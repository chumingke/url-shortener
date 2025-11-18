import { NextRequest, NextResponse } from 'next/server';
import { redis, RedisKeys } from '@/lib/redis';
import { generateShortCode, getDomainFromUrl } from '@/lib/utils';

// 简单的平台检测
function detectPlatform(url: string): string {
  if (url.includes('douyin.com')) return 'douyin';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('bilibili.com')) return 'bilibili';
  return 'other';
}

// 简单标题生成
function generateTitle(url: string): string {
  if (url.includes('douyin.com')) return '抖音视频';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube视频';
  if (url.includes('bilibili.com')) return 'B站视频';
  return '未知链接';
}

export async function POST(request: NextRequest) {
  try {
    const { longUrl } = await request.json();

    // 1. 基础校验
    if (!longUrl || typeof longUrl !== 'string' || longUrl.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '请输入有效的URL链接' },
        { status: 400 }
      );
    }

    let cleanUrl = longUrl.trim();

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      return NextResponse.json(
        { success: false, error: 'URL必须以 http:// 或 https:// 开头' },
        { status: 400 }
      );
    }

    // 2. 自动解析抖音短链
    let finalLongUrl = cleanUrl;

    if (cleanUrl.includes('v.douyin.com/')) {
      console.log("检测到抖音短链，开始解析:", cleanUrl);

      try {
        const response = await fetch(cleanUrl, {
          method: "GET",
          redirect: "follow",
        });

        finalLongUrl = response.url; // 最终跳转后的真实长链
        console.log("抖音短链解析成功:", finalLongUrl);
      } catch (err) {
        console.error("抖音短链解析失败:", err);
      }
    }

    // 3. 平台检测与标题生成
    const platform = detectPlatform(finalLongUrl);
    const title = generateTitle(finalLongUrl);

    // 4. Redis 去重判断
    const existing = await redis.get(RedisKeys.urlByLongUrl(finalLongUrl));
    if (existing) {
      return NextResponse.json({
        success: true,
        data: existing
      });
    }

    // 5. 构建保存的数据
    const urlData = {
      id: generateShortCode(),
      shortUrl: cleanUrl,            // 用户输入的短链（如果是短链）
      longUrl: finalLongUrl,         // 真实长链
      originalUrl: cleanUrl,
      normalizedUrl: finalLongUrl,
      createdAt: new Date().toISOString(),
      clickCount: 0,
      platform,
      title,
      thumbnail: null,
      domain: getDomainFromUrl(finalLongUrl)
    };

    // 6. 存入 Redis
    await Promise.all([
      redis.set(RedisKeys.urlByLongUrl(finalLongUrl), urlData),
      redis.zadd(RedisKeys.allUrls, {
        score: Date.now(),
        member: urlData.id
      }),
      redis.hincrby(RedisKeys.platformStats, platform, 1)
    ]);

    // 7. 返回结果
    return NextResponse.json({
      success: true,
      data: urlData
    });

  } catch (error) {
    console.error('短链转换错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: '转换失败: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}
