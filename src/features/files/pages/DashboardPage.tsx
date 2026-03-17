import {useEffect, useMemo, useRef, useState} from 'react';
import {
    Breadcrumb,
    Button,
    Card,
    Empty,
    Input,
    Popconfirm,
    Progress,
    Segmented,
    Statistic,
    Table,
    Tag,
    Tree,
    message,
} from 'antd';
import type {DataNode} from 'antd/es/tree';
import type {ColumnsType} from 'antd/es/table';
import {
    CaretDownOutlined,
    CaretRightOutlined,
    DeleteOutlined,
    DownloadOutlined,
    EyeOutlined,
    FileOutlined,
    FolderFilled,
    FolderOpenOutlined,
    LinkOutlined,
    ReloadOutlined,
    ShareAltOutlined,
    UploadOutlined,
} from '@ant-design/icons';
import {apiClient} from '../../../lib/api/client';
import {ShareDialog} from '../components/ShareDialog';
import {PreviewModal} from '../components/PreviewModal';
import {useI18n} from '../../../app/providers/I18nProvider';
import styles from './DashboardPage.module.css';
import {
    buildPathLabel,
    doesPathExist,
    FileNode,
    flattenNodes,
    formatBytes,
    getAllFolderIds,
    getNodesAtPath,
    hydrateNodes,
    parseSize,
    RawFileNode,
} from '../utils/fileDisplay';

type UsagePayload = {
    usage: Array<{name: string; size: string}>;
    totalUsed: string;
    totalFree: string;
};

type ShareRecord = {
    shareId: string;
    fileName: string;
    type: 'file' | 'folder';
    expireAt: number | null;
    accessCode: string;
    createdAt: number;
    clickCount: number;
    downloadCount: number;
};

type QuotaPayload = {
    enabled: boolean;
    total: string | null;
    remaining: string | null;
    percent: number | null;
};

type TreeNode = DataNode & {
    fileNode?: FileNode;
    pathSegments?: string[];
};

type TableRow = FileNode & {
    pathLabel: string;
};

const ROOT_KEY = '__root__';
const TEXT = {
    file: '\u6587\u4ef6',
    folder: '\u6587\u4ef6\u5939',
    allFiles: '\u5168\u90e8\u6587\u4ef6',
    other: '\u5176\u4ed6',
    rootDir: '\u6839\u76ee\u5f55',
    path: '\u8def\u5f84',
    searchResults: '\u641c\u7d22\u7ed3\u679c',
    currentFolder: '\u5f53\u524d\u76ee\u5f55',
    item: '\u9879',
    storageOverview: '\u5b58\u50a8\u6982\u89c8',
    storageHint: '\u7528\u56fe\u8868\u5feb\u901f\u67e5\u770b\u4e2a\u4eba\u5360\u7528\u3001\u56e2\u961f\u603b\u91cf\u548c\u5269\u4f59\u7a7a\u95f4\u3002',
    usageRanking: '\u7528\u91cf\u6392\u884c',
    usageHint: '\u6309\u5df2\u5360\u7528\u7a7a\u95f4\u6392\u5e8f\uff0c\u4fbf\u4e8e\u5feb\u901f\u5b9a\u4f4d\u4e3b\u8981\u6765\u6e90\u3002',
    fileTree: '\u6587\u4ef6\u6811',
    treeHint: '\u70b9\u51fb\u6587\u4ef6\u5939\u5207\u6362\u76ee\u5f55\uff0c\u70b9\u51fb\u6587\u4ef6\u76f4\u63a5\u9884\u89c8\u3002',
    searchPlaceholder: '\u68c0\u7d22\u6587\u4ef6\u6216\u6587\u4ef6\u5939',
    noResults: '\u6ca1\u6709\u5339\u914d\u7684\u7ed3\u679c',
    accessCode: '\u63d0\u53d6\u7801',
    visits: '\u8bbf\u95ee',
    downloads: '\u4e0b\u8f7d',
    quotaRatio: '\u4e2a\u4eba\u914d\u989d\u5360\u6bd4',
    quotaTotal: '\u4e2a\u4eba\u914d\u989d',
    quotaRemaining: '\u5269\u4f59\u914d\u989d',
    notConfigured: '\u672a\u8bbe\u7f6e',
    collapse: '\u6536\u8d77',
    expand: '\u5c55\u5f00',
};

