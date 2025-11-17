import { NextRequest, NextResponse } from 'next/server';
import { redis, RedisKeys } from '@/lib/redis';
import { generateShortCode, isValidUrl, getDomainFromUrl } from '@/lib/utils';
import { platformManager } from '@/lib/platforms';

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const { longUrl } = await request.json();

    // 1. 验证输入
    if (!longUrl || !isValidUrl(longUrl)) {
      return NextResponse.json(
        { success: false, error: '请输入有效的URL链接' },
        { status: 400 }
      );
    }

    // 2. 使用平台管理器将短链接转换为长链接
    const { platform, normalizedUrl, displayInfo } = await platformManager.processUrl(longUrl);
    
    console.log('短链转长链结果:', {
      平台: platform,
      输入短链: longUrl,
      输出长链: normalizedUrl
    });

    // 3. 检查是否已存在相同的转换
    const existing = await redis.get(RedisKeys.urlByLongUrl(longUrl));
    if (existing) {
      return NextResponse.json({
        success: true,
        data: existing
      });
    }

    // 4. 构建返回数据
    const urlData = {
      id: generateShortCode(),
      shortUrl: longUrl,        // 用户输入的短链接
      longUrl: normalizedUrl,   // 转换后的长链接
      platform: platform,
      originalUrl: longUrl,
      normalizedUrl: normalizedUrl,
      createdAt: new Date().toISOString(),
      clickCount: 0,
      title: displayInfo.title,
      thumbnail: displayInfo.thumbnail,
      domain: getDomainFromUrl(normalizedUrl)
    };

    // 5. 存储到 Redis
    await Promise.all([
      redis.set(RedisKeys.urlByLongUrl(longUrl), urlData),
      redis.zadd(RedisKeys.allUrls, {
        score: Date.now(),
        member: urlData.id
      }),
      redis.hincrby(RedisKeys.platformStats, platform, 1)
    ]);

    // 6. 返回成功响应
    return NextResponse.json({
      success: true,
      data: urlData
    });

  } catch (error) {
    console.error('短链转换错误:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '转换失败: ' + (error as Error).message 
      },
      { status: 500 }
    );
  }
}