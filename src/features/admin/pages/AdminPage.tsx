import {useEffect, useState} from 'react';
import {Button, Card, Descriptions, Form, Input, Space, Switch, Tabs, Tag, Typography, message} from 'antd';
import {CaretDownOutlined, CaretRightOutlined} from '@ant-design/icons';
import {apiClient} from '../../../lib/api/client';
import {useI18n} from '../../../app/providers/I18nProvider';

type SettingsPayload = {
    auth: {
        cookieName: string;
        sessionTtlSeconds: number;
        adminFallbackEnabled: boolean;
        adminUsername: string;
    };
    feishu: {
        enabled: boolean;
        appId: string;
        appSecret: string;
        appBaseUrl: string;
        callbackBaseUrl: string;
    };
    ngrok: {
        enabled: boolean;
        apiUrl: string;
        authtoken: string;
        domain: string;
        tunnelName: string;
        addr: string;
    };
    storage: {
        rootDir: string;
        devRootDir: string;
        quotaEnabled: boolean;
        defaultUserQuotaGb: number;
    };
    ui: {
        appName: string;
        supportUrl: string;
    };
    metadata: {
        updatedAt: string;
        restartRequired: boolean;
    };
};

type StatusPayload = {
    app: {
        name: string;
        version: string;
        uptimeSeconds: number;
        environment: string;
    };
    storage: {
        rootDir: string;
        exists: boolean;
        freeBytes: number;
        totalBytes: number;
        quotaEnabled: boolean;
        defaultUserQuotaGb: number;
    };
    dependencies: {
        soffice: boolean;
        purePw: boolean;
    };
    ngrok: {
        connected: boolean;
        publicUrl: string;
    };
    restartRequired: boolean;
};

