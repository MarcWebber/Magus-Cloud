import {Router, Request, Response} from 'express';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import logger from '../logger';
import {upload} from '../middleware/storage';
import {authenticateToken, requireAdmin} from '../middleware/authenticationToken';
import {getDirectorySize} from '../services/fileService';
import {extOf, mimeByExt, safeResolve} from '../utils/previewUtils';
import {
    handleDocRtfPreview,
    handleDocxPreview,
    handleExcelPreview,
    handleImagePreview,
    handlePdfPreview,
    handlePptPreview,
    handleTextPreview,
    handleWordPreview,
} from './previewService';
import {getStorageRoot, getUserStorageRoot} from '../lib/runtime/paths';
import {createShare, deleteShare, getShareById, listSharesByUser, updateShare} from '../modules/share/store';
import {getCloudConfig, getConfiguredCloudUser} from '../lib/cloud/config';
import {formatBytes, safePercent, toBytesFromGb} from '../lib/platform/bytes';
import {createSiteSnapshot, exportUserSnapshot, importUserSnapshot} from '../lib/platform/backup';
import {ensureRuntimeReady} from '../lib/platform/bootstrap';
import {getMonitoringStatus} from '../lib/monitoring/status';

const router = Router();
const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

type FileTreeNode = {
    name: string;
    size: string;
    mtime: string;
    type: 'file' | 'folder';
    children?: FileTreeNode[];
};

function parseSize(size: string) {
    const [rawValue, unit = 'Bytes'] = size.split(' ');
    const value = Number(rawValue) || 0;
    switch (unit) {
        case 'KB':
            return value * 1024;
        case 'MB':
            return value * 1024 ** 2;
        case 'GB':
            return value * 1024 ** 3;
        case 'TB':
            return value * 1024 ** 4;
        default:
            return value;
    }
}

async function ensureDir(dirPath: string) {
    await fsp.mkdir(dirPath, {recursive: true});
}

async function getUniqueTargetPath(filePath: string) {
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const name = path.basename(filePath, ext);
    let counter = 0;
    let candidate = filePath;

    while (true) {
        try {
            await fsp.access(candidate);
            counter += 1;
            candidate = path.join(dir, `${name}(${counter})${ext}`);
        } catch {
            return candidate;
        }
    }
}

function fixFileName(name: string) {
    return Buffer.from(name, 'latin1').toString('utf8');
}

async function readDirRecursive(dirPath: string): Promise<FileTreeNode[]> {
    const entries = await fsp.readdir(dirPath, {withFileTypes: true});
    const result = await Promise.all(entries
        .filter((entry) => !entry.name.startsWith('.'))
        .map(async (entry) => {
            const fullPath = path.join(dirPath, entry.name);
            const stat = await fsp.stat(fullPath);

            if (entry.isDirectory()) {
                return {
                    name: entry.name,
                    size: formatBytes(getDirectorySize(fullPath)),
                    mtime: stat.mtime.toISOString(),
                    type: 'folder' as const,
                    children: await readDirRecursive(fullPath),
                };
            }

            return {
                name: entry.name,
                size: formatBytes(stat.size),
                mtime: stat.mtime.toISOString(),
                type: 'file' as const,
            };
        }));

    return result.sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));
}

function getEffectiveUserConfig(username: string, role?: string) {
    const configured = getConfiguredCloudUser(username);
    if (configured?.enabled) {
        return configured;
    }
    if (role === 'admin') {
        return {
            username,
            displayName: username,
            enabled: true,
            homeDir: username,
            quotaGb: null,
        };
    }
    return null;
}

async function resolveUserDir(username: string, role?: string) {
    const user = getEffectiveUserConfig(username, role);
    if (!user) {
        const error = new Error(`User ${username} is not enabled in cloud config`) as Error & {status?: number};
        error.status = 403;
        throw error;
    }

    const userDir = getUserStorageRoot(username, isDev);
    await ensureDir(userDir);
    return userDir;
}

