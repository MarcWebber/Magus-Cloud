import {render, screen, waitFor} from '@testing-library/react';
import DashboardPage from './DashboardPage';
import {AppConfigProvider} from '../../../app/providers/AppConfigProvider';
import {HelpProvider} from '../../../app/providers/HelpProvider';
import {I18nProvider} from '../../../app/providers/I18nProvider';

vi.mock('../../../app/providers/SessionProvider', () => ({
    useSession: () => ({
        session: {
            authenticated: true,
            user: {username: 'admin', role: 'admin', provider: 'admin'},
        },
    }),
}));

vi.mock('../../../lib/api/client', () => ({
    apiClient: {
        get: vi.fn((url: string) => {
            if (url === '/api/app-config') {
                return Promise.resolve({
                    appName: 'Magus Cloud',
                    supportUrl: '',
                    defaultLocale: 'zh-CN',
                });
            }
            if (url === '/api/help?audience=user') {
                return Promise.resolve({
                    audience: 'user',
                    title: '用户文档',
                    updatedAt: '2026-03-18T00:00:00.000Z',
                    markdown: '# 用户文档',
                });
            }
            if (url === '/api/files') {
                return Promise.resolve({
                    files: [{name: 'demo.txt', size: '1 KB', mtime: '2026-03-17T00:00:00.000Z', type: 'file'}],
                });
            }
            if (url === '/api/usage') {
                return Promise.resolve({
                    totalCapacity: '10 MB',
                    totalUsed: '1 KB',
                    allocatable: '9 MB',
                    topUsers: [],
                    overQuotaUsers: [],
                    nodes: [{id: 'node-local', baseUrl: 'http://localhost:3000', storageMounted: true, databaseOk: true, lastHeartbeat: '2026-03-17T00:00:00.000Z'}],
                    recentBackup: {snapshotId: 'site-1'},
                    storagePolicy: {
                        quotaMode: 'hard',
                        defaultSoftQuotaGb: 200,
                        defaultHardQuotaGb: 20,
                        warningThresholdPercent: 85,
                        autoExpandEnabled: false,
                        warningTriggered: false,
                    },
                    personal: {
                        used: '1 KB',
                        quota: {
                            enabled: true,
                            limitBytes: 1024 * 1024,
                            usedBytes: 1024,
                            remainingBytes: 1024 * 1023,
                            source: 'default',
                            usedLabel: '1 KB',
                            limitLabel: '1 MB',
                            remainingLabel: '1023 KB',
                            percent: 1,
                        },
                    },
                });
            }
            if (url === '/api/share/list') {
                return Promise.resolve([]);
            }
            return Promise.resolve([]);
        }),
        post: vi.fn(),
        delete: vi.fn(),
        upload: vi.fn(),
    },
}));

describe('DashboardPage', () => {
    it('renders the new product-style workspace shell', async () => {
        render(
            <AppConfigProvider>
                <I18nProvider>
                    <HelpProvider>
                        <DashboardPage />
                    </HelpProvider>
                </I18nProvider>
            </AppConfigProvider>
        );

        await waitFor(() => {
            expect(screen.getAllByText('demo.txt').length).toBeGreaterThan(0);
            expect(screen.getAllByRole('button', {name: /上传文件/}).length).toBeGreaterThan(0);
            expect(screen.getByRole('button', {name: /新建文件夹/})).toBeInTheDocument();
            expect(screen.getByPlaceholderText('检索文件或文件夹')).toBeInTheDocument();
        });
    });
});
