import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // 安全地获取URL参数 - 避免在构建时解析URL
    const urlSearchParams = request.nextUrl.searchParams;
    const url = urlSearchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    // 简单格式验证
    if (typeof url !== 'string' || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // 执行代理请求
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    clearTimeout(timeoutId);

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return NextResponse.json({
      status: response.status,
      url: response.url,
      headers: headers
    });
  } catch (error) {
    console.error('Proxy API error:', error);
    return NextResponse.json(
      { error: 'Proxy request failed' },
      { status: 500 }
    );
  }
}