import { PlatformProcessor } from './base';

export class BilibiliProcessor extends PlatformProcessor {
  name = 'B站';
  domains = ['bilibili.com', 'b23.tv'];
  icon = '📱';
  color = 'bg-pink-500';

  isValid(url: string): boolean {
    return this.domains.some(domain => url.includes(domain));
  }

  extractId(url: string): string | null {
    const bvMatch = url.match(/(BV[\w]+)/);
    if (bvMatch) return bvMatch[1];
    
    const avMatch = url.match(/(av\d+)/i);
    if (avMatch) return avMatch[1];
    
    return null;
  }

  async normalize(url: string): Promise<string> {
    console.log('处理B站链接:', url);
    
    // 如果已经是长链接，直接返回（清理参数）
    if (!this.isShortLink(url)) {
      return this.cleanUrl(url);
    }

    // 短链接：跟踪重定向获取长链接
    try {
      const longUrl = await this.followRedirects(url);
      console.log('B站短链转长链结果:', url, '->', longUrl);
      return this.cleanUrl(longUrl);
    } catch (error) {
      throw new Error(`B站短链接解析失败: ${(error as Error).message}`);
    }
  }

  async getDisplayInfo(url: string): Promise<{ title: string; thumbnail?: string }> {
    const videoId = this.extractId(url);
    return {
      title: videoId ? `B站视频 ${videoId}` : 'B站链接',
    };
  }
}