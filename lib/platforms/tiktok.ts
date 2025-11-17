import { PlatformProcessor } from './base';

export class TikTokProcessor extends PlatformProcessor {
  name = '抖音';
  domains = ['douyin.com', 'tiktok.com', 'iesdouyin.com', 'v.douyin.com'];
  icon = '🎵';
  color = 'bg-red-500';

  isValid(url: string): boolean {
    return this.domains.some(domain => url.includes(domain));
  }

  extractId(url: string): string | null {
    // 从长链接中提取视频ID
    const patterns = [
      /video\/(\d+)/,           // https://www.douyin.com/video/1234567890123456789
      /note\/(\d+)/,            // 笔记格式
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  }

  async normalize(url: string): Promise<string> {
    console.log('处理抖音链接:', url);
    
    // 如果已经是长链接，直接返回（清理参数）
    if (!this.isShortLink(url)) {
      return this.cleanUrl(url);
    }

    // 短链接：跟踪重定向获取长链接
    try {
      const longUrl = await this.followRedirects(url);
      console.log('抖音短链转长链结果:', url, '->', longUrl);
      return this.cleanUrl(longUrl);
    } catch (error) {
      throw new Error(`抖音短链接解析失败: ${(error as Error).message}`);
    }
  }

  async getDisplayInfo(url: string): Promise<{ title: string; thumbnail?: string }> {
    const videoId = this.extractId(url);
    return {
      title: videoId ? `抖音视频 ${videoId}` : '抖音链接',
    };
  }
}