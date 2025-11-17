import { customAlphabet } from 'nanoid';

const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
export const generateShortCode = customAlphabet(alphabet, 6);

// 抖音链接专用清理函数
export function cleanDouyinUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  
  console.log('原始输入:', url);
  
  // 1. 提取抖音短链接部分（匹配 v.douyin.com/xxx/ 格式）
  const douyinPattern = /(https?:\/\/v\.douyin\.com\/[^\/\s]+\/)/;
  const match = url.match(douyinPattern);
  
  if (match) {
    const cleaned = match[1];
    console.log('提取的抖音链接:', cleaned);
    return cleaned;
  }
  
  // 2. 如果没有匹配到抖音短链，使用通用清理
  return cleanUserInput(url);
}

// 通用URL清理函数
export function cleanUserInput(url: string): string {
  if (!url || typeof url !== 'string') return '';
  
  let cleaned = url;
  
  // 移除常见的分享文案
  const patternsToRemove = [
    /复制此链接，打开抖音搜索，直接观看视频！.*$/,
    /打开.*抖音.*搜索.*$/,
    /直接观看视频！.*$/,
    /a@[a-zA-Z0-9.\s]+\/\s*\d{2}\/\d{2}.*$/, // 匹配 a@a.xx xx/xx 格式
    /01\/04.*$/,
    /05\/26.*$/,
  ];
  
  patternsToRemove.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  // 提取第一个URL部分（到第一个空格为止）
  cleaned = cleaned.split(' ')[0].trim();
  
  // 移除开头和结尾的多余字符
  cleaned = cleaned.replace(/^["'\s]+|["'\s]+$/g, '');
  
  // 确保以 http:// 或 https:// 开头
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = 'https://' + cleaned;
  }
  
  // 移除URL末尾的斜杠和空格
  cleaned = cleaned.replace(/[/\s]+$/, '');
  
  console.log('通用清理结果:', url, '->', cleaned);
  return cleaned;
}

// 增强的URL验证
export function isValidUrl(url: string): boolean {
  try {
    const cleaned = cleanDouyinUrl(url); // 使用抖音专用清理
    new URL(cleaned);
    return true;
  } catch {
    return false;
  }
}

export function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown';
  }
}