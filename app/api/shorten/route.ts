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

    let url = longUrl.trim();

    // 必须 http(s)
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return NextResponse.json(
        { success: false, error: "URL 必须以 http:// 或 https:// 开头" },
        { status: 400 }
      );
    }

    // =============== 1. 先解析抖音短链 ===============
    if (url.includes("v.douyin.com")) {
      url = await expandDouyinShortUrl(url);
    }

    // =============== 2. 清洗抖音长链 ===============
    const cleanedUrl = cleanFinalDouyinUrl(url);

    // =============== 3. 平台 & 标题 ===============
    const platform = detectPlatform(cleanedUrl);
    const title = generateTitle(cleanedUrl);

    console.log("解析结果：", { 输入: longUrl, 最终链接: cleanedUrl });

    // =============== 4. 检查是否已存在 ===============
    const existing = await redis.get(RedisKeys.urlByLongUrl(cleanedUrl));
    if (existing) {
      return NextResponse.json({ success: true, data: existing });
    }

    // =============== 5. 生成短码记录 ===============
    const id = generateShortCode();

    const urlData = {
      id,
      shortUrl: longUrl,
      longUrl: cleanedUrl,
      originalUrl: longUrl,
      normalizedUrl: cleanedUrl,
      createdAt: new Date().toISOString(),
      platform,
      clickCount: 0,
      title,
      thumbnail: null,
      domain: getDomainFromUrl(cleanedUrl),
    };

    // =============== 6. 写入 Redis ===============
    await Promise.all([
      redis.set(RedisKeys.urlByLongUrl(cleanedUrl), urlData),
      redis.zadd(RedisKeys.allUrls, { score: Date.now(), member: id }),
      redis.hincrby(RedisKeys.platformStats, platform, 1),
    ]);

    return NextResponse.json({ success: true, data: urlData });
  } catch (error: any) {
    console.error("短链转换错误:", error);
    return NextResponse.json(
      { success: false, error: "转换失败：" + error.message },
      { status: 500 }
    );
  }
}
