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
    const patterns = [
      /video\/(\d+)/,
      /note\/(\d+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  }

  async normalize(url: string): Promise<string> {
    console.log('处理抖音链接:', url);
    
    // 如果已经是长链接，直接返回
    if (url.includes('www.douyin.com/video/')) {
      return this.cleanUrl(url);
    }

    // 抖音短链接 - 标记需要客户端解析
    if (url.includes('v.douyin.com')) {
      // 返回特殊标记，让前端知道需要客户端解析
      return `client_parse:${url}`;
    }
    
    return this.cleanUrl(url);
  }

  async getDisplayInfo(url: string): Promise<{ title: string; thumbnail?: string }> {
    const videoId = this.extractId(url);
    
    if (videoId) {
      return {
        title: `抖音视频 ${videoId}`,
      };
    } else if (url.includes('v.douyin.com')) {
      return {
        title: '抖音短链接 - 点击解析',
      };
    }
    
    return {
      title: '抖音链接',
    };
  }

  // 新增：检查是否需要客户端解析
  needsClientParse(normalizedUrl: string): boolean {
    return normalizedUrl.startsWith('client_parse:');
  }

  // 新增：获取原始URL
  getOriginalUrl(normalizedUrl: string): string {
    if (this.needsClientParse(normalizedUrl)) {
      return normalizedUrl.replace('client_parse:', '');
    }
    return normalizedUrl;
  }
}