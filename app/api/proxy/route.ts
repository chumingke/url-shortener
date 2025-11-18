// app/api/proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const target = request.nextUrl.searchParams.get('url');
    if (!target) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    const trimmedUrl = target.trim();
    if (!/^https?:\/\//i.test(trimmedUrl)) {
      return NextResponse.json({ error: 'URL must start with http:// or https://' }, { status: 400 });
    }

    // === 超时控制 ===
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    // === 设置完整浏览器请求头（抖音需要这些） ===
    const browserHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      Referer: "https://www.douyin.com/",
    };

    // **关键**：改为 GET（抖音/短链常常拒绝 HEAD）
    const resp = await fetch(trimmedUrl, {
      method: "GET",
      redirect: "manual", // 捕获 302 / 301 的 Location
      signal: controller.signal,
      headers: browserHeaders,
    });

    clearTimeout(timeout);

    // 收集 headers（Next.js 不允许直接返回 Headers 对象）
    const outHeaders: Record<string, string> = {};
    resp.headers.forEach((value, key) => {
      outHeaders[key] = value;
    });

    // === 如果是重定向，返回 Location ===
    const location = resp.headers.get("location");

    if (resp.status >= 300 && resp.status < 400 && location) {
      return NextResponse.json({
        status: resp.status,
        redirected: true,
        location,
        headers: outHeaders,
      });
    }

    // === 不是重定向时，读取部分 body 内容（避免巨大 body 崩溃） ===
    let bodyText = "";
    try {
      const text = await resp.text();
      bodyText = text.slice(0, 1500); // 截断避免太大
    } catch {
      bodyText = "";
    }

    return NextResponse.json({
      status: resp.status,
      redirected: false,
      headers: outHeaders,
      url: resp.url,
      bodySnippet: bodyText,
    });

  } catch (error: any) {
    console.error("Proxy API Error =>", error);

    if (error?.name === "AbortError") {
      return NextResponse.json({ error: "Request timeout" }, { status: 408 });
    }

    return NextResponse.json(
      { error: error?.message || "Proxy request failed" },
      { status: 500 }
    );
  }
}
