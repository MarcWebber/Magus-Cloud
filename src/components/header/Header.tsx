// src/components/Header.tsx
import React, { useEffect, useState } from 'react';
import { Breadcrumb, Avatar, Dropdown, MenuProps, message } from 'antd';
import { UserOutlined, LogoutOutlined, DownOutlined, HomeOutlined } from "@ant-design/icons";
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
    currentPath: string[];
    onNavigate: (path: string[]) => void;
}

const Header: React.FC<HeaderProps> = ({ currentPath, onNavigate }) => {
    const navigate = useNavigate();

    const [username, setUsername] = useState('加载中...');
    const [avatarUrl, setAvatarUrl] = useState('');

    useEffect(() => {
        fetch('/api/user/me', { method: 'POST', credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                setUsername(data.username || '用户');
                setAvatarUrl(data.avatarUrl || '');
            }).catch(() => setUsername('访客'));
    }, []);

    const handleLogout = async () => {
        try {
            await fetch('/api/user/logout', { method: 'POST', credentials: 'include' });
            message.success('已退出登录');
        } catch (error) {
            console.error('Logout failed', error);
        } finally {
            navigate('/');
        }
    };

    const userMenuItems: MenuProps['items'] = [
        {
            key: 'logout',
            label: '退出登录',
            icon: <LogoutOutlined />,
            danger: true,
            onClick: handleLogout
        },
    ];

    const breadcrumbItems = [
        {
            title: (
                <span
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    onClick={() => onNavigate([])}
                >
                    <HomeOutlined style={{ marginRight: 4 }} /> 全部文件
                </span>
            ),
        },
        ...currentPath.map((folderName, index) => {
            const targetPath = currentPath.slice(0, index + 1);
            return {
                title: (
                    <span style={{ cursor: 'pointer' }} onClick={() => onNavigate(targetPath)}>
                        {folderName}
                    </span>
                )
            };
        })
    ];

    return (
        <header style={{
            height: '64px',
            backgroundColor: 'var(--surface-color)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            flexShrink: 0,
            boxSizing: 'border-box' // 确保 padding 不会撑大高度
        }}>
            {/* 左侧：面包屑 */}
            <div style={{ fontSize: '14px' }}>
                <Breadcrumb items={breadcrumbItems} separator=">" />
            </div>

            {/* 右侧：用户信息 */}
            {/* 这里加一个 div 确保 flex 布局环境单纯 */}
            <div style={{ height: '100%', display: 'flex', alignItems: 'center' }}>
                <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                    {/* 🔥 核心修复 🔥
                        1. padding: 增加点击热区，同时给头像留出呼吸空间
                        2. border-radius + transition: 增加 hover 时的交互感
                        3. align-items: center: 强行锁死垂直居中
                    */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        padding: '4px 8px', // 给头像周围留点空隙
                        borderRadius: '6px',
                        transition: 'background 0.2s',
                        gap: '8px'
                    }}
                        // 鼠标悬停变色，增加交互感
                         onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.025)'}
                         onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <Avatar
                            src={avatarUrl}
                            icon={<UserOutlined />}
                            size={32}
                            style={{
                                backgroundColor: 'var(--primary-color)',
                                flexShrink: 0,
                                border: '1px solid rgba(0,0,0,0.05)' // 给头像加个淡淡的边框防止与背景混淆
                            }}
                        />
                        <span style={{
                            color: '#555',
                            fontWeight: 500,
                            fontSize: '14px',
                            lineHeight: '1.5', // 恢复正常的行高，让文字垂直居中更自然
                            maxWidth: '120px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {username}
                        </span>
                        <DownOutlined style={{ fontSize: '10px', color: '#999' }} />
                    </div>
                </Dropdown>
            </div>
        </header>
    );
};

export default Header;