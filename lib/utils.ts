import { customAlphabet } from "nanoid";

const alphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
export const generateShortCode = customAlphabet(alphabet, 6);

// ===============
// 抖音长链最终清洗
// ===============
export function cleanFinalDouyinUrl(url: string): string {
  try {
    const u = new URL(url);

    // 新版抖音视频长链： https://www.douyin.com/video/{id}
    if (u.hostname === "www.douyin.com" && u.pathname.startsWith("/video/")) {
      return `https://www.douyin.com${u.pathname}`;
    }

    // 旧版: https://www.iesdouyin.com/share/video/{id}/?from=xx
    if (
      u.hostname.includes("iesdouyin.com") &&
      u.pathname.includes("/share/video/")
    ) {
      const parts = u.pathname.split("/");
      const videoId = parts.find((p) => /^\d+$/.test(p)); // 找数字ID

      if (videoId) {
        return `https://www.douyin.com/video/${videoId}`;
      }
    }

    return url;
  } catch {
    return url;
  }
}

// ===============
// 抖音短链解析 v.douyin.com/xxxx
// ===============
export async function expandDouyinShortUrl(shortUrl: string): Promise<string> {
  try {
    const res = await fetch(shortUrl, {
      method: "GET",
      redirect: "follow",
    });

    return res.url; // 最终跳转后的 URL
  } catch (e) {
    console.error("抖音短链解析失败:", e);
    return shortUrl;
  }
}

// 平台判断
export function detectPlatform(url: string): string {
  if (url.includes("douyin.com")) return "douyin";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("bilibili.com")) return "bilibili";
  return "other";
}

// 标题
export function generateTitle(url: string): string {
  if (url.includes("douyin.com")) return "抖音视频";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "YouTube视频";
  if (url.includes("bilibili.com")) return "B站视频";
  return "未知链接";
}

// 安全获取 domain
export function getDomainFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return "unknown";
  }
}
