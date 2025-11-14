// src/components/Sidebar.tsx
import React from 'react';

interface SidebarProps {
    usedSize: string;
    // 当前选中的是哪个页面
    activeTab: 'all' | 'share';
    // 切换页面的回调
    onTabChange: (tab: 'all' | 'share') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ usedSize, activeTab, onTabChange }) => {
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
            cursor: 'pointer', // 变成手型
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
        }
    };

    // 动态获取样式：如果当前tab匹配，就合并 activeItem 样式
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
                {/* 全部文件 */}
                <div
                    style={getItemStyle('all')}
                    onClick={() => onTabChange('all')}
                >
                    <i className="fa-solid fa-folder-open" style={{ width: '24px' }}></i> 全部文件
                </div>

                {/* 我的分享 */}
                <div
                    style={getItemStyle('share')}
                    onClick={() => onTabChange('share')}
                >
                    <i className="fa-solid fa-share-nodes" style={{ width: '24px' }}></i> 我的分享
                </div>
            </nav>

            <div style={styles.storageArea}>
                <div style={styles.storageText}>
                    <span>个人空间已用</span>
                    <span style={{ color: 'var(--primary-color)' }}>{usedSize}</span>
                </div>
                <div style={styles.progressBarBg}>
                    <div style={styles.progressBarFill}></div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;