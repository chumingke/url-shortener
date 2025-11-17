import { Redis } from '@upstash/redis';

// 创建 Redis 客户端
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 使用前缀来隔离不同项目的数据
const REDIS_PREFIX = process.env.REDIS_PREFIX || 'dev_url_shortener:';

// Redis 键名管理（所有键都带前缀）
export const RedisKeys = {
  // 根据短码获取URL数据
  urlByCode: (code: string) => `${REDIS_PREFIX}url:code:${code}`,
  
  // 根据长链接获取URL数据（用于去重）
  urlByLongUrl: (longUrl: string) => `${REDIS_PREFIX}url:long:${longUrl}`,
  
  // 短链接的统计信息
  urlStats: (code: string) => `${REDIS_PREFIX}stats:${code}`,
  
  // 所有URL的集合
  allUrls: `${REDIS_PREFIX}urls:all`,
  
  // 平台统计
  platformStats: `${REDIS_PREFIX}stats:platforms`,
  
  // 点击统计
  urlClicks: `${REDIS_PREFIX}urls:clicks`
} as const;

console.log('Redis 配置加载完成，使用前缀:', REDIS_PREFIX);