function buildQuotaPayload(username: string, role: string | undefined, usedBytes: number) {
    const loaded = getCloudConfig();
    if (!loaded.config.storage.quotaEnabled) {
        return {
            enabled: false,
            limitBytes: null,
            usedBytes,
            remainingBytes: null,
            source: 'disabled',
            usedLabel: formatBytes(usedBytes),
            limitLabel: null,
            remainingLabel: null,
            percent: null,
        };
    }

    const user = getEffectiveUserConfig(username, role);
    const quotaGb = user?.quotaGb ?? loaded.config.storage.defaultUserQuotaGb;
    const limitBytes = toBytesFromGb(quotaGb || 0);
    const remainingBytes = Math.max(limitBytes - usedBytes, 0);

    return {
        enabled: true,
        limitBytes,
        usedBytes,
        remainingBytes,
        source: user?.quotaGb ? 'user' : 'default',
        usedLabel: formatBytes(usedBytes),
        limitLabel: formatBytes(limitBytes),
        remainingLabel: formatBytes(remainingBytes),
        percent: safePercent(usedBytes, limitBytes),
    };
}

async function cleanupTempUpload(filePath: string) {
    try {
        await fsp.unlink(filePath);
    } catch {
    }
}

async function cleanupTempUploads(files: Array<{path: string}>) {
    await Promise.all(files.map((file) => cleanupTempUpload(file.path)));
}

async function enforceStoragePoliciesOrThrow(username: string, role: string | undefined, userDir: string, incomingBytes: number) {
    const loaded = getCloudConfig();
    const quota = buildQuotaPayload(username, role, getDirectorySize(userDir));
    if (quota.enabled && quota.limitBytes !== null && quota.usedBytes + incomingBytes > quota.limitBytes) {
        const error = new Error(`超出用户配额限制，最多可用 ${quota.limitLabel}`) as Error & {status?: number};
        error.status = 413;
        throw error;
    }

    const rootDir = getStorageRoot(isDev);
    const currentTotalUsed = fs.existsSync(rootDir) ? getDirectorySize(rootDir) : 0;
    const maxAllocatableBytes = Math.max(
        toBytesFromGb(loaded.config.storage.totalCapacityGb) - toBytesFromGb(loaded.config.storage.reserveFreeGb),
        0,
    );
    if (currentTotalUsed + incomingBytes > maxAllocatableBytes) {
        const error = new Error(`超出云端总容量限制，当前最多可分配 ${formatBytes(maxAllocatableBytes)}`) as Error & {status?: number};
        error.status = 507;
        throw error;
    }
}

function normalizeTargetSegments(input: unknown) {
    if (Array.isArray(input)) {
        return input.filter((segment): segment is string => typeof segment === 'string' && segment.trim().length > 0);
    }
    if (typeof input === 'string' && input.trim()) {
        return input.split('/').filter(Boolean);
    }
    return [];
}

