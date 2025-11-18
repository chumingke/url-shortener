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

    // === 保留用户原始输入（shortUrl 将使用此值） ===
    const originalInput = longUrl.trim();

    // 必须以 http(s) 开头
    if (!originalInput.startsWith("http://") && !originalInput.startsWith("https://")) {
      return NextResponse.json(
        { success: false, error: "URL 必须以 http:// 或 https:// 开头" },
        { status: 400 }
      );
    }

    // === 1) 如果是抖音短链，先展开跳转以拿到真实长链 ===
    let resolvedUrl = originalInput;
    if (originalInput.includes("v.douyin.com")) {
      try {
        resolvedUrl = await expandDouyinShortUrl(originalInput);
      } catch (e) {
        console.error("expandDouyinShortUrl 错误，使用原始输入：", e);
        resolvedUrl = originalInput;
      }
    }

    // === 2) 将 resolvedUrl 清洗为最终的“干净长链”（去掉 query 等） ===
    const cleanedUrl = cleanFinalDouyinUrl(resolvedUrl);

    // === 3) 平台与标题 ===
    const platform = detectPlatform(cleanedUrl);
    const title = generateTitle(cleanedUrl);

    console.log("解析结果:", { originalInput, resolvedUrl, cleanedUrl });

    // === 4) 去重：以 cleanedUrl（最终长链）作为去重 key ===
    const existing = await redis.get(RedisKeys.urlByLongUrl(cleanedUrl));
    if (existing) {
      // 如果已经存在，直接返回已存数据（该数据可能已有 shortUrl）
      return NextResponse.json({ success: true, data: existing });
    }

    // === 5) 生成记录：短链字段 shortUrl 使用用户原始输入 ===
    const id = generateShortCode();

    const urlData = {
      id,
      // 保留用户原始短链作为 shortUrl（如果用户原本提交的是长链，则会保存长链）
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

    // === 6) 写入 Redis（以 cleanedUrl 去重/索引） ===
    await Promise.all([
      redis.set(RedisKeys.urlByLongUrl(cleanedUrl), urlData),
      redis.zadd(RedisKeys.allUrls, { score: Date.now(), member: id }),
      redis.hincrby(RedisKeys.platformStats, platform, 1),
    ]);

    // === 7) 返回数据（shortUrl 保持原始短链） ===
    return NextResponse.json({ success: true, data: urlData });
  } catch (error: any) {
    console.error("短链转换错误:", error);
    return NextResponse.json(
      { success: false, error: "转换失败：" + (error?.message ?? "Unknown error") },
      { status: 500 }
    );
  }
}
