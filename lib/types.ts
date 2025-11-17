// 这个文件定义了数据的"形状"，让TypeScript知道我们的数据长什么样

// 短链接的数据结构
export interface ShortUrl {
  id: string;           // 唯一标识
  longUrl: string;      // 原始长链接
  shortCode: string;    // 短码（如：abc123）
  shortUrl: string;     // 完整短链接（如：http://xxx.com/abc123）
  createdAt: string;    // 创建时间
  clickCount: number;   // 点击次数
  title?: string;       // 链接标题（可选）
  platform: string;     // 平台名称（抖音、YouTube等）
  originalUrl: string;  // 用户输入的原始链接
  normalizedUrl: string; // 标准化后的链接
  domain: string;       // 域名
}

// API 响应的数据结构
export interface ApiResponse<T = any> {
  success: boolean;     // 是否成功
  data?: T;            // 成功时的数据
  error?: string;      // 错误时的消息
}

// 平台信息
export interface PlatformInfo {
  name: string;        // 平台名称
  domain: string;      // 平台域名
  icon: string;        // 平台图标
  color: string;       // 平台颜色
}