import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // 安全获取URL参数 - 使用Next.js提供的方法
    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    // 简单字符串验证，避免任何URL解析
    if (typeof url !== 'string') {
      return NextResponse.json({ error: 'URL must be a string' }, { status: 400 });
    }

    // 检查基本URL格式
    const trimmedUrl = url.trim();
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      return NextResponse.json({ error: 'URL must start with http:// or https://' }, { status: 400 });
    }

    // 设置超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(trimmedUrl, {
        method: 'HEAD',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      clearTimeout(timeoutId);

      // 安全地收集headers
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      return NextResponse.json({
        status: response.status,
        url: response.url,
        headers: headers
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }

  } catch (error) {
    console.error('Proxy API error:', error);
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timeout' }, { status: 408 });
    }
    
    return NextResponse.json(
      { error: 'Proxy request failed' },
      { status: 500 }
    );
  }
}