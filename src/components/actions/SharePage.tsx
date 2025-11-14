// src/pages/SharePage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom'; // 引入 useSearchParams
import '../../page-style.css';

export default function SharePage() {
    const { shareId } = useParams();
    const [searchParams] = useSearchParams(); // 获取 URL 查询参数

    const [info, setInfo] = useState<any>(null);
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        // 1. 优先从 URL 参数里获取 code (实现自动填码)
        const urlCode = searchParams.get('code');
        if (urlCode) {
            setCode(urlCode);
        }

        // 2. 获取文件信息
        fetch(`/api/share/info/${shareId}`)
            .then(async res => {
                const data = await res.json();
                if (res.ok) {
                    setInfo(data);
                } else {
                    setError(data.error);
                }
            })
            .catch(() => setError('网络错误'))
            .finally(() => setLoading(false));
    }, [shareId, searchParams]);

    const handleDownload = () => {
        if (info.hasCode && !code) {
            alert('请输入提取码');
            return;
        }

        const baseUrl = window.location.origin;
        let downloadUrl = `${baseUrl}/api/download?shareId=${shareId}`;
        if (code) {
            downloadUrl += `&code=${code}`;
        }

        // 触发下载
        window.location.href = downloadUrl;
    };

    if (loading) return <div style={{textAlign:'center', marginTop: 100, color:'#666'}}>加载中...</div>;

    if (error) {
        return (
            <div style={{textAlign:'center', marginTop: 100}}>
                <h2 style={{color: '#ff4d4f'}}>😕</h2>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            height: '100vh', background: '#f0f2f5'
        }}>
            <div className="auth-container" style={{ width: '420px', textAlign: 'center', padding: '40px' }}>

                <div style={{ marginBottom: '24px' }}>
                    {info.type === 'folder' ? (
                        <i className="fa-solid fa-folder-open" style={{ fontSize: '56px', color: '#FFC107' }}></i>
                    ) : (
                        <i className="fa-solid fa-file-lines" style={{ fontSize: '56px', color: '#3b8cff' }}></i>
                    )}
                </div>

                <h2 style={{fontSize: '18px', color: '#333', marginBottom: '8px', wordBreak: 'break-all'}}>
                    {info.fileName}
                </h2>
                <p style={{ color: '#999', fontSize: '13px', marginBottom: '32px' }}>
                    分享者: {info.username} <br/>
                    {info.expireAt ? `有效期至: ${new Date(info.expireAt).toLocaleDateString()}` : '永久有效'}
                </p>

                {/* 提取码输入区 */}
                {info.hasCode && (
                    <div style={{ marginBottom: '24px', textAlign: 'left' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#666', fontSize: '14px' }}>
                            提取码：
                        </label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="请输入提取码"
                            style={{
                                width: '100%', padding: '12px', borderRadius: '8px',
                                border: '1px solid #ddd', fontSize: '16px',
                                letterSpacing: '2px', textAlign: 'center',
                                boxSizing: 'border-box', outline: 'none',
                                // 如果自动填了码，背景稍微变一下提示用户
                                backgroundColor: searchParams.get('code') ? '#f6ffed' : 'white'
                            }}
                        />
                    </div>
                )}

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