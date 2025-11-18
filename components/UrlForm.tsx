const handleClientSideParse = async (urlData: any) => {
  try {
    setLoading(true);
    setError('');
    
    console.log('开始客户端解析:', urlData.normalizedUrl);

    // 尝试使用代理API获取重定向
    const proxyResponse = await fetch(`/api/proxy?url=${encodeURIComponent(urlData.normalizedUrl)}`);
    
    if (!proxyResponse.ok) {
      throw new Error('代理服务暂时不可用');
    }

    const proxyResult = await proxyResponse.json();
    
    if (proxyResult.error) {
      throw new Error(proxyResult.error);
    }

    let finalUrl = urlData.normalizedUrl;
    
    // 处理重定向
    if (proxyResult.headers?.location) {
      finalUrl = proxyResult.headers.location;
    } else if (proxyResult.url && proxyResult.url !== urlData.normalizedUrl) {
      finalUrl = proxyResult.url;
    }

    console.log('解析成功，最终URL:', finalUrl);

    const updatedData = {
      ...urlData,
      longUrl: finalUrl,
      normalizedUrl: finalUrl,
      needsClientParse: false
    };

    onSuccess(updatedData);
    setLongUrl('');
    
  } catch (err) {
    console.error('客户端解析失败:', err);
    
    // 提供用户友好的错误信息和解决方案
    const errorMsg = err instanceof Error ? err.message : '未知错误';
    setError(`
      抖音链接解析失败: ${errorMsg}
      
      解决方案：
      1. 请手动在浏览器中打开该抖音链接
      2. 复制浏览器地址栏中的长链接
      3. 用长链接重新尝试解析
    `);
    
    // 即使解析失败，也显示原始结果
    const fallbackData = {
      ...urlData,
      needsClientParse: false
    };
    onSuccess(fallbackData);
  } finally {
    setLoading(false);
  }
};