async function buildUsagePayload(username: string, role: string | undefined) {
    const monitoring = await getMonitoringStatus();
    const userDir = await resolveUserDir(username, role);
    const personalUsedBytes = fs.existsSync(userDir) ? getDirectorySize(userDir) : 0;
    const personalQuota = buildQuotaPayload(username, role, personalUsedBytes);
    const topUsers = [...monitoring.storage.users]
        .sort((left, right) => right.usedBytes - left.usedBytes)
        .slice(0, 8)
        .map((item) => ({
            name: item.username,
            sizeBytes: item.usedBytes,
            size: item.usedLabel,
        }));

    return {
        totalCapacityBytes: monitoring.storage.totalCapacityBytes,
        totalUsedBytes: monitoring.storage.usedBytes,
        reserveFreeBytes: monitoring.storage.reserveFreeBytes,
        allocatableBytes: monitoring.storage.allocatableBytes,
        totalCapacity: formatBytes(monitoring.storage.totalCapacityBytes),
        totalUsed: formatBytes(monitoring.storage.usedBytes),
        reserveFree: formatBytes(monitoring.storage.reserveFreeBytes),
        allocatable: formatBytes(monitoring.storage.allocatableBytes),
        topUsers,
        overQuotaUsers: role === 'admin' ? monitoring.storage.overQuotaUsers : [],
        nodes: role === 'admin'
            ? monitoring.cluster.activeNodes.map((node) => ({
                id: node.node_id,
                baseUrl: node.base_url,
                storageMounted: node.storage_mounted,
                databaseOk: node.database_ok,
                lastHeartbeat: new Date(node.last_heartbeat).toISOString(),
            }))
            : [],
        recentBackup: monitoring.backups.latest ? {
            snapshotId: monitoring.backups.latest.snapshot_id,
            kind: monitoring.backups.latest.kind,
            status: monitoring.backups.latest.status,
            createdAt: new Date(monitoring.backups.latest.created_at).toISOString(),
        } : null,
        storagePolicy: {
            quotaMode: monitoring.storage.quotaMode,
            defaultSoftQuotaGb: monitoring.storage.defaultSoftQuotaGb,
            defaultHardQuotaGb: monitoring.storage.defaultHardQuotaGb,
            warningThresholdPercent: monitoring.storage.warningThresholdPercent,
            autoExpandEnabled: monitoring.storage.autoExpandEnabled,
            warningTriggered: monitoring.storage.warningTriggered,
        },
        personal: {
            usedBytes: personalUsedBytes,
            used: formatBytes(personalUsedBytes),
            quota: personalQuota,
        },
    };
}

router.use(async (_req, _res, next) => {
    try {
        await ensureRuntimeReady();
        next();
    } catch (error) {
        next(error);
    }
});

router.get('/files', authenticateToken, async (req, res) => {
    try {
        const username = req.username || 'default';
        const role = typeof req.user === 'object' && req.user && 'role' in req.user ? String(req.user.role) : undefined;
        const userDir = await resolveUserDir(username, role);
        const files = await readDirRecursive(userDir);
        const usedBytes = fs.existsSync(userDir) ? getDirectorySize(userDir) : 0;

        return res.json({
            files,
            usage: formatBytes(usedBytes),
            usageBytes: usedBytes,
            quota: buildQuotaPayload(username, role, usedBytes),
        });
    } catch (error) {
        const status = error instanceof Error && 'status' in error && typeof error.status === 'number' ? error.status : 500;
        logger.error(`Failed to list files: ${error instanceof Error ? error.message : error}`);
        return res.status(status).json({error: error instanceof Error ? error.message : '获取文件列表失败'});
    }
});

router.post('/upload', authenticateToken, upload.single('file'), async (req: Request, res: Response) => {
    if (!req.file) {
        return res.status(400).json({error: '缺少上传文件'});
    }

    try {
        const username = req.username || 'default';
        const role = typeof req.user === 'object' && req.user && 'role' in req.user ? String(req.user.role) : undefined;
        const userRoot = await resolveUserDir(username, role);
        await enforceStoragePoliciesOrThrow(username, role, userRoot, req.file.size);
        const finalFileName = path.basename(fixFileName(req.file.originalname));
        const targetPath = await getUniqueTargetPath(path.join(userRoot, finalFileName));

        await fsp.rename(req.file.path, targetPath);
        return res.json({
            success: true,
            file: path.basename(targetPath),
        });
    } catch (error) {
        await cleanupTempUpload(req.file.path);
        const status = error instanceof Error && 'status' in error && typeof error.status === 'number' ? error.status : 500;
        logger.error(`Failed to save upload: ${error instanceof Error ? error.message : error}`);
        return res.status(status).json({error: error instanceof Error ? error.message : '保存文件失败'});
    }
});

