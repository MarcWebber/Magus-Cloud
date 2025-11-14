// src/pages/SharePage.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
// 复用登录页的样式 (卡片风格)
import '../page-style.css';

export default function SharePage() {
    const { shareId } = useParams();
    const [info, setInfo] = useState<any>(null);
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        // 1. 获取分享详情
        fetch(`/api/share/info/${shareId}`)
            .then(async res => {
                const data = await res.json();
                if (res.ok) {
                    setInfo(data);
                } else {
                    setError(data.error);
                }
            })
            .catch(() => setError('网络连接错误'))
            .finally(() => setLoading(false));
    }, [shareId]);

    const handleDownload = () => {
        // 如果需要码且未输入，提示
        if (info.hasCode && !code) {
            alert('请输入提取码'); // 这里也可以用 message.warning
            return;
        }

        // 🔥 核心逻辑：拼接到底层下载 API
        // 用户在浏览器里访问这个链接，实际上就是触发下载
        const baseUrl = window.location.origin;
        let downloadUrl = `${baseUrl}/api/download?shareId=${shareId}`;

        // 如果有码，拼上去
        if (code) {
            downloadUrl += `&code=${code}`;
        }

        // 触发下载
        window.location.href = downloadUrl;
    };

    if (loading) return <div style={{textAlign:'center', marginTop: 100, color: '#666'}}>加载分享信息...</div>;

    if (error) {
        return (
            <div style={{textAlign:'center', marginTop: 100}}>
                <div style={{fontSize: '48px', marginBottom: '20px'}}>😕</div>
                <h3 style={{color: '#555'}}>{error}</h3>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            height: '100vh', background: '#f0f2f5'
        }}>
            {/* 复用 auth-container 样式实现卡片效果 */}
            <div className="auth-container" style={{ width: '420px', textAlign: 'center', padding: '40px' }}>

                {/* 图标区 */}
                <div style={{ marginBottom: '24px' }}>
                    {info.type === 'folder' ? (
                        <i className="fa-solid fa-folder-open" style={{ fontSize: '56px', color: '#FFC107' }}></i>
                    ) : (
                        <i className="fa-solid fa-file-lines" style={{ fontSize: '56px', color: '#3b8cff' }}></i>
                    )}
                </div>

                {/* 信息区 */}
                <h2 style={{fontSize: '18px', color: '#333', marginBottom: '8px', wordBreak: 'break-all'}}>
                    {info.fileName}
                </h2>
                <p style={{ color: '#999', fontSize: '13px', marginBottom: '32px' }}>
                    分享者: {info.username} <br/>
                    {info.expireAt ? `有效期至: ${new Date(info.expireAt).toLocaleDateString()}` : '永久有效'}
                </p>

                {/* 提取码输入区 (如果需要) */}
                {info.hasCode && (
                    <div style={{ marginBottom: '24px', textAlign: 'left' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#666', fontSize: '14px' }}>
                            请输入提取码：
                        </label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="4位提取码"
                            style={{
                                width: '100%', padding: '12px', borderRadius: '8px',
                                border: '1px solid #ddd', fontSize: '16px',
                                letterSpacing: '2px', textAlign: 'center',
                                boxSizing: 'border-box', outline: 'none'
                            }}
                        />
                    </div>
                )}

                {/* 按钮区 */}
                <button
                    onClick={handleDownload}
                    style={{
                        width: '100%', padding: '12px', background: '#3b8cff',
                        color: 'white', border: 'none', borderRadius: '8px',
                        fontSize: '16px', cursor: 'pointer', fontWeight: '600',
                        transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#2979ff'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#3b8cff'}
                >
                    <i className="fa-solid fa-download" style={{marginRight: '8px'}}></i>
                    立即下载
                </button>
            </div>
        </div>
    );
}