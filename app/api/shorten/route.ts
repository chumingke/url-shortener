import { NextRequest, NextResponse } from 'next/server';
import { redis, RedisKeys } from '@/lib/redis';
import { generateShortCode, getDomainFromUrl } from '@/lib/utils';
import { platformManager } from '@/lib/platforms';

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const { longUrl } = await request.json();

    // 1. 基础验证（避免构建时URL解析）
    if (!longUrl || typeof longUrl !== 'string' || longUrl.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '请输入有效的URL链接' },
        { status: 400 }
      );
    }

    // 2. 简单格式验证
    const cleanUrl = longUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      return NextResponse.json(
        { success: false, error: 'URL必须以 http:// 或 https:// 开头' },
        { status: 400 }
      );
    }

    // 3. 使用平台管理器将短链接转换为长链接
    const { platform, normalizedUrl, displayInfo } = await platformManager.processUrl(cleanUrl);
    
    console.log('短链转长链结果:', {
      平台: platform,
      输入短链: cleanUrl,
      输出长链: normalizedUrl
    });

    // 4. 检查是否已存在相同的转换
    const existing = await redis.get(RedisKeys.urlByLongUrl(cleanUrl));
    if (existing) {
      return NextResponse.json({
        success: true,
        data: existing
      });
    }

    // 5. 构建返回数据
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
      domain: getDomainFromUrl(normalizedUrl),
      needsClientParse: displayInfo.needsClientParse || false
    };

    // 6. 存储到 Redis
    await Promise.all([
      redis.set(RedisKeys.urlByLongUrl(cleanUrl), urlData),
      redis.zadd(RedisKeys.allUrls, {
        score: Date.now(),
        member: urlData.id
      }),
      redis.hincrby(RedisKeys.platformStats, platform, 1)
    ]);

    // 7. 返回成功响应
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