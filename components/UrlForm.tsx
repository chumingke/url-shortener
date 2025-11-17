'use client'

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
      const response = await fetch('/api/shorten', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ longUrl }),
      });

      const result = await response.json();

      if (result.success) {
        onSuccess(result.data);
        setLongUrl('');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('网络错误，请重试');
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
            placeholder="https://v.douyin.com/ABC123def/ 或 https://youtu.be/ABC123def"
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