// ShareModal.tsx
import React, { useEffect, useState } from 'react';
import Styles from './ShareModal.module.css';

type ShareModalProps = {
    fileName: string;
    visible: boolean;
    onClose: () => void;
};

export default function ShareModal({ fileName, visible, onClose }: ShareModalProps) {
    const [link, setLink] = useState('');
    const [curlCommand, setCurlCommand] = useState('');

    useEffect(() => {
        if (visible && fileName) {
            const encoded = encodeURIComponent(fileName);
            const baseUrl = `${window.location.origin}/api/download/${encoded}`;
            setLink(baseUrl);
            setCurlCommand(`curl -O "${baseUrl}"`);
        }
    }, [visible, fileName]);

    const copyText = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            alert('已复制');
        } catch {
            alert('复制失败');
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
