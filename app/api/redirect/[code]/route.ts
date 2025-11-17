import { NextRequest, NextResponse } from 'next/server';
import { redis, RedisKeys } from '@/lib/redis';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const { code } = params;

  try {
    // 1. 查找URL数据（使用带前缀的键名）
    const urlData = await redis.get(RedisKeys.urlByCode(code));
    
    if (!urlData) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    const data = urlData as any;

    // 2. 更新统计（使用带前缀的键名）
    await Promise.all([
      redis.zincrby(RedisKeys.urlClicks, 1, code),
      redis.hincrby(RedisKeys.urlStats(code), 'clickCount', 1),
      redis.hincrby(RedisKeys.platformStats, data.platform, 1)
    ]);

    // 3. 重定向
    return NextResponse.redirect(data.originalUrl);
    
  } catch (error) {
    console.error('重定向错误:', error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}