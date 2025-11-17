import { PlatformProcessor } from './base';

export class GenericProcessor extends PlatformProcessor {
  name = '通用链接';
  domains: string[] = [];
  icon = '🔗';
  color = 'bg-gray-500';

  isValid(url: string): boolean {
    return true; // 捕获所有其他链接
  }

  extractId(url: string): string | null {
    return null;
  }

  async normalize(url: string): Promise<string> {
    // 对通用链接进行基本清理
    return this.cleanUrl(url);
  }

  async getDisplayInfo(url: string): Promise<{ title: string; thumbnail?: string }> {
    try {
      // 尝试从URL中提取域名作为标题
      const domain = new URL(url).hostname;
      return {
        title: `链接 - ${domain}`
      };
    } catch {
      return {
        title: '未知链接'
      };
    }
  }
}