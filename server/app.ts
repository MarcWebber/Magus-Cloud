import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import authRouter from './modules/auth/router';
import adminRouter from './modules/admin/router';
import filesRouter from './modules/files/router';
import {getMonitoringStatus} from './lib/monitoring/status';
import {ensureRuntimeReady} from './lib/platform/bootstrap';
import {getCloudConfig} from './lib/cloud/config';
import {readSessionFromRequest} from './lib/auth/session';
import {getPublicUiSettings} from './lib/config/store';
import {getHelpAssetRoot, getHelpDoc, HelpAudience} from './lib/help/docs';

export function createApp() {
    const app = express();

    app.use(express.json());
    app.use(cookieParser());
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.use('/help-assets', express.static(getHelpAssetRoot()));
    app.use(async (_req, _res, next) => {
        try {
            await ensureRuntimeReady();
            next();
        } catch (error) {
            next(error);
        }
    });

    app.get('/api/health', async (req, res) => {
        const status = await getMonitoringStatus();
        res.json({
            ok: true,
            app: status.app,
            config: status.config,
            database: status.database,
            storage: status.storage,
            cluster: {
                activeNodeCount: status.cluster.activeNodes.length,
                configuredNodeCount: status.cluster.configuredNodes.length,
                nodes: status.cluster.activeNodes.map((node) => ({
                    id: node.node_id,
                    baseUrl: node.base_url,
                    lastHeartbeat: node.last_heartbeat,
                    databaseOk: node.database_ok,
                    storageMounted: node.storage_mounted,
                })),
            },
            backups: status.backups,
            dependencies: status.dependencies,
            ngrok: status.ngrok,
        });
    });

    app.get('/api/health/gateway', async (_req, res) => {
        const status = await getMonitoringStatus();
        const loaded = getCloudConfig();
        res.json({
            ok: Boolean(status.database.connected && status.storage.exists && status.cluster.activeNodes.length > 0),
            gateway: {
                publicUrl: loaded.config.cluster.gatewayPublicUrl,
                loginPage: `${loaded.config.cluster.gatewayPublicUrl.replace(/\/$/, '')}/`,
                apiBase: `${loaded.config.cluster.gatewayPublicUrl.replace(/\/$/, '')}/api`,
            },
            checks: {
                staticReachable: true,
                loginReachable: true,
                apiReachable: true,
                activeNodes: status.cluster.activeNodes.length,
                sharedStorageReadable: status.storage.exists,
                databaseReachable: status.database.connected,
            },
        });
    });

    app.get('/api/app-config', (_req, res) => {
        res.json(getPublicUiSettings());
    });

    app.get('/api/help', (req, res) => {
        const audience = req.query.audience === 'admin' ? 'admin' : 'user';
        const session = readSessionFromRequest(req);
        if (audience === 'admin' && session?.role !== 'admin') {
            return res.status(403).json({error: '需要管理员权限'});
        }
        return res.json(getHelpDoc(audience as HelpAudience));
    });

    // Backward compatibility for legacy Feishu callback path.
    app.get('/api/feishu-callback', (req, res) => {
        const queryString = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
        return res.redirect(307, `/api/auth/feishu/callback${queryString}`);
    });

    app.use('/api/auth', authRouter);
    app.use('/api/admin', adminRouter);
    app.use('/api', filesRouter);

    app.use((req, res) => {
        res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });

    return app;
}
