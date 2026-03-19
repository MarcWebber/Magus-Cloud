import {ReactNode, useEffect, useMemo, useState} from 'react';
import {Alert, Button, Card, Col, Empty, Form, Input, InputNumber, List, Radio, Row, Select, Space, Switch, Tag, Typography, message} from 'antd';
import {CaretDownOutlined, CaretRightOutlined, DeleteOutlined, InboxOutlined, PlusOutlined, ReloadOutlined, SaveOutlined} from '@ant-design/icons';
import {useLocation, useNavigate} from 'react-router-dom';
import {apiClient} from '../../../lib/api/client';
import {usePersistentPanels} from '../../../lib/ui/usePersistentPanels';
import {useAppConfig} from '../../../app/providers/AppConfigProvider';
import styles from './AdminPage.module.css';

type NodeConfig = {id: string; baseUrl: string; enabled: boolean; tags: string[]};
type UserConfig = {username: string; displayName: string; quotaGb?: number | null; enabled: boolean; homeDir: string};
type ServiceConfig = {
    cluster: {mode: 'shared-storage'; gatewayPublicUrl: string; nodes: NodeConfig[]};
    storage: {sharedRootDir: string; totalCapacityGb: number; reserveFreeGb: number; defaultUserQuotaGb: number; quotaEnabled: boolean; quotaMode: 'hard' | 'oversell'; defaultSoftQuotaGb: number; defaultHardQuotaGb: number; warningThresholdPercent: number; autoExpandEnabled: boolean};
    users: UserConfig[];
    backup: {snapshotRootDir: string; retentionCount: number; compression: 'tar.gz'; allowUserExport: boolean; verifyAfterCreate: boolean};
    ui: {appName: string; supportUrl: string; defaultLocale: 'zh-CN' | 'en-US'};
    auth: {cookieName: string; sessionTtlSeconds: number; adminFallbackEnabled: boolean; adminUsername: string};
    feishu: {enabled: boolean; appBaseUrl: string; callbackBaseUrl: string};
    ngrok: {enabled: boolean; apiUrl: string; domain: string; tunnelName: string; addr: string};
};
type ServiceConfigResponse = {version: string; path: string; updatedAt: string; source: 'magus-config' | 'cloud-config'; fieldSources: {ui: Record<string, string>}; config: ServiceConfig};
type StatusPayload = {
    cluster?: {gatewayPublicUrl?: string; activeNodes?: Array<{node_id: string; base_url: string; storage_mounted: boolean; database_ok: boolean; tags?: string[]; last_heartbeat?: string}>};
    storage?: {totalCapacityBytes: number; usedBytes: number; reserveFreeBytes: number; allocatableBytes: number; warningThresholdPercent?: number; warningTriggered?: boolean; overQuotaUsers: Array<{username: string; displayName: string; percent: number | null}>};
    database?: {connected: boolean};
    dependencies?: {purePw: boolean};
    ngrok?: {connected: boolean};
};
type BackupItem = {snapshotId: string; kind: string; createdAt: string; status: string; username: string | null};
type LogPayload = {lines: string[]; events: Array<{level: string; message: string; created_at: string}>};

const PANEL_DEFAULTS = {cluster: false, storage: false, users: false, backup: false, system: false};
type AdminSection = 'cluster' | 'storage' | 'users' | 'backup' | 'system';
const ADMIN_SECTIONS: Array<{key: AdminSection; label: string; description: string}> = [
    {key: 'cluster', label: '集群与网关', description: '节点与网关地址'},
    {key: 'storage', label: '容量与配额', description: '容量、阈值与策略'},
    {key: 'users', label: '用户与空间', description: '用户与配额分配'},
    {key: 'backup', label: '备份与迁移', description: '快照、导入与导出'},
    {key: 'system', label: '系统配置', description: '认证、集成与运行状态'},
];

function parseAdminSection(pathname: string): AdminSection {
    const maybe = pathname.split('/')[2] as AdminSection | undefined;
    return ADMIN_SECTIONS.some((item) => item.key === maybe) ? (maybe as AdminSection) : 'cluster';
}

function formatBytes(bytes?: number) {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / 1024 ** index;
    return `${value.toFixed(index === 0 ? 0 : value >= 10 ? 1 : 2)} ${units[index]}`;
}

