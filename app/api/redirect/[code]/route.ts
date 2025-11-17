import { NextRequest, NextResponse } from 'next/server';
import { redis, RedisKeys } from '@/lib/redis';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  // 等待 params Promise 解析
  const { code } = await params;

  try {
    console.log('重定向请求，短码:', code);
    
    // 1. 根据短码查找URL数据
    const urlData = await redis.get(RedisKeys.urlByCode(code));
    
    // 2. 如果找不到，重定向到首页
    if (!urlData) {
      console.log('未找到短码:', code);
      return NextResponse.redirect(new URL('/', request.url));
    }

    const data = urlData as any;
    console.log('找到URL数据:', data.shortUrl, '->', data.originalUrl);

    // 3. 更新统计信息
    await Promise.all([
      redis.zincrby(RedisKeys.urlClicks, 1, code),
      redis.hincrby(RedisKeys.urlStats(code), 'clickCount', 1),
      redis.hincrby(RedisKeys.platformStats, data.platform, 1)
    ]);

    console.log('统计信息更新完成');

    // 4. 重定向到原始URL
    return NextResponse.redirect(data.originalUrl);
    
  } catch (error) {
    console.error('重定向错误:', error);
    // 出错时也重定向到首页
    return NextResponse.redirect(new URL('/', request.url));
  }
}