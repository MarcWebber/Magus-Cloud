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

export default function Share({ fileName, type, visible, onClose }: ShareModalProps) {
    // --- 状态 1: 配置参数 ---
    const [expireDays, setExpireDays] = useState('7'); // 默认7天

    // --- 状态 2: 生成结果 ---
    const [shareData, setShareData] = useState<{
        url: string;
        code: string;
    } | null>(null);

    // --- 状态 3: UI控制 ---
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // 每次打开弹窗重置状态
    useEffect(() => {
        if (visible) {
            setShareData(null);
            setExpireDays('7');
            setError('');
            setLoading(false);
        }
    }, [visible, fileName]);

    // 生成链接逻辑
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

            // 🔥 核心修改：这里的 URL 改为指向前端路由 /s/:shareId
            // 这样用户打开看到的是卡片页，而不是直接请求 API
            const url = `${baseUrl}/s/${shareId}`;

            setShareData({
                url,
                code: code || ''
            });
            message.success('链接创建成功');

        } catch (err) {
            console.error('生成分享链接失败', err);
            setError('生成失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    // 复制功能
    const handleCopy = async (text: string) => {
        try {
            // 1. 尝试使用现代 API (需要 HTTPS 或 localhost)
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                message.success('已复制');
                return;
            }
        } catch (err) {
            console.warn('Clipboard API failed, trying fallback...', err);
        }

        // 2. 兼容方案：创建隐藏输入框选中文本 (支持 HTTP)
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;

            // 确保输入框不可见但存在于 DOM 中
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";

            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);

            if (successful) {
                message.success('已复制');
            } else {
                message.error('复制失败，请手动复制');
            }
        } catch (err) {
            console.error('Fallback copy failed', err);
            message.error('复制失败，请手动复制');
        }
    };
    // 复制完整信息
    const handleCopyAll = () => {
        if (!shareData) return;

        // 🔥 核心修改：拼接成“百度网盘风格”的文本
        // 格式：链接: http://... 提取码: xxxx
        const text = `链接: ${shareData.url} 提取码: ${shareData.code}`;

        // 如果你想要更丰富的格式（带文件名），可以用下面这种：
        // const text = `我给你分享了「${fileName}」\n链接: ${shareData.url}\n提取码: ${shareData.code}`;

        handleCopy(text);
    };
    if (!visible) return null;

    return (
        <div className={Styles['mask']}>
            <div className={Styles['modal']}>
                <h3 className={Styles['title']}>
                    <i className="fa-solid fa-share-nodes" style={{color: '#3b8cff'}}></i>
                    分享：{fileName}
                </h3>

                {/* 阶段一：配置参数 (未生成前显示) */}
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
                            <button className={`${Styles['btn']} ${Styles['btnCancel']}`} onClick={onClose}>
                                取消
                            </button>
                            <button
                                className={`${Styles['btn']} ${Styles['btnPrimary']}`}
                                onClick={handleCreate}
                                disabled={loading}
                            >
                                {loading ? '正在创建...' : '创建链接'}
                            </button>
                        </div>
                    </div>
                )}

                {/* 阶段二：展示结果 (生成成功后显示) */}
                {shareData && (
                    <div className={Styles['resultSection']}>
                        <div className={Styles['resultCard']}>
                            {/* 链接行 */}
                            <div className={Styles['resultRow']}>
                                <label className={Styles['label']}>下载链接</label>
                                <div className={Styles['inputRow']}>
                                    <input
                                        className={Styles['input']}
                                        value={shareData.url}
                                        readOnly
                                    />
                                    <button
                                        className={Styles['copyBtn']}
                                        onClick={() => handleCopy(shareData.url)}
                                    >
                                        复制
                                    </button>
                                </div>
                            </div>

                            {/* 提取码行 */}
                            <div className={Styles['resultRow']}>
                                <label className={Styles['label']}>提取码</label>
                                <div className={Styles['inputRow']}>
                                    <input
                                        className={`${Styles['input']} ${Styles['codeBox']}`}
                                        value={shareData.code}
                                        readOnly
                                    />
                                    <button
                                        className={Styles['copyBtn']}
                                        onClick={() => handleCopy(shareData.code)}
                                    >
                                        复制
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className={Styles['actions']}>
                            <button className={`${Styles['btn']} ${Styles['btnCancel']}`} onClick={onClose}>
                                关闭
                            </button>
                            <button className={`${Styles['btn']} ${Styles['btnPrimary']}`} onClick={handleCopyAll}>
                                复制链接及提取码
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}