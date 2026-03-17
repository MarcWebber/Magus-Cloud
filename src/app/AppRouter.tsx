import {ReactNode, Suspense, lazy} from 'react';
import {Navigate, Route, Routes, useLocation, useNavigate} from 'react-router-dom';
import {BrowserRouter} from 'react-router-dom';
import {ConfigProvider, Layout, Menu, Space, Spin, Tag, Avatar, Dropdown} from 'antd';
import type {MenuProps} from 'antd';
import {DashboardOutlined, SettingOutlined, LogoutOutlined, UserOutlined} from '@ant-design/icons';
import {SessionProvider, useSession} from './providers/SessionProvider';
import {I18nProvider, useI18n} from './providers/I18nProvider';
import {LoginPage} from '../features/auth/pages/LoginPage';

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

function ShellHeader() {
    const navigate = useNavigate();
    const location = useLocation();
    const {session, logout} = useSession();
    const {t} = useI18n();
    const title = location.pathname === '/admin' ? t('app.menu.admin') : t('app.menu.files');

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
        <div className="shell-header">
            <div className="shell-title">
                <h1>{title}</h1>
            </div>
            <Space size="middle">
                <Tag color={session?.user?.role === 'admin' ? 'gold' : 'blue'}>
                    {session?.user?.role === 'admin' ? t('app.session.admin') : t('app.session.feishu')}
                </Tag>
                <Dropdown menu={{items}} trigger={['click']}>
                    <Space className="shell-user-trigger">
                        <Avatar src={session?.user?.avatarUrl} icon={<UserOutlined />} />
                        <span>{session?.user?.username}</span>
                    </Space>
                </Dropdown>
            </Space>
        </div>
    );
}

function AppShell({children}: {children: ReactNode}) {
    const navigate = useNavigate();
    const location = useLocation();
    const {session} = useSession();
    const {t} = useI18n();

    const menuItems = [
        {
            key: '/dashboard',
            icon: <DashboardOutlined />,
            label: t('app.menu.files'),
        },
        session?.user?.role === 'admin'
            ? {
                key: '/admin',
                icon: <SettingOutlined />,
                label: t('app.menu.admin'),
            }
            : null,
    ].filter(Boolean) as MenuProps['items'];

    return (
        <div className="app-shell">
            <Layout className="shell-frame">
                <Layout.Sider width={248} className="shell-sider" breakpoint="lg" collapsedWidth={0}>
                    <div className="shell-brand">
                        <Space size="middle">
                            <div className="shell-brand-logo">
                                <img src="/magus.png" alt="Magus" />
                            </div>
                            <div>
                                <strong>Magus Cloud</strong>
                            </div>
                        </Space>
                    </div>
                    <div className="shell-nav">
                        <Menu
                            theme="dark"
                            mode="inline"
                            selectedKeys={[location.pathname]}
                            items={menuItems}
                            onClick={({key}) => navigate(key)}
                        />
                    </div>
                </Layout.Sider>
                <Layout className="shell-main">
                    <ShellHeader />
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
                element={
                    <ProtectedRoute>
                        <AppShell>
                            <DashboardPage />
                        </AppShell>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin"
                element={
                    <ProtectedRoute requireAdmin>
                        <AppShell>
                            <AdminPage />
                        </AppShell>
                    </ProtectedRoute>
                }
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
                    colorPrimary: '#1d4ed8',
                    borderRadius: 18,
                    colorBgBase: '#f8fbff',
                    fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
                    fontSize: 16,
                    controlHeight: 44,
                },
            }}
        >
            <BrowserRouter>
                <I18nProvider>
                    <SessionProvider>
                        <RoutedApp />
                    </SessionProvider>
                </I18nProvider>
            </BrowserRouter>
        </ConfigProvider>
    );
}
