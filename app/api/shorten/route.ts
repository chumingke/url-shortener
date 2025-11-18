import { NextRequest, NextResponse } from 'next/server';
import { redis, RedisKeys } from '@/lib/redis';
import { normalizeDouyinUrl } from '@/lib/normalize';

export async function POST(req: NextRequest) {
  try {
    const { longUrl: input } = await req.json();

    if (!input) {
      return NextResponse.json({ success: false, error: "请输入 URL" });
    }

    const originalInput = input.trim();

    // 调用你现有的 normalize 方法
    const resolved = await normalizeDouyinUrl(originalInput);

    console.log("解析结果:", resolved);

    // resolved → { originalInput, resolvedUrl, cleanedUrl }
    const longUrl = resolved.cleanedUrl;       // 最终解析后的真实链接
    const platform = "douyin";

    // 检查 Redis 是否已有数据
    const exist = await redis.get(RedisKeys.urlByLongUrl(longUrl));
    if (exist) {
      return NextResponse.json({ success: true, data: exist });
    }

    const id = resolved.cleanedUrl.split("/").pop();

    // ⭐⭐⭐ 最重要修复点：shortUrl 必须保存用户原始输入 ⭐⭐⭐
    const urlData = {
      id,
      shortUrl: originalInput,   // 必须是 v.douyin.com 短链！
      longUrl: longUrl,          // 解析后的长链
      originalUrl: originalInput,
      normalizedUrl: longUrl,
      platform,
      title: "抖音视频",
      createdAt: new Date().toISOString(),
      clickCount: 0,
      thumbnail: null
    };

    // 写入 Redis
    await Promise.all([
      redis.set(RedisKeys.urlByLongUrl(longUrl), urlData),
      redis.zadd(RedisKeys.allUrls, { score: Date.now(), member: id }),
      redis.hincrby(RedisKeys.platformStats, platform, 1)
    ]);

    return NextResponse.json({ success: true, data: urlData });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { success: false, error: err.message || "解析失败" },
      { status: 500 }
    );
  }
}
