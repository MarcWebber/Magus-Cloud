import {ReactNode, useEffect, useMemo, useRef, useState} from 'react';
import {
    AppstoreOutlined,
    DeleteOutlined,
    DownloadOutlined,
    EyeOutlined,
    FileImageOutlined,
    FileTextOutlined,
    FolderAddOutlined,
    FolderFilled,
    FolderOpenOutlined,
    QuestionCircleOutlined,
    HomeOutlined,
    LinkOutlined,
    PlaySquareOutlined,
    ReloadOutlined,
    SearchOutlined,
    ShareAltOutlined,
    UploadOutlined,
} from '@ant-design/icons';
import {
    Badge,
    Breadcrumb,
    Button,
    Card,
    Empty,
    Input,
    Modal,
    Popconfirm,
    Progress,
    Segmented,
    Space,
    Statistic,
    Table,
    Tag,
    message,
} from 'antd';
import type {ColumnsType} from 'antd/es/table';
import {apiClient} from '../../../lib/api/client';
import {useHelpDrawer} from '../../../app/providers/HelpProvider';
import {useI18n} from '../../../app/providers/I18nProvider';
import {useSession} from '../../../app/providers/SessionProvider';
import {ShareDialog} from '../components/ShareDialog';
import {PreviewModal} from '../components/PreviewModal';
import styles from './DashboardPage.module.css';
import {FileNode, RawFileNode, buildPathLabel, doesPathExist, flattenNodes, getNodesAtPath, hydrateNodes} from '../utils/fileDisplay';

type QuotaPayload = {
    enabled: boolean;
    limitBytes: number | null;
    usedBytes: number;
    remainingBytes: number | null;
    source: 'disabled' | 'default' | 'user';
    usedLabel: string;
    limitLabel: string | null;
    remainingLabel: string | null;
    percent: number | null;
};

type UsagePayload = {
    totalCapacity: string;
    totalUsed: string;
    allocatable: string;
    nodes: Array<{id: string; baseUrl: string; storageMounted: boolean; databaseOk: boolean; lastHeartbeat: string}>;
    recentBackup: null | {snapshotId: string};
    storagePolicy?: {
        quotaMode: 'hard' | 'oversell';
        warningThresholdPercent: number;
        autoExpandEnabled: boolean;
        warningTriggered: boolean;
    };
    personal: {used: string; quota: QuotaPayload};
};

type ShareRecord = {
    shareId: string;
    fileName: string;
    type: 'file' | 'folder';
    accessCode: string;
    clickCount: number;
    downloadCount: number;
};

