'use client'

import { useState } from 'react';
import { Download, FileText, Check, X } from 'lucide-react';

interface BatchResultsProps {
  data: any;
}

export function BatchResults({ data }: BatchResultsProps) {
  const [exporting, setExporting] = useState(false);

  const downloadResults = () => {
    setExporting(true);
    
    try {
      const csv = convertToCSV(data.processed);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `短链接解析结果_${new Date().getTime()}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('导出失败:', error);
    } finally {
      setExporting(false);
    }
  };

  const convertToCSV = (data: any[]): string => {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => 
          `"${String(row[header] || '').replace(/"/g, '""')}"`
        ).join(',')
      )
    ];
    
    return csvRows.join('\n');
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-semibold text-gray-900">批量解析结果</h2>
        </div>
        <button
          onClick={downloadResults}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          <Download size={16} />
          {exporting ? '导出中...' : '导出结果'}
        </button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-blue-700 font-medium">处理行数</p>
            <p className="text-2xl font-bold text-blue-800">{data.total}</p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-green-700 font-medium">成功解析</p>
            <p className="text-2xl font-bold text-green-800">
              {data.processed.filter((row: any) => 
                Object.keys(row).some(key => key.includes('_长链') && row[key] && !row[key].includes('解析失败'))
              ).length}
            </p>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {Object.keys(data.processed[0] || {}).slice(0, 4).map(header => (
                  <th key={header} className="p-2 text-left border-b">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.processed.slice(0, 10).map((row: any, index: number) => (
                <tr key={index} className="border-b">
                  {Object.keys(row).slice(0, 4).map(key => (
                    <td key={key} className="p-2 max-w-xs truncate">
                      {row[key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {data.processed.length > 10 && (
            <p className="text-sm text-gray-500 mt-2 text-center">
              显示前10行，共{data.processed.length}行
            </p>
          )}
        </div>
      </div>
    </div>
  );
}