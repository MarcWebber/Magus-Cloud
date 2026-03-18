// @vitest-environment node
import fs from 'fs';
import os from 'os';
import path from 'path';
import {beforeEach, describe, expect, it, vi} from 'vitest';

describe('cloud config loader', () => {
    beforeEach(() => {
        vi.resetModules();
        delete process.env.MAGUS_SERVICE_CONFIG;
        delete process.env.MAGUS_CLOUD_CONFIG;
    });

    it('loads the main service config and computes a stable version', async () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magus-service-config-'));
        const configPath = path.join(tempDir, 'magus.config.json');
        fs.writeFileSync(configPath, JSON.stringify({
            cluster: {
                mode: 'shared-storage',
                gatewayPublicUrl: 'http://localhost:3000',
                nodes: [{id: 'node-a', baseUrl: 'http://localhost:3000', enabled: true, tags: ['primary']}],
            },
            storage: {
                sharedRootDir: './uploads',
                totalCapacityGb: 200,
                reserveFreeGb: 10,
                defaultUserQuotaGb: 20,
                quotaEnabled: true,
                quotaMode: 'hard',
                defaultSoftQuotaGb: 100,
                defaultHardQuotaGb: 20,
                warningThresholdPercent: 85,
                autoExpandEnabled: false,
            },
            users: [{username: 'admin', displayName: 'Administrator', enabled: true, homeDir: 'admin'}],
            backup: {
                snapshotRootDir: './snapshots',
                retentionCount: 5,
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
        }), 'utf8');

        process.env.MAGUS_SERVICE_CONFIG = configPath;

        const {getCloudConfig} = await import('./config');
        const loaded = getCloudConfig();
        expect(loaded.config.cluster.mode).toBe('shared-storage');
        expect(loaded.source).toBe('magus-config');
        expect(loaded.version).toMatch(/^[a-f0-9]{40}$/);
    });

    it('migrates legacy cloud config into magus.config.json', async () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magus-cloud-config-'));
        const legacyPath = path.join(tempDir, 'cloud.config.json');
        const mainPath = path.join(tempDir, 'magus.config.json');

        fs.writeFileSync(legacyPath, JSON.stringify({
            cluster: {
                mode: 'shared-storage',
                gatewayPublicUrl: 'http://localhost:3000',
                nodes: [{id: 'node-a', baseUrl: 'http://localhost:3000', enabled: true, tags: ['primary']}],
            },
            storage: {
                sharedRootDir: './uploads',
                totalCapacityGb: 200,
                reserveFreeGb: 10,
                defaultUserQuotaGb: 20,
                quotaEnabled: true,
            },
            users: [{username: 'admin', displayName: 'Administrator', enabled: true, homeDir: 'admin'}],
            backup: {
                snapshotRootDir: './snapshots',
                retentionCount: 5,
                compression: 'tar.gz',
                allowUserExport: true,
                verifyAfterCreate: true,
            },
            ui: {
                appName: 'Magus Cloud',
                supportUrl: '',
                defaultLocale: 'zh-CN',
            },
        }), 'utf8');

        process.env.MAGUS_SERVICE_CONFIG = mainPath;
        process.env.MAGUS_CLOUD_CONFIG = legacyPath;

        const {getCloudConfig} = await import('./config');
        const loaded = getCloudConfig();
        expect(loaded.source).toBe('cloud-config');
        expect(fs.existsSync(mainPath)).toBe(true);
        const migrated = JSON.parse(fs.readFileSync(mainPath, 'utf8'));
        expect(migrated.auth.cookieName).toBe('magus_session');
        expect(migrated.storage.defaultHardQuotaGb).toBeGreaterThan(0);
    });
});
