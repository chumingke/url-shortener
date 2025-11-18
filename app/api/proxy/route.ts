// app/api/proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  console.log('Proxy API received URL:', url);

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  // 验证URL格式
  try {
    new URL(url);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      method: 'GET', // 使用 GET 而不是 HEAD，因为有些网站对 HEAD 请求返回不同结果
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    console.log('Proxy fetch response status:', response.status);

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const result = {
      status: response.status,
      url: response.url,
      headers: headers,
    };

    console.log('Proxy result:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: `Failed to fetch URL: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}