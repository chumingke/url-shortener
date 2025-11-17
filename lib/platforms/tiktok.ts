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
    
    // 如果已经是长链接，直接返回
    if (url.includes('www.douyin.com/video/')) {
      return this.cleanUrl(url);
    }

    // 抖音短链接解析 - 在服务器环境中可能需要不同的方法
    try {
      // 在 Vercel 环境中，我们可能需要使用不同的方法
      // 暂时返回原始链接，并提示用户手动获取
      console.log('抖音短链接解析在服务器环境中受限:', url);
      
      // 提取短码用于显示
      const shortCodeMatch = url.match(/v\.douyin\.com\/([^\/]+)/);
      if (shortCodeMatch) {
        const shortCode = shortCodeMatch[1];
        throw new Error(`抖音短链接解析受限。请手动访问 https://v.douyin.com/${shortCode} 获取长链接`);
      }
      
      throw new Error('无法解析抖音短链接');
    } catch (error) {
      console.error('抖音短链接解析失败:', error);
      throw new Error(`抖音短链接解析失败: 请在浏览器中手动访问该链接获取长链接`);
    }
  }

  async getDisplayInfo(url: string): Promise<{ title: string; thumbnail?: string }> {
    const cleanedUrl = this.cleanUrl(url);
    const videoId = this.extractId(cleanedUrl);
    
    if (videoId) {
      return {
        title: `抖音视频 ${videoId}`,
      };
    } else {
      // 如果是短链接，提供更友好的提示
      const shortCodeMatch = url.match(/v\.douyin\.com\/([^\/]+)/);
      if (shortCodeMatch) {
        return {
          title: `抖音短链接 - 需要手动解析`,
        };
      }
      return {
        title: '抖音链接',
      };
    }
  }
}