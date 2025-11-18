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