export default function AdminPage() {
    const {t} = useI18n();
    const [form] = Form.useForm<SettingsPayload>();
    const [settings, setSettings] = useState<SettingsPayload | null>(null);
    const [status, setStatus] = useState<StatusPayload | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [collapsedPanels, setCollapsedPanels] = useState<Record<string, boolean>>({
        auth: false,
        feishu: false,
        ngrok: false,
        storage: false,
        app: false,
        runtime: false,
        ngrokStatus: false,
        logs: false,
    });

    const togglePanel = (key: string) => {
        setCollapsedPanels((previous) => ({
            ...previous,
            [key]: !previous[key],
        }));
    };

    const panelExtra = (key: string) => (
        <Button
            type="text"
            size="small"
            icon={collapsedPanels[key] ? <CaretRightOutlined /> : <CaretDownOutlined />}
            onClick={() => togglePanel(key)}
        >
            {collapsedPanels[key] ? '展开' : '收起'}
        </Button>
    );

    const refresh = async () => {
        setLoading(true);
        try {
            const [settingsPayload, statusPayload, logPayload] = await Promise.all([
                apiClient.get<SettingsPayload>('/api/admin/settings'),
                apiClient.get<StatusPayload>('/api/admin/status'),
                apiClient.get<{lines: string[]; restartRequired: boolean}>('/api/admin/logs?limit=200'),
            ]);

            setSettings(settingsPayload);
            setStatus(statusPayload);
            setLogs(logPayload.lines);
            form.setFieldsValue(settingsPayload);
        } catch (error) {
            message.error(error instanceof Error ? error.message : t('admin.loadFailed'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void refresh();
    }, []);

    const saveSettings = async (values: SettingsPayload) => {
        setSaving(true);
        try {
            const response = await apiClient.put<{settings: SettingsPayload}>('/api/admin/settings', values);
            setSettings(response.settings);
            form.setFieldsValue(response.settings);
            message.success(t('admin.saveSuccess'));
            await refresh();
        } catch (error) {
            message.error(error instanceof Error ? error.message : t('admin.saveFailed'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Tabs
            defaultActiveKey="settings"
            items={[
                {
                    key: 'settings',
                    label: t('admin.tabSettings'),
                    children: (
                        <Form form={form} layout="vertical" onFinish={saveSettings}>
                            <div className="settings-grid">
                                <Card className="glass-card section-card" loading={loading}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                    <Typography.Title level={5}>{t('admin.authTitle')}</Typography.Title>
                                        {panelExtra('auth')}
                                    </div>
                                    {!collapsedPanels.auth && (
                                        <>
                                    <Form.Item label={t('admin.cookieName')} name={['auth', 'cookieName']}>
                                        <Input />
                                    </Form.Item>
                                    <Form.Item label={t('admin.sessionTtl')} name={['auth', 'sessionTtlSeconds']}>
                                        <Input type="number" />
                                    </Form.Item>
                                    <Form.Item label={t('admin.adminUsername')} name={['auth', 'adminUsername']}>
                                        <Input />
                                    </Form.Item>
                                    <Form.Item label={t('admin.adminFallback')} name={['auth', 'adminFallbackEnabled']} valuePropName="checked">
                                        <Switch />
                                    </Form.Item>
                                        </>
                                    )}
                                </Card>

                                <Card className="glass-card section-card" loading={loading}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                    <Typography.Title level={5}>{t('admin.feishuTitle')}</Typography.Title>
                                        {panelExtra('feishu')}
                                    </div>
                                    {!collapsedPanels.feishu && (
                                        <>
                                    <Form.Item label={t('admin.feishuEnabled')} name={['feishu', 'enabled']} valuePropName="checked">
                                        <Switch />
                                    </Form.Item>
                                    <Form.Item label={t('admin.feishuAppId')} name={['feishu', 'appId']}>
                                        <Input />
                                    </Form.Item>
                                    <Form.Item label={t('admin.feishuAppSecret')} name={['feishu', 'appSecret']}>
                                        <Input.Password />
                                    </Form.Item>
                                    <Form.Item label={t('admin.feishuAppUrl')} name={['feishu', 'appBaseUrl']} help={t('admin.feishuAppUrlHelp')}>
                                        <Input />
                                    </Form.Item>
                                    <Form.Item label={t('admin.feishuCallbackUrl')} name={['feishu', 'callbackBaseUrl']} help={t('admin.feishuCallbackUrlHelp')}>
                                        <Input />
                                    </Form.Item>
                                        </>
                                    )}
                                </Card>

                                <Card className="glass-card section-card" loading={loading}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                    <Typography.Title level={5}>{t('admin.ngrokTitle')}</Typography.Title>
                                        {panelExtra('ngrok')}
                                    </div>
                                    {!collapsedPanels.ngrok && (
                                        <>
                                    <Form.Item label={t('admin.ngrokEnabled')} name={['ngrok', 'enabled']} valuePropName="checked">
                                        <Switch />
                                    </Form.Item>
                                    <Form.Item label={t('admin.ngrokApiUrl')} name={['ngrok', 'apiUrl']}>
                                        <Input />
                                    </Form.Item>
                                    <Form.Item label={t('admin.ngrokAuthtoken')} name={['ngrok', 'authtoken']}>
                                        <Input.Password />
                                    </Form.Item>
                                    <Form.Item label={t('admin.ngrokDomain')} name={['ngrok', 'domain']}>
                                        <Input />
                                    </Form.Item>
                                    <Form.Item label={t('admin.ngrokTunnelName')} name={['ngrok', 'tunnelName']}>
                                        <Input />
                                    </Form.Item>
                                    <Form.Item label={t('admin.ngrokAddr')} name={['ngrok', 'addr']}>
                                        <Input />
                                    </Form.Item>
                                        </>
                                    )}
                                </Card>

                                <Card className="glass-card section-card" loading={loading}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                    <Typography.Title level={5}>{t('admin.uiStorageTitle')}</Typography.Title>
                                        {panelExtra('storage')}
                                    </div>
                                    {!collapsedPanels.storage && (
                                        <>
                                    <Form.Item label={t('admin.appName')} name={['ui', 'appName']}>
                                        <Input />
                                    </Form.Item>
                                    <Form.Item label={t('admin.supportUrl')} name={['ui', 'supportUrl']}>
                                        <Input />
                                    </Form.Item>
                                    <Form.Item label={t('admin.storageRoot')} name={['storage', 'rootDir']}>
                                        <Input />
                                    </Form.Item>
                                    <Form.Item label={t('admin.devStorageRoot')} name={['storage', 'devRootDir']}>
                                        <Input />
                                    </Form.Item>
                                    <Form.Item label="启用用户配额" name={['storage', 'quotaEnabled']} valuePropName="checked">
                                        <Switch />
                                    </Form.Item>
                                    <Form.Item label="默认每用户配额 (GB)" name={['storage', 'defaultUserQuotaGb']}>
                                        <Input type="number" step="0.5" min="0.001" />
                                    </Form.Item>
                                        </>
                                    )}
                                </Card>
                            </div>

                            <Space style={{marginTop: 20}}>
                                <Button type="primary" htmlType="submit" loading={saving}>
                                    {t('admin.save')}
                                </Button>
                                {settings?.metadata.restartRequired && <Tag color="red">{t('admin.restartRequired')}</Tag>}
                            </Space>
                        </Form>
                    ),
                },
                {
                    key: 'monitoring',
                    label: t('admin.tabMonitoring'),
                    children: (
                        <div className="monitor-grid">
                            <Card className="glass-card section-card" loading={loading}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                    <Typography.Title level={5}>{t('admin.application')}</Typography.Title>
                                    {panelExtra('app')}
                                </div>
                                {!collapsedPanels.app && (
                                <Descriptions title={t('admin.application')} column={1}>
                                    <Descriptions.Item label={t('admin.appInfo.name')}>{status?.app.name}</Descriptions.Item>
                                    <Descriptions.Item label={t('admin.appInfo.version')}>{status?.app.version}</Descriptions.Item>
                                    <Descriptions.Item label={t('admin.appInfo.environment')}>{status?.app.environment}</Descriptions.Item>
                                    <Descriptions.Item label={t('admin.appInfo.uptime')}>{status?.app.uptimeSeconds}s</Descriptions.Item>
                                </Descriptions>
                                )}
                            </Card>
                            <Card className="glass-card section-card" loading={loading}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                    <Typography.Title level={5}>{t('admin.runtime')}</Typography.Title>
                                    {panelExtra('runtime')}
                                </div>
                                {!collapsedPanels.runtime && (
                                <Descriptions title={t('admin.runtime')} column={1}>
                                    <Descriptions.Item label={t('admin.runtime.storageRoot')}>{status?.storage.rootDir}</Descriptions.Item>
                                    <Descriptions.Item label={t('admin.runtime.storageMounted')}>
                                        {status?.storage.exists ? <Tag color="green">{t('admin.yes')}</Tag> : <Tag color="red">{t('admin.no')}</Tag>}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="用户配额">
                                        {status?.storage.quotaEnabled ? <Tag color="blue">{`${status.storage.defaultUserQuotaGb} GB`}</Tag> : <Tag>{'未启用'}</Tag>}
                                    </Descriptions.Item>
                                    <Descriptions.Item label={t('admin.runtime.libreOffice')}>
                                        {status?.dependencies.soffice ? <Tag color="green">{t('admin.available')}</Tag> : <Tag color="orange">{t('admin.missing')}</Tag>}
                                    </Descriptions.Item>
                                    <Descriptions.Item label={t('admin.runtime.purePw')}>
                                        {status?.dependencies.purePw ? <Tag color="green">{t('admin.available')}</Tag> : <Tag color="orange">{t('admin.missing')}</Tag>}
                                    </Descriptions.Item>
                                </Descriptions>
                                )}
                            </Card>
                            <Card className="glass-card section-card" loading={loading}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                    <Typography.Title level={5}>{t('admin.ngrokStatus')}</Typography.Title>
                                    {panelExtra('ngrokStatus')}
                                </div>
                                {!collapsedPanels.ngrokStatus && (
                                    <>
                                <Descriptions title={t('admin.ngrokStatus')} column={1}>
                                    <Descriptions.Item label={t('admin.ngrok.connected')}>
                                        {status?.ngrok.connected ? <Tag color="green">{t('admin.connected')}</Tag> : <Tag color="orange">{t('admin.disconnected')}</Tag>}
                                    </Descriptions.Item>
                                    <Descriptions.Item label={t('admin.ngrok.publicUrl')}>
                                        {status?.ngrok.publicUrl || t('admin.notAvailable')}
                                    </Descriptions.Item>
                                    <Descriptions.Item label={t('admin.ngrok.restartRequired')}>
                                        {status?.restartRequired ? <Tag color="red">{t('admin.yes')}</Tag> : <Tag color="blue">{t('admin.no')}</Tag>}
                                    </Descriptions.Item>
                                </Descriptions>
                                <Button onClick={() => void refresh()}>{t('admin.refreshStatus')}</Button>
                                    </>
                                )}
                            </Card>
                            <Card className="glass-card section-card" loading={loading}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                <Typography.Title level={5}>{t('admin.logs')}</Typography.Title>
                                    {panelExtra('logs')}
                                </div>
                                {!collapsedPanels.logs && (
                                    <div className="log-panel">
                                        {logs.length === 0 ? t('admin.noLogs') : logs.join('\n')}
                                    </div>
                                )}
                            </Card>
                        </div>
                    ),
                },
            ]}
        />
    );
}
