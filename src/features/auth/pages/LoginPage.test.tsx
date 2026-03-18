import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {AppConfigProvider} from '../../../app/providers/AppConfigProvider';
import {HelpProvider} from '../../../app/providers/HelpProvider';
import {I18nProvider} from '../../../app/providers/I18nProvider';
import {SessionProvider} from '../../../app/providers/SessionProvider';
import {LoginPage} from './LoginPage';

vi.mock('../../../lib/api/client', () => ({
    apiClient: {
        get: vi.fn((url: string) => {
            if (url === '/api/app-config') {
                return Promise.resolve({
                    appName: 'Magus Cloud',
                    supportUrl: 'https://support.example.com',
                    defaultLocale: 'zh-CN',
                });
            }
            if (url === '/api/auth/session') {
                return Promise.resolve({authenticated: false});
            }
            if (url === '/api/help?audience=user') {
                return Promise.resolve({
                    audience: 'user',
                    title: '用户文档',
                    updatedAt: '2026-03-18T00:00:00.000Z',
                    markdown: '# 用户文档\n\n这里是帮助内容。',
                });
            }
            return Promise.resolve({});
        }),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        upload: vi.fn(),
    },
}));

describe('LoginPage', () => {
    it('renders the minimal hero shell, opens login modal, and opens help drawer', async () => {
        render(
            <MemoryRouter>
                <AppConfigProvider>
                    <I18nProvider>
                        <SessionProvider>
                            <HelpProvider>
                                <LoginPage />
                            </HelpProvider>
                        </SessionProvider>
                    </I18nProvider>
                </AppConfigProvider>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Magus Cloud')).toBeInTheDocument();
            expect(screen.getByRole('heading', {name: /让团队资料/})).toBeInTheDocument();
            expect(screen.getByRole('button', {name: '去登录'})).toBeInTheDocument();
            expect(screen.getByRole('button', {name: '打开用户帮助文档'})).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', {name: '去登录'}));

        await waitFor(() => {
            expect(screen.getByRole('button', {name: /使用飞书登录/})).toBeInTheDocument();
            expect(screen.getByRole('button', {name: /管理员应急登录/})).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', {name: '打开用户帮助文档'}));

        await waitFor(() => {
            expect(screen.getByText('使用文档')).toBeInTheDocument();
            expect(screen.getAllByText('用户文档').length).toBeGreaterThan(0);
            expect(screen.getByText('这里是帮助内容。')).toBeInTheDocument();
        });
    });
});
