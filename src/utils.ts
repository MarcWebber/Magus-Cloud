// 可放在CustomNode组件内部，或提取为工具函数
export const handleDownload = async (filename: string) => {
  try {
    // 调用后端下载接口（需后端配合实现）
    const response = await fetch(`/api/download?filename=${encodeURIComponent(filename)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // 如有认证需求，添加token（例如）
        credentials: 'include' // 确保发送cookie
        
      }
    });

    if (!response.ok) {
      throw new Error(`下载失败：${response.statusText}`);
    }

    // 将响应转换为blob（二进制文件流）
    const blob = await response.blob();
    // 创建临时下载链接
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // 设置下载文件名（从响应头获取或使用原文件名）
    const contentDisposition = response.headers.get('Content-Disposition');
    const downloadName = contentDisposition 
      ? contentDisposition.split('filename=')[1] 
      : filename;
    a.download = decodeURIComponent(downloadName); // 解决中文乱码
    document.body.appendChild(a);
    a.click(); // 触发下载
    // 清理临时资源
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('下载失败：', error);
    alert(`下载失败：${(error as Error).message}`); // 提示用户
  }
};