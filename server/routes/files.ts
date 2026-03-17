import {Router, Request, Response} from 'express';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import checkDiskSpace from 'check-disk-space';
import logger from '../logger';
import {upload} from '../middleware/storage';
import {authenticateToken} from '../middleware/authenticationToken';
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
import {getSystemSettings} from '../lib/config/store';
import {createShare, deleteShare, getShareById, listSharesByUser, updateShare} from '../modules/share/store';

const router = Router();
const isDev = process.env.NODE_ENV === 'development';

type FileTreeNode = {
    name: string;
    size: string;
    mtime: string;
    type: 'file' | 'folder';
    children?: FileTreeNode[];
};

function formatBytes(bytes: number, decimals = 2) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return '0 Bytes';
    }

    const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, unitIndex);
    return `${value.toFixed(unitIndex === 0 ? 0 : decimals)} ${units[unitIndex]}`;
}

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
                    size: formatBytes(await getDirectorySize(fullPath)),
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

async function resolveUserDir(username: string) {
    const userDir = getUserStorageRoot(username, isDev);
    await ensureDir(userDir);
    return userDir;
}

async function buildUsagePayload() {
    const rootDir = getStorageRoot(isDev);
    await ensureDir(rootDir);

    const entries = await fsp.readdir(rootDir, {withFileTypes: true});
    const users = entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'));
    const usage = await Promise.all(users.map(async (entry) => {
        const userDir = path.join(rootDir, entry.name);
        const size = await getDirectorySize(userDir);
        return {
            name: entry.name,
            size: formatBytes(size),
        };
    }));

    const totalUsedBytes = usage.reduce((sum, item) => sum + parseSize(item.size), 0);
    const diskInfo = await checkDiskSpace(rootDir).catch(() => null);

    return {
        usage,
        totalUsed: formatBytes(totalUsedBytes),
        totalFree: formatBytes(diskInfo?.free || 0),
    };
}

function getUserQuotaBytes() {
    const settings = getSystemSettings();
    if (!settings.storage.quotaEnabled) {
        return null;
    }

    return Math.max(Number(settings.storage.defaultUserQuotaGb) || 0, 0.001) * 1024 ** 3;
}

function buildQuotaPayload(usedBytes: number) {
    const quotaBytes = getUserQuotaBytes();
    if (!quotaBytes) {
        return {
            enabled: false,
            total: null,
            remaining: null,
            percent: null,
        };
    }

    const remaining = Math.max(quotaBytes - usedBytes, 0);
    return {
        enabled: true,
        total: formatBytes(quotaBytes),
        remaining: formatBytes(remaining),
        percent: Math.min(Number(((usedBytes / quotaBytes) * 100).toFixed(1)), 100),
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

async function enforceQuotaOrThrow(userDir: string, incomingBytes: number) {
    const quotaBytes = getUserQuotaBytes();
    if (!quotaBytes) {
        return;
    }

    const currentSize = await getDirectorySize(userDir);
    if (currentSize + incomingBytes > quotaBytes) {
        const error = new Error(`超出配额限制，最多可用 ${formatBytes(quotaBytes)}`) as Error & {status?: number};
        error.status = 413;
        throw error;
    }
}

router.get('/files', authenticateToken, async (req, res) => {
    try {
        const username = req.username || 'default';
        const userDir = await resolveUserDir(username);
        const files = await readDirRecursive(userDir);
        const usedBytes = await getDirectorySize(userDir);

        return res.json({
            files,
            usage: formatBytes(usedBytes),
            quota: buildQuotaPayload(usedBytes),
        });
    } catch (error) {
        logger.error(`Failed to list files: ${error instanceof Error ? error.message : error}`);
        return res.status(500).json({error: '获取文件列表失败'});
    }
});

router.post('/upload', authenticateToken, upload.single('file'), async (req: Request, res: Response) => {
    if (!req.file) {
        return res.status(400).json({error: '缺少上传文件'});
    }

    try {
        const username = req.username || 'default';
        const userRoot = await resolveUserDir(username);
        await enforceQuotaOrThrow(userRoot, req.file.size);
        const finalFileName = path.basename(fixFileName(req.file.originalname));
        const targetPath = await getUniqueTargetPath(path.join(userRoot, finalFileName));

        await fsp.rename(req.file.path, targetPath);
        return res.json({
            success: true,
            file: path.basename(targetPath),
        });
    } catch (error) {
        await cleanupTempUpload(req.file.path);

        if (error instanceof Error && 'status' in error && typeof error.status === 'number') {
            return res.status(error.status).json({error: error.message});
        }
        logger.error(`Failed to save upload: ${error instanceof Error ? error.message : error}`);
        return res.status(500).json({error: '保存文件失败'});
    }
});

router.post('/upload-folder', authenticateToken, upload.array('folderFiles'), async (req: Request, res: Response) => {
    if (!Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({error: '缺少文件夹内容'});
    }

    try {
        const username = req.username || 'default';
        const userRoot = await resolveUserDir(username);
        const incomingBytes = req.files.reduce((sum, file) => sum + (file.size || 0), 0);
        await enforceQuotaOrThrow(userRoot, incomingBytes);
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
        if (error instanceof Error && 'status' in error && typeof error.status === 'number') {
            return res.status(error.status).json({error: error.message});
        }
        logger.error(`Failed to save folder upload: ${error instanceof Error ? error.message : error}`);
        return res.status(500).json({error: '保存文件夹失败'});
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
            const shareRecord = getShareById(shareId);
            if (!shareRecord) {
                return res.status(404).json({error: '分享不存在'});
            }
            if (shareRecord.accessCode && shareRecord.accessCode !== code) {
                return res.status(403).json({error: '提取码错误'});
            }

            updateShare(shareId, (record) => ({
                ...record,
                downloadCount: record.downloadCount + 1,
            }));

            nameParam = shareRecord.fileName;
            typeParam = shareRecord.type;
            userDir = await resolveUserDir(shareRecord.username);
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

            userDir = await resolveUserDir(req.username || 'default');
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

        const userDir = await resolveUserDir(req.username || 'default');
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
        const payload = await buildUsagePayload();
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

        const userDir = await resolveUserDir(req.username || 'default');
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
        const userDir = await resolveUserDir(username);
        const resourcePath = safeResolve(userDir, decodeURIComponent(fileName));
        await fsp.access(resourcePath);

        const record = createShare({
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
    return res.json(listSharesByUser(req.username || 'default'));
});

router.delete('/share/:shareId', authenticateToken, async (req: Request, res: Response) => {
    const deleted = deleteShare(req.params.shareId, req.username || 'default');
    if (!deleted) {
        return res.status(404).json({error: '分享不存在'});
    }

    return res.json({success: true});
});

router.get('/share/info/:shareId', async (req: Request, res: Response) => {
    const shareRecord = getShareById(req.params.shareId);
    if (!shareRecord) {
        return res.status(404).json({error: '分享不存在'});
    }

    updateShare(req.params.shareId, (record) => ({
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

export default router;
