// export const handleDownload = (filename: string) => {
//   try {
//     // 构建带认证的下载链接（浏览器自动携带cookie）
//     const downloadUrl = `/api/download?filename=${encodeURIComponent(filename)}`;
//     const a = document.createElement('a');
//     a.href = downloadUrl;
//     a.download = filename; // 指定下载文件名（可选，增强体验）
//     a.target = '_blank'; // 新窗口下载，避免离开当前页面
//     a.rel = 'noopener noreferrer'; // 安全加固
//     a.style.visibility = 'hidden'; // 隐藏a标签
//     document.body.appendChild(a);
//     a.click(); // 触发下载
//     document.body.removeChild(a); // 清理元素
//   } catch (error) {
//     console.error('下载失败：', error);
//     alert(`下载失败：${(error as Error).message}`);
//   }
// };

// 新增资源类型枚举，区分文件/文件夹
type ResourceType = 'file' | 'folder';

export const handleDownload = (name: string, type: ResourceType = 'file') => {
  try {
    // 传递 type 参数，让后端识别资源类型
    const downloadUrl = `/api/download?name=${encodeURIComponent(name)}&type=${type}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    // 文件夹下载时，指定 zip 后缀（配合后端打包）
    a.download = type === 'folder' ? `${name}.zip` : name;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.style.visibility = 'hidden';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (error) {
    console.error('下载失败：', error);
    alert(`下载失败：${(error as Error).message}`);
  }
};

