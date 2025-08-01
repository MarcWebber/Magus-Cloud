// ShareModal.tsx
import React, {useEffect, useState} from 'react';
import Styles from './ShareModal.module.css';

type ShareModalProps = {
    fileName: string;
    visible: boolean;
    onClose: () => void;
};

export default function ShareModal({fileName, visible, onClose}: ShareModalProps) {
    const [link, setLink] = useState('');
    const [curlCommand, setCurlCommand] = useState('');

    useEffect(() => {
        if (visible && fileName) {
            const encoded = encodeURIComponent(fileName);
            const baseUrl = `${window.location.origin}/api/download/${encoded}`;
            fetch('/api/files', {
                credentials: 'include' // 确保发送cookie
            }).then(r => {

            }).then(() => {

            })
            setLink(baseUrl);
            setCurlCommand(`curl -O "${baseUrl}"`);
        }
    }, [visible, fileName]);

    const copyText = async (text: string) => {
        try {
            // 现代浏览器 + HTTPS 下优先使用
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                // 回退方式：创建隐藏 textarea 实现复制
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed'; // 避免页面抖动
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();

                const successful = document.execCommand('copy');
                document.body.removeChild(textarea);

                if (!successful) throw new Error('execCommand 失败');
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
                <h3 className={Styles['title']}>分享文件：{fileName}</h3>
                <div className={Styles['section']}>
                    <label className={Styles['label']}>下载链接</label>
                    <div className={Styles['input-row']}>
                        <input className={Styles['input']} value={link} readOnly/>
                        <button className={Styles['copy']} onClick={() => copyText(link)}>复制链接</button>
                    </div>
                </div>

                <div className={Styles['section']}>
                    <label className={Styles['label']}>命令行下载</label>
                    <div className={Styles['input-row']}>
                        <input className={Styles['input']} value={curlCommand} readOnly/>
                        <button className={Styles['copy']} onClick={() => copyText(curlCommand)}>复制命令</button>
                    </div>
                </div>
                <div className={Styles['actions']}>
                    <button className={Styles['copy']} onClick={onClose}>关闭</button>
                </div>
            </div>
        </div>
    );
}
