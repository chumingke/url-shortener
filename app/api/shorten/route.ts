import { NextRequest, NextResponse } from 'next/server';
import { redis, RedisKeys } from '@/lib/redis';
import { generateShortCode, getDomainFromUrl } from '@/lib/utils';

// ★ 新增：抖音链接清洗（只保留关键参数）
function normalizeDouyinUrl(url: string): string {
  try {
    const u = new URL(url);

    // 不是抖音就原样返回
    if (!u.hostname.includes('douyin.com') && !u.hostname.includes('iesdouyin.com')) {
      return url;
    }

    // 如果是短链 v.douyin.com 或跳转链，直接返回原样（前端会二次解析）
    if (u.hostname.includes('v.douyin.com')) {
      return url;
    }

    // 提取 video/123456789 部分
    const match = u.pathname.match(/video\/(\d+)/);
    if (!match) return url;

    const videoId = match[1];

    // ★ 构造最干净的抖音长链（不会带一大堆参数）
    return `https://www.iesdouyin.com/share/video/${videoId}/`;
  } catch {
    return url;
  }
}

// 平台检测
function detectPlatform(url: string): string {
  if (url.includes('douyin.com')) return 'douyin';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('bilibili.com')) return 'bilibili';
  return 'other';
}

// 标题
function generateTitle(url: string): string {
  if (url.includes('douyin.com')) return '抖音视频';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube视频';
  if (url.includes('bilibili.com')) return 'B站视频';
  return '未知链接';
}

export async function POST(request: NextRequest) {
  try {
    const { longUrl } = await request.json();

    if (!longUrl || typeof longUrl !== 'string') {
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

    // ★ 对抖音链接进行清洗
    const normalizedUrl = normalizeDouyinUrl(cleanUrl);

    // 检测平台
    const platform = detectPlatform(normalizedUrl);
    const title = generateTitle(normalizedUrl);

    console.log('短链处理结果:', {
      输入原始链接: cleanUrl,
      清洗后链接: normalizedUrl,
      平台: platform
    });

    // 检查是否已存在
    const existing = await redis.get(RedisKeys.urlByLongUrl(normalizedUrl));
    if (existing) {
      return NextResponse.json({
        success: true,
        data: existing
      });
    }

    // ★ 构建数据（shortUrl 用原链接 / longUrl 用清洗后的链接）
    const urlData = {
      id: generateShortCode(),
      shortUrl: cleanUrl,
      longUrl: normalizedUrl,
      platform,
      originalUrl: cleanUrl,
      normalizedUrl,
      createdAt: new Date().toISOString(),
      clickCount: 0,
      title,
      thumbnail: null,
      domain: getDomainFromUrl(normalizedUrl)
    };

    // 存储 Redis
    await Promise.all([
      redis.set(RedisKeys.urlByLongUrl(normalizedUrl), urlData),
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
