import { PlatformProcessor } from './base';
import { TikTokProcessor } from './tiktok';
import { YouTubeProcessor } from './youtube';
import { BilibiliProcessor } from './bilibili';
import { GenericProcessor } from './generic';

export class PlatformManager {
  private processors: PlatformProcessor[];
  
  constructor() {
    this.processors = [
      new TikTokProcessor(),
      new YouTubeProcessor(),
      new BilibiliProcessor(),
      new GenericProcessor()
    ];
  }

  getProcessorForUrl(url: string): PlatformProcessor {
    const processor = this.processors.find(p => p.isValid(url));
    return processor || this.processors[this.processors.length - 1];
  }

  getAllPlatforms() {
    return this.processors.filter(p => !(p instanceof GenericProcessor));
  }

  async processUrl(url: string): Promise<{
    platform: string;
    normalizedUrl: string;
    displayInfo: { title: string; thumbnail?: string };
    needsClientParse?: boolean;
  }> {
    const processor = this.getProcessorForUrl(url);
    const normalizedUrl = await processor.normalize(url);
    const displayInfo = await processor.getDisplayInfo(url);
    
    // 检查是否需要客户端解析
    const needsClientParse = (processor as any).needsClientParse?.(normalizedUrl) || false;
    
    return {
      platform: processor.name,
      normalizedUrl: needsClientParse ? (processor as any).getOriginalUrl(normalizedUrl) : normalizedUrl,
      displayInfo,
      needsClientParse
    };
  }
}

export const platformManager = new PlatformManager();