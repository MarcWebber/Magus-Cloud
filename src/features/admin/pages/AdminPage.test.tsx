import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import AdminPage from './AdminPage';

vi.mock('../../../app/providers/AppConfigProvider', () => ({
    useAppConfig: () => ({
        config: {appName: 'Magus Cloud', supportUrl: '', defaultLocale: 'zh-CN'},
        refresh: vi.fn(),
    }),
}));

vi.mock('../../../lib/api/client', () => ({
    apiClient: {
        get: vi.fn((url: string) => {
            if (url === '/api/admin/service-config') {
                return Promise.resolve({
                    version: 'abcdef1234567890',
                    path: '/app/config/magus.config.json',
                    updatedAt: '2026-03-17T00:00:00.000Z',
                    source: 'magus-config',
                    fieldSources: {
                        auth: {cookieName: 'service-config', sessionTtlSeconds: 'service-config', adminFallbackEnabled: 'service-config', adminUsername: 'service-config'},
                        feishu: {enabled: 'service-config', appBaseUrl: 'service-config', callbackBaseUrl: 'service-config'},
                        ngrok: {enabled: 'service-config', apiUrl: 'service-config', domain: 'service-config', tunnelName: 'service-config', addr: 'service-config'},
                        ui: {appName: 'service-config', supportUrl: 'service-config', defaultLocale: 'service-config'},
                    },
                    config: {
                        cluster: {
                            mode: 'shared-storage',
                            gatewayPublicUrl: 'http://localhost:3000',
                            nodes: [{id: 'node-local', baseUrl: 'http://localhost:3000', enabled: true, tags: ['test']}],
                        },
                        storage: {
                            sharedRootDir: '/data/storage',
                            totalCapacityGb: 100,
                            reserveFreeGb: 10,
                            defaultUserQuotaGb: 20,
                            quotaEnabled: true,
                            quotaMode: 'hard',
                            defaultSoftQuotaGb: 200,
                            defaultHardQuotaGb: 20,
                            warningThresholdPercent: 85,
                            autoExpandEnabled: false,
                        },
                        users: [{username: 'admin', displayName: 'Administrator', quotaGb: 20, enabled: true, homeDir: 'admin'}],
                        backup: {
                            snapshotRootDir: '/data/snapshots',
                            retentionCount: 10,
                            compression: 'tar.gz',
                            allowUserExport: true,
                            verifyAfterCreate: true,
                        },
                        ui: {appName: 'Magus Cloud', supportUrl: '', defaultLocale: 'zh-CN'},
                        auth: {cookieName: 'magus_session', sessionTtlSeconds: 7200, adminFallbackEnabled: true, adminUsername: 'admin'},
                        feishu: {enabled: true, appBaseUrl: 'http://localhost:3000', callbackBaseUrl: 'http://localhost:3000'},
                        ngrok: {enabled: false, apiUrl: 'http://ngrok:4040', domain: '', tunnelName: 'magus', addr: 'app:3000'},
                    },
                });
            }
            if (url === '/api/admin/status') {
                return Promise.resolve({
                    cluster: {activeNodes: [{node_id: 'node-local', base_url: 'http://localhost:3000', storage_mounted: true, database_ok: true}]},
                    storage: {
                        totalCapacityBytes: 10 * 1024 ** 3,
                        usedBytes: 2 * 1024 ** 3,
                        reserveFreeBytes: 1024 ** 3,
                        allocatableBytes: 9 * 1024 ** 3,
                        exists: true,
                        quotaMode: 'hard',
                        defaultSoftQuotaBytes: 200 * 1024 ** 3,
                        defaultHardQuotaBytes: 20 * 1024 ** 3,
                        warningThresholdPercent: 85,
                        warningTriggered: false,
                        autoExpandEnabled: false,
                        overQuotaUsers: [],
                    },
                    database: {connected: true},
                    dependencies: {purePw: false},
                    ngrok: {connected: false, publicUrl: ''},
                });
            }
            if (url === '/api/admin/backup/list') {
                return Promise.resolve([{snapshotId: 'site-1', kind: 'site', status: 'verified', archivePath: '/tmp/a', manifestPath: '/tmp/b', createdAt: '2026-03-17', checksum: '', metadata: {}, username: null}]);
            }
            if (url === '/api/admin/logs?limit=200') {
                return Promise.resolve({lines: ['line 1'], events: [{level: 'info', message: 'boot ok', created_at: '2026-03-17'}]});
            }
            return Promise.resolve({});
        }),
        put: vi.fn(() => Promise.resolve({success: true})),
        post: vi.fn(() => Promise.resolve({snapshot: {snapshotId: 'site-1'}})),
    },
}));

describe('AdminPage', () => {
    it('renders module sidebar and switches sections as routes change', async () => {
        render(
            <MemoryRouter initialEntries={['/admin/cluster']}>
                <AdminPage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('heading', {name: '\u96c6\u7fa4\u4e0e\u7f51\u5173'})).toBeInTheDocument();
            expect(screen.getByText('后台模块')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', {name: /容量与配额/}));

        await waitFor(() => {
            expect(screen.getByRole('heading', {name: '\u5bb9\u91cf\u4e0e\u914d\u989d'})).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', {name: /集群与网关/}));

        await waitFor(() => {
            expect(screen.getByRole('heading', {name: '\u96c6\u7fa4\u4e0e\u7f51\u5173'})).toBeInTheDocument();
        });

        fireEvent.click(screen.getAllByRole('button', {name: /\u6536\u8d77/})[0]);
        expect(screen.getByRole('heading', {name: '\u96c6\u7fa4\u4e0e\u7f51\u5173'})).toBeInTheDocument();
        expect(screen.getByText('\u914d\u7f6e\u7248\u672c abcdef12')).toBeInTheDocument();
    });
});
