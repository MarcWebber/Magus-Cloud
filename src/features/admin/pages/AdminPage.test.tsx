import {render, screen, waitFor} from '@testing-library/react';
import AdminPage from './AdminPage';
import {I18nProvider} from '../../../app/providers/I18nProvider';

vi.mock('../../../lib/api/client', () => ({
    apiClient: {
        get: vi.fn((url: string) => {
            if (url === '/api/admin/settings') {
                return Promise.resolve({
                    auth: {cookieName: 'magus_session', sessionTtlSeconds: 7200, adminFallbackEnabled: true, adminUsername: 'admin'},
                    feishu: {enabled: true, appId: 'app', appSecret: '******1234', appBaseUrl: 'http://localhost:3000', callbackBaseUrl: 'http://localhost:3000'},
                    ngrok: {enabled: true, apiUrl: 'http://ngrok:4040', authtoken: '******5678', domain: '', tunnelName: 'magus', addr: 'app:3000'},
                    storage: {rootDir: '/www/wwwroot', devRootDir: '/tmp/storage', quotaEnabled: true, defaultUserQuotaGb: 20},
                    ui: {appName: 'Magus Cloud', supportUrl: ''},
                    metadata: {updatedAt: '2026-03-17T00:00:00.000Z', restartRequired: true},
                });
            }
            if (url === '/api/admin/status') {
                return Promise.resolve({
                    app: {name: 'Magus Cloud', version: '0.1.0', uptimeSeconds: 120, environment: 'test'},
                    storage: {rootDir: '/www/wwwroot', exists: true, freeBytes: 1, totalBytes: 2, quotaEnabled: true, defaultUserQuotaGb: 20},
                    dependencies: {soffice: true, purePw: false},
                    ngrok: {connected: false, publicUrl: ''},
                    restartRequired: true,
                });
            }
            return Promise.resolve({lines: ['line 1'], restartRequired: true});
        }),
        put: vi.fn(() => Promise.resolve({settings: {metadata: {restartRequired: true}}})),
    },
}));

describe('AdminPage', () => {
    it('loads settings and monitoring content', async () => {
        render(
            <I18nProvider>
                <AdminPage />
            </I18nProvider>
        );

        await waitFor(() => {
            expect(screen.getByText('保存设置')).toBeInTheDocument();
            expect(screen.getByText('需要重启服务')).toBeInTheDocument();
        });
    });
});
