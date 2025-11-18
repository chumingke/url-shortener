import { customAlphabet } from 'nanoid';

const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
export const generateShortCode = customAlphabet(alphabet, 6);

// =============== 抖音长链规范化（关键修复） ===============

// 从超长抖音长链中提取 videoId
export function normalizeDouyinLongUrl(url: string): string {
  try {
    const u = new URL(url);

    // 目标 URL 格式：
    // https://www.iesdouyin.com/share/video/1234567890/
    const match = u.pathname.match(/video\/(\d+)/);

    if (match && match[1]) {
      const videoId = match[1];
      return `https://www.iesdouyin.com/share/video/${videoId}/`;
    }
  } catch {}

  // 无法解析则返回原值
  return url;
}

// =============== 通用 URL 清理（保留你的逻辑） ===============
export function cleanUserInput(url: string): string {
  if (!url || typeof url !== 'string') return '';

  let cleaned = url.trim().split(' ')[0].replace(/^["']+|["']+$/g, '');

  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = 'https://' + cleaned;
  }

  return cleaned.replace(/\/+$/, '');
}

// =============== 平台识别 ===============
export function detectPlatform(url: string): string {
  if (url.includes('douyin.com')) return 'douyin';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('bilibili.com')) return 'bilibili';
  return 'other';
}

// =============== 长链规范化入口 ===============
export function normalizeLongUrl(url: string, platform: string): string {
  if (platform === 'douyin') return normalizeDouyinLongUrl(url);
  return url;
}

// =============== 域名提取（保留你的逻辑） ===============
export function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown';
  }
}
