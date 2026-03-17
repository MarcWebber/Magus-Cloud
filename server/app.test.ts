// @vitest-environment node
import fs from 'fs';
import path from 'path';
import os from 'os';
import request from 'supertest';
import {beforeEach, describe, expect, it, vi} from 'vitest';

describe('server app', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('supports admin login, session, settings update and health checks', async () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magus-test-'));
        process.env.MAGUS_DATA_DIR = tempDir;
        process.env.MAGUS_DEV_STORAGE_ROOT = path.join(tempDir, 'storage');
        process.env.MAGUS_ADMIN_PASSWORD = 'secret';
        process.env.NODE_ENV = 'development';

        const {createApp} = await import('./app');
        const app = createApp();
        const agent = request.agent(app);

        await agent
            .post('/api/auth/admin/login')
            .send({username: 'admin', password: 'secret'})
            .expect(200);

        const sessionResponse = await agent.get('/api/auth/session').expect(200);
        expect(sessionResponse.body.authenticated).toBe(true);
        expect(sessionResponse.body.user.role).toBe('admin');

        const settingsResponse = await agent.get('/api/admin/settings').expect(200);
        expect(settingsResponse.body.auth.cookieName).toBe('magus_session');

        const updateResponse = await agent
            .put('/api/admin/settings')
            .send({ui: {appName: 'New Name'}})
            .expect(200);
        expect(updateResponse.body.settings.metadata.restartRequired).toBe(true);

        const healthResponse = await agent.get('/api/health').expect(200);
        expect(healthResponse.body.ok).toBe(true);
    }, 15000);

    it('blocks path traversal on delete', async () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magus-test-'));
        process.env.MAGUS_DATA_DIR = tempDir;
        process.env.MAGUS_DEV_STORAGE_ROOT = path.join(tempDir, 'storage');
        process.env.MAGUS_ADMIN_PASSWORD = 'secret';
        process.env.NODE_ENV = 'development';

        const {createApp} = await import('./app');
        const app = createApp();
        const agent = request.agent(app);

        await agent
            .post('/api/auth/admin/login')
            .send({username: 'admin', password: 'secret'})
            .expect(200);

        const response = await agent
            .post('/api/delete')
            .send({filename: '../outside.txt'})
            .expect(403);

        expect(response.body.error).toContain('路径穿越');
    });
    it('uses real files for preview and share creation', async () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magus-test-'));
        const storageDir = path.join(tempDir, 'storage');
        fs.mkdirSync(storageDir, {recursive: true});
        fs.writeFileSync(path.join(storageDir, 'readme.txt'), 'hello magus', 'utf8');

        process.env.MAGUS_DATA_DIR = tempDir;
        process.env.MAGUS_DEV_STORAGE_ROOT = storageDir;
        process.env.MAGUS_ADMIN_PASSWORD = 'secret';
        process.env.MAGUS_QUOTA_ENABLED = 'true';
        process.env.MAGUS_USER_QUOTA_GB = '1';
        process.env.NODE_ENV = 'development';

        const {createApp} = await import('./app');
        const app = createApp();
        const agent = request.agent(app);

        await agent
            .post('/api/auth/admin/login')
            .send({username: 'admin', password: 'secret'})
            .expect(200);

        const filesResponse = await agent.get('/api/files').expect(200);
        expect(filesResponse.body.files[0].name).toBe('readme.txt');
        expect(filesResponse.body.quota.enabled).toBe(true);

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
    });

    it('rejects uploads that exceed quota', async () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magus-test-'));
        const storageDir = path.join(tempDir, 'storage');
        fs.mkdirSync(storageDir, {recursive: true});

        process.env.MAGUS_DATA_DIR = tempDir;
        process.env.MAGUS_DEV_STORAGE_ROOT = storageDir;
        process.env.MAGUS_ADMIN_PASSWORD = 'secret';
        process.env.MAGUS_QUOTA_ENABLED = 'true';
        process.env.MAGUS_USER_QUOTA_GB = '0.001';
        process.env.NODE_ENV = 'development';

        const {createApp} = await import('./app');
        const app = createApp();
        const agent = request.agent(app);

        await agent
            .post('/api/auth/admin/login')
            .send({username: 'admin', password: 'secret'})
            .expect(200);

        const largeBuffer = Buffer.alloc(2 * 1024 * 1024, 'a');
        const response = await agent
            .post('/api/upload')
            .attach('file', largeBuffer, 'large.txt')
            .expect(413);

        expect(response.body.error).toContain('配额');
    });
});
