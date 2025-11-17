import { PlatformProcessor } from './base';
import { TikTokProcessor } from './tiktok';
import { YouTubeProcessor } from './youtube';
import { BilibiliProcessor } from './bilibili';
import { GenericProcessor } from './generic';

// 平台管理器：负责选择合适的处理器
export class PlatformManager {
  private processors: PlatformProcessor[];
  
  constructor() {
    // 按顺序注册所有处理器，通用处理器放在最后
    this.processors = [
      new TikTokProcessor(),
      new YouTubeProcessor(),
      new BilibiliProcessor(),
      new GenericProcessor() // 最后作为fallback
    ];
  }

  // 根据URL选择合适的处理器
  getProcessorForUrl(url: string): PlatformProcessor {
    const processor = this.processors.find(p => p.isValid(url));
    return processor || this.processors[this.processors.length - 1]; // 返回通用处理器
  }

  // 获取所有平台（排除通用处理器）
  getAllPlatforms() {
    return this.processors.filter(p => !(p instanceof GenericProcessor));
  }

  // 处理URL：标准化 + 获取信息
  async processUrl(url: string): Promise<{
    platform: string;
    normalizedUrl: string;
    displayInfo: { title: string; thumbnail?: string };
  }> {
    const processor = this.getProcessorForUrl(url);
    const normalizedUrl = await processor.normalize(url);
    const displayInfo = await processor.getDisplayInfo(url);
    
    return {
      platform: processor.name,
      normalizedUrl,
      displayInfo
    };
  }
}

// 创建全局的平台管理器实例
export const platformManager = new PlatformManager();