function download(name: string, type: 'file' | 'folder') {
    const anchor = document.createElement('a');
    anchor.href = `/api/download?name=${encodeURIComponent(name)}&type=${type}`;
    anchor.target = '_blank';
    anchor.rel = 'noreferrer';
    anchor.click();
}

function compareName(left: string, right: string) {
    return left.localeCompare(right, 'zh-CN');
}

function compareNodes(left: FileNode, right: FileNode, key: 'name' | 'size' | 'mtime') {
    if (left.type !== right.type) {
        return left.type === 'folder' ? -1 : 1;
    }

    switch (key) {
        case 'size':
            return left.sizeBytes - right.sizeBytes;
        case 'mtime':
            return left.modifiedAt - right.modifiedAt;
        case 'name':
        default:
            return compareName(left.name, right.name);
    }
}

function folderSummary(items: FileNode[]) {
    const folders = items.filter((item) => item.type === 'folder').length;
    const files = items.length - folders;
    return `${TEXT.file} ${files} · ${TEXT.folder} ${folders}`;
}

function mapTreeNode(node: FileNode): TreeNode {
    return {
        key: node.id,
        pathSegments: node.pathSegments,
        fileNode: node,
        isLeaf: node.type === 'file',
        title: (
            <span className={styles.treeLabel}>
                {node.type === 'folder' ? <FolderFilled /> : <FileOutlined />}
                <span className={styles.treeLabelText}>{node.name}</span>
            </span>
        ),
        children: node.children?.map(mapTreeNode),
    };
}

function buildTreeData(nodes: FileNode[]): TreeNode[] {
    return [
        {
            key: ROOT_KEY,
            selectable: true,
            title: <span className={styles.treeRootLabel}>{TEXT.allFiles}</span>,
            icon: <FolderFilled />,
            children: nodes.map(mapTreeNode),
        },
    ];
}

