// src/components/Sidebar.tsx
import React, { useState } from 'react';
import { Popover, Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';

export interface TopUser {
    name: string;
    sizeFormatted: string;
}

// 升级 Props 定义
interface SidebarProps {
    usedSize: string;
    activeTab: 'all' | 'share';
    onTabChange: (tab: 'all' | 'share') => void;
    totalDiskUsage?: string; // 新增：磁盘总用量 (设为可选)
    top5Users?: TopUser[];      // 新增：Top 5 用户 (设为可选)
}


const UsageDetailContent = ({ users }: { users: TopUser[] }) => (
    <div style={{ width: 220 }}>
        <h4 style={{ margin: '0 0 10px 0', fontWeight: 600, color: '#333' }}>空间占用排行 Top 5</h4>
        {users.length === 0 ? <p style={{color: '#999', fontSize: 12}}>暂无数据</p> : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {users.map((user, index) => (
                    <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
                        <span style={{ display: 'flex', alignItems: 'center', color: '#555' }}>
                            <Avatar size={18} icon={<UserOutlined />} style={{ marginRight: 6, backgroundColor: '#e6f7ff', color: '#1890ff' }} />
                            {user.name}
                        </span>
                        <span style={{ fontWeight: 'bold', color: '#333' }}>{user.sizeFormatted}</span>
                    </li>
                ))}
            </ul>
        )}
    </div>
);

export default function Sidebar({
                                    usedSize,
                                    activeTab,
                                    onTabChange,
                                    totalDiskUsage = '0 B', // 接收新 prop，并给默认值
                                    top5Users = []       // 接收新 prop，并给默认值
                                }: SidebarProps) {

    // 5. 🔥 在 styles 中新增 totalUsageRow 样式
    const styles = {
        container: {
            width: '240px',
            height: '100%',
            backgroundColor: 'var(--surface-color)',
            borderRight: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column' as const,
            flexShrink: 0,
        },
        logoArea: {
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            fontSize: '22px',
            fontWeight: 'bold',
            color: 'var(--primary-color)',
            gap: '10px',
            cursor: 'pointer'
        },
        menu: {
            flex: 1,
            padding: '10px 12px',
        },
        menuItem: {
            display: 'flex',
            alignItems: 'center',
            padding: '12px 20px',
            borderRadius: 'var(--radius)',
            textDecoration: 'none',
            fontSize: '15px',
            marginBottom: '4px',
            color: '#555',
            transition: 'all 0.2s',
            cursor: 'pointer',
        },
        activeItem: {
            backgroundColor: '#eef5ff',
            color: 'var(--primary-color)',
            fontWeight: 600,
        },
        storageArea: {
            padding: '24px',
            borderTop: '1px solid var(--border-color)',
        },
        storageText: {
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '13px',
            color: 'var(--text-main)',
            marginBottom: '8px',
            fontWeight: 500,
        },
        progressBarBg: {
            height: '4px',
            backgroundColor: '#f0f2f5',
            borderRadius: '2px',
            overflow: 'hidden',
            display: 'flex',
        },
        progressBarFill: {
            width: '15%',
            height: '100%',
            backgroundColor: 'var(--primary-color)',
            borderRadius: '2px',
            opacity: 0.8,
        },

        totalUsageRow: {
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '13px',
            color: '#666',
            fontWeight: 500,
            cursor: 'pointer', // 变为可点击
            transition: 'color 0.2s, background-color 0.2s',
            marginTop: '16px', // 增加间距
            padding: '4px 6px',
            borderRadius: '4px'
        },
    };

    const getItemStyle = (tabName: string) => {
        return activeTab === tabName
            ? { ...styles.menuItem, ...styles.activeItem }
            : styles.menuItem;
    };

    return (
        <aside style={styles.container}>
            <div style={styles.logoArea} onClick={() => onTabChange('all')}>
                <i className="fa-solid fa-cloud"></i>
                MagusCloud
            </div>

            <nav style={styles.menu}>
                <div style={getItemStyle('all')} onClick={() => onTabChange('all')}>
                    <i className="fa-solid fa-folder-open" style={{ width: '24px' }}></i> 全部文件
                </div>
                <div style={getItemStyle('share')} onClick={() => onTabChange('share')}>
                    <i className="fa-solid fa-share-nodes" style={{ width: '24px' }}></i> 我的分享
                </div>
            </nav>

            {/* 🔥 6. 核心修改：底部存储区 */}
            <div style={styles.storageArea}>
                {/* 个人空间 */}
                <div style={styles.storageText}>
                    <span>个人空间已用</span>
                    <span style={{ color: 'var(--primary-color)' }}>{usedSize}</span>
                </div>
                <div style={styles.progressBarBg}>
                    <div style={styles.progressBarFill}></div>
                </div>

                {/* 磁盘总用量 (带 Popover 交互) */}
                <Popover
                    content={<UsageDetailContent users={top5Users} />}
                    title={null}
                    trigger="click"
                    placement="rightTop" // 弹出位置
                >
                    <div
                        style={styles.totalUsageRow}
                        // 鼠标悬停效果
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLDivElement).style.color = 'var(--primary-color)';
                            (e.currentTarget as HTMLDivElement).style.backgroundColor = '#f0f7ff';
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLDivElement).style.color = '#666';
                            (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
                        }}
                    >
                        <span>磁盘空间已用</span>
                        <span>{totalDiskUsage}</span>
                    </div>
                </Popover>
            </div>
        </aside>
    );
};

export default Sidebar;