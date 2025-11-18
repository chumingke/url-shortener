'use client';

import { useState } from 'react';
import { ShortUrl } from '@/lib/types';
import { Link, AlertCircle } from 'lucide-react';

export interface UrlFormProps {
  onSuccess: (url: ShortUrl) => void;
}

export function UrlForm({ onSuccess }: UrlFormProps) {
  const [longUrl, setLongUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // === 修复的抖音链接清理逻辑 ===
      let cleanUrl = longUrl.trim();
      
      // 处理抖音特有的分享格式（包含说明文字的链接）
      if (cleanUrl.includes('v.douyin.com')) {
        console.log('检测到抖音链接，原始输入:', cleanUrl);
        
        // 如果是标准短链（长度较短，没有多余文本），不需要清理
        if (cleanUrl.length < 50 && cleanUrl.match(/^https?:\/\/v\.douyin\.com\/[^\/\s]+\/?$/)) {
          console.log('标准抖音短链，无需清理');
          // 确保以斜杠结尾
          if (!cleanUrl.endsWith('/')) {
            cleanUrl += '/';
          }
        } else {
          // 包含说明文字的抖音分享链接，需要清理
          const urlMatch = cleanUrl.match(/(https?:\/\/v\.douyin\.com\/[^\/\s]+)\/?/);
          if (urlMatch) {
            cleanUrl = urlMatch[1] + '/'; // 确保有斜杠
            console.log('清理抖音链接:', { 原始: longUrl, 清理后: cleanUrl });
          }
        }
      }
      // === 清理逻辑结束 ===

      console.log('最终提交的URL:', cleanUrl);

      const response = await fetch('/api/shorten', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ longUrl: cleanUrl }), // 使用清理后的URL
      });

      const result = await response.json();

      if (result.success) {
        // 检查是否需要客户端解析
        if (result.data.needsClientParse) {
          console.log('需要客户端解析:', result.data.normalizedUrl);
          await handleClientSideParse(result.data);
        } else {
          onSuccess(result.data);
          setLongUrl('');
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 新增：客户端解析函数
  const handleClientSideParse = async (urlData: any) => {
    try {
      setLoading(true);
      console.log('开始客户端解析抖音链接:', urlData.normalizedUrl);

      // 使用代理API获取重定向信息
      const proxyResponse = await fetch(`/api/proxy?url=${encodeURIComponent(urlData.normalizedUrl)}`);
      const proxyResult = await proxyResponse.json();
      
      if (proxyResult.error) {
        throw new Error(`客户端解析失败: ${proxyResult.error}`);
      }

      console.log('代理响应:', proxyResult);

      // 处理重定向
      let finalUrl = urlData.normalizedUrl;
      if (proxyResult.status === 302 || proxyResult.status === 301) {
        const location = proxyResult.headers.location;
        if (location) {
          finalUrl = location;
          console.log('获取到重定向地址:', finalUrl);
        }
      } else if (proxyResult.url && proxyResult.url !== urlData.normalizedUrl) {
        finalUrl = proxyResult.url;
      }

      // 更新数据
      const updatedData = {
        ...urlData,
        longUrl: finalUrl,
        normalizedUrl: finalUrl,
        needsClientParse: false
      };

      onSuccess(updatedData);
      setLongUrl('');
      
    } catch (err) {
      console.error('客户端解析错误:', err);
      setError(`抖音链接解析失败: ${(err as Error).message}。请手动在浏览器中打开获取长链接。`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Link className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">解析短链接</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
            输入短链接
          </label>
          <input
            type="url"
            id="url"
            value={longUrl}
            onChange={(e) => setLongUrl(e.target.value)}
            placeholder="粘贴抖音分享链接或其它短链接"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        
        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Link size={20} />
          {loading ? '解析中...' : '解析短链接'}
        </button>
      </form>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-800">
          <strong>提示：</strong>支持直接粘贴抖音分享的全部内容，系统会自动提取纯净链接。
        </p>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 mb-2">支持平台</h3>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded">抖音</span>
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded">YouTube</span>
          <span className="px-2 py-1 bg-pink-100 text-pink-800 rounded">B站</span>
        </div>
      </div>
    </div>
  );
}