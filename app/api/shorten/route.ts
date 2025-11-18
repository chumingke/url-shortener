import { NextRequest, NextResponse } from 'next/server';
import { redis, RedisKeys } from '@/lib/redis';
import { generateShortCode, getDomainFromUrl } from '@/lib/utils';

// 简单的平台检测（避免复杂的URL解析）
function detectPlatform(url: string): string {
  if (url.includes('douyin.com')) return 'douyin';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('bilibili.com')) return 'bilibili';
  return 'other';
}

// 简单的标题生成
function generateTitle(url: string): string {
  if (url.includes('douyin.com')) return '抖音视频';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube视频';
  if (url.includes('bilibili.com')) return 'B站视频';
  return '未知链接';
}

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const { longUrl } = await request.json();

    // 1. 基础验证
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

    // 3. 检测平台和生成数据（简化版，避免复杂处理）
    const platform = detectPlatform(cleanUrl);
    const title = generateTitle(cleanUrl);
    
    console.log('短链处理结果:', {
      平台: platform,
      输入短链: cleanUrl,
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
      longUrl: cleanUrl, // 简化：直接返回原URL，让客户端处理
      platform: platform,
      originalUrl: cleanUrl,
      normalizedUrl: cleanUrl,
      createdAt: new Date().toISOString(),
      clickCount: 0,
      title: title,
      thumbnail: null,
      domain: getDomainFromUrl(cleanUrl)
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