router.post('/upload-folder', authenticateToken, upload.array('folderFiles'), async (req: Request, res: Response) => {
    if (!Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({error: '缺少文件夹内容'});
    }

    try {
        const username = req.username || 'default';
        const role = typeof req.user === 'object' && req.user && 'role' in req.user ? String(req.user.role) : undefined;
        const userRoot = await resolveUserDir(username, role);
        const incomingBytes = req.files.reduce((sum, file) => sum + (file.size || 0), 0);
        await enforceStoragePoliciesOrThrow(username, role, userRoot, incomingBytes);
        const rootDirMap = new Map<string, string>();

        for (const file of req.files) {
            const originalName = fixFileName(file.originalname);
            const parts = originalName.split('/');
            if (parts.length < 2) {
                continue;
            }

            const requestedRoot = parts[0];
            let finalRoot = rootDirMap.get(requestedRoot);

            if (!finalRoot) {
                finalRoot = await getUniqueTargetPath(path.join(userRoot, requestedRoot));
                rootDirMap.set(requestedRoot, finalRoot);
                await ensureDir(finalRoot);
            }

            const relativePath = parts.slice(1).join(path.sep);
            const targetPath = path.join(finalRoot, relativePath);
            await ensureDir(path.dirname(targetPath));
            await fsp.rename(file.path, targetPath);
        }

        const firstRoot = Array.from(rootDirMap.values())[0];
        return res.json({
            success: true,
            folderName: firstRoot ? path.basename(firstRoot) : '',
            fileCount: req.files.length,
        });
    } catch (error) {
        await cleanupTempUploads(req.files);
        const status = error instanceof Error && 'status' in error && typeof error.status === 'number' ? error.status : 500;
        logger.error(`Failed to save folder upload: ${error instanceof Error ? error.message : error}`);
        return res.status(status).json({error: error instanceof Error ? error.message : '保存文件夹失败'});
    }
});

router.post('/create-folder', authenticateToken, async (req: Request, res: Response) => {
    try {
        const folderName = typeof req.body?.folderName === 'string' ? req.body.folderName.trim() : '';
        if (!folderName) {
            return res.status(400).json({error: '缺少文件夹名称'});
        }

        const role = typeof req.user === 'object' && req.user && 'role' in req.user ? String(req.user.role) : undefined;
        const userRoot = await resolveUserDir(req.username || 'default', role);
        const parentSegments = normalizeTargetSegments(req.body?.parentPath);
        const parentDir = safeResolve(userRoot, parentSegments.join('/'));
        await ensureDir(parentDir);
        const targetPath = await getUniqueTargetPath(path.join(parentDir, folderName));
        await ensureDir(targetPath);

        return res.json({
            success: true,
            folderName: path.basename(targetPath),
            path: path.relative(userRoot, targetPath).replace(/\\/g, '/'),
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'PathTraversal') {
            return res.status(403).json({error: '已阻止路径穿越访问'});
        }
        return res.status(500).json({error: error instanceof Error ? error.message : '创建文件夹失败'});
    }
});

router.get('/download', async (req: Request, res: Response) => {
    try {
        const shareId = typeof req.query.shareId === 'string' ? req.query.shareId : '';
        const code = typeof req.query.code === 'string' ? req.query.code : '';
        let nameParam = typeof req.query.name === 'string' ? req.query.name : '';
        let typeParam = typeof req.query.type === 'string' ? req.query.type : '';
        let userDir = '';

        if (shareId) {
            const shareRecord = await getShareById(shareId);
            if (!shareRecord) {
                return res.status(404).json({error: '分享不存在'});
            }
            if (shareRecord.accessCode && shareRecord.accessCode !== code) {
                return res.status(403).json({error: '提取码错误'});
            }

            await updateShare(shareId, (record) => ({
                ...record,
                downloadCount: record.downloadCount + 1,
            }));

            nameParam = shareRecord.fileName;
            typeParam = shareRecord.type;
            userDir = await resolveUserDir(shareRecord.username, 'user');
        } else {
            const authenticated = await new Promise<boolean>((resolve) => {
                authenticateToken(req, res, () => resolve(true));
            });

            if (!authenticated || res.headersSent) {
                return;
            }

            if (!nameParam || !typeParam) {
                return res.status(400).json({error: '缺少下载参数'});
            }

            const role = typeof req.user === 'object' && req.user && 'role' in req.user ? String(req.user.role) : undefined;
            userDir = await resolveUserDir(req.username || 'default', role);
        }

        const resourcePath = safeResolve(userDir, decodeURIComponent(nameParam));
        const stat = await fsp.stat(resourcePath);

        if (typeParam === 'file' && stat.isFile()) {
            return res.download(resourcePath, path.basename(resourcePath));
        }

        if (typeParam === 'folder' && stat.isDirectory()) {
            const zipName = `${path.basename(resourcePath)}.zip`;
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(zipName)}"`);

            const archive = archiver('zip', {zlib: {level: 9}});
            archive.on('error', (archiveError) => {
                logger.error(`Archive error: ${archiveError.message}`);
                if (!res.headersSent) {
                    res.status(500).json({error: '打包文件夹失败'});
                } else {
                    res.end();
                }
            });

            archive.pipe(res);
            archive.directory(resourcePath, path.basename(resourcePath));
            await archive.finalize();
            return;
        }

        return res.status(400).json({error: '资源类型不匹配'});
    } catch (error) {
        logger.error(`Failed to download resource: ${error instanceof Error ? error.message : error}`);
        if (!res.headersSent) {
            return res.status(500).json({error: '下载失败'});
        }
    }
});

