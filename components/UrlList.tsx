'use client'

import { useState } from 'react';
import { ShortUrl } from '@/lib/types';
import { Copy, Check, ExternalLink, Calendar, MousePointer } from 'lucide-react';

// 确保有 export 关键字
export interface UrlListProps {
  urls: ShortUrl[];
}

// 确保有 export 关键字
export function UrlList({ urls }: UrlListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  if (urls.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="text-gray-400 mb-4">
          <ExternalLink className="w-12 h-12 mx-auto" />
        </div>
        <p className="text-gray-500">暂无解析的链接</p>
        <p className="text-sm text-gray-400 mt-1">在上方输入短链接开始解析</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">已解析的链接</h2>
      <div className="space-y-4">
        {urls.map((url) => (
          <div key={url.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    {url.platform}
                  </span>
                  <span className="text-sm text-gray-500 truncate">{url.domain}</span>
                </div>
                <h3 className="font-medium text-gray-900 truncate">{url.title}</h3>
                <div className="space-y-2 mt-2">
                  <p className="text-sm text-gray-600">
                    <strong>短链接:</strong> 
                    <span className="ml-2 break-all">{url.shortUrl}</span>
                  </p>
                  <p className="text-sm text-green-600">
                    <strong>解析的长链接:</strong> 
                    <span className="ml-2 break-all">{url.longUrl}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(url.createdAt)}
                </div>
                <div className="flex items-center gap-1">
                  <MousePointer className="w-4 h-4" />
                  {url.clickCount} 点击
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(url.longUrl, url.id)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {copiedId === url.id ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}