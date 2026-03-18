import {QuestionCircleOutlined} from '@ant-design/icons';
import {Alert, Button, Drawer, Space, Spin, Tabs, Typography} from 'antd';
import {createContext, ReactNode, useContext, useMemo, useState} from 'react';
import type {TabsProps} from 'antd';
import {apiClient} from '../../lib/api/client';
import {useSession} from './SessionProvider';
import {MarkdownDocument} from '../../components/help/MarkdownDocument';
import {useAppConfig} from './AppConfigProvider';

type HelpAudience = 'user' | 'admin';

type HelpPayload = {
    audience: HelpAudience;
    title: string;
    updatedAt: string;
    markdown: string;
};

type HelpContextValue = {
    openHelp: (audience?: HelpAudience) => void;
};

const HelpContext = createContext<HelpContextValue | null>(null);

const HELP_STRINGS = {
    drawerTitle: '\u4f7f\u7528\u6587\u6863',
    drawerDescription: '\u67e5\u770b\u5f53\u524d\u4ea7\u54c1\u7684\u7528\u6237\u6307\u5357\u3001\u7ba1\u7406\u5458\u624b\u518c\u4e0e\u5e38\u7528\u64cd\u4f5c\u8bf4\u660e\u3002',
    userTab: '\u7528\u6237\u6587\u6863',
    adminTab: '\u7ba1\u7406\u5458\u6587\u6863',
    updatedAt: '\u6700\u540e\u66f4\u65b0',
    empty: '\u6682\u65e0\u53ef\u7528\u6587\u6863',
    loadError: '\u52a0\u8f7d\u5e2e\u52a9\u6587\u6863\u5931\u8d25',
    helpAria: '\u6253\u5f00\u4f7f\u7528\u6587\u6863',
} as const;

export function HelpProvider({children}: {children: ReactNode}) {
    const {session} = useSession();
    const {config} = useAppConfig();
    const [open, setOpen] = useState(false);
    const [activeAudience, setActiveAudience] = useState<HelpAudience>('user');
    const [docs, setDocs] = useState<Partial<Record<HelpAudience, HelpPayload>>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const canSeeAdminDoc = session?.user?.role === 'admin';

    const loadDoc = async (audience: HelpAudience) => {
        if (docs[audience]) {
            return;
        }

        setLoading(true);
        setError('');
        try {
            const payload = await apiClient.get<HelpPayload>(`/api/help?audience=${audience}`);
            setDocs((previous) => ({
                ...previous,
                [audience]: payload,
            }));
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : HELP_STRINGS.loadError);
        } finally {
            setLoading(false);
        }
    };

    const openHelp = (audience: HelpAudience = 'user') => {
        const targetAudience = audience === 'admin' && canSeeAdminDoc ? 'admin' : 'user';
        setActiveAudience(targetAudience);
        setOpen(true);
        void loadDoc(targetAudience);
    };

    const tabs = useMemo(() => {
        const items: TabsProps['items'] = [{key: 'user', label: HELP_STRINGS.userTab}];
        if (canSeeAdminDoc) {
            items.push({key: 'admin', label: HELP_STRINGS.adminTab});
        }
        return items;
    }, [canSeeAdminDoc]);

    const currentDoc = docs[activeAudience];

    return (
        <HelpContext.Provider value={{openHelp}}>
            {children}
            <Drawer
                width={720}
                open={open}
                onClose={() => setOpen(false)}
                title={
                    <Space direction="vertical" size={2}>
                        <Typography.Title level={4} style={{margin: 0}}>
                            {HELP_STRINGS.drawerTitle}
                        </Typography.Title>
                        <Typography.Text type="secondary">
                            {config.appName} · {HELP_STRINGS.drawerDescription}
                        </Typography.Text>
                    </Space>
                }
            >
                <Tabs
                    activeKey={activeAudience}
                    items={tabs}
                    onChange={(key) => {
                        const nextAudience = key === 'admin' ? 'admin' : 'user';
                        setActiveAudience(nextAudience);
                        void loadDoc(nextAudience);
                    }}
                />
                {error && <Alert type="error" showIcon message={error} style={{marginBottom: 16}} />}
                {loading && !currentDoc ? (
                    <div style={{display: 'grid', placeItems: 'center', minHeight: 240}}>
                        <Spin size="large" />
                    </div>
                ) : currentDoc ? (
                    <Space direction="vertical" size="large" style={{width: '100%'}}>
                        <Space direction="vertical" size={2}>
                            <Typography.Title level={3} style={{margin: 0}}>
                                {currentDoc.title}
                            </Typography.Title>
                            <Typography.Text type="secondary">
                                {HELP_STRINGS.updatedAt} {new Date(currentDoc.updatedAt).toLocaleString('zh-CN')}
                            </Typography.Text>
                        </Space>
                        <MarkdownDocument markdown={currentDoc.markdown} />
                    </Space>
                ) : (
                    <Alert type="info" showIcon message={HELP_STRINGS.empty} />
                )}
            </Drawer>
        </HelpContext.Provider>
    );
}

export function useHelpDrawer() {
    const value = useContext(HelpContext);
    if (!value) {
        throw new Error('useHelpDrawer must be used inside HelpProvider');
    }
    return value;
}

export function HelpButton({audience = 'user', text = '?'}: {audience?: HelpAudience; text?: string}) {
    const {openHelp} = useHelpDrawer();

    return (
        <Button
            shape="circle"
            icon={text === '?' ? <QuestionCircleOutlined /> : undefined}
            onClick={() => openHelp(audience)}
            aria-label={HELP_STRINGS.helpAria}
        >
            {text === '?' ? null : text}
        </Button>
    );
}
