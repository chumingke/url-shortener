import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const runtime = 'nodejs';

// 固定基地址，避免 Vercel 解析为 /pipeline
function getBaseUrl(req: NextRequest) {
  try {
    return req.nextUrl.origin; // 绝对不会变成 /pipeline
  } catch {
    return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  }
}

// 修复后的短链解析函数
async function parseShortUrl(
  url: string,
  req: NextRequest
): Promise<{ longUrl: string; platform: string }> {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return { longUrl: url || '', platform: '未知' };
  }

  try {
    const cleanUrl = url.split(' ')[0].trim();

    const baseUrl = getBaseUrl(req);

    // 很关键：必须使用绝对地址，否则 Vercel 会变成 /pipeline
    const apiUrl = `${baseUrl}/api/shorten`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ longUrl: cleanUrl })
    });

    if (!response.ok) {
      return {
        longUrl: cleanUrl,
        platform: '解析失败'
      };
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

// Excel 解析
async function processExcelFile(buffer: ArrayBuffer): Promise<any[]> {
  try {
    console.log('开始解析 Excel 文件...');

    const workbook = XLSX.read(buffer, {
      type: 'array',
      cellDates: true,
      cellText: true,
      cellStyles: true
    });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('Excel 工作表不存在');
    }

    const worksheet = workbook.Sheets[sheetName];

    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      raw: false
    }) as any[][];

    if (jsonData.length === 0) {
      throw new Error('Excel 文件为空');
    }

    const headers = (jsonData[0] as any[]).map((header: any, index: number) => {
      if (!header) return `列${index + 1}`;
      return header.toString().trim();
    });

    const data = jsonData
      .slice(1)
      .map((row: any[]) => {
        const obj: any = {};
        headers.forEach((header, i) => {
          const v = row[i];
          if (v instanceof Date) {
            obj[header] = v.toISOString().split('T')[0];
          } else {
            obj[header] = v?.toString().trim() || '';
          }
        });

        return obj;
      })
      .filter((row) =>
        Object.values(row).some((x) => x && x.toString().trim())
      );

    return data;
  } catch (e) {
    console.error(e);
    throw new Error(`Excel 文件解析失败: ${(e as Error).message}`);
  }
}

// CSV 解析
async function processCsvFile(buffer: ArrayBuffer): Promise<any[]> {
  try {
    console.log('开始解析 CSV 文件…');

    const text = new TextDecoder('utf-8').decode(buffer);
    const lines = text.split('\n').filter((l) => l.trim());

    if (lines.length === 0) {
      throw new Error('CSV 文件为空');
    }

    const headers = lines[0].split(',').map((h) => h.replace(/"/g, '').trim());

    const data = lines
      .slice(1)
      .map((line) => {
        const values = line.split(',').map((v) => v.replace(/"/g, '').trim());
        const obj: any = {};

        headers.forEach((h, i) => {
          obj[h] = values[i] || '';
        });

        return obj;
      })
      .filter((row) =>
        Object.values(row).some((x) => x && x.toString().trim())
      );

    return data;
  } catch (e) {
    console.error(e);
    throw new Error(`CSV 文件解析失败: ${(e as Error).message}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== 开始文件上传处理 ===');

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: '未上传文件' },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();

    let data: any[] = [];

    if (file.name.endsWith('.csv')) {
      data = await processCsvFile(buffer);
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      data = await processExcelFile(buffer);
    } else {
      return NextResponse.json(
        { success: false, error: '不支持的文件格式' },
        { status: 400 }
      );
    }

    if (data.length === 0) {
      return NextResponse.json(
        { success: false, error: '文件无有效数据' },
        { status: 400 }
      );
    }

    console.log(`共 ${data.length} 行数据，开始解析 URL`);
    const processedData: any[] = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const newRow: any = { ...row };

      console.log(`正在处理第 ${i + 1}/${data.length} 行…`);

      for (const [key, value] of Object.entries(row)) {
        if (typeof value === 'string' && value.trim()) {
          const val = value.trim();

          // 宽松 URL 判断
          if (
            val.includes('http') ||
            val.includes('.com') ||
            val.includes('.cn') ||
            val.includes('v.douyin.com') ||
            val.includes('b23.tv') ||
            val.includes('youtu.be')
          ) {
            try {
              console.log(`解析 URL（${key}）: ${val}`);

              // 调用修复后的解析函数
              const result = await parseShortUrl(val, request);

              newRow[`${key}_长链`] = result.longUrl;
              newRow[`${key}_平台`] = result.platform;

              if (result.platform !== '解析失败') {
                successCount++;
              } else {
                failCount++;
              }

              // 避免压力过大（智能延时）
              const delay = data.length > 100 ? 300 : 600;
              await new Promise((res) => setTimeout(res, delay));
            } catch (err) {
              console.error(`解析失败（${key}）:`, val);
              newRow[`${key}_长链`] = val;
              newRow[`${key}_平台`] = '解析失败';
              failCount++;
            }
          }
        }
      }

      processedData.push(newRow);
    }

    console.log(`=== 文件处理完成 ===`);
    console.log(`成功解析: ${successCount}`);
    console.log(`失败解析: ${failCount}`);

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
        message: `共 ${data.length} 行，其中成功 ${successCount} 个URL，失败 ${failCount} 个`
      }
    });
  } catch (e) {
    console.error('❌ 文件处理错误:', e);
    return NextResponse.json(
      {
        success: false,
        error: '文件处理失败: ' + (e as Error).message
      },
      { status: 500 }
    );
  }
}
