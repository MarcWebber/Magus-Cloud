import {ReactNode, Suspense, lazy} from 'react';
import {BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate} from 'react-router-dom';
import {Avatar, Button, ConfigProvider, Dropdown, Layout, Menu, Space, Spin, Tag} from 'antd';
import type {MenuProps} from 'antd';
import {AppstoreOutlined, DashboardOutlined, LogoutOutlined, SettingOutlined, UserOutlined} from '@ant-design/icons';
import {SessionProvider, useSession} from './providers/SessionProvider';
import {I18nProvider, useI18n} from './providers/I18nProvider';
import {LoginPage} from '../features/auth/pages/LoginPage';
import {AppConfigProvider, useAppConfig} from './providers/AppConfigProvider';
import {HelpButton, HelpProvider} from './providers/HelpProvider';

const DashboardPage = lazy(() => import('../features/files/pages/DashboardPage'));
const AdminPage = lazy(() => import('../features/admin/pages/AdminPage'));
const PublicSharePage = lazy(() => import('../features/share/pages/PublicSharePage'));

function LoadingScreen() {
    const {t} = useI18n();

    return (
        <div className="login-screen">
            <Space direction="vertical" align="center">
                <Spin size="large" />
                <span>{t('app.loading')}</span>
            </Space>
        </div>
    );
}

function ProtectedRoute({children, requireAdmin = false}: {children: ReactNode; requireAdmin?: boolean}) {
    const {session, loading} = useSession();
    const location = useLocation();

    if (loading) {
        return <LoadingScreen />;
    }

    if (!session?.authenticated) {
        return <Navigate to="/" state={{from: location.pathname}} replace />;
    }

    if (requireAdmin && session.user?.role !== 'admin') {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}

function SessionBadge() {
    const {session, logout} = useSession();
    const {t} = useI18n();
    const navigate = useNavigate();

    const items: MenuProps['items'] = [
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: t('app.logout'),
            onClick: async () => {
                await logout();
                navigate('/');
            },
        },
    ];

    return (
        <Dropdown menu={{items}} trigger={['click']}>
            <Space className="shell-user-trigger">
                <Avatar src={session?.user?.avatarUrl} icon={<UserOutlined />} />
                <span>{session?.user?.username}</span>
            </Space>
        </Dropdown>
    );
}

function UserShell({children}: {children: ReactNode}) {
    const {session} = useSession();
    const {config} = useAppConfig();
    const {t} = useI18n();
    const navigate = useNavigate();

    return (
        <div className="product-shell">
            <div className="product-shell-header">
                <div className="product-shell-brand" onClick={() => navigate('/dashboard')} role="button" tabIndex={0}>
                    <img src="/magus.png" alt="Magus" />
                    <div>
                        <strong>{config.appName}</strong>
                        <span>{t('app.userShellSubtitle')}</span>
                    </div>
                </div>
                <Space size="middle">
                    {session?.user?.role === 'admin' && (
                        <Button icon={<SettingOutlined />} onClick={() => navigate('/admin')}>
                            {t('app.enterAdmin')}
                        </Button>
                    )}
                    {config.supportUrl && (
                        <Button href={config.supportUrl} target="_blank" rel="noreferrer">
                            {t('app.support')}
                        </Button>
                    )}
                    <HelpButton audience={session?.user?.role === 'admin' ? 'admin' : 'user'} />
                    <Tag color={session?.user?.role === 'admin' ? 'gold' : 'blue'}>
                        {session?.user?.role === 'admin' ? t('app.session.admin') : t('app.session.feishu')}
                    </Tag>
                    <SessionBadge />
                </Space>
            </div>
            <div className="product-shell-content">{children}</div>
        </div>
    );
}

function AdminShell({children}: {children: ReactNode}) {
    const navigate = useNavigate();
    const location = useLocation();
    const {session} = useSession();
    const {config} = useAppConfig();
    const {t} = useI18n();

    const menuItems: MenuProps['items'] = [
        {
            key: '/dashboard',
            icon: <AppstoreOutlined />,
            label: t('app.menu.files'),
        },
        {
            key: '/admin',
            icon: <DashboardOutlined />,
            label: t('app.menu.admin'),
        },
    ];
    const selectedShellMenuKey = location.pathname.startsWith('/admin') ? '/admin' : '/dashboard';

    return (
        <div className="app-shell">
            <Layout className="shell-frame">
                <Layout.Sider width={260} className="shell-sider" breakpoint="lg" collapsedWidth={0}>
                    <div className="shell-brand">
                        <Space size="middle">
                            <div className="shell-brand-logo">
                                <img src="/magus.png" alt="Magus" />
                            </div>
                            <div>
                                <strong>{config.appName}</strong>
                                <div className="shell-brand-subtitle">Cloud Ops Console</div>
                            </div>
                        </Space>
                    </div>
                    <div className="shell-nav">
                        <Menu
                            theme="dark"
                            mode="inline"
                            selectedKeys={[selectedShellMenuKey]}
                            items={menuItems}
                            onClick={({key}) => navigate(key)}
                        />
                    </div>
                </Layout.Sider>
                <Layout className="shell-main">
                    <div className="shell-header">
                        <div className="shell-title">
                            <h1>{t('app.adminShellTitle')}</h1>
                            <p>{t('app.adminShellSubtitle')}</p>
                        </div>
                        <Space size="middle">
                            <Button icon={<AppstoreOutlined />} onClick={() => navigate('/dashboard')}>
                                {t('app.backToFiles')}
                            </Button>
                            <HelpButton audience={session?.user?.role === 'admin' ? 'admin' : 'user'} />
                            <Tag color="gold">{t('app.session.admin')}</Tag>
                            <SessionBadge />
                        </Space>
                    </div>
                    <Layout.Content className="shell-content">
                        <Suspense fallback={<LoadingScreen />}>
                            {children}
                        </Suspense>
                    </Layout.Content>
                </Layout>
            </Layout>
        </div>
    );
}

function RoutedApp() {
    return (
        <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route
                path="/dashboard"
                element={(
                    <ProtectedRoute>
                        <UserShell>
                            <DashboardPage />
                        </UserShell>
                    </ProtectedRoute>
                )}
            />
            <Route
                path="/admin/*"
                element={(
                    <ProtectedRoute requireAdmin>
                        <AdminShell>
                            <AdminPage />
                        </AdminShell>
                    </ProtectedRoute>
                )}
            />
            <Route path="/s/:shareId" element={<PublicSharePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export function AppRouter() {
    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#1677ff',
                    borderRadius: 18,
                    colorBgBase: '#f5f9ff',
                    fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
                    fontSize: 16,
                    controlHeight: 42,
                },
            }}
        >
            <BrowserRouter>
                <AppConfigProvider>
                    <I18nProvider>
                        <SessionProvider>
                            <HelpProvider>
                                <RoutedApp />
                            </HelpProvider>
                        </SessionProvider>
                    </I18nProvider>
                </AppConfigProvider>
            </BrowserRouter>
        </ConfigProvider>
    );
}
