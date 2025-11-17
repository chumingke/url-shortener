export abstract class PlatformProcessor {
  abstract name: string;
  abstract domains: string[];
  abstract icon: string;
  abstract color: string;
  
  abstract isValid(url: string): boolean;
  abstract normalize(url: string): Promise<string>;
  abstract extractId(url: string): string | null;
  abstract getDisplayInfo(url: string): Promise<{ title: string; thumbnail?: string }>;
  
  // 判断是否是平台的短链
  isShortLink(url: string): boolean {
    const shortLinkPatterns = [
      /v\.douyin\.com\/.+\//,           // 抖音短链
      /youtu\.be\/.+/,                 // YouTube短链
      /b23\.tv\/.+/,                   // B站短链
      /xhslink\.com\/.+/,              // 小红书短链
    ];
    
    return shortLinkPatterns.some(pattern => pattern.test(url));
  }
  
  // 通用的HTTP重定向跟踪方法
  protected async followRedirects(shortUrl: string): Promise<string> {
    try {
      const response = await fetch(shortUrl, {
        method: 'HEAD',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      return response.url;
    } catch (error) {
      console.error(`跟踪重定向失败: ${shortUrl}`, error);
      throw new Error(`无法解析短链接: ${(error as Error).message}`);
    }
  }

  // 通用URL清理方法
  protected cleanUrl(url: string): string {
    return url.split('?')[0].split('#')[0];
  }
  
  // 通用ID提取
  protected extractPattern(url: string, pattern: RegExp): string | null {
    const match = url.match(pattern);
    return match ? match[1] : null;
  }

  // 如果已经是短链，直接返回
  protected async handleShortLink(url: string): Promise<string> {
    if (this.isShortLink(url)) {
      return url;
    }
    throw new Error('需要长链接进行转换');
  }
}