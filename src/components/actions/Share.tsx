// import React, { useEffect, useState } from 'react';
// import Styles from './Share.module.css';
// import axios from 'axios';
//
// type ShareModalProps = {
//     fileName: string;
//     type: 'file' | 'folder';
//     visible: boolean;
//     onClose: () => void;
// };
//
// export default function Share({ fileName, type, visible, onClose }: ShareModalProps) {
//     // 移除curlCommand相关状态
//     const [shareId, setShareId] = useState('');
//     const [link, setLink] = useState('');
//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState('');
//
//     useEffect(() => {
//         if (!visible) {
//             // 清空状态（移除curlCommand相关）
//             setShareId('');
//             setLink('');
//             setError('');
//             return;
//         }
//
//         if (visible && fileName) {
//             generateShareLink();
//         }
//     }, [visible, fileName, type]);
//
//     const generateShareLink = async () => {
//         try {
//             setLoading(true);
//             setError('');
//
//             const response = await axios.post('/api/share/create', {
//                 fileName,
//                 type
//             });
//
//             // 从响应中获取shareId
//             const { shareId } = response.data;
//             setShareId(shareId);
//
//             // 构建下载链接（不再生成curl命令）
//             const encodedFileName = encodeURIComponent(fileName);
//             const baseUrl = window.location.origin;
//             const downloadLink = `${baseUrl}/api/download?name=${encodedFileName}&type=${type}&shareId=${shareId}`;
//             setLink(downloadLink);
//
//         } catch (err) {
//             console.error('生成分享链接失败', err);
//             setError('生成分享链接失败，请重试');
//         } finally {
//             setLoading(false);
//         }
//     };
//
//     // 复制文本逻辑保持不变（仅用于复制链接）
//     const copyText = async (text: string) => {
//         try {
//             if (navigator.clipboard && window.isSecureContext) {
//                 await navigator.clipboard.writeText(text);
//             } else {
//                 const textarea = document.createElement('textarea');
//                 textarea.value = text;
//                 textarea.style.position = 'fixed';
//                 textarea.style.opacity = '0';
//                 document.body.appendChild(textarea);
//                 textarea.focus();
//                 textarea.select();
//                 document.execCommand('copy');
//                 document.body.removeChild(textarea);
//             }
//             alert('已复制到剪贴板');
//         } catch (e) {
//             console.error('复制失败', e);
//             alert('复制失败，请手动复制');
//         }
//     };
//
//     if (!visible) return null;
//
//     return (
//         <div className={Styles['mask']}>
//             <div className={Styles['modal']}>
//                 <h3 className={Styles['title']}>分享：{fileName}</h3>
//
//                 {loading && (
//                     <div className={Styles['loading']}>生成分享链接中...</div>
//                 )}
//
//                 {error && (
//                     <div className={Styles['error']}>{error}</div>
//                 )}
//
//                 {/* 仅保留下载链接部分 */}
//                 {!loading && !error && shareId && (
//                     <div className={Styles['section']}>
//                         <label className={Styles['label']}>下载链接</label>
//                         <div className={Styles['input-row']}>
//                             <input
//                                 className={Styles['input']}
//                                 value={link}
//                                 readOnly
//                                 placeholder="分享链接"
//                             />
//                             <button
//                                 className={Styles['copy']}
//                                 onClick={() => copyText(link)}
//                             >
//                                 复制链接
//                             </button>
//                         </div>
//                     </div>
//                 )}
//
//                 <div className={Styles['actions']}>
//                     <button className={Styles['close-btn']} onClick={onClose}>
//                         关闭
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// }
//
// src/components/actions/Share.tsx
// src/components/actions/Share.tsx
// src/components/actions/Share.tsx
import React, { useEffect, useState } from 'react';
import Styles from './Share.module.css';
import axios from 'axios';
import { message } from 'antd';

type ShareModalProps = {
    fileName: string;
    type: 'file' | 'folder';
    visible: boolean;
    onClose: () => void;
};

