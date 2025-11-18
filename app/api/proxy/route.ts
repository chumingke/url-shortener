import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: '缺少URL参数' }, { status: 400 });
  }

  try {
    // 简单的代理请求，只用于获取重定向信息
    const response = await fetch(targetUrl, {
      method: 'HEAD',
      redirect: 'manual', // 不自动重定向
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    // 返回重定向信息
    return NextResponse.json({
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      redirected: response.redirected,
      url: response.url,
    });
  } catch (error) {
    console.error('代理请求失败:', error);
    return NextResponse.json({ 
      error: '代理请求失败',
      message: (error as Error).message 
    }, { status: 500 });
  }
}