function formatDate(value?: string) {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN');
}

function SummaryTag({color, children}: {color?: string; children: ReactNode}) {
    return <Tag color={color} className={styles.summaryTag}>{children}</Tag>;
}

function SectionCard({title, subtitle, summary, collapsed, onToggle, actions, children}: {title: string; subtitle: string; summary: ReactNode[]; collapsed: boolean; onToggle: () => void; actions?: ReactNode; children: ReactNode}) {
    return (
        <Card className={`glass-card ${styles.sectionCard}`}>
            <div className={styles.sectionHeader}>
                <div className={styles.sectionIdentity}>
                    <div>
                        <Typography.Title level={3} className={styles.sectionTitle}>{title}</Typography.Title>
                        <Typography.Paragraph className={styles.sectionSubtitle}>{subtitle}</Typography.Paragraph>
                    </div>
                    <div className={styles.summaryRow}>{summary}</div>
                </div>
                <div className={styles.sectionActions}>
                    {actions}
                    <Button type="text" className={styles.collapseButton} icon={collapsed ? <CaretRightOutlined /> : <CaretDownOutlined />} onClick={onToggle}>{collapsed ? '展开' : '收起'}</Button>
                </div>
            </div>
            <div className={`${styles.sectionBodyWrap} ${collapsed ? styles.sectionBodyCollapsed : styles.sectionBodyExpanded}`}><div className={styles.sectionBody}>{children}</div></div>
        </Card>
    );
}

