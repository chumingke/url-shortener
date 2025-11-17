'use client'

import { useState } from 'react';
import { ShortUrl } from '@/lib/types';
import { UrlForm } from '@/components/UrlForm';
import { UrlList } from '@/components/UrlList';
import { FileUploader } from '@/components/FileUploader';
import { BatchResults } from '@/components/BatchResults';

export default function Home() {
  const [urls, setUrls] = useState<ShortUrl[]>([]);
  const [batchData, setBatchData] = useState<any>(null);

  const addNewUrl = (newUrl: ShortUrl) => {
    setUrls(prev => [newUrl, ...prev]);
  };

  const handleFileProcessed = (data: any) => {
    setBatchData(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            短链接解析器
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            支持单条解析和批量文件解析抖音、YouTube、B站等平台的短链接
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：单条解析 */}
          <div className="space-y-8">
            <UrlForm onSuccess={addNewUrl} />
            <UrlList urls={urls} />
          </div>
          
          {/* 右侧：批量解析 */}
          <div className="space-y-8">
            <FileUploader onFileProcessed={handleFileProcessed} />
            {batchData && <BatchResults data={batchData} />}
          </div>
        </div>
      </div>
    </div>
  );
}