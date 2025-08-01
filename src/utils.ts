export const handleDownload = (filename: string) => {
  try {
    // 构建带认证的下载链接（浏览器自动携带cookie）
    const downloadUrl = `/api/download?filename=${encodeURIComponent(filename)}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename; // 指定下载文件名（可选，增强体验）
    a.target = '_blank'; // 新窗口下载，避免离开当前页面
    a.rel = 'noopener noreferrer'; // 安全加固
    a.style.visibility = 'hidden'; // 隐藏a标签
    document.body.appendChild(a);
    a.click(); // 触发下载
    document.body.removeChild(a); // 清理元素
  } catch (error) {
    console.error('下载失败：', error);
    alert(`下载失败：${(error as Error).message}`);
  }
};