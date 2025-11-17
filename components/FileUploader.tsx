'use client'

import { useState } from 'react';
import { Upload, FileText, Download, AlertCircle } from 'lucide-react';

interface FileUploaderProps {
  onFileProcessed: (data: any) => void;
}

export function FileUploader({ onFileProcessed }: FileUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      console.log('开始上传文件:', file.name);

      const response = await fetch('/api/process-file', {
        method: 'POST',
        body: formData,
      });

      console.log('响应状态:', response.status);
      const result = await response.json();
      console.log('响应结果:', result);

      if (result.success) {
        onFileProcessed(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('上传错误:', err);
      setError('文件处理失败: ' + (err as Error).message);
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        '短链接': 'https://v.douyin.com/ABC123def/',
        '副片1': 'https://youtu.be/abc123',
        '副片2': 'https://b23.tv/xyz789',
        '备注': '示例数据'
      },
      {
        '短链接': 'https://v.douyin.com/DEF456ghi/',
        '副片1': 'https://youtu.be/def456',
        '副片2': '',
        '备注': '支持空单元格'
      }
    ];

    const csv = convertToCSV(templateData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', '短链接批量解析模板.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const convertToCSV = (data: any[]): string => {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.map(header => `"${header}"`).join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          const escapedValue = String(value).replace(/"/g, '""');
          return `"${escapedValue}"`;
        }).join(',')
      )
    ];
    
    return '\uFEFF' + csvRows.join('\n');
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Upload className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">批量文件解析</h2>
      </div>

      <div className="space-y-4">
        <div className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${loading 
            ? 'border-gray-300 bg-gray-50' 
            : 'border-gray-300 bg-gray-50 hover:border-blue-500 hover:bg-blue-50 cursor-pointer'
          }
        `}>
          <input
            type="file"
            id="file-upload"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="hidden"
            disabled={loading}
          />
          <label 
            htmlFor="file-upload" 
            className={`cursor-pointer block ${loading ? 'pointer-events-none' : ''}`}
          >
            <FileText className={`w-16 h-16 mx-auto mb-4 ${loading ? 'text-gray-400' : 'text-blue-400'}`} />
            <p className={`text-lg font-medium mb-2 ${loading ? 'text-gray-600' : 'text-gray-700'}`}>
              {loading ? '文件处理中...' : '点击上传文件'}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              支持 Excel (.xlsx, .xls) 和 CSV 格式
            </p>
            {loading && (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
          </label>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-blue-800 mb-2">使用说明：</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 第一行应为表头（列名）</li>
            <li>• 系统会自动识别包含URL的列进行解析</li>
            <li>• 解析结果会新增"_长链"和"_平台"列</li>
            <li>• 建议先下载模板查看格式要求</li>
          </ul>
        </div>

        <div className="text-center border-t pt-4">
          <button
            onClick={downloadTemplate}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 text-blue-600 hover:text-blue-700 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            下载模板文件
          </button>
          <p className="text-xs text-gray-500 mt-3">
            下载模板文件查看支持的格式和示例数据
          </p>
        </div>
      </div>
    </div>
  );
}