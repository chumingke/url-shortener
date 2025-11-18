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

    const originalInput = longUrl.trim();

    if (!originalInput.startsWith("http://") && !originalInput.startsWith("https://")) {
      return NextResponse.json(
        { success: false, error: "URL 必须以 http:// 或 https:// 开头" },
        { status: 400 }
      );
    }

    // 1) 展开抖音短链（如果是 v.douyin.com）
    let resolvedUrl = originalInput;
    if (originalInput.includes("v.douyin.com")) {
      try {
        resolvedUrl = await expandDouyinShortUrl(originalInput);
      } catch (e) {
        console.error("expandDouyinShortUrl 错误，使用原始输入：", e);
        resolvedUrl = originalInput;
      }
    }

    // 2) 清洗为最干净的抖音视频链接
    const cleanedUrl = cleanFinalDouyinUrl(resolvedUrl);

    // 3) 平台、标题
    const platform = detectPlatform(cleanedUrl);
    const title = generateTitle(cleanedUrl);

    console.log("解析结果:", { originalInput, resolvedUrl, cleanedUrl });

    // 4) 去重（以 cleanedUrl 为 key）
    const existing = await redis.get(RedisKeys.urlByLongUrl(cleanedUrl));
    if (existing) {
      return NextResponse.json({ success: true, data: existing });
    }

    // 5) 生成并保存（shortUrl 保留用户原始输入）
    const id = generateShortCode();

    const urlData = {
      id,
      shortUrl: originalInput,
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

    await Promise.all([
      redis.set(RedisKeys.urlByLongUrl(cleanedUrl), urlData),
      redis.zadd(RedisKeys.allUrls, { score: Date.now(), member: id }),
      redis.hincrby(RedisKeys.platformStats, platform, 1),
    ]);

    return NextResponse.json({ success: true, data: urlData });
  } catch (error: any) {
    console.error("短链转换错误:", error);
    return NextResponse.json(
      { success: false, error: "转换失败：" + (error?.message ?? "Unknown error") },
      { status: 500 }
    );
  }
}
