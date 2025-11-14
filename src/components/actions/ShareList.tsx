// src/components/share/ShareList.tsx
import React from 'react';
// 🔥 偷个懒：直接复用 FileTree 的 CSS，这样风格和主列表完全一致
import Styles from '../file_tree/FileTree.module.css';
import { message } from 'antd';

// 定义分享项的数据结构 (对应后端返回的数据)
export type ShareItem = {
    shareId: string;
    fileName: string;
    type: 'file' | 'folder';
    code: string;          // 提取码
    clickCount: number;    // 浏览/查看次数
    downloadCount: number; // 下载次数
    expireAt: number | null; // 过期时间戳 (null代表永久)
    createdAt: number;
};

interface ShareListProps {
    items: ShareItem[];
    onCancelShare: (shareId: string) => void;
}

export default function ShareList({ items, onCancelShare }: ShareListProps) {

    // 格式化时间戳
    const formatDate = (timestamp: number | null) => {
        if (!timestamp) return '永久有效';
        const date = new Date(timestamp);
        // 检查是否已过期
        if (date.getTime() < Date.now()) {
            return <span style={{color: '#ff4d4f'}}>已过期</span>;
        }
        return date.toLocaleString(); // 转为本地时间字符串
    };

    // 复制链接逻辑
    const handleCopyLink = (item: ShareItem) => {
        const baseUrl = window.location.origin;
        const url = item.code
            ? `${baseUrl}/api/download?shareId=${item.shareId}&code=${item.code}`
            : `${baseUrl}/api/download?shareId=${item.shareId}`;
        const text = `链接: ${url} 提取码: ${item.code || '无'}`;

        // 1. 尝试现代 API
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text)
                .then(() => message.success('链接已复制'))
                .catch(() => doFallbackCopy(text));
        } else {
            // 2. 直接走兼容方案
            doFallbackCopy(text);
        }
    };

    const doFallbackCopy = (text: string) => {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            if (successful) {
                message.success('链接已复制');
            } else {
                message.error('复制失败');
            }
        } catch (err) {
            message.error('复制失败');
        }
    }

    // --- 空状态 ---
    if (!items || items.length === 0) {
        return (
            <div className={Styles.container}>
                <div className={Styles.header}>
                    <span className={Styles.colName}>分享文件</span>
                    <span className={Styles.colSize}>提取码</span>
                    <span className={Styles.colDate}>过期时间</span>
                    <span className={Styles.colActions}>操作</span>
                </div>
                <div className={Styles.emptyState}>
                    <i className="fa-solid fa-share-nodes" style={{fontSize: '48px', marginBottom: '16px', color: '#eee'}}></i>
                    <p>暂无分享记录</p>
                </div>
            </div>
        );
    }

    // --- 列表状态 ---
    return (
        <div className={Styles.container}>
            {/* 表头 */}
            <div className={Styles.header}>
                <span className={Styles.colName}>分享文件</span>
                <span className={Styles.colSize}>提取码</span>
                <span className={Styles.colDate}>过期时间</span>
                <span className={Styles.colActions}>操作</span>
            </div>

            {/* 列表内容 */}
            {items.map((item) => (
                <div key={item.shareId} className={Styles.row}>

                    {/* 1. 文件名列 */}
                    <div className={Styles.colName}>
                        {/* 图标 */}
                        <i className={`fa-solid ${item.type === 'folder' ? 'fa-folder' : 'fa-file-lines'} ${Styles.icon}`}
                           style={{ color: item.type === 'folder' ? '#FFC107' : '#3b8cff' }}>
                        </i>

                        <div style={{display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
                            <span className={Styles.fileNameText} title={item.fileName}>
                                {item.fileName}
                            </span>
                            {/* 在文件名下方显示统计数据 */}
                            <span style={{fontSize: '12px', color: '#999', marginTop: '2px'}}>
                                下载: {item.downloadCount || 0} 次
                            </span>
                        </div>
                    </div>

                    {/* 2. 提取码列 (复用 colSize 样式) */}
                    <div className={Styles.colSize} style={{fontFamily: 'monospace', color: '#333'}}>
                        {item.code || <span style={{color:'#ccc'}}>公开</span>}
                    </div>

                    {/* 3. 过期时间列 (复用 colDate 样式) */}
                    <div className={Styles.colDate}>
                        {formatDate(item.expireAt)}
                    </div>

                    {/* 4. 操作列 */}
                    <div className={Styles.colActions} style={{ opacity: 1 }}> {/* 让按钮常驻显示 */}
                        <button
                            className={Styles.actionBtn}
                            title="复制链接"
                            onClick={() => handleCopyLink(item)}
                        >
                            <i className="fa-regular fa-copy"></i>
                        </button>
                        <button
                            className={Styles.actionBtn}
                            title="取消分享"
                            onClick={() => onCancelShare(item.shareId)}
                            style={{color: '#ff4d4f', borderColor: 'transparent'}}
                        >
                            <i className="fa-solid fa-ban"></i>
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}