router.post('/delete', authenticateToken, async (req, res) => {
    try {
        const filename = typeof req.body?.filename === 'string' ? req.body.filename : '';
        if (!filename) {
            return res.status(400).json({error: '缺少文件名'});
        }

        const role = typeof req.user === 'object' && req.user && 'role' in req.user ? String(req.user.role) : undefined;
        const userDir = await resolveUserDir(req.username || 'default', role);
        const targetPath = safeResolve(userDir, decodeURIComponent(filename));
        await fsp.rm(targetPath, {recursive: true, force: false});

        return res.json({success: true});
    } catch (error) {
        if (error instanceof Error && error.message === 'PathTraversal') {
            return res.status(403).json({error: '已阻止路径穿越访问'});
        }
        return res.status(500).json({
            error: error instanceof Error ? error.message : '删除失败',
        });
    }
});

router.get('/usage', authenticateToken, async (req, res) => {
    try {
        const role = typeof req.user === 'object' && req.user && 'role' in req.user ? String(req.user.role) : undefined;
        const payload = await buildUsagePayload(req.username || 'default', role);
        return res.json(payload);
    } catch (error) {
        logger.error(`Failed to build usage payload: ${error instanceof Error ? error.message : error}`);
        return res.status(500).json({error: '获取空间用量失败'});
    }
});

router.get('/preview', authenticateToken, async (req: Request, res: Response) => {
    try {
        const nameParam = typeof req.query.name === 'string' ? req.query.name : '';
        const typeParam = typeof req.query.type === 'string' ? req.query.type : '';
        const mode = String(req.query.mode || '');

        if (!nameParam || !typeParam) {
            return res.status(400).json({error: '缺少预览参数'});
        }

        const role = typeof req.user === 'object' && req.user && 'role' in req.user ? String(req.user.role) : undefined;
        const userDir = await resolveUserDir(req.username || 'default', role);
        const filePath = safeResolve(userDir, decodeURIComponent(nameParam));
        const stats = await fsp.stat(filePath);

        if (typeParam !== 'file' || !stats.isFile()) {
            return res.status(400).json({error: '当前仅支持预览文件'});
        }

        const ext = extOf(nameParam);
        const mime = mimeByExt[ext] || 'application/octet-stream';

        if (mode === 'pdf' && ['doc', 'docx', 'rtf'].includes(ext)) {
            return handleWordPreview(filePath, nameParam, mode, res);
        }
        if (mime.startsWith('text/') || mime === 'application/json') {
            return handleTextPreview(filePath, nameParam, mime, res);
        }
        if (mime.startsWith('image/')) {
            return handleImagePreview(filePath, nameParam, mime, res);
        }
        if (ext === 'docx') {
            return handleDocxPreview(filePath, nameParam, res);
        }
        if (ext === 'doc' || ext === 'rtf') {
            return handleDocRtfPreview(filePath, nameParam, res);
        }
        if (ext === 'xls' || ext === 'xlsx') {
            return handleExcelPreview(filePath, nameParam, res);
        }
        if (ext === 'ppt' || ext === 'pptx') {
            return handlePptPreview(filePath, nameParam, res);
        }
        if (ext === 'pdf') {
            return handlePdfPreview(filePath, res);
        }

        return res.status(415).json({error: '暂不支持该文件类型预览'});
    } catch (error) {
        if (error instanceof Error && error.message === 'PathTraversal') {
            return res.status(403).json({error: '已阻止路径穿越访问'});
        }

        return res.status(500).json({error: '预览失败'});
    }
});

