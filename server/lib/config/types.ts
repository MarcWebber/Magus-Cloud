export type SessionRole = 'user' | 'admin';
export type SessionProvider = 'feishu' | 'admin' | 'legacy';

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
    storage: {
        rootDir: string;
        devRootDir: string;
        quotaEnabled: boolean;
        defaultUserQuotaGb: number;
    };
    ui: {
        appName: string;
        supportUrl: string;
    };
    metadata: {
        updatedAt: string;
        restartRequired: boolean;
    };
}

export interface SessionPayload {
    username: string;
    role: SessionRole;
    provider: SessionProvider;
    avatarUrl?: string;
}
