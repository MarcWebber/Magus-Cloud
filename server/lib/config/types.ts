export type SessionRole = 'user' | 'admin';
export type SessionProvider = 'feishu' | 'admin' | 'legacy';
export type SettingsFieldSource = 'service-config' | 'env';

export interface SystemSettings {
    auth: {
        cookieName: string;
        sessionTtlSeconds: number;
        adminFallbackEnabled: boolean;
        adminUsername: string;
    };
    feishu: {
        enabled: boolean;
        appId: string;
        appSecret: string;
        redirectUri: string;
        appBaseUrl: string;
        callbackBaseUrl: string;
    };
    ngrok: {
        enabled: boolean;
        apiUrl: string;
        authtoken: string;
        domain: string;
        tunnelName: string;
        addr: string;
    };
    ui: {
        appName: string;
        supportUrl: string;
        defaultLocale: 'zh-CN' | 'en-US';
    };
    metadata: {
        updatedAt: string;
        restartRequired: boolean;
        configVersion: string;
        source: 'env+service-config';
    };
}

export interface SettingsFieldSources {
    auth: Record<keyof SystemSettings['auth'], SettingsFieldSource>;
    feishu: {
        enabled: 'service-config';
        appId: 'env';
        appSecret: 'env';
        redirectUri: 'env';
        appBaseUrl: 'service-config';
        callbackBaseUrl: 'service-config';
    };
    ngrok: {
        enabled: 'service-config';
        apiUrl: 'service-config';
        authtoken: 'env';
        domain: 'service-config';
        tunnelName: 'service-config';
        addr: 'service-config';
    };
    ui: {
        appName: 'service-config';
        supportUrl: 'service-config';
        defaultLocale: 'service-config';
    };
}

export interface SessionPayload {
    username: string;
    role: SessionRole;
    provider: SessionProvider;
    avatarUrl?: string;
}