router.post('/share/create', authenticateToken, async (req: Request, res: Response) => {
    try {
        const {fileName, type, expireDays, hasCode} = req.body || {};
        if (!fileName || !['file', 'folder'].includes(type)) {
            return res.status(400).json({error: '分享参数不合法'});
        }

        const username = req.username || 'default';
        const role = typeof req.user === 'object' && req.user && 'role' in req.user ? String(req.user.role) : undefined;
        const userDir = await resolveUserDir(username, role);
        const resourcePath = safeResolve(userDir, decodeURIComponent(fileName));
        await fsp.access(resourcePath);

        const record = await createShare({
            username,
            fileName,
            type,
            expireDays: Number(expireDays) || 0,
            hasCode: Boolean(hasCode),
        });

        return res.json({
            shareId: record.shareId,
            code: record.accessCode,
            expireAt: record.expireAt,
            message: '分享创建成功',
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'PathTraversal') {
            return res.status(403).json({error: '已阻止路径穿越访问'});
        }
        return res.status(500).json({error: '创建分享失败'});
    }
});

router.get('/share/list', authenticateToken, async (req: Request, res: Response) => {
    return res.json(await listSharesByUser(req.username || 'default'));
});

router.delete('/share/:shareId', authenticateToken, async (req: Request, res: Response) => {
    const deleted = await deleteShare(req.params.shareId, req.username || 'default');
    if (!deleted) {
        return res.status(404).json({error: '分享不存在'});
    }

    return res.json({success: true});
});

router.get('/share/info/:shareId', async (req: Request, res: Response) => {
    const shareRecord = await getShareById(req.params.shareId);
    if (!shareRecord) {
        return res.status(404).json({error: '分享不存在'});
    }

    await updateShare(req.params.shareId, (record) => ({
        ...record,
        clickCount: record.clickCount + 1,
    }));

    return res.json({
        fileName: shareRecord.fileName,
        username: shareRecord.username,
        expireAt: shareRecord.expireAt,
        type: shareRecord.type,
        hasCode: Boolean(shareRecord.accessCode),
    });
});

router.post('/admin/backup/create', requireAdmin, async (_req: Request, res: Response) => {
    const snapshot = await createSiteSnapshot();
    return res.json({
        success: true,
        snapshot,
    });
});

router.post('/admin/migration/export-user', requireAdmin, async (req: Request, res: Response) => {
    const username = typeof req.body?.username === 'string' ? req.body.username : '';
    if (!username) {
        return res.status(400).json({error: '缺少用户名'});
    }

    const snapshot = await exportUserSnapshot(username);
    return res.json({
        success: true,
        snapshot,
    });
});

router.post('/admin/migration/import-user', requireAdmin, async (req: Request, res: Response) => {
    const archivePath = typeof req.body?.archivePath === 'string' ? req.body.archivePath : '';
    const targetUsername = typeof req.body?.targetUsername === 'string' ? req.body.targetUsername : '';
    const dryRun = String(req.query.dryRun || 'true') !== 'false';
    if (!archivePath || !targetUsername) {
        return res.status(400).json({error: '缺少导入参数'});
    }

    const result = await importUserSnapshot(archivePath, targetUsername, dryRun);
    return res.json({
        success: true,
        ...result,
    });
});

export default router;
