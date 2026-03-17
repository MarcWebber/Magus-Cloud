import {render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {SessionProvider} from '../../../app/providers/SessionProvider';
import {I18nProvider} from '../../../app/providers/I18nProvider';
import {LoginPage} from './LoginPage';

describe('LoginPage', () => {
    it('renders the simplified login shell', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            headers: new Headers({'content-type': 'application/json'}),
            json: async () => ({authenticated: false}),
        }));

        render(
            <MemoryRouter>
                <I18nProvider>
                    <SessionProvider>
                        <LoginPage />
                    </SessionProvider>
                </I18nProvider>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Magus Cloud')).toBeInTheDocument();
            expect(screen.getAllByRole('button').length).toBeGreaterThan(1);
        });
    });
});
