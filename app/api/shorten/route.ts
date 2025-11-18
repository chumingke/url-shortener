import { NextRequest, NextResponse } from 'next/server';
import { redis, RedisKeys } from '@/lib/redis';
import { generateShortCode, getDomainFromUrl } from '@/lib/utils';
import { platformManager } from '@/lib/platforms';

export async function POST(request: NextRequest) {
  try {
    const { longUrl } = await request.json();

    // 基础验证
    if (!longUrl || typeof longUrl !== 'string' || longUrl.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '请输入有效的URL链接' },
        { status: 400 }
      );
    }

    const cleanUrl = longUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      return NextResponse.json(
        { success: false, error: 'URL必须以 http:// 或 https:// 开头' },
        { status: 400 }
      );
    }

    const { platform, normalizedUrl, displayInfo } = await platformManager.processUrl(cleanUrl);
    
    console.log('短链转长链结果:', {
      平台: platform,
      输入短链: cleanUrl,
      输出长链: normalizedUrl
    });

    const existing = await redis.get(RedisKeys.urlByLongUrl(cleanUrl));
    if (existing) {
      return NextResponse.json({
        success: true,
        data: existing
      });
    }

    const urlData = {
      id: generateShortCode(),
      shortUrl: cleanUrl,
      longUrl: normalizedUrl,
      platform: platform,
      originalUrl: cleanUrl,
      normalizedUrl: normalizedUrl,
      createdAt: new Date().toISOString(),
      clickCount: 0,
      title: displayInfo.title,
      thumbnail: displayInfo.thumbnail,
      domain: getDomainFromUrl(normalizedUrl)
    };

    await Promise.all([
      redis.set(RedisKeys.urlByLongUrl(cleanUrl), urlData),
      redis.zadd(RedisKeys.allUrls, {
        score: Date.now(),
        member: urlData.id
      }),
      redis.hincrby(RedisKeys.platformStats, platform, 1)
    ]);

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