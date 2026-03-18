import fs from 'fs';
import path from 'path';
import {Request, Response, Router, NextFunction} from 'express';
import {readSessionFromRequest, setSessionCookies} from '../../lib/auth/session';
import {
    getMaskedSystemSettings,
    getSettingsFieldSources,
    getSystemSettings,
    updateSystemSettings,
} from '../../lib/config/store';
import {getMonitoringStatus} from '../../lib/monitoring/status';
import {getCloudConfig, updateCloudConfig} from '../../lib/cloud/config';
import {
    listBackupSnapshots,
    listOpsEvents,
    recordConfigVersion,
    syncUsersFromCloudConfig,
} from '../../lib/platform/metadata';
import {getNodeRuntimeInfo} from '../../lib/platform/bootstrap';

const router = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const session = readSessionFromRequest(req);
    if (!session || session.role !== 'admin') {
        return res.status(403).json({error: '需要管理员权限'});
    }

    req.user = session;
    req.username = session.username;
    next();
}

router.get('/settings', requireAdmin, (_req, res) => {
    const settings = getMaskedSystemSettings();
    const serviceConfig = getCloudConfig();
    return res.json({
        ...settings,
        fieldSources: getSettingsFieldSources(),
        cloud: {
            version: serviceConfig.version,
            path: serviceConfig.configPath,
            config: serviceConfig.config,
        },
    });
});

router.put('/settings', requireAdmin, async (req, res) => {
    const nextSettings = await updateSystemSettings(req.body || {});
    const session = typeof req.user === 'object' ? req.user : null;
    if (session && 'username' in session && 'role' in session && 'provider' in session) {
        setSessionCookies(res, {
            username: String(session.username),
            role: session.role as 'user' | 'admin',
            provider: session.provider as 'feishu' | 'admin' | 'legacy',
            avatarUrl: 'avatarUrl' in session && typeof session.avatarUrl === 'string' ? session.avatarUrl : undefined,
        });
    }
    return res.json({
        success: true,
        settings: {
            ...getMaskedSystemSettings(),
            fieldSources: getSettingsFieldSources(),
            metadata: nextSettings.metadata,
        },
    });
});

router.get('/service-config', requireAdmin, (_req, res) => {
    const loaded = getCloudConfig();
    return res.json({
        version: loaded.version,
        path: loaded.configPath,
        updatedAt: loaded.updatedAt,
        source: loaded.source,
        fieldSources: getSettingsFieldSources(),
        config: loaded.config,
    });
});

router.put('/service-config', requireAdmin, async (req, res) => {
    try {
        const payload = typeof req.body?.config === 'object' && req.body.config ? req.body.config : req.body || {};
        const nextConfig = updateCloudConfig(payload);
        await syncUsersFromCloudConfig(nextConfig.config.users);
        await recordConfigVersion(nextConfig.version, nextConfig.configPath, getNodeRuntimeInfo().nodeId);
        return res.json({
            success: true,
            restartRequired: true,
            version: nextConfig.version,
            path: nextConfig.configPath,
            updatedAt: nextConfig.updatedAt,
            source: nextConfig.source,
            config: nextConfig.config,
            fieldSources: getSettingsFieldSources(),
        });
    } catch (error) {
        return res.status(400).json({
            error: error instanceof Error ? error.message : '服务配置保存失败',
        });
    }
});

router.get('/cloud-config', requireAdmin, (_req, res) => {
    const loaded = getCloudConfig();
    return res.json({
        version: loaded.version,
        path: loaded.configPath,
        updatedAt: loaded.updatedAt,
        source: loaded.source,
        config: loaded.config,
    });
});

router.put('/cloud-config', requireAdmin, async (req, res) => {
    try {
        const nextConfig = updateCloudConfig(req.body || {});
        await syncUsersFromCloudConfig(nextConfig.config.users);
        await recordConfigVersion(nextConfig.version, nextConfig.configPath, getNodeRuntimeInfo().nodeId);
        return res.json({
            success: true,
            restartRequired: true,
            version: nextConfig.version,
            path: nextConfig.configPath,
            updatedAt: nextConfig.updatedAt,
            source: nextConfig.source,
            config: nextConfig.config,
        });
    } catch (error) {
        return res.status(400).json({
            error: error instanceof Error ? error.message : 'Cloud 配置保存失败',
        });
    }
});

router.get('/status', requireAdmin, async (_req, res) => {
    return res.json(await getMonitoringStatus());
});

router.get('/cluster/status', requireAdmin, async (_req, res) => {
    const status = await getMonitoringStatus();
    return res.json(status.cluster);
});

router.get('/storage/status', requireAdmin, async (_req, res) => {
    const status = await getMonitoringStatus();
    return res.json(status.storage);
});

router.get('/backup/list', requireAdmin, async (_req, res) => {
    const backups = await listBackupSnapshots();
    return res.json(backups.map((item) => ({
        snapshotId: item.snapshot_id,
        kind: item.kind,
        username: item.username,
        archivePath: item.archive_path,
        manifestPath: item.manifest_path,
        createdAt: item.created_at,
        status: item.status,
        checksum: item.checksum,
        metadata: item.metadata,
    })));
});

router.get('/logs', requireAdmin, async (req, res) => {
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 200, 2000));
    const logFile = path.resolve(process.cwd(), 'logs', 'server.log');
    const events = await listOpsEvents(Math.min(limit, 100));

    if (!fs.existsSync(logFile)) {
        return res.json({lines: [], events});
    }

    const lines = fs.readFileSync(logFile, 'utf8')
        .split(/\r?\n/)
        .filter(Boolean)
        .slice(-limit);

    return res.json({
        lines,
        events,
        restartRequired: getSystemSettings().metadata.restartRequired,
    });
});

export default router;
