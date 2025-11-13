import React, { useEffect, useState } from 'react';
import Styles from './Share.module.css';
import axios from 'axios';

type ShareModalProps = {
    fileName: string;
    type: 'file' | 'folder';
    visible: boolean;
    onClose: () => void;
};

export default function Share({ fileName, type, visible, onClose }: ShareModalProps) {
    // 移除curlCommand相关状态
    const [shareId, setShareId] = useState('');
    const [link, setLink] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!visible) {
            // 清空状态（移除curlCommand相关）
            setShareId('');
            setLink('');
            setError('');
            return;
        }

        if (visible && fileName) {
            generateShareLink();
        }
    }, [visible, fileName, type]);

    const generateShareLink = async () => {
        try {
            setLoading(true);
            setError('');
            
            const response = await axios.post('/api/share/create', {
                fileName,
                type
            });

            // 从响应中获取shareId
            const { shareId } = response.data;
            setShareId(shareId);

            // 构建下载链接（不再生成curl命令）
            const encodedFileName = encodeURIComponent(fileName);
            const baseUrl = window.location.origin;
            const downloadLink = `${baseUrl}/api/download?name=${encodedFileName}&type=${type}&shareId=${shareId}`;
            setLink(downloadLink);

        } catch (err) {
            console.error('生成分享链接失败', err);
            setError('生成分享链接失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    // 复制文本逻辑保持不变（仅用于复制链接）
    const copyText = async (text: string) => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }
            alert('已复制到剪贴板');
        } catch (e) {
            console.error('复制失败', e);
            alert('复制失败，请手动复制');
        }
    };

    if (!visible) return null;

    return (
        <div className={Styles['mask']}>
            <div className={Styles['modal']}>
                <h3 className={Styles['title']}>分享：{fileName}</h3>
                
                {loading && (
                    <div className={Styles['loading']}>生成分享链接中...</div>
                )}

                {error && (
                    <div className={Styles['error']}>{error}</div>
                )}

                {/* 仅保留下载链接部分 */}
                {!loading && !error && shareId && (
                    <div className={Styles['section']}>
                        <label className={Styles['label']}>下载链接</label>
                        <div className={Styles['input-row']}>
                            <input 
                                className={Styles['input']} 
                                value={link} 
                                readOnly 
                                placeholder="分享链接"
                            />
                            <button 
                                className={Styles['copy']} 
                                onClick={() => copyText(link)}
                            >
                                复制链接
                            </button>
                        </div>
                    </div>
                )}

                <div className={Styles['actions']}>
                    <button className={Styles['close-btn']} onClick={onClose}>
                        关闭
                    </button>
                </div>
            </div>
        </div>
    );
}