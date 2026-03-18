// @vitest-environment node
import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import {beforeEach, describe, expect, it, vi} from 'vitest';

function writeServiceConfig(tempDir: string, overrides: Record<string, unknown> = {}) {
    const configPath = path.join(tempDir, 'magus.config.json');
    const baseConfig = {
        cluster: {
            mode: 'shared-storage',
            gatewayPublicUrl: 'http://localhost:3000',
            nodes: [{id: 'node-local', baseUrl: 'http://localhost:3000', enabled: true, tags: ['test']}],
        },
        storage: {
            sharedRootDir: path.join(tempDir, 'storage'),
            totalCapacityGb: 4,
            reserveFreeGb: 0.1,
            defaultUserQuotaGb: 1,
            quotaEnabled: true,
            quotaMode: 'hard',
            defaultSoftQuotaGb: 2,
            defaultHardQuotaGb: 1,
            warningThresholdPercent: 85,
            autoExpandEnabled: false,
        },
        users: [
            {username: 'admin', displayName: 'Administrator', quotaGb: 1, enabled: true, homeDir: 'admin'},
            {username: 'test', displayName: 'Test User', quotaGb: 1, enabled: true, homeDir: 'test'},
        ],
        backup: {
            snapshotRootDir: path.join(tempDir, 'snapshots'),
            retentionCount: 10,
            compression: 'tar.gz',
            allowUserExport: true,
            verifyAfterCreate: true,
        },
        ui: {
            appName: 'Magus Cloud',
            supportUrl: '',
            defaultLocale: 'zh-CN',
        },
        auth: {
            cookieName: 'magus_session',
            sessionTtlSeconds: 7200,
            adminFallbackEnabled: true,
            adminUsername: 'admin',
        },
        feishu: {
            enabled: false,
            appBaseUrl: 'http://localhost:3000',
            callbackBaseUrl: 'http://localhost:3000',
        },
        ngrok: {
            enabled: false,
            apiUrl: 'http://ngrok:4040',
            domain: '',
            tunnelName: 'magus',
            addr: 'app:3000',
        },
        ...overrides,
    };
    fs.writeFileSync(configPath, JSON.stringify(baseConfig, null, 2), 'utf8');
    return configPath;
}

async function createTestAgent() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magus-test-'));
    process.env.MAGUS_DATA_DIR = tempDir;
    process.env.MAGUS_DEV_STORAGE_ROOT = path.join(tempDir, 'storage');
    process.env.MAGUS_ADMIN_PASSWORD = 'secret';
    process.env.MAGUS_SERVICE_CONFIG = writeServiceConfig(tempDir);
    process.env.MAGUS_USE_PGMEM = 'true';
    process.env.NODE_ENV = 'development';

    const {createApp} = await import('./app');
    const app = createApp();
    const agent = request.agent(app);
    return {tempDir, agent};
}

