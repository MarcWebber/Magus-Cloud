// src/components/Header.tsx
import React, { useEffect, useState } from 'react';
import { Breadcrumb, Avatar, Dropdown, MenuProps, message } from 'antd';
import { UserOutlined, LogoutOutlined, DownOutlined, HomeOutlined, FolderOpenOutlined } from "@ant-design/icons";
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

    // 动态生成面包屑项目
    const generateBreadcrumbItems = () => {
        // 1. 始终存在的“根节点”
        const rootItem = {
            title: (
                <span
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    onClick={() => onNavigate([])}
                >
                    <HomeOutlined style={{ marginRight: 4 }} /> 全部文件
                </span>
            ),
        };

        // 如果路径很短（比如只有3层或更少），直接全部显示
        // 这里的 4 是阈值，意味着除了根目录外，最多显示 4 个层级不折叠
        if (currentPath.length <= 4) {
            const pathItems = currentPath.map((folderName, index) => ({
                title: (
                    <span
                        style={{ cursor: 'pointer' }}
                        onClick={() => onNavigate(currentPath.slice(0, index + 1))}
                    >
                        {folderName}
                    </span>
                )
            }));
            return [rootItem, ...pathItems];
        }

        // === 路径过长，开始折叠 ===
        // 策略：[根] > [第1个] > [...] > [倒数第2个] > [倒数第1个]

        // A. 第一个文件夹
        const firstItem = {
            title: (
                <span
                    style={{ cursor: 'pointer' }}
                    onClick={() => onNavigate(currentPath.slice(0, 1))}
                >
                    {currentPath[0]}
                </span>
            )
        };

        // B. 中间被隐藏的部分 (生成下拉菜单)
        const hiddenCount = currentPath.length - 3; // 总数 - (第一个 + 最后两个)
        const hiddenItems = currentPath.slice(1, currentPath.length - 2); // 取出中间段

        const ellipsisMenu: MenuProps['items'] = hiddenItems.map((name, index) => {
            // 注意：hiddenItems 的 index 是从 0 开始的，
            // 但它在原数组 currentPath 里的实际位置是 1 + index
            const realIndex = 1 + index;
            return {
                key: realIndex,
                label: name,
                icon: <FolderOpenOutlined />,
                onClick: () => onNavigate(currentPath.slice(0, realIndex + 1))
            };
        });

        const ellipsisItem = {
            title: (
                <span style={{ cursor: 'default', color: '#999' }}>...</span>
            ),
            // Ant Design Breadcrumb 支持直接把 menu 放进去
            menu: { items: ellipsisMenu }
        };

        // C. 最后两个文件夹
        const lastTwoItems = currentPath.slice(-2).map((folderName, index) => {
            // slice(-2) 只有两个元素，index 是 0 或 1
            // 计算它在原数组中的真实索引
            const realIndex = currentPath.length - 2 + index;
            return {
                title: (
                    <span
                        style={{ cursor: 'pointer' }}
                        onClick={() => onNavigate(currentPath.slice(0, realIndex + 1))}
                    >
                        {folderName}
                    </span>
                )
            };
        });

        return [rootItem, firstItem, ellipsisItem, ...lastTwoItems];
    };

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
            boxSizing: 'border-box'
        }}>
            {/* 左侧：面包屑 */}
            <div style={{ fontSize: '14px', flex: 1, overflow: 'hidden', marginRight: '20px' }}>
                {/* 调用生成的函数 */}
                <Breadcrumb items={generateBreadcrumbItems()} separator=">" />
            </div>

            {/* 右侧：用户信息 */}
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        transition: 'background 0.2s',
                        gap: '8px'
                    }}
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
                                border: '1px solid rgba(0,0,0,0.05)'
                            }}
                        />
                        <span style={{
                            color: '#555',
                            fontWeight: 500,
                            fontSize: '14px',
                            lineHeight: '1.5',
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