// 内部复制按钮组件 (保持不变)
const CopyBtn = ({ text, className, label }: { text: string, className: string, label: string }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = async () => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            message.success('复制成功');
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            message.error('复制失败，请手动复制');
        }
    };

    return (
        <button
            className={className}
            onClick={handleCopy}
            style={isCopied ? { backgroundColor: '#f6ffed', borderColor: '#b7eb8f', color: '#52c41a', transition: 'all 0.2s' } : {}}
        >
            {isCopied ? <><i className="fa-solid fa-check" style={{marginRight: '4px'}}></i> 已复制</> : label}
        </button>
    );
};

export default function Share({ fileName, type, visible, onClose }: ShareModalProps) {
    const [expireDays, setExpireDays] = useState('7');
    const [shareData, setShareData] = useState<{ url: string; code: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (visible) {
            setShareData(null);
            setExpireDays('7');
            setError('');
            setLoading(false);
        }
    }, [visible, fileName]);

    const handleCreate = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await axios.post('/api/share/create', {
                fileName,
                type,
                expireDays: parseInt(expireDays),
                hasCode: true
            });

            const { shareId, code } = response.data;
            const baseUrl = window.location.origin;

            // 🔥 修改点 1：这里只存“干净”的链接，用于在界面上展示
            // 界面显示：http://.../s/s_0b1b91
            const url = `${baseUrl}/s/${shareId}`;

            setShareData({ url, code: code || '' });
            message.success('链接创建成功');
        } catch (err) {
            setError('生成失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    // 🔥 修改点 2：计算智能链接 (带参数)
    // 复制内容：http://.../s/s_0b1b91?code=i21l
    const getSmartUrl = () => {
        if (!shareData) return '';
        if (shareData.code) {
            return `${shareData.url}?code=${shareData.code}`;
        }
        return shareData.url;
    };

    if (!visible) return null;

    return (
        <div className={Styles['mask']}>
            <div className={Styles['modal']}>
                <h3 className={Styles['title']}>
                    <i className="fa-solid fa-share-nodes" style={{color: '#3b8cff'}}></i>
                    分享：{fileName}
                </h3>

                {!shareData && (
                    <div className={Styles['configSection']}>
                        <div className={Styles['section']}>
                            <label className={Styles['label']}>有效期</label>
                            <div className={Styles['configRow']}>
                                <select
                                    className={Styles['select']}
                                    value={expireDays}
                                    onChange={(e) => setExpireDays(e.target.value)}
                                >
                                    <option value="1">1 天</option>
                                    <option value="7">7 天</option>
                                    <option value="30">30 天</option>
                                    <option value="0">永久有效</option>
                                </select>
                            </div>
                        </div>
                        {error && <div className={Styles['error']}>{error}</div>}
                        <div className={Styles['actions']}>
                            <button className={`${Styles['btn']} ${Styles['btnCancel']}`} onClick={onClose}>取消</button>
                            <button className={`${Styles['btn']} ${Styles['btnPrimary']}`} onClick={handleCreate} disabled={loading}>
                                {loading ? '创建中...' : '创建链接'}
                            </button>
                        </div>
                    </div>
                )}

                {shareData && (
                    <div className={Styles['resultSection']}>
                        <div className={Styles['resultCard']}>
                            <div className={Styles['resultRow']}>
                                <label className={Styles['label']}>下载链接</label>
                                <div className={Styles['inputRow']}>
                                    {/* 界面展示的是 shareData.url (干净链接) */}
                                    <input className={Styles['input']} value={shareData.url} readOnly />
                                    <CopyBtn text={shareData.url} className={Styles['copyBtn']} label="复制" />
                                </div>
                            </div>

                            <div className={Styles['resultRow']}>
                                <label className={Styles['label']}>提取码</label>
                                <div className={Styles['inputRow']}>
                                    <input className={`${Styles['input']} ${Styles['codeBox']}`} value={shareData.code} readOnly />
                                    <CopyBtn text={shareData.code} className={Styles['copyBtn']} label="复制" />
                                </div>
                            </div>
                        </div>

                        <div className={Styles['actions']}>
                            <button className={`${Styles['btn']} ${Styles['btnCancel']}`} onClick={onClose}>关闭</button>

                            {/* 🔥 核心修改：底部按钮复制的是 getSmartUrl() (智能链接) */}
                            <CopyBtn
                                text={getSmartUrl()}
                                className={`${Styles['btn']} ${Styles['btnPrimary']}`}
                                label="复制链接及提取码"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}