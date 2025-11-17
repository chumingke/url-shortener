import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const runtime = 'nodejs';

// 简单解析URL的函数
async function parseShortUrl(url: string): Promise<{ longUrl: string; platform: string }> {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return { longUrl: url || '', platform: '未知' };
  }

  try {
    // 清理URL - 移除多余文本
    const cleanUrl = url.split(' ')[0].trim();
    
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/shorten`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ longUrl: cleanUrl }),
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      return {
        longUrl: result.data.longUrl,
        platform: result.data.platform
      };
    } else {
      return { longUrl: cleanUrl, platform: '解析失败' };
    }
  } catch (error) {
    console.error('解析URL失败:', url, error);
    return { longUrl: url, platform: '解析失败' };
  }
}

// 处理Excel数据的函数 - 使用 xlsx
async function processExcelFile(buffer: ArrayBuffer): Promise<any[]> {
  try {
    console.log('开始解析Excel文件...');
    
    // 使用 xlsx 读取Excel
    const workbook = XLSX.read(buffer, { 
      type: 'array',
      cellDates: true,
      cellText: true,
      cellStyles: true
    });
    
    // 获取第一个工作表
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('Excel文件中没有找到工作表');
    }
    
    const worksheet = workbook.Sheets[sheetName];
    console.log(`Excel工作表: ${sheetName}`);

    // 转换为JSON数据
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: '',
      raw: false
    }) as any[][]; // 添加类型断言

    console.log(`Excel原始数据: ${jsonData.length} 行`);

    if (jsonData.length === 0) {
      throw new Error('Excel文件为空');
    }

    // 第一行为表头 - 修复类型问题
    const headers = (jsonData[0] as any[]).map((header: any, index: number) => {
      if (header === null || header === undefined || header === '') {
        return `列${index + 1}`;
      }
      return header.toString().trim();
    });

    console.log('表头:', headers);

    // 从第二行开始是数据
    const data = jsonData.slice(1).map((row: any[], rowIndex: number) => {
      const obj: any = {};
      headers.forEach((header, colIndex) => {
        const value = row[colIndex];
        if (value === null || value === undefined) {
          obj[header] = '';
        } else if (value instanceof Date) {
          obj[header] = value.toISOString().split('T')[0];
        } else {
          obj[header] = value.toString().trim();
        }
      });
      return obj;
    }).filter((row, index) => {
      const hasData = Object.values(row).some(val => val && val.toString().trim());
      return hasData;
    });

    console.log(`Excel文件解析成功，共 ${data.length} 行有效数据`);
    return data;
    
  } catch (error) {
    console.error('Excel处理错误:', error);
    throw new Error(`Excel文件解析失败: ${(error as Error).message}`);
  }
}

// 处理CSV数据的函数
async function processCsvFile(buffer: ArrayBuffer): Promise<any[]> {
  try {
    console.log('开始解析CSV文件...');
    
    const text = new TextDecoder('utf-8').decode(buffer);
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new Error('CSV文件为空');
    }

    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    console.log('CSV表头:', headers);

    const data = lines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.replace(/"/g, '').trim());
      const row: any = {};
      headers.forEach((header, colIndex) => {
        row[header] = values[colIndex] || '';
      });
      return row;
    }).filter((row, index) => {
      const hasData = Object.values(row).some(val => val && val.toString().trim());
      return hasData;
    });
    
    console.log(`CSV文件解析成功，共 ${data.length} 行有效数据`);
    return data;
    
  } catch (error) {
    console.error('CSV处理错误:', error);
    throw new Error(`CSV文件解析失败: ${(error as Error).message}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== 开始处理文件上传 ===');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: '没有上传文件' },
        { status: 400 }
      );
    }

    console.log('收到文件:', {
      文件名: file.name,
      大小: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      类型: file.type
    });

    // 文件大小限制（50MB）
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: '文件过大，请上传小于50MB的文件' },
        { status: 400 }
      );
    }

    let data: any[] = [];

    // 根据文件类型选择处理方式
    const buffer = await file.arrayBuffer();
    
    if (file.name.endsWith('.csv')) {
      data = await processCsvFile(buffer);
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      data = await processExcelFile(buffer);
    } else {
      return NextResponse.json(
        { success: false, error: '不支持的文件格式，请使用CSV或Excel文件' },
        { status: 400 }
      );
    }

    if (data.length === 0) {
      return NextResponse.json(
        { success: false, error: '文件为空或没有有效数据' },
        { status: 400 }
      );
    }

    console.log(`开始处理 ${data.length} 行数据中的URL`);

    const processedData = [];
    let successCount = 0;
    let failCount = 0;
    
    // 处理所有行数据
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const processedRow: any = { ...row };
      
      // 每处理100行输出一次进度
      if ((i + 1) % 100 === 0) {
        console.log(`📊 处理进度: ${i + 1}/${data.length} 行`);
      }
      
      let urlProcessed = false;
      let rowSuccess = true;
      
      // 解析所有包含URL的列
      for (const [key, value] of Object.entries(row)) {
        if (typeof value === 'string' && value.trim()) {
          const urlValue = value.trim();
          // 宽松的URL检测
          if (urlValue.includes('http') || 
              urlValue.includes('.com') || 
              urlValue.includes('.cn') ||
              urlValue.includes('v.douyin.com') || 
              urlValue.includes('youtu.be') || 
              urlValue.includes('b23.tv')) {
            
            try {
              console.log(`🔗 解析URL [${key}]: ${urlValue}`);
              const result = await parseShortUrl(urlValue);
              processedRow[`${key}_长链`] = result.longUrl;
              processedRow[`${key}_平台`] = result.platform;
              urlProcessed = true;
              
              if (result.platform !== '解析失败') {
                successCount++;
              } else {
                failCount++;
                rowSuccess = false;
              }
              
              // 根据处理速度调整延迟（大文件时减少延迟）
              const delay = data.length > 100 ? 500 : 1000;
              await new Promise(resolve => setTimeout(resolve, delay));
              
            } catch (error) {
              console.error(`❌ 解析URL失败 [${key}]:`, urlValue);
              processedRow[`${key}_长链`] = urlValue;
              processedRow[`${key}_平台`] = '解析失败';
              failCount++;
              rowSuccess = false;
            }
          }
        }
      }
      
      processedData.push(processedRow);
    }

    console.log(`\n=== 文件处理完成 ===`);
    console.log(`📈 统计信息:`);
    console.log(`  总行数: ${data.length}`);
    console.log(`  成功解析: ${successCount} 个URL`);
    console.log(`  解析失败: ${failCount} 个URL`);
    console.log(`  处理完成: ${processedData.length} 行`);

    return NextResponse.json({
      success: true,
      data: {
        original: data,
        processed: processedData,
        total: processedData.length,
        stats: {
          totalRows: data.length,
          successUrls: successCount,
          failedUrls: failCount
        },
        message: `成功处理所有 ${data.length} 行数据，解析了 ${successCount} 个URL`
      }
    });

  } catch (error) {
    console.error('❌ 文件处理错误:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '文件处理失败: ' + (error as Error).message 
      },
      { status: 500 }
    );
  }
}