// src/components/share/ShareList.tsx
import React, { useState } from 'react';
import Styles from '../file_tree/FileTree.module.css';
import { message } from 'antd';

export type ShareItem = {
    shareId: string;
    fileName: string;
    type: 'file' | 'folder';
    code: string;
    clickCount: number;
    downloadCount: number;
    expireAt: number | null;
    createdAt: number;
};

interface ShareListProps {
    items: ShareItem[];
    onCancelShare: (shareId: string) => void;
}

const CopyButton = ({ onCopy }: { onCopy: () => void }) => {
    const [isCopied, setIsCopied] = useState(false);
    const handleClick = () => {
        onCopy();
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };
    return (
        <button
            className={Styles.actionBtn}
            title={isCopied ? "复制成功" : "复制链接"}
            onClick={handleClick}
            style={isCopied ? { borderColor: '#52c41a', backgroundColor: '#f6ffed' } : {}}
        >
            {isCopied ? <i className="fa-solid fa-check" style={{ color: '#52c41a' }}></i> : <i className="fa-regular fa-copy"></i>}
        </button>
    );
};

export default function ShareList({ items, onCancelShare }: ShareListProps) {

    const formatDate = (timestamp: number | null) => {
        if (!timestamp) return '永久有效';
        const date = new Date(timestamp);
        if (date.getTime() < Date.now()) return <span style={{color: '#ff4d4f'}}>已过期</span>;
        return date.toLocaleString();
    };

    const handleCopyLink = (item: ShareItem) => {
        const baseUrl = window.location.origin;

        // 1. 构造基础干净链接
        let url = `${baseUrl}/s/${item.shareId}`;

        // 2. 🔥 核心修改：直接拼参数，不加额外中文描述
        // 结果：http://domain/s/xyz?code=123
        if (item.code) {
            url += `?code=${item.code}`;
        }

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(url)
                .then(() => message.success('链接已复制'))
                .catch(() => doFallbackCopy(url));
        } else {
            doFallbackCopy(url);
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
            if (successful) message.success('链接已复制');
            else message.error('复制失败');
        } catch (err) {
            message.error('复制失败');
        }
    }

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

    return (
        <div className={Styles.container}>
            <div className={Styles.header}>
                <span className={Styles.colName}>分享文件</span>
                <span className={Styles.colSize}>提取码</span>
                <span className={Styles.colDate}>过期时间</span>
                <span className={Styles.colActions}>操作</span>
            </div>

            {items.map((item) => (
                <div key={item.shareId} className={Styles.row}>
                    <div className={Styles.colName}>
                        <i className={`fa-solid ${item.type === 'folder' ? 'fa-folder' : 'fa-file-lines'} ${Styles.icon}`}
                           style={{ color: item.type === 'folder' ? '#FFC107' : '#3b8cff' }}>
                        </i>
                        <div style={{display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
                            <span className={Styles.fileNameText} title={item.fileName}>{item.fileName}</span>
                            <span style={{fontSize: '12px', color: '#999', marginTop: '2px'}}>
                                下载: {item.downloadCount || 0} 次
                            </span>
                        </div>
                    </div>
                    <div className={Styles.colSize} style={{fontFamily: 'monospace', color: '#333'}}>
                        {item.code || <span style={{color:'#ccc'}}>公开</span>}
                    </div>
                    <div className={Styles.colDate}>{formatDate(item.expireAt)}</div>
                    <div className={Styles.colActions} style={{ opacity: 1 }}>
                        <CopyButton onCopy={() => handleCopyLink(item)} />
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