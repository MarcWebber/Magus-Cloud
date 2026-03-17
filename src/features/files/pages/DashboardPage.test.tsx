import {render, screen, waitFor} from '@testing-library/react';
import DashboardPage from './DashboardPage';
import {I18nProvider} from '../../../app/providers/I18nProvider';

vi.mock('../../../lib/api/client', () => ({
    apiClient: {
        get: vi.fn((url: string) => {
            if (url === '/api/files') {
                return Promise.resolve({
                    files: [{name: 'demo.txt', size: '1 KB', mtime: '2026-03-17T00:00:00.000Z', type: 'file'}],
                    usage: '1 KB',
                    quota: {enabled: true, total: '10 GB', remaining: '9.99 GB', percent: 0},
                });
            }
            if (url === '/api/usage') {
                return Promise.resolve({
                    usage: [{name: 'alice', size: '1 KB'}],
                    totalUsed: '1 KB',
                    totalFree: '9 GB',
                });
            }
            return Promise.resolve([]);
        }),
        post: vi.fn(),
        delete: vi.fn(),
        upload: vi.fn(),
    },
}));

describe('DashboardPage', () => {
    it('renders file tree and search controls', async () => {
        render(
            <I18nProvider>
                <DashboardPage />
            </I18nProvider>
        );

        await waitFor(() => {
            expect(screen.getAllByText('demo.txt').length).toBeGreaterThan(0);
            expect(screen.getByText('文件树')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('检索文件或文件夹')).toBeInTheDocument();
        });
    });
});