export default function AdminPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [form] = Form.useForm<ServiceConfig>();
    const draft = Form.useWatch([], form) as ServiceConfig | undefined;
    const {refresh: refreshAppConfig} = useAppConfig();
    const panels = usePersistentPanels('magus.admin.panels', PANEL_DEFAULTS);
    const [serviceConfig, setServiceConfig] = useState<ServiceConfigResponse | null>(null);
    const [status, setStatus] = useState<StatusPayload | null>(null);
    const [backups, setBackups] = useState<BackupItem[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [events, setEvents] = useState<Array<{level: string; message: string; created_at: string}>>([]);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [backupRunning, setBackupRunning] = useState(false);
    const [exportUsername, setExportUsername] = useState('');
    const [importArchivePath, setImportArchivePath] = useState('');
    const [importTargetUsername, setImportTargetUsername] = useState('');
    const [dryRun, setDryRun] = useState(true);
    const activeSection = parseAdminSection(location.pathname);

    useEffect(() => {
        if (location.pathname === '/admin' || location.pathname === '/admin/') {
            navigate('/admin/cluster', {replace: true});
        }
    }, [location.pathname, navigate]);

    const refresh = async () => {
        setLoading(true);
        try {
            const [configPayload, statusPayload, backupPayload, logPayload] = await Promise.all([
                apiClient.get<ServiceConfigResponse>('/api/admin/service-config'),
                apiClient.get<StatusPayload>('/api/admin/status'),
                apiClient.get<BackupItem[]>('/api/admin/backup/list'),
                apiClient.get<LogPayload>('/api/admin/logs?limit=200'),
            ]);
            setServiceConfig(configPayload);
            setStatus(statusPayload);
            setBackups(backupPayload);
            setLogs(logPayload.lines || []);
            setEvents(logPayload.events || []);
            form.setFieldsValue(configPayload.config);
        } catch (error) {
            message.error(error instanceof Error ? error.message : '加载后台配置失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void refresh(); }, []);

    const saveConfig = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            const response = await apiClient.put<ServiceConfigResponse>('/api/admin/service-config', values);
            setServiceConfig(response);
            message.success('主配置已保存到 magus.config.json');
            await refreshAppConfig();
            await refresh();
        } catch (error) {
            if (error instanceof Error) message.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    const createBackup = async () => {
        try {
            setBackupRunning(true);
            const response = await apiClient.post<{snapshot: {snapshotId: string}}>('/api/admin/backup/create');
            message.success(`已创建整站快照：${response.snapshot.snapshotId}`);
            await refresh();
        } catch (error) {
            message.error(error instanceof Error ? error.message : '创建快照失败');
        } finally {
            setBackupRunning(false);
        }
    };

    const runExport = async () => {
        if (!exportUsername.trim()) return message.error('请输入要导出的用户名');
        try {
            await apiClient.post('/api/admin/migration/export-user', {username: exportUsername.trim()});
            message.success('用户导出任务已创建');
            await refresh();
        } catch (error) {
            message.error(error instanceof Error ? error.message : '导出用户失败');
        }
    };

    const runImport = async () => {
        if (!importArchivePath.trim() || !importTargetUsername.trim()) return message.error('请填写归档路径和目标用户');
        try {
            await apiClient.post(`/api/admin/migration/import-user?dryRun=${dryRun ? 'true' : 'false'}`, {archivePath: importArchivePath.trim(), targetUsername: importTargetUsername.trim()});
            message.success(dryRun ? '演练导入校验通过' : '用户导入已执行完成');
            await refresh();
        } catch (error) {
            message.error(error instanceof Error ? error.message : '导入用户失败');
        }
    };

    const current = useMemo(() => {
        if (!serviceConfig) {
            return null;
        }
        if (!draft) {
            return serviceConfig.config;
        }
        return {
            ...serviceConfig.config,
            ...draft,
            cluster: {
                ...serviceConfig.config.cluster,
                ...(draft.cluster || {}),
            },
            storage: {
                ...serviceConfig.config.storage,
                ...(draft.storage || {}),
            },
            backup: {
                ...serviceConfig.config.backup,
                ...(draft.backup || {}),
            },
            ui: {
                ...serviceConfig.config.ui,
                ...(draft.ui || {}),
            },
            auth: {
                ...serviceConfig.config.auth,
                ...(draft.auth || {}),
            },
            feishu: {
                ...serviceConfig.config.feishu,
                ...(draft.feishu || {}),
            },
            ngrok: {
                ...serviceConfig.config.ngrok,
                ...(draft.ngrok || {}),
            },
            users: draft.users || serviceConfig.config.users,
        };
    }, [draft, serviceConfig]);
    const nodeSummary = useMemo(() => current?.cluster.nodes.filter((node) => node.enabled).length || 0, [current]);
    if (loading && !serviceConfig) return <Card loading className="glass-card" />;
    if (!serviceConfig || !current) return <Alert type="error" showIcon message="无法加载管理员配置" />;

    return (
        <div className={styles.adminPage}>
            <div className={styles.pageActions}>
                <Button onClick={panels.expandAll}>全部展开</Button>
                <Button onClick={panels.collapseAll}>全部收起</Button>
                <Button icon={<ReloadOutlined />} onClick={() => void refresh()}>刷新状态</Button>
                <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={() => void saveConfig()}>保存主配置</Button>
            </div>
            <Form form={form} layout="vertical" initialValues={serviceConfig.config}>
                <div className={styles.adminSplitLayout}>
                    <aside className={styles.moduleSider}>
                        <div className={styles.moduleSiderTitle}>后台模块</div>
                        <div className={styles.moduleSiderHint}>每个模块独立入口，避免长页面堆叠。</div>
                        <div className={styles.moduleNavList}>
                            {ADMIN_SECTIONS.map((section) => {
                                const active = activeSection === section.key;
                                return (
                                    <button
                                        key={section.key}
                                        type="button"
                                        className={`${styles.moduleNavButton} ${active ? styles.moduleNavButtonActive : ''}`}
                                        onClick={() => navigate(`/admin/${section.key}`)}
                                    >
                                        <strong>{section.label}</strong>
                                        <span>{section.description}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </aside>
                    <div className={styles.matrixLayout}>
                    {activeSection === 'cluster' ? <SectionCard title="集群与网关" subtitle="管理网关地址、节点列表与在线状态，折叠后仍保留版本和节点摘要。" summary={[<SummaryTag key="v" color="blue">配置版本 {serviceConfig.version.slice(0, 8)}</SummaryTag>, <SummaryTag key="n" color={nodeSummary ? 'green' : 'red'}>{nodeSummary}/{current.cluster.nodes.length} 节点</SummaryTag>, <SummaryTag key="s">{serviceConfig.source === 'magus-config' ? '主配置' : '兼容迁移'}</SummaryTag>]} collapsed={panels.state.cluster} onToggle={() => panels.toggle('cluster')} actions={<Button icon={<SaveOutlined />} loading={saving} onClick={() => void saveConfig()}>保存本区</Button>}>
                        <div className={styles.sectionGrid}>
                            <div className={styles.formPanel}>
                                <Form.Item label="网关公网地址" name={['cluster', 'gatewayPublicUrl']} rules={[{required: true, message: '请输入网关公网地址'}]}><Input placeholder="https://cloud.example.com" /></Form.Item>
                                <Alert type="info" showIcon message={`当前配置文件：${serviceConfig.path}`} description={`最近更新时间：${formatDate(serviceConfig.updatedAt)}`} />
                                <Form.List name={['cluster', 'nodes']}>{(fields, {add, remove}) => <div className={styles.listEditor}><div className={styles.editorToolbar}><Typography.Title level={5}>节点列表</Typography.Title><Button icon={<PlusOutlined />} onClick={() => add({id: '', baseUrl: '', enabled: true, tags: []})}>新增节点</Button></div>{fields.map((field) => <Card key={field.key} size="small" className={styles.editorCard}><div className={styles.editorHeader}><Typography.Text strong>节点 {field.name + 1}</Typography.Text><Button danger type="text" icon={<DeleteOutlined />} onClick={() => remove(field.name)}>删除</Button></div><Row gutter={16}><Col xs={24} md={8}><Form.Item label="节点 ID" name={[field.name, 'id']} rules={[{required: true, message: '请输入节点 ID'}]}><Input /></Form.Item></Col><Col xs={24} md={10}><Form.Item label="节点地址" name={[field.name, 'baseUrl']} rules={[{required: true, message: '请输入节点地址'}]}><Input /></Form.Item></Col><Col xs={24} md={6}><Form.Item label="启用节点" name={[field.name, 'enabled']} valuePropName="checked"><Switch /></Form.Item></Col></Row><Form.Item label="标签" name={[field.name, 'tags']}><Select mode="tags" tokenSeparators={[',']} placeholder="例如 primary、cn-east" /></Form.Item></Card>)}</div>}</Form.List>
                            </div>
                            <div className={styles.sidePanel}><Card size="small" className={styles.sideCard}><Typography.Title level={5}>节点大盘</Typography.Title>{status?.cluster?.activeNodes?.length ? status.cluster.activeNodes.map((node) => <div key={node.node_id} className={styles.statusCard}><div className={styles.statusCardTop}><strong>{node.node_id}</strong><Tag color={node.database_ok && node.storage_mounted ? 'green' : 'orange'}>{node.database_ok && node.storage_mounted ? '在线' : '需关注'}</Tag></div><div className={styles.statusList}><span>Base URL：{node.base_url}</span><span>存储挂载：{node.storage_mounted ? '正常' : '异常'}</span><span>数据库连通：{node.database_ok ? '正常' : '异常'}</span><span>最近心跳：{formatDate(node.last_heartbeat)}</span><span>Tags：{node.tags?.join(', ') || '-'}</span><span>网关地址：{status.cluster?.gatewayPublicUrl || current.cluster.gatewayPublicUrl}</span></div></div>) : <Empty description="暂无节点状态数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />}</Card></div>
                        </div>
                    </SectionCard> : null}
                    {activeSection === 'storage' ? <SectionCard title="容量与配额" subtitle="配置共享存储、总容量和策略预留字段，并明确标注当前只做展示不改上传逻辑。" summary={[<SummaryTag key="m" color="blue">模式 {current.storage.quotaMode === 'oversell' ? '超卖预留' : '硬限制'}</SummaryTag>, <SummaryTag key="u">{formatBytes(status?.storage?.usedBytes)} / {formatBytes(status?.storage?.totalCapacityBytes)}</SummaryTag>, <SummaryTag key="w" color={status?.storage?.warningTriggered ? 'orange' : 'green'}>{status?.storage?.warningTriggered ? '已触发告警' : '状态平稳'}</SummaryTag>]} collapsed={panels.state.storage} onToggle={() => panels.toggle('storage')} actions={<Button icon={<SaveOutlined />} loading={saving} onClick={() => void saveConfig()}>保存本区</Button>}>
                        <div className={styles.sectionGrid}>
                            <div className={styles.formPanel}>
                                <Row gutter={16}>
                                    <Col xs={24} md={12}><Form.Item label="共享存储根目录" name={['storage', 'sharedRootDir']} rules={[{required: true, message: '请输入共享存储根目录'}]}><Input /></Form.Item></Col>
                                    <Col xs={24} md={6}><Form.Item label="总容量 (GB)" name={['storage', 'totalCapacityGb']}><InputNumber min={1} precision={0} style={{width: '100%'}} /></Form.Item></Col>
                                    <Col xs={24} md={6}><Form.Item label="保留空闲 (GB)" name={['storage', 'reserveFreeGb']}><InputNumber min={0} style={{width: '100%'}} /></Form.Item></Col>
                                </Row>
                                <Row gutter={16}>
                                    <Col xs={24} md={6}><Form.Item label="默认用户配额 (GB)" name={['storage', 'defaultUserQuotaGb']}><InputNumber min={0.001} style={{width: '100%'}} /></Form.Item></Col>
                                    <Col xs={24} md={6}><Form.Item label="启用配额" name={['storage', 'quotaEnabled']} valuePropName="checked"><Switch /></Form.Item></Col>
                                    <Col xs={24} md={12}><Form.Item label="容量策略" name={['storage', 'quotaMode']}><Radio.Group optionType="button" buttonStyle="solid" options={[{label: 'hard', value: 'hard'}, {label: 'oversell', value: 'oversell'}]} /></Form.Item></Col>
                                </Row>
                                <Row gutter={16}>
                                    <Col xs={24} md={8}><Form.Item label="默认软配额 (GB)" name={['storage', 'defaultSoftQuotaGb']}><InputNumber min={0.001} style={{width: '100%'}} /></Form.Item></Col>
                                    <Col xs={24} md={8}><Form.Item label="默认硬配额 (GB)" name={['storage', 'defaultHardQuotaGb']}><InputNumber min={0.001} style={{width: '100%'}} /></Form.Item></Col>
                                    <Col xs={24} md={8}><Form.Item label="告警阈值 (%)" name={['storage', 'warningThresholdPercent']}><InputNumber min={1} max={99} precision={0} style={{width: '100%'}} /></Form.Item></Col>
                                </Row>
                                <Form.Item label="自动扩容开关" name={['storage', 'autoExpandEnabled']} valuePropName="checked"><Switch checkedChildren="开启" unCheckedChildren="关闭" /></Form.Item>
                                <Alert type="warning" showIcon message="仅配置预留，当前不影响真实上传限制" description="oversell、去重和自动扩容本轮只做配置建模与界面说明，不触发真实执行逻辑。" />
                            </div>
                            <div className={styles.sidePanel}>
                                <Card size="small" className={styles.sideCard}><Typography.Title level={5}>容量摘要</Typography.Title><div className={styles.statusList}><span>总容量：{formatBytes(status?.storage?.totalCapacityBytes)}</span><span>已使用：{formatBytes(status?.storage?.usedBytes)}</span><span>可分配：{formatBytes(status?.storage?.allocatableBytes)}</span><span>保留空闲：{formatBytes(status?.storage?.reserveFreeBytes)}</span></div></Card>
                                <Card size="small" className={styles.sideCard}><Typography.Title level={5}>存储优化路线</Typography.Title><div className={styles.statusList}><span>当前去重状态：未启用</span><span>后续路线：基于 hash / metadata 的去重规划</span><span>自动扩容：仅预留字段，暂不执行</span></div></Card>
                            </div>
                        </div>
                    </SectionCard> : null}
                    {activeSection === 'users' ? <SectionCard title="用户与空间分配" subtitle="维护用户名、显示名、homeDir 和配额，帮助管理员快速识别超额用户。" summary={[<SummaryTag key="u">{current.users.filter((user) => user.enabled).length}/{current.users.length} 已启用</SummaryTag>, <SummaryTag key="q" color={status?.storage?.overQuotaUsers?.length ? 'orange' : 'green'}>{status?.storage?.overQuotaUsers?.length ? `${status.storage.overQuotaUsers.length} 个超额用户` : '无超额用户'}</SummaryTag>]} collapsed={panels.state.users} onToggle={() => panels.toggle('users')} actions={<Button icon={<SaveOutlined />} loading={saving} onClick={() => void saveConfig()}>保存本区</Button>}>
                        <div className={styles.sectionGrid}>
                            <div className={styles.formPanel}>
                                <Form.List name="users">{(fields, {add, remove}) => <div className={styles.listEditor}><div className={styles.editorToolbar}><Typography.Title level={5}>用户列表</Typography.Title><Button icon={<PlusOutlined />} onClick={() => add({username: '', displayName: '', quotaGb: current.storage.defaultUserQuotaGb, enabled: true, homeDir: ''})}>新增用户</Button></div>{fields.map((field) => <Card key={field.key} size="small" className={styles.editorCard}><div className={styles.editorHeader}><Typography.Text strong>用户 {field.name + 1}</Typography.Text><Button danger type="text" icon={<DeleteOutlined />} onClick={() => remove(field.name)}>删除</Button></div><Row gutter={16}><Col xs={24} md={6}><Form.Item label="用户名" name={[field.name, 'username']} rules={[{required: true, message: '请输入用户名'}]}><Input /></Form.Item></Col><Col xs={24} md={6}><Form.Item label="显示名" name={[field.name, 'displayName']} rules={[{required: true, message: '请输入显示名'}]}><Input /></Form.Item></Col><Col xs={24} md={6}><Form.Item label="HomeDir" name={[field.name, 'homeDir']} rules={[{required: true, message: '请输入 homeDir'}]}><Input /></Form.Item></Col><Col xs={24} md={3}><Form.Item label="配额 (GB)" name={[field.name, 'quotaGb']}><InputNumber min={0.001} style={{width: '100%'}} /></Form.Item></Col><Col xs={24} md={3}><Form.Item label="启用" name={[field.name, 'enabled']} valuePropName="checked"><Switch /></Form.Item></Col></Row></Card>)}</div>}</Form.List>
                            </div>
                            <div className={styles.sidePanel}><Card size="small" className={styles.sideCard}><Typography.Title level={5}>超额用户提醒</Typography.Title>{status?.storage?.overQuotaUsers?.length ? <List size="small" dataSource={status.storage.overQuotaUsers} renderItem={(item) => <List.Item><div className={styles.snapshotRow}><div><Typography.Text strong>{item.displayName}</Typography.Text><Typography.Paragraph className={styles.mutedText}>{item.username}</Typography.Paragraph></div><Tag color="orange">{item.percent ? `${item.percent.toFixed(1)}%` : '超额'}</Tag></div></List.Item>} /> : <Empty description="当前没有超额用户" image={Empty.PRESENTED_IMAGE_SIMPLE} />}</Card></div>
                        </div>
                    </SectionCard> : null}
                    {activeSection === 'backup' ? <SectionCard title="备份与迁移" subtitle="整站快照、用户导出和导入演练统一收口在这里，便于迁移前后核验。" summary={[<SummaryTag key="b">{backups.length} 条快照</SummaryTag>, <SummaryTag key="c" color="blue">{current.backup.compression}</SummaryTag>]} collapsed={panels.state.backup} onToggle={() => panels.toggle('backup')} actions={<Button type="primary" icon={<ReloadOutlined />} loading={backupRunning} onClick={() => void createBackup()}>创建整站快照</Button>}>
                        <div className={styles.sectionGrid}>
                            <div className={styles.formPanel}>
                                <Row gutter={16}>
                                    <Col xs={24} md={8}><Form.Item label="快照目录" name={['backup', 'snapshotRootDir']}><Input /></Form.Item></Col>
                                    <Col xs={24} md={4}><Form.Item label="保留数量" name={['backup', 'retentionCount']}><InputNumber min={1} precision={0} style={{width: '100%'}} /></Form.Item></Col>
                                    <Col xs={24} md={4}><Form.Item label="压缩格式" name={['backup', 'compression']}><Select options={[{value: 'tar.gz', label: 'tar.gz'}]} /></Form.Item></Col>
                                    <Col xs={24} md={4}><Form.Item label="允许用户导出" name={['backup', 'allowUserExport']} valuePropName="checked"><Switch /></Form.Item></Col>
                                    <Col xs={24} md={4}><Form.Item label="创建后校验" name={['backup', 'verifyAfterCreate']} valuePropName="checked"><Switch /></Form.Item></Col>
                                </Row>
                                <div className={styles.subsection}>
                                    <Typography.Title level={5}>迁移操作</Typography.Title>
                                    <div className={styles.inlineForm}><Input value={exportUsername} onChange={(event) => setExportUsername(event.target.value)} placeholder="输入导出用户，例如 alice" /><Button onClick={() => void runExport()}>导出用户</Button></div>
                                    <div className={styles.inlineForm}><Input value={importArchivePath} onChange={(event) => setImportArchivePath(event.target.value)} placeholder="归档路径，例如 /data/snapshots/user-alice.tar.gz" /><Input value={importTargetUsername} onChange={(event) => setImportTargetUsername(event.target.value)} placeholder="目标用户" /><Switch checked={dryRun} onChange={setDryRun} checkedChildren="演练" unCheckedChildren="执行" /><Button icon={<InboxOutlined />} onClick={() => void runImport()}>{dryRun ? '演练导入' : '执行导入'}</Button></div>
                                </div>
                            </div>
                            <div className={styles.sidePanel}><Card size="small" className={styles.sideCard}><Typography.Title level={5}>最近快照</Typography.Title>{backups.length ? <List size="small" dataSource={backups.slice(0, 5)} renderItem={(item) => <List.Item><div className={styles.snapshotRow}><div><Typography.Text strong>{item.snapshotId}</Typography.Text><Typography.Paragraph className={styles.mutedText}>{item.kind === 'site' ? '整站快照' : '用户导出'} · {formatDate(item.createdAt)}</Typography.Paragraph></div><Tag color={item.status === 'verified' ? 'green' : 'blue'}>{item.status}</Tag></div></List.Item>} /> : <Empty description="暂无备份记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />}</Card></div>
                        </div>
                    </SectionCard> : null}
                    {activeSection === 'system' ? <SectionCard title="系统配置与告警" subtitle="维护产品文案、认证和 tunnel 参数，并集中查看依赖状态、运行告警与操作日志。" summary={[<SummaryTag key="db" color={status?.database?.connected ? 'green' : 'red'}>{status?.database?.connected ? '数据库正常' : '数据库异常'}</SummaryTag>, <SummaryTag key="ng" color={status?.ngrok?.connected ? 'green' : 'default'}>{status?.ngrok?.connected ? '隧道在线' : '隧道未连接'}</SummaryTag>, <SummaryTag key="ev">{events.length} 条事件</SummaryTag>]} collapsed={panels.state.system} onToggle={() => panels.toggle('system')} actions={<Button icon={<SaveOutlined />} loading={saving} onClick={() => void saveConfig()}>保存本区</Button>}>
                        <div className={styles.systemGrid}>
                            <div className={styles.formPanel}>
                                <Card size="small" className={styles.sideCard}>
                                    <Typography.Title level={5}>应用与帮助</Typography.Title>
                                    <Row gutter={16}>
                                        <Col xs={24} md={12}><Form.Item label="产品名称" name={['ui', 'appName']}><Input placeholder="Magus Cloud" /></Form.Item></Col>
                                        <Col xs={24} md={12}><Form.Item label="帮助链接" name={['ui', 'supportUrl']}><Input placeholder="https://support.example.com" /></Form.Item></Col>
                                    </Row>
                                    <Row gutter={16}>
                                        <Col xs={24} md={12}><Form.Item label="默认语言" name={['ui', 'defaultLocale']}><Select options={[{value: 'zh-CN', label: '简体中文'}, {value: 'en-US', label: 'English'}]} /></Form.Item></Col>
                                        <Col xs={24} md={12} className={styles.sourceRow}><Typography.Text type="secondary">字段来源：</Typography.Text><Tag color="blue">{serviceConfig.fieldSources.ui.defaultLocale === 'service-config' ? '主配置' : serviceConfig.fieldSources.ui.defaultLocale}</Tag></Col>
                                    </Row>
                                </Card>
                                <Card size="small" className={styles.sideCard}>
                                    <Typography.Title level={5}>认证与会话</Typography.Title>
                                    <Row gutter={16}>
                                        <Col xs={24} md={8}><Form.Item label="Cookie 名称" name={['auth', 'cookieName']}><Input /></Form.Item></Col>
                                        <Col xs={24} md={8}><Form.Item label="会话 TTL (秒)" name={['auth', 'sessionTtlSeconds']}><InputNumber min={300} precision={0} style={{width: '100%'}} /></Form.Item></Col>
                                        <Col xs={24} md={8}><Form.Item label="管理员用户名" name={['auth', 'adminUsername']}><Input /></Form.Item></Col>
                                    </Row>
                                    <Form.Item label="允许管理员应急登录" name={['auth', 'adminFallbackEnabled']} valuePropName="checked"><Switch /></Form.Item>
                                </Card>
                                <Card size="small" className={styles.sideCard}>
                                    <Typography.Title level={5}>Feishu 与 ngrok</Typography.Title>
                                    <Row gutter={16}>
                                        <Col xs={24} md={6}><Form.Item label="启用飞书登录" name={['feishu', 'enabled']} valuePropName="checked"><Switch /></Form.Item></Col>
                                        <Col xs={24} md={6}><div className={styles.readonlyValue}>FEISHU_APP_ID / SECRET 仅环境变量注入</div></Col>
                                        <Col xs={24} md={12}><Form.Item label="飞书应用基础地址" name={['feishu', 'appBaseUrl']}><Input /></Form.Item></Col>
                                    </Row>
                                    <Row gutter={16}>
                                        <Col xs={24} md={12}><Form.Item label="飞书回调地址" name={['feishu', 'callbackBaseUrl']}><Input /></Form.Item></Col>
                                        <Col xs={24} md={12}><Form.Item label="ngrok API 地址" name={['ngrok', 'apiUrl']}><Input /></Form.Item></Col>
                                    </Row>
                                    <Row gutter={16}>
                                        <Col xs={24} md={6}><Form.Item label="启用 ngrok" name={['ngrok', 'enabled']} valuePropName="checked"><Switch /></Form.Item></Col>
                                        <Col xs={24} md={6}><Form.Item label="域名" name={['ngrok', 'domain']}><Input /></Form.Item></Col>
                                        <Col xs={24} md={6}><Form.Item label="隧道名称" name={['ngrok', 'tunnelName']}><Input /></Form.Item></Col>
                                        <Col xs={24} md={6}><Form.Item label="转发地址" name={['ngrok', 'addr']}><Input /></Form.Item></Col>
                                    </Row>
                                </Card>
                            </div>
                            <div className={styles.sidePanel}>
                                <Card size="small" className={styles.sideCard}><Typography.Title level={5}>依赖与告警</Typography.Title><Space wrap size={[8, 8]}><Tag color={status?.database?.connected ? 'green' : 'red'}>{status?.database?.connected ? '数据库已连接' : '数据库未连接'}</Tag><Tag color={status?.dependencies?.purePw ? 'green' : 'default'}>{status?.dependencies?.purePw ? 'pure-pw 就绪' : 'pure-pw 未启用'}</Tag></Space>{status?.storage?.warningTriggered ? <Alert showIcon type="warning" message="可用容量已接近告警阈值" description={`当前阈值 ${status.storage.warningThresholdPercent ?? current.storage.warningThresholdPercent}%`} style={{marginTop: 16}} /> : null}</Card>
                                <Card size="small" className={styles.sideCard}><Typography.Title level={5}>操作事件</Typography.Title>{events.length ? <List size="small" dataSource={events.slice(0, 8)} renderItem={(event) => <List.Item><div className={styles.eventRow}><Tag color={event.level === 'error' ? 'red' : event.level === 'warn' ? 'orange' : 'blue'}>{event.level}</Tag><Typography.Text>{event.message}</Typography.Text><Typography.Text type="secondary">{formatDate(event.created_at)}</Typography.Text></div></List.Item>} /> : <Empty description="暂无事件" image={Empty.PRESENTED_IMAGE_SIMPLE} />}</Card>
                                <Card size="small" className={styles.sideCard}><Typography.Title level={5}>日志窗口</Typography.Title><div className={styles.logPanel}>{logs.length ? logs.join('\n') : '暂无日志输出'}</div></Card>
                            </div>
                        </div>
                    </SectionCard> : null}
                    </div>
                </div>
            </Form>
        </div>
    );
}