export default function DashboardPage() {
    const {t, locale} = useI18n();
    const [files, setFiles] = useState<FileNode[]>([]);
    const [usage, setUsage] = useState<UsagePayload | null>(null);
    const [quota, setQuota] = useState<QuotaPayload | null>(null);
    const [personalUsage, setPersonalUsage] = useState('0 B');
    const [shares, setShares] = useState<ShareRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'files' | 'shares'>('files');
    const [currentPath, setCurrentPath] = useState<string[]>([]);
    const [query, setQuery] = useState('');
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [shareTarget, setShareTarget] = useState<FileNode | null>(null);
    const [previewTarget, setPreviewTarget] = useState<FileNode | null>(null);
    const [expandedKeys, setExpandedKeys] = useState<string[]>([ROOT_KEY]);
    const [collapsedPanels, setCollapsedPanels] = useState<Record<string, boolean>>({
        overview: false,
        ranking: false,
        tree: false,
        toolbar: false,
        content: false,
    });
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const folderInputRef = useRef<HTMLInputElement | null>(null);

    const refreshAll = async () => {
        setLoading(true);
        try {
            const [filePayload, usagePayload, sharePayload] = await Promise.all([
                apiClient.get<{files: RawFileNode[]; usage: string; quota?: QuotaPayload}>('/api/files'),
                apiClient.get<UsagePayload>('/api/usage'),
                apiClient.get<ShareRecord[]>('/api/share/list'),
            ]);

            setFiles(hydrateNodes(filePayload.files || []));
            setPersonalUsage(formatBytes(parseSize(filePayload.usage)));
            setQuota(filePayload.quota || null);
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
        const folderIds = getAllFolderIds(files);
        if (query.trim()) {
            setExpandedKeys([ROOT_KEY, ...folderIds]);
            return;
        }

        setExpandedKeys((previous) => {
            const keep = previous.filter((key) => key === ROOT_KEY || folderIds.includes(key));
            return keep.length ? keep : [ROOT_KEY, ...folderIds];
        });
    }, [files, query]);

    const currentItems = useMemo(() => getNodesAtPath(files, currentPath), [files, currentPath]);

    const tableItems = useMemo<TableRow[]>(() => {
        const search = query.trim().toLowerCase();
        const source = search
            ? flattenNodes(files).filter((item) => item.name.toLowerCase().includes(search))
            : currentItems;

        return source.map((item) => ({
            ...item,
            pathLabel: buildPathLabel(item.pathSegments),
        }));
    }, [files, currentItems, query]);

    const topUsers = useMemo(() => {
        return [...(usage?.usage || [])]
            .map((item) => {
                const sizeBytes = parseSize(item.size);
                return {
                    ...item,
                    sizeBytes,
                    sizeLabel: formatBytes(sizeBytes),
                };
            })
            .sort((left, right) => right.sizeBytes - left.sizeBytes)
            .slice(0, 6);
    }, [usage]);

    const treeData = useMemo(() => buildTreeData(files), [files]);

    const storageSegments = useMemo(() => {
        const rootItems = [...files]
            .filter((item) => item.sizeBytes > 0)
            .sort((left, right) => right.sizeBytes - left.sizeBytes);
        const topItems = rootItems.slice(0, 5);
        const remainingBytes = rootItems.slice(5).reduce((sum, item) => sum + item.sizeBytes, 0);

        const segments = topItems.map((item) => ({
            name: item.name,
            sizeBytes: item.sizeBytes,
            sizeLabel: item.sizeLabel,
        }));

        if (remainingBytes > 0) {
            segments.push({
                name: TEXT.other,
                sizeBytes: remainingBytes,
                sizeLabel: formatBytes(remainingBytes),
            });
        }

        return segments;
    }, [files]);

    const totalUsedBytes = parseSize(usage?.totalUsed);
    const totalFreeBytes = parseSize(usage?.totalFree);
    const totalCapacityBytes = totalUsedBytes + totalFreeBytes;
    const personalUsageBytes = parseSize(personalUsage);
    const currentPathLabel = currentPath.length ? currentPath.join(' / ') : TEXT.rootDir;
    const personalUsagePercent = quota?.enabled ? quota.percent ?? 0 : null;

    const togglePanel = (key: string) => {
        setCollapsedPanels((previous) => ({
            ...previous,
            [key]: !previous[key],
        }));
    };

    const panelToggle = (key: string) => (
        <Button
            type="text"
            size="small"
            icon={collapsedPanels[key] ? <CaretRightOutlined /> : <CaretDownOutlined />}
            onClick={() => togglePanel(key)}
        >
            {collapsedPanels[key] ? TEXT.expand : TEXT.collapse}
        </Button>
    );

    const uploadSelected = async (event: React.ChangeEvent<HTMLInputElement>, folder = false) => {
        if (!event.target.files?.length) {
            return;
        }

        const formData = new FormData();
        try {
            if (folder) {
                Array.from(event.target.files).forEach((file) => {
                    formData.append('folderFiles', new File([file], file.webkitRelativePath));
                });
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
            sorter: (left, right) => compareNodes(left, right, 'name'),
            defaultSortOrder: 'ascend',
            render: (_, item) => (
                <div className={styles.nameCell}>
                    {item.type === 'folder' ? <FolderOpenOutlined /> : <FileOutlined />}
                    <Button
                        type="link"
                        className={styles.tableNameButton}
                        onClick={() => item.type === 'folder'
                            ? setCurrentPath(item.pathSegments)
                            : setPreviewTarget(item)}
                    >
                        <span className={styles.nameText}>{item.name}</span>
                    </Button>
                </div>
            ),
        },
        {
            title: t('files.tableSize'),
            dataIndex: 'sizeLabel',
            sorter: (left, right) => compareNodes(left, right, 'size'),
        },
        {
            title: t('files.tableModified'),
            dataIndex: 'mtime',
            sorter: (left, right) => compareNodes(left, right, 'mtime'),
            render: (_, item) => item.mtime ? new Date(item.mtime).toLocaleString(locale) : '-',
        },
    ];

    if (query.trim()) {
        columns.push({
            title: TEXT.path,
            dataIndex: 'pathLabel',
            render: (value) => <span className={styles.tablePath}>{value}</span>,
        });
    }

    columns.push({
        title: t('files.tableActions'),
        key: 'actions',
        render: (_, item) => (
            <div className={styles.tableActions}>
                {item.type === 'file' && (
                    <Button icon={<EyeOutlined />} onClick={() => setPreviewTarget(item)}>
                        {t('files.preview')}
                    </Button>
                )}
                <Button icon={<DownloadOutlined />} onClick={() => download(item.id, item.type)}>
                    {t('files.download')}
                </Button>
                <Button icon={<ShareAltOutlined />} onClick={() => setShareTarget(item)}>
                    {t('files.share')}
                </Button>
                <Popconfirm title={t('files.deleteConfirm')} onConfirm={() => void removeItem(item)}>
                    <Button danger icon={<DeleteOutlined />} />
                </Popconfirm>
            </div>
        ),
    });

    return (
        <div className={styles.dashboardPage}>
            <div className={styles.statsGrid}>
                <Card className={`glass-card section-card ${styles.statCard}`} loading={loading}>
                    <Statistic title={t('files.personalUsage')} value={personalUsage} />
                </Card>
                <Card className={`glass-card section-card ${styles.statCard}`} loading={loading}>
                    <Statistic title={t('files.totalUsed')} value={formatBytes(totalUsedBytes)} />
                </Card>
                <Card className={`glass-card section-card ${styles.statCard}`} loading={loading}>
                    <Statistic title={t('files.totalFree')} value={formatBytes(totalFreeBytes)} />
                </Card>
                <Card className={`glass-card section-card ${styles.statCard}`} loading={loading}>
                    <Statistic
                        title={TEXT.quotaRatio}
                        value={personalUsagePercent ?? TEXT.notConfigured}
                        suffix={personalUsagePercent === null ? undefined : '%'}
                    />
                </Card>
                <Card className={`glass-card section-card ${styles.statCard}`} loading={loading}>
                    <Statistic
                        title={query.trim() ? TEXT.searchResults : TEXT.currentFolder}
                        value={query.trim() ? tableItems.length : currentItems.length}
                        suffix={TEXT.item}
                    />
                </Card>
            </div>

            <div className={styles.usageGrid}>
                <Card className="glass-card section-card" loading={loading} extra={panelToggle('overview')}>
                    {!collapsedPanels.overview && (
                        <>
                    <h3 className={styles.sectionTitle}>{TEXT.storageOverview}</h3>
                    <p className={styles.sectionHint}>{TEXT.storageHint}</p>
                    <div className={styles.storageLegend}>
                        <div className={styles.storageLegendItem}>
                            <div className={styles.storageLegendLabel}>
                                <strong>{t('files.personalUsage')}</strong>
                                <span>{personalUsage}</span>
                            </div>
                            <div className={styles.storageBar}>
                                <div
                                    className={styles.storageBarFill}
                                    style={{
                                        width: `${totalUsedBytes > 0 ? Math.min((personalUsageBytes / totalUsedBytes) * 100, 100) : 0}%`,
                                        background: 'linear-gradient(90deg, #2563eb, #38bdf8)',
                                    }}
                                />
                            </div>
                        </div>
                        <div className={styles.storageLegendItem}>
                            <div className={styles.storageLegendLabel}>
                                <strong>{t('files.totalUsed')}</strong>
                                <span>{formatBytes(totalUsedBytes)}</span>
                            </div>
                            <Progress
                                percent={totalCapacityBytes > 0 ? Number(((totalUsedBytes / totalCapacityBytes) * 100).toFixed(1)) : 0}
                                showInfo={false}
                                strokeColor="#1d4ed8"
                            />
                        </div>
                        <div className={styles.storageLegendItem}>
                            <div className={styles.storageLegendLabel}>
                                <strong>{t('files.totalFree')}</strong>
                                <span>{formatBytes(totalFreeBytes)}</span>
                            </div>
                            <Progress
                                percent={totalCapacityBytes > 0 ? Number(((totalFreeBytes / totalCapacityBytes) * 100).toFixed(1)) : 0}
                                showInfo={false}
                                strokeColor="#10b981"
                            />
                        </div>
                        {quota?.enabled && (
                            <>
                                <div className={styles.storageLegendItem}>
                                    <div className={styles.storageLegendLabel}>
                                        <strong>{TEXT.quotaTotal}</strong>
                                        <span>{quota.total}</span>
                                    </div>
                                    <Progress percent={personalUsagePercent ?? 0} showInfo={false} strokeColor="#f59e0b" />
                                </div>
                                <div className={styles.storageLegendItem}>
                                    <div className={styles.storageLegendLabel}>
                                        <strong>{TEXT.quotaRemaining}</strong>
                                        <span>{quota.remaining}</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    {storageSegments.length > 0 && (
                        <div className={styles.segmentList}>
                            {storageSegments.map((item) => (
                                <div key={item.name} className={styles.segmentItem}>
                                    <div className={styles.segmentMeta}>
                                        <strong>{item.name}</strong>
                                        <span>{item.sizeLabel}</span>
                                    </div>
                                    <div className={styles.storageBar}>
                                        <div
                                            className={styles.storageBarFill}
                                            style={{
                                                width: `${storageSegments[0]?.sizeBytes ? (item.sizeBytes / storageSegments[0].sizeBytes) * 100 : 0}%`,
                                                background: 'linear-gradient(90deg, #0f766e, #2dd4bf)',
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                        </>
                    )}
                </Card>

                <Card className="glass-card section-card" loading={loading} extra={panelToggle('ranking')}>
                    {!collapsedPanels.ranking && (
                        <>
                    <h3 className={styles.sectionTitle}>{TEXT.usageRanking}</h3>
                    <p className={styles.sectionHint}>{TEXT.usageHint}</p>
                    {topUsers.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('files.noTopUsers')} />
                    ) : (
                        <div className={styles.segmentList}>
                            {topUsers.map((item) => (
                                <div key={item.name} className={styles.segmentItem}>
                                    <div className={styles.segmentMeta}>
                                        <strong>{item.name}</strong>
                                        <span>{item.sizeLabel}</span>
                                    </div>
                                    <div className={styles.storageBar}>
                                        <div
                                            className={styles.storageBarFill}
                                            style={{
                                                width: `${topUsers[0]?.sizeBytes ? (item.sizeBytes / topUsers[0].sizeBytes) * 100 : 0}%`,
                                                background: 'linear-gradient(90deg, #7c3aed, #c084fc)',
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                        </>
                    )}
                </Card>
            </div>

            <div className={styles.workspaceGrid}>
                <Card className={`glass-card section-card ${styles.treeCard}`} loading={loading} extra={panelToggle('tree')}>
                    {!collapsedPanels.tree && (
                        <>
                    <div className={styles.treeHeader}>
                        <h3 className={styles.sectionTitle}>{TEXT.fileTree}</h3>
                        <p className={styles.sectionHint}>{TEXT.treeHint}</p>
                    </div>
                    <div className={styles.treeWrap}>
                        <Tree
                            showIcon
                            blockNode
                            selectedKeys={[currentPath.join('/') || ROOT_KEY]}
                            expandedKeys={expandedKeys}
                            onExpand={(keys) => setExpandedKeys(keys as string[])}
                            treeData={treeData}
                            onSelect={(_, info) => {
                                const selected = info.node as TreeNode;
                                if (selected.key === ROOT_KEY) {
                                    setCurrentPath([]);
                                    return;
                                }

                                if (selected.fileNode?.type === 'folder') {
                                    setCurrentPath(selected.pathSegments || []);
                                    return;
                                }

                                if (selected.fileNode) {
                                    setPreviewTarget(selected.fileNode);
                                }
                            }}
                        />
                    </div>
                        </>
                    )}
                </Card>

                <div className="page-grid">
                    <Card className={`glass-card section-card ${styles.toolbarCard}`} extra={panelToggle('toolbar')}>
                        {!collapsedPanels.toolbar && (
                            <>
                        <div className={styles.toolbarRow}>
                            <div className={styles.toolbarActions}>
                                <Segmented
                                    value={tab}
                                    onChange={(value) => setTab(value as 'files' | 'shares')}
                                    options={[
                                        {label: t('files.tabFiles'), value: 'files'},
                                        {label: t('files.tabShares'), value: 'shares'},
                                    ]}
                                />
                                <Button type="primary" icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()}>
                                    {t('files.uploadFile')}
                                </Button>
                                <Button onClick={() => folderInputRef.current?.click()}>
                                    {t('files.uploadFolder')}
                                </Button>
                                <Button icon={<ReloadOutlined />} onClick={() => void refreshAll()}>
                                    {t('files.refresh')}
                                </Button>
                            </div>
                            <Input
                                allowClear
                                className={styles.searchBox}
                                placeholder={TEXT.searchPlaceholder}
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                            />
                        </div>

                        <input ref={fileInputRef} hidden type="file" onChange={(event) => void uploadSelected(event)} />
                        <input
                            ref={(node) => {
                                folderInputRef.current = node;
                                if (node) {
                                    node.setAttribute('webkitdirectory', '');
                                }
                            }}
                            hidden
                            type="file"
                            onChange={(event) => void uploadSelected(event, true)}
                        />

                        {uploadProgress !== null && (
                            <div className={styles.progressWrap}>
                                <Progress percent={uploadProgress} />
                            </div>
                        )}
                            </>
                        )}
                    </Card>

                    {tab === 'files' ? (
                        <Card className={`glass-card section-card ${styles.contentCard}`} loading={loading} extra={panelToggle('content')}>
                            {!collapsedPanels.content && (
                                <>
                            <div className={styles.contentHeader}>
                                <div className={styles.breadcrumbWrap}>
                                    <Breadcrumb
                                        items={[
                                            {
                                                title: (
                                                    <Button type="link" className={styles.linkButton} onClick={() => setCurrentPath([])}>
                                                        {t('files.rootBreadcrumb')}
                                                    </Button>
                                                ),
                                            },
                                            ...currentPath.map((segment, index) => ({
                                                title: (
                                                    <Button
                                                        type="link"
                                                        className={styles.linkButton}
                                                        onClick={() => setCurrentPath(currentPath.slice(0, index + 1))}
                                                    >
                                                        {segment}
                                                    </Button>
                                                ),
                                            })),
                                        ]}
                                    />
                                    <div className={styles.folderMeta}>
                                        {query.trim()
                                            ? `\u5171\u627e\u5230 ${tableItems.length} ${TEXT.item}`
                                            : `${currentPathLabel} · ${folderSummary(currentItems)}`}
                                    </div>
                                </div>
                                {!query.trim() && <Tag color="blue">{`\u76ee\u5f55\u5185 ${currentItems.length} ${TEXT.item}`}</Tag>}
                            </div>

                            <Table
                                rowKey="id"
                                className={styles.dashboardTable}
                                columns={columns}
                                dataSource={tableItems}
                                pagination={{pageSize: 12, showSizeChanger: false}}
                                locale={{emptyText: <Empty description={query.trim() ? TEXT.noResults : t('files.emptyFolder')} />}}
                            />
                                </>
                            )}
                        </Card>
                    ) : (
                        <Card className={`glass-card section-card ${styles.contentCard}`} loading={loading} extra={panelToggle('content')}>
                            {!collapsedPanels.content && (
                                <>
                            {shares.length === 0 ? (
                                <Empty description={t('files.emptyShares')} />
                            ) : (
                                <div className={styles.shareList}>
                                    {shares.map((share) => {
                                        const smartUrl = `${window.location.origin}/s/${share.shareId}${share.accessCode ? `?code=${share.accessCode}` : ''}`;
                                        return (
                                            <Card key={share.shareId} className={styles.shareCard}>
                                                <div className={styles.shareHeader}>
                                                    <div className={styles.shareMeta}>
                                                        <strong>{share.fileName}</strong>
                                                        <Tag>{t(`files.fileType.${share.type}`)}</Tag>
                                                        <Tag color="blue">{share.shareId}</Tag>
                                                        {share.accessCode && <Tag color="gold">{`${TEXT.accessCode} ${share.accessCode}`}</Tag>}
                                                    </div>
                                                    <div className={styles.shareStats}>
                                                        <span>{`${TEXT.visits} ${share.clickCount}`}</span>
                                                        <span>{`${TEXT.downloads} ${share.downloadCount}`}</span>
                                                    </div>
                                                </div>
                                                <p className={styles.shareUrl}>{smartUrl}</p>
                                                <div className={styles.shareActions}>
                                                    <Button
                                                        icon={<LinkOutlined />}
                                                        onClick={async () => {
                                                            await navigator.clipboard.writeText(smartUrl);
                                                            message.success(t('files.copySuccess'));
                                                        }}
                                                    >
                                                        {t('files.copyLink')}
                                                    </Button>
                                                    <Popconfirm title={t('files.revokeConfirm')} onConfirm={() => void revokeShare(share.shareId)}>
                                                        <Button danger icon={<DeleteOutlined />}>{t('files.revoke')}</Button>
                                                    </Popconfirm>
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                                </>
                            )}
                        </Card>
                    )}
                </div>
            </div>

            {shareTarget && (
                <ShareDialog
                    open={Boolean(shareTarget)}
                    fileName={shareTarget.id}
                    type={shareTarget.type}
                    onClose={() => setShareTarget(null)}
                />
            )}

            {previewTarget && (
                <PreviewModal
                    open={Boolean(previewTarget)}
                    fileId={previewTarget.id}
                    fileName={previewTarget.name}
                    onClose={() => setPreviewTarget(null)}
                />
            )}
        </div>
    );
}
