// @vitest-environment node
import fs from 'fs';
import os from 'os';
import path from 'path';
import {beforeEach, describe, expect, it, vi} from 'vitest';

function writeCloudConfig(tempDir: string) {
    const configPath = path.join(tempDir, 'cloud.config.json');
    fs.writeFileSync(configPath, JSON.stringify({
        cluster: {
            mode: 'shared-storage',
            gatewayPublicUrl: 'http://localhost:3000',
            nodes: [{id: 'node-local', baseUrl: 'http://localhost:3000', enabled: true, tags: ['test']}],
        },
        storage: {
            sharedRootDir: path.join(tempDir, 'storage'),
            totalCapacityGb: 2,
            reserveFreeGb: 0,
            defaultUserQuotaGb: 1,
            quotaEnabled: true,
        },
        users: [{username: 'admin', displayName: 'Administrator', enabled: true, quotaGb: 1, homeDir: 'admin'}],
        backup: {
            snapshotRootDir: path.join(tempDir, 'snapshots'),
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
    return configPath;
}

describe('backup service', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('creates a site snapshot with manifest and archive', async () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magus-backup-test-'));
        const adminDir = path.join(tempDir, 'storage', 'admin');
        fs.mkdirSync(adminDir, {recursive: true});
        fs.writeFileSync(path.join(adminDir, 'demo.txt'), 'hello backup', 'utf8');

        process.env.MAGUS_DATA_DIR = tempDir;
        process.env.MAGUS_DEV_STORAGE_ROOT = path.join(tempDir, 'storage');
        process.env.MAGUS_CLOUD_CONFIG = writeCloudConfig(tempDir);
        process.env.MAGUS_USE_PGMEM = 'true';
        process.env.NODE_ENV = 'development';

        const {ensureRuntimeReady} = await import('./bootstrap');
        const {createSiteSnapshot} = await import('./backup');
        await ensureRuntimeReady();

        const snapshot = await createSiteSnapshot();
        expect(fs.existsSync(snapshot.archivePath)).toBe(true);
        expect(fs.existsSync(snapshot.manifestPath)).toBe(true);

        const manifest = JSON.parse(fs.readFileSync(snapshot.manifestPath, 'utf8'));
        expect(manifest.snapshotId).toBe(snapshot.snapshotId);
        expect(manifest.storage.usedBytes).toBeGreaterThan(0);
    }, 20000);
});
