import { PlatformProcessor } from './base';

export class YouTubeProcessor extends PlatformProcessor {
  name = 'YouTube';
  domains = ['youtube.com', 'youtu.be'];
  icon = '📺';
  color = 'bg-red-600';

  isValid(url: string): boolean {
    return this.domains.some(domain => url.includes(domain));
  }

  extractId(url: string): string | null {
    // 从短链或长链中提取视频ID
    if (url.includes('youtu.be')) {
      return this.extractPattern(url, /youtu\.be\/([^\/\?]+)/);
    }
    
    return this.extractPattern(url, /(?:v=|\/v\/|embed\/)([^&\?]+)/);
  }

  async normalize(url: string): Promise<string> {
    console.log('处理YouTube链接:', url);
    
    // 如果已经是长链接，直接返回（清理参数）
    if (!this.isShortLink(url)) {
      return this.cleanUrl(url);
    }

    // 短链接：跟踪重定向获取长链接
    try {
      const longUrl = await this.followRedirects(url);
      console.log('YouTube短链转长链结果:', url, '->', longUrl);
      return this.cleanUrl(longUrl);
    } catch (error) {
      throw new Error(`YouTube短链接解析失败: ${(error as Error).message}`);
    }
  }

  async getDisplayInfo(url: string): Promise<{ title: string; thumbnail?: string }> {
    const videoId = this.extractId(url);
    return {
      title: videoId ? `YouTube视频 ${videoId}` : 'YouTube链接',
      thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/0.jpg` : undefined
    };
  }
}