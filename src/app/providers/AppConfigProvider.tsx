import {createContext, ReactNode, startTransition, useContext, useEffect, useMemo, useState} from 'react';
import {apiClient} from '../../lib/api/client';

export type PublicUiConfig = {
    appName: string;
    supportUrl: string;
    defaultLocale: 'zh-CN' | 'en-US';
};

const DEFAULT_CONFIG: PublicUiConfig = {
    appName: 'Magus Cloud',
    supportUrl: '',
    defaultLocale: 'zh-CN',
};

type AppConfigContextValue = {
    config: PublicUiConfig;
    refresh: () => Promise<void>;
};

const AppConfigContext = createContext<AppConfigContextValue | null>(null);

export function AppConfigProvider({children}: {children: ReactNode}) {
    const [config, setConfig] = useState<PublicUiConfig>(DEFAULT_CONFIG);

    const refresh = async () => {
        try {
            const next = await apiClient.get<PublicUiConfig>('/api/app-config');
            startTransition(() => {
                setConfig(next);
            });
        } catch {
            startTransition(() => {
                setConfig(DEFAULT_CONFIG);
            });
        }
    };

    useEffect(() => {
        void refresh();
    }, []);

    useEffect(() => {
        document.title = config.appName;
    }, [config.appName]);

    const value = useMemo<AppConfigContextValue>(() => ({
        config,
        refresh,
    }), [config]);

    return <AppConfigContext.Provider value={value}>{children}</AppConfigContext.Provider>;
}

export function useAppConfig() {
    const value = useContext(AppConfigContext);
    if (!value) {
        throw new Error('useAppConfig must be used inside AppConfigProvider');
    }
    return value;
}