type TableRow = FileNode & {pathLabel: string};
type PrimaryNav = 'home' | 'files' | 'shares' | 'recycle';
type SidebarView = 'all' | 'image' | 'document' | 'video' | 'other' | 'recycle' | 'shares';

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']);
const DOCUMENT_EXTENSIONS = new Set(['txt', 'md', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf', 'json']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'avi', 'mkv', 'webm']);

const FILTERS: Array<{key: SidebarView; label: string; icon?: ReactNode}> = [
    {key: 'all', label: '我的文件'},
    {key: 'image', label: '图片', icon: <FileImageOutlined />},
    {key: 'document', label: '文档', icon: <FileTextOutlined />},
    {key: 'video', label: '视频', icon: <PlaySquareOutlined />},
    {key: 'other', label: '其他', icon: <AppstoreOutlined />},
    {key: 'recycle', label: '回收站'},
    {key: 'shares', label: '分享记录'},
];

function getFileExtension(name: string) {
    return name.split('.').pop()?.toLowerCase() || '';
}

function matchesView(item: FileNode, view: SidebarView) {
    if (view === 'all') {
        return true;
    }
    if (view === 'shares' || view === 'recycle' || item.type === 'folder') {
        return false;
    }
    const extension = getFileExtension(item.name);
    if (view === 'image') return IMAGE_EXTENSIONS.has(extension);
    if (view === 'document') return DOCUMENT_EXTENSIONS.has(extension);
    if (view === 'video') return VIDEO_EXTENSIONS.has(extension);
    return !IMAGE_EXTENSIONS.has(extension) && !DOCUMENT_EXTENSIONS.has(extension) && !VIDEO_EXTENSIONS.has(extension);
}

function compareNodes(left: FileNode, right: FileNode) {
    if (left.type !== right.type) {
        return left.type === 'folder' ? -1 : 1;
    }
    return left.name.localeCompare(right.name, 'zh-CN');
}

function download(name: string, type: 'file' | 'folder') {
    const anchor = document.createElement('a');
    anchor.href = `/api/download?name=${encodeURIComponent(name)}&type=${type}`;
    anchor.target = '_blank';
    anchor.rel = 'noreferrer';
    anchor.click();
}

export default function DashboardPage() {
    const {t, locale} = useI18n();
    const {session} = useSession();
    const {openHelp} = useHelpDrawer();
    const [files, setFiles] = useState<FileNode[]>([]);
    const [usage, setUsage] = useState<UsagePayload | null>(null);
    const [shares, setShares] = useState<ShareRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [primaryNav, setPrimaryNav] = useState<PrimaryNav>('home');
    const [tab, setTab] = useState<'files' | 'shares'>('files');
    const [view, setView] = useState<SidebarView>('all');
    const [currentPath, setCurrentPath] = useState<string[]>([]);
    const [query, setQuery] = useState('');
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [shareTarget, setShareTarget] = useState<FileNode | null>(null);
    const [previewTarget, setPreviewTarget] = useState<FileNode | null>(null);
    const [folderModalOpen, setFolderModalOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const folderInputRef = useRef<HTMLInputElement | null>(null);

    const refreshAll = async () => {
        setLoading(true);
        try {
            const [filePayload, usagePayload, sharePayload] = await Promise.all([
                apiClient.get<{files: RawFileNode[]}>('/api/files'),
                apiClient.get<UsagePayload>('/api/usage'),
                apiClient.get<ShareRecord[]>('/api/share/list'),
            ]);
            setFiles(hydrateNodes(filePayload.files || []));
            setUsage(usagePayload);
            setShares(sharePayload);
        } catch (error) {
            message.error(error instanceof Error ? error.message : t('files.loadFailed'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void refreshAll();
    }, []);

    useEffect(() => {
        if (!doesPathExist(files, currentPath)) {
            setCurrentPath([]);
        }
    }, [files, currentPath]);

    useEffect(() => {
        if (primaryNav === 'shares') {
            setTab('shares');
            setView('shares');
            setCurrentPath([]);
            return;
        }
        if (primaryNav === 'recycle') {
            setTab('files');
            setView('recycle');
            setCurrentPath([]);
            return;
        }
        setTab('files');
        if (view === 'shares' || view === 'recycle') {
            setView('all');
        }
    }, [primaryNav, view]);

    const rootFolders = useMemo(() => files.filter((item) => item.type === 'folder').slice(0, 8), [files]);
    const currentItems = useMemo(() => getNodesAtPath(files, currentPath), [files, currentPath]);
    const filteredCurrentItems = useMemo(() => {
        const base = view === 'all' ? currentItems : currentItems.filter((item) => matchesView(item, view));
        if (!query.trim()) {
            return [...base].sort(compareNodes);
        }
        return flattenNodes(base).filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase())).sort(compareNodes);
    }, [currentItems, query, view]);
    const tableItems = useMemo<TableRow[]>(() => filteredCurrentItems.map((item) => ({...item, pathLabel: buildPathLabel(item.pathSegments)})), [filteredCurrentItems]);

    const createFolder = async () => {
        if (!newFolderName.trim()) {
            message.error('请输入文件夹名称');
            return;
        }
        try {
            await apiClient.post('/api/create-folder', {folderName: newFolderName.trim(), parentPath: currentPath});
            setFolderModalOpen(false);
            setNewFolderName('');
            message.success('文件夹已创建');
            await refreshAll();
        } catch (error) {
            message.error(error instanceof Error ? error.message : '创建文件夹失败');
        }
    };

    const uploadSelected = async (event: React.ChangeEvent<HTMLInputElement>, folder = false) => {
        if (!event.target.files?.length) return;
        const formData = new FormData();
        try {
            if (folder) {
                Array.from(event.target.files).forEach((file) => formData.append('folderFiles', new File([file], file.webkitRelativePath)));
                await apiClient.upload('/api/upload-folder', formData, setUploadProgress);
            } else {
                formData.append('file', event.target.files[0]);
                await apiClient.upload('/api/upload', formData, setUploadProgress);
            }
            message.success(t('files.uploadSuccess'));
            await refreshAll();
        } catch (error) {
            message.error(error instanceof Error ? error.message : t('files.uploadFailed'));
        } finally {
            setUploadProgress(null);
            event.target.value = '';
        }
    };

    const removeItem = async (item: FileNode) => {
        await apiClient.post('/api/delete', {filename: item.id});
        message.success(t('files.deleteSuccess'));
        await refreshAll();
    };

    const revokeShare = async (shareId: string) => {
        await apiClient.delete(`/api/share/${shareId}`);
        message.success(t('files.revokeSuccess'));
        await refreshAll();
    };

    const columns: ColumnsType<TableRow> = [
        {
            title: t('files.tableName'),
            dataIndex: 'name',
            render: (_, item) => (
                <div className={styles.nameCell}>
                    <span className={styles.nameIcon}>{item.type === 'folder' ? <FolderOpenOutlined /> : <AppstoreOutlined />}</span>
                    <Button type="link" className={styles.nameButton} onClick={() => item.type === 'folder' ? setCurrentPath(item.pathSegments) : setPreviewTarget(item)}>
                        {item.name}
                    </Button>
                    {query.trim() && item.pathLabel !== '根目录' ? <span className={styles.pathTag}>{item.pathLabel}</span> : null}
                </div>
            ),
        },
        {title: t('files.tableSize'), dataIndex: 'sizeLabel', width: 140},
        {title: t('files.tableModified'), dataIndex: 'mtime', width: 220, render: (_, item) => item.mtime ? new Date(item.mtime).toLocaleString(locale) : '-'},
        {
            title: t('files.tableActions'),
            key: 'actions',
            width: 190,
            render: (_, item) => (
                <div className={styles.tableActions}>
                    {item.type === 'file' ? <Button type="text" icon={<EyeOutlined />} onClick={() => setPreviewTarget(item)} /> : null}
                    <Button type="text" icon={<DownloadOutlined />} onClick={() => download(item.id, item.type)} />
                    <Button type="text" icon={<ShareAltOutlined />} onClick={() => setShareTarget(item)} />
                    <Popconfirm title={t('files.deleteConfirm')} onConfirm={() => void removeItem(item)}>
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </div>
            ),
        },
    ];

    const capacityPercent = usage?.personal.quota.percent ?? 0;
    const warningText = usage?.storagePolicy?.warningTriggered
        ? `总容量使用率已超过 ${usage.storagePolicy.warningThresholdPercent}% 告警阈值，请尽快安排清理或扩容评估。`
        : '当前集群容量状态平稳，上传、分享和预览链路可以继续正常使用。';

    return (
        <div className={styles.dashboardPage}>
            <div className={styles.shellGrid}>
                <aside className={styles.iconRail}>
                    <div className={styles.iconRailTop}>
                        <button type="button" className={`${styles.railButton} ${primaryNav === 'home' ? styles.railButtonActive : ''}`} onClick={() => setPrimaryNav('home')}><HomeOutlined /><span>首页</span></button>
                        <button type="button" className={`${styles.railButton} ${primaryNav === 'files' ? styles.railButtonActive : ''}`} onClick={() => setPrimaryNav('files')}><FolderFilled /><span>文件</span></button>
                        <button type="button" className={`${styles.railButton} ${primaryNav === 'shares' ? styles.railButtonActive : ''}`} onClick={() => setPrimaryNav('shares')}><ShareAltOutlined /><span>分享</span></button>
                        <button type="button" className={`${styles.railButton} ${primaryNav === 'recycle' ? styles.railButtonActive : ''}`} onClick={() => setPrimaryNav('recycle')}><DeleteOutlined /><span>回收站</span></button>
                    </div>
                    <div className={styles.iconRailBottom}>
                        <button type="button" className={styles.railButton} onClick={() => openHelp('user')}><QuestionCircleOutlined /><span>帮助</span></button>
                    </div>
                </aside>

                <aside className={styles.secondaryRail}>
                    <div className={styles.secondaryHeader}>
                        <strong>我的空间</strong>
                        <span>常用分类、快捷访问和容量状态都集中在这里。</span>
                    </div>

                    <div className={styles.navSection}>
                        {FILTERS.map((item) => {
                            const active = item.key === 'shares' ? tab === 'shares' : item.key === 'recycle' ? primaryNav === 'recycle' : view === item.key;
                            return (
                                <button
                                    key={item.key}
                                    type="button"
                                    className={`${styles.navButton} ${active ? styles.navButtonActive : ''}`}
                                    onClick={() => {
                                        if (item.key === 'shares') {
                                            setPrimaryNav('shares');
                                            return;
                                        }
                                        if (item.key === 'recycle') {
                                            setPrimaryNav('recycle');
                                            return;
                                        }
                                        setPrimaryNav('files');
                                        setView(item.key);
                                        if (item.key === 'all') {
                                            setCurrentPath([]);
                                        }
                                    }}
                                >
                                    <span>{item.icon} {item.label}</span>
                                    {item.key === 'shares' && shares.length > 0 ? <Badge count={shares.length} /> : item.key === 'recycle' ? <Tag bordered={false}>预留</Tag> : null}
                                </button>
                            );
                        })}
                    </div>

                    <div className={styles.navSection}>
                        <div className={styles.sectionLabel}>快捷访问</div>
                        {rootFolders.length === 0 ? <div className={styles.emptyTip}>上传后，常用根目录会出现在这里。</div> : rootFolders.map((item) => (
                            <button key={item.id} type="button" className={styles.quickButton} onClick={() => {setPrimaryNav('files'); setCurrentPath(item.pathSegments); setView('all');}}>
                                <FolderFilled />
                                <span>{item.name}</span>
                            </button>
                        ))}
                    </div>

                    <div className={styles.storagePanel}>
                        <div className={styles.storagePanelTitle}>个人配额</div>
                        <div className={styles.storagePanelValue}>{usage?.personal.used || '0 B'}</div>
                        <div className={styles.storagePanelHint}>已用 / {usage?.personal.quota.limitLabel || '未设置配额'}</div>
                        <Progress percent={capacityPercent} showInfo={false} strokeColor="#1677ff" />
                    </div>
                </aside>

                <main className={styles.mainPanel}>
                    <div className={styles.heroBar}>
                        <div className={styles.heroBarLeft}>
                            <div>
                                <h2>文件工作台</h2>
                                <p>像使用网盘一样浏览、整理、分享和预览你的资料。</p>
                            </div>
                            <Space wrap>
                                <Button type="primary" icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()}>{t('files.uploadFile')}</Button>
                                <Button icon={<UploadOutlined />} onClick={() => folderInputRef.current?.click()}>{t('files.uploadFolder')}</Button>
                                <Button icon={<FolderAddOutlined />} onClick={() => setFolderModalOpen(true)}>新建文件夹</Button>
                                <Button icon={<ReloadOutlined />} onClick={() => void refreshAll()}>{t('files.refresh')}</Button>
                            </Space>
                        </div>

                        <div className={styles.heroBarRight}>
                            <Input allowClear prefix={<SearchOutlined />} className={styles.searchBox} placeholder="检索文件或文件夹" value={query} onChange={(event) => setQuery(event.target.value)} />
                            <Segmented
                                value={tab}
                                onChange={(value) => {
                                    const nextTab = value as 'files' | 'shares';
                                    setTab(nextTab);
                                    setPrimaryNav(nextTab === 'shares' ? 'shares' : 'files');
                                    if (nextTab === 'files' && view === 'shares') setView('all');
                                }}
                                options={[{label: t('files.tabFiles'), value: 'files'}, {label: t('files.tabShares'), value: 'shares'}]}
                            />
                        </div>
                    </div>

                    {uploadProgress !== null ? <div className={styles.progressWrap}><Progress percent={uploadProgress} /></div> : null}

                    <div className={styles.statsRow}>
                        <Card className={`glass-card ${styles.statCard}`} loading={loading}><Statistic title={t('files.personalUsage')} value={usage?.personal.used || '0 B'} /></Card>
                        <Card className={`glass-card ${styles.statCard}`} loading={loading}><Statistic title="个人配额" value={usage?.personal.quota.limitLabel || '未设置'} /></Card>
                        <Card className={`glass-card ${styles.statCard}`} loading={loading}><Statistic title={t('files.totalUsed')} value={usage?.totalUsed || '0 B'} /></Card>
                        <Card className={`glass-card ${styles.statCard}`} loading={loading}><Statistic title="可分配空间" value={usage?.allocatable || '0 B'} /></Card>
                    </div>

                    <div className={styles.noticeRow}>
                        <Card className={`glass-card ${styles.noticeCard}`}>
                            <div className={styles.noticeHead}><strong>容量与策略</strong><span>{usage?.storagePolicy?.quotaMode === 'oversell' ? '超卖预留模式' : '硬限制模式'}</span></div>
                            <Progress percent={capacityPercent} strokeColor="#1677ff" format={() => usage?.personal.quota.remainingLabel || '未设置'} />
                            <div className={styles.noticeText}>当前仅展示策略字段，上传限制仍按现有硬限制逻辑执行。</div>
                        </Card>
                        <Card className={`glass-card ${styles.noticeCard}`}>
                            <div className={styles.noticeHead}><strong>集群与告警</strong><span>{session?.user?.role === 'admin' ? `${usage?.nodes.length || 0} 个在线节点视图` : '状态概览'}</span></div>
                            <div className={styles.noticeText}>{warningText}</div>
                            {usage?.recentBackup ? <Tag color="blue">最近备份 {usage.recentBackup.snapshotId}</Tag> : null}
                        </Card>
                    </div>

                    {primaryNav === 'recycle' ? (
                        <Card className={`glass-card ${styles.contentCard}`}>
                            <Empty description="回收站入口已预留。本轮删除仍为直接删除，不进入回收站。" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        </Card>
                    ) : tab === 'files' ? (
                        <Card className={`glass-card ${styles.contentCard}`} loading={loading}>
                            <div className={styles.contentHeader}>
                                <div>
                                    <Breadcrumb items={[
                                        {title: <Button type="link" onClick={() => setCurrentPath([])} className={styles.breadcrumbButton}>{t('files.rootBreadcrumb')}</Button>},
                                        ...currentPath.map((segment, index) => ({
                                            title: <Button type="link" className={styles.breadcrumbButton} onClick={() => setCurrentPath(currentPath.slice(0, index + 1))}>{segment}</Button>,
                                        })),
                                    ]} />
                                    <div className={styles.pathMeta}>{query.trim() ? `共找到 ${tableItems.length} 条匹配结果` : `当前位置：${currentPath.length ? currentPath.join(' / ') : '根目录'}`}</div>
                                </div>
                                <Tag color="blue">{tableItems.length} 项</Tag>
                            </div>
                            <Table rowKey="id" className={styles.fileTable} columns={columns} dataSource={tableItems} pagination={{pageSize: 12, showSizeChanger: false}} locale={{emptyText: <Empty description={query.trim() ? '没有匹配结果' : t('files.emptyFolder')} />}} />
                        </Card>
                    ) : (
                        <div className={styles.shareGrid}>
                            {shares.length === 0 ? (
                                <Card className={`glass-card ${styles.contentCard}`}><Empty description={t('files.emptyShares')} /></Card>
                            ) : shares.map((share) => {
                                const smartUrl = `${window.location.origin}/s/${share.shareId}${share.accessCode ? `?code=${share.accessCode}` : ''}`;
                                return (
                                    <Card key={share.shareId} className={`glass-card ${styles.shareCard}`}>
                                        <div className={styles.shareHeader}>
                                            <div>
                                                <strong>{share.fileName}</strong>
                                                <div className={styles.shareMeta}>
                                                    <Tag>{t(`files.fileType.${share.type}`)}</Tag>
                                                    <Tag color="blue">{share.shareId}</Tag>
                                                    {share.accessCode ? <Tag color="gold">提取码 {share.accessCode}</Tag> : null}
                                                </div>
                                            </div>
                                            <div className={styles.shareStats}><span>访问 {share.clickCount}</span><span>下载 {share.downloadCount}</span></div>
                                        </div>
                                        <p className={styles.shareUrl}>{smartUrl}</p>
                                        <div className={styles.shareActions}>
                                            <Button icon={<LinkOutlined />} onClick={async () => {await navigator.clipboard.writeText(smartUrl); message.success(t('files.copySuccess'));}}>{t('files.copyLink')}</Button>
                                            <Popconfirm title={t('files.revokeConfirm')} onConfirm={() => void revokeShare(share.shareId)}><Button danger>{t('files.revoke')}</Button></Popconfirm>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </main>
            </div>

            <input ref={fileInputRef} hidden type="file" onChange={(event) => void uploadSelected(event)} />
            <input ref={(node) => {folderInputRef.current = node; if (node) node.setAttribute('webkitdirectory', '');}} hidden type="file" onChange={(event) => void uploadSelected(event, true)} />

            <Modal open={folderModalOpen} title="新建文件夹" onCancel={() => setFolderModalOpen(false)} onOk={() => void createFolder()} okText="创建" cancelText="取消">
                <Input placeholder="输入文件夹名称" value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)} />
            </Modal>

            {shareTarget ? <ShareDialog open={Boolean(shareTarget)} fileName={shareTarget.id} type={shareTarget.type} onClose={() => setShareTarget(null)} /> : null}
            {previewTarget ? <PreviewModal open={Boolean(previewTarget)} fileId={previewTarget.id} fileName={previewTarget.name} onClose={() => setPreviewTarget(null)} /> : null}
        </div>
    );
}