describe('server app', () => {
    beforeEach(() => {
        vi.resetModules();
        delete process.env.MAGUS_SERVICE_CONFIG;
        delete process.env.MAGUS_CLOUD_CONFIG;
    });

    it('serves public UI config and help docs', async () => {
        const {agent} = await createTestAgent();

        const appConfig = await agent.get('/api/app-config').expect(200);
        expect(appConfig.body.appName).toBe('Magus Cloud');
        expect(appConfig.body.defaultLocale).toBe('zh-CN');

        const userHelp = await agent.get('/api/help?audience=user').expect(200);
        expect(userHelp.body.audience).toBe('user');
        expect(userHelp.body.markdown).toContain('Magus Cloud');

        await agent.get('/api/help?audience=admin').expect(403);
    }, 10000);

    it('supports admin login, service config update, and compatibility cloud config update', async () => {
        const {agent} = await createTestAgent();

        await agent
            .post('/api/auth/admin/login')
            .send({username: 'admin', password: 'secret'})
            .expect(200);

        const sessionResponse = await agent.get('/api/auth/session').expect(200);
        expect(sessionResponse.body.authenticated).toBe(true);
        expect(sessionResponse.body.user.role).toBe('admin');

        const settingsResponse = await agent.get('/api/admin/service-config').expect(200);
        expect(settingsResponse.body.fieldSources.ui.defaultLocale).toBe('service-config');

        const serviceUpdate = await agent
            .put('/api/admin/service-config')
            .send({
                ui: {appName: 'New Name', supportUrl: 'https://support.example.com', defaultLocale: 'zh-CN'},
                auth: {cookieName: 'magus_session', sessionTtlSeconds: 7200, adminFallbackEnabled: true, adminUsername: 'admin'},
                feishu: {enabled: false, appBaseUrl: 'http://localhost:3000', callbackBaseUrl: 'http://localhost:3000'},
                ngrok: {enabled: false, apiUrl: 'http://ngrok:4040', domain: '', tunnelName: 'magus', addr: 'app:3000'},
                cluster: {
                    mode: 'shared-storage',
                    gatewayPublicUrl: 'http://localhost:3000',
                    nodes: [{id: 'node-local', baseUrl: 'http://localhost:3000', enabled: true, tags: ['test']}],
                },
                storage: {
                    sharedRootDir: process.env.MAGUS_DEV_STORAGE_ROOT,
                    totalCapacityGb: 4,
                    reserveFreeGb: 0.1,
                    defaultUserQuotaGb: 1,
                    quotaEnabled: true,
                    quotaMode: 'hard',
                    defaultSoftQuotaGb: 2,
                    defaultHardQuotaGb: 1,
                    warningThresholdPercent: 85,
                    autoExpandEnabled: false,
                },
                users: [
                    {username: 'admin', displayName: 'Administrator', quotaGb: 1, enabled: true, homeDir: 'admin'},
                    {username: 'test', displayName: 'Test User', quotaGb: 1, enabled: true, homeDir: 'test'},
                ],
                backup: {
                    snapshotRootDir: path.join(process.env.MAGUS_DATA_DIR!, 'snapshots'),
                    retentionCount: 10,
                    compression: 'tar.gz',
                    allowUserExport: true,
                    verifyAfterCreate: true,
                },
            })
            .expect(200);
        expect(serviceUpdate.body.config.ui.appName).toBe('New Name');
        expect(serviceUpdate.body.restartRequired).toBe(true);

        const cloudUpdate = await agent
            .put('/api/admin/cloud-config')
            .send({
                storage: {
                    sharedRootDir: process.env.MAGUS_DEV_STORAGE_ROOT,
                    totalCapacityGb: 8,
                    reserveFreeGb: 1,
                    defaultUserQuotaGb: 2,
                    quotaEnabled: true,
                },
            })
            .expect(200);
        expect(cloudUpdate.body.config.storage.totalCapacityGb).toBe(8);

        const healthResponse = await agent.get('/api/health').expect(200);
        expect(healthResponse.body.ok).toBe(true);

        const gatewayResponse = await agent.get('/api/health/gateway').expect(200);
        expect(gatewayResponse.body.checks.databaseReachable).toBe(true);

    });

    it('rejects invalid service config updates without corrupting the file', async () => {
        const {agent, tempDir} = await createTestAgent();

        await agent
            .post('/api/auth/admin/login')
            .send({username: 'admin', password: 'secret'})
            .expect(200);

        const configPath = path.join(tempDir, 'magus.config.json');
        const before = fs.readFileSync(configPath, 'utf8');

        const response = await agent
            .put('/api/admin/service-config')
            .send({
                users: [
                    {username: 'dup', displayName: 'Dup 1', enabled: true, homeDir: 'dup', quotaGb: 1},
                    {username: 'dup', displayName: 'Dup 2', enabled: true, homeDir: 'dup-2', quotaGb: 1},
                ],
            })
            .expect(400);

        expect(response.body.error).toContain('Duplicate service username');
        expect(fs.readFileSync(configPath, 'utf8')).toBe(before);
    });

    it('uses real files for preview, share creation, usage payload, and backups', async () => {
        const {tempDir, agent} = await createTestAgent();
        const storageDir = path.join(tempDir, 'storage', 'admin');
        fs.mkdirSync(storageDir, {recursive: true});
        fs.writeFileSync(path.join(storageDir, 'readme.txt'), 'hello magus', 'utf8');

        await agent
            .post('/api/auth/admin/login')
            .send({username: 'admin', password: 'secret'})
            .expect(200);

        const filesResponse = await agent.get('/api/files').expect(200);
        expect(filesResponse.body.files[0].name).toBe('readme.txt');
        expect(filesResponse.body.quota.limitBytes).toBeGreaterThan(0);

        const usageResponse = await agent.get('/api/usage').expect(200);
        expect(usageResponse.body.totalCapacityBytes).toBeGreaterThan(0);
        expect(Array.isArray(usageResponse.body.nodes)).toBe(true);
        expect(usageResponse.body.storagePolicy.quotaMode).toBe('hard');

        const previewResponse = await agent
            .get('/api/preview?name=readme.txt&type=file')
            .expect(200);
        expect(previewResponse.body.content).toContain('hello magus');

        const shareResponse = await agent
            .post('/api/share/create')
            .send({fileName: 'readme.txt', type: 'file', expireDays: 7, hasCode: true})
            .expect(200);
        expect(shareResponse.body.shareId).toContain('s_');

        const listResponse = await agent.get('/api/share/list').expect(200);
        expect(listResponse.body).toHaveLength(1);

        const backupResponse = await agent.post('/api/admin/backup/create').expect(200);
        expect(backupResponse.body.snapshot.snapshotId).toContain('site-');
    }, 20000);

    it('blocks path traversal and rejects uploads that exceed quota', async () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magus-test-'));
        const storageRoot = path.join(tempDir, 'storage');
        fs.mkdirSync(storageRoot, {recursive: true});
        process.env.MAGUS_DATA_DIR = tempDir;
        process.env.MAGUS_DEV_STORAGE_ROOT = storageRoot;
        process.env.MAGUS_ADMIN_PASSWORD = 'secret';
        process.env.MAGUS_SERVICE_CONFIG = writeServiceConfig(tempDir, {
            storage: {
                sharedRootDir: storageRoot,
                totalCapacityGb: 1,
                reserveFreeGb: 0,
                defaultUserQuotaGb: 0.001,
                quotaEnabled: true,
                quotaMode: 'hard',
                defaultSoftQuotaGb: 0.001,
                defaultHardQuotaGb: 0.001,
                warningThresholdPercent: 85,
                autoExpandEnabled: false,
            },
            users: [
                {username: 'admin', displayName: 'Administrator', quotaGb: 0.001, enabled: true, homeDir: 'admin'},
                {username: 'test', displayName: 'Test User', quotaGb: 0.001, enabled: true, homeDir: 'test'},
            ],
        });
        process.env.MAGUS_USE_PGMEM = 'true';
        process.env.NODE_ENV = 'development';

        const {createApp} = await import('./app');
        const app = createApp();
        const agent = request.agent(app);

        await agent
            .post('/api/auth/admin/login')
            .send({username: 'admin', password: 'secret'})
            .expect(200);

        const deleteResponse = await agent
            .post('/api/delete')
            .send({filename: '../outside.txt'})
            .expect(403);
        expect(deleteResponse.body.error).toBeTruthy();

        const largeBuffer = Buffer.alloc(2 * 1024 * 1024, 'a');
        const uploadResponse = await agent
            .post('/api/upload')
            .attach('file', largeBuffer, 'large.txt')
            .expect(413);
        expect(uploadResponse.body.error).toBeTruthy();
    }, 20000);
});
