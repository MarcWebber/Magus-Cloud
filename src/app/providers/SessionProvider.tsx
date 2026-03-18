import {createContext, ReactNode, useContext, useEffect, useState} from 'react';
import {apiClient} from '../../lib/api/client';

export type SessionState = {
    authenticated: boolean;
    user?: {
        username: string;
        role: 'user' | 'admin';
        provider: 'feishu' | 'admin' | 'legacy';
        avatarUrl?: string;
    };
};

type SessionContextValue = {
    session: SessionState | null;
    loading: boolean;
    refresh: () => Promise<void>;
    logout: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({children}: {children: ReactNode}) {
    const [session, setSession] = useState<SessionState | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = async () => {
        setLoading(true);
        try {
            const next = await apiClient.get<SessionState>('/api/auth/session');
            setSession(next);
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        await apiClient.post('/api/auth/logout');
        setSession({authenticated: false});
    };

    useEffect(() => {
        void refresh();
    }, []);

    return (
        <SessionContext.Provider value={{session, loading, refresh, logout}}>
            {children}
        </SessionContext.Provider>
    );
}

export function useSession() {
    const value = useContext(SessionContext);
    if (!value) {
        throw new Error('useSession must be used inside SessionProvider');
    }
    return value;
}
