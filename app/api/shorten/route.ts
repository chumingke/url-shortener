import { NextRequest, NextResponse } from "next/server";
import { redis, RedisKeys } from "@/lib/redis";
import {
  expandDouyinShortUrl,
  cleanFinalDouyinUrl,
  detectPlatform,
  generateTitle,
  generateShortCode,
  getDomainFromUrl,
} from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const { longUrl } = await request.json();

    if (!longUrl || typeof longUrl !== "string") {
      return NextResponse.json(
        { success: false, error: "请输入有效的URL链接" },
        { status: 400 }
      );
    }

    // === 记录用户原始输入（非常重要：shortUrl 使用此值） ===
    const originalInput = longUrl.trim();

    // 必须 http(s)
    if (!originalInput.startsWith("http://") && !originalInput.startsWith("https://")) {
      return NextResponse.json(
        { success: false, error: "URL 必须以 http:// 或 https:// 开头" },
        { status: 400 }
      );
    }

    // === 1. 先解析抖音短链（如果是 v.douyin.com） ===
    let resolvedUrl = originalInput;
    if (originalInput.includes("v.douyin.com")) {
      try {
        resolvedUrl = await expandDouyinShortUrl(originalInput);
      } catch (e) {
        console.error("expandDouyinShortUrl 错误，保留原始输入:", e);
        // 保留 originalInput 到 resolvedUrl，以便后续仍能存储/返回
        resolvedUrl = originalInput;
      }
    }

    // === 2. 清洗抖音长链为最干净格式（如 /video/{id}） ===
    const cleanedUrl = cleanFinalDouyinUrl(resolvedUrl);

    // === 3. 平台 & 标题 ===
    const platform = detectPlatform(cleanedUrl);
    const title = generateTitle(cleanedUrl);

    console.log("解析结果：", { 输入: originalInput, 解析后: resolvedUrl, 清洗后: cleanedUrl });

    // === 4. Redis 去重（以清洗后的 final URL 作为去重 key） ===
    const existing = await redis.get(RedisKeys.urlByLongUrl(cleanedUrl));
    if (existing) {
      return NextResponse.json({ success: true, data: existing });
    }

    // === 5. 生成短码记录（注意 shortUrl 保留用户原始输入） ===
    const id = generateShortCode();

    const urlData = {
      id,
      // shortUrl 为用户提交的原始值（保留短链形式，如果原始就是长链也会如实保存）
      shortUrl: originalInput,
      // longUrl / normalizedUrl 保存解析并清洗后的最终链接（无追踪参数）
      longUrl: cleanedUrl,
      originalUrl: originalInput,
      normalizedUrl: cleanedUrl,
      createdAt: new Date().toISOString(),
      platform,
      clickCount: 0,
      title,
      thumbnail: null,
      domain: getDomainFromUrl(cleanedUrl),
    };

    // === 6. 写入 Redis ===
    await Promise.all([
      redis.set(RedisKeys.urlByLongUrl(cleanedUrl), urlData),
      redis.zadd(RedisKeys.allUrls, { score: Date.now(), member: id }),
      redis.hincrby(RedisKeys.platformStats, platform, 1),
    ]);

    // === 7. 返回结果 ===
    return NextResponse.json({ success: true, data: urlData });
  } catch (error: any) {
    console.error("短链转换错误:", error);
    return NextResponse.json(
      { success: false, error: "转换失败：" + (error?.message ?? "Unknown error") },
      { status: 500 }
    );
  }
}
