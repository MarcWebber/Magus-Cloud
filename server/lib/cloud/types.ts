export type CloudClusterMode = 'shared-storage';
export type QuotaMode = 'hard' | 'oversell';

export interface CloudNodeConfig {
    id: string;
    baseUrl: string;
    enabled: boolean;
    tags: string[];
}

export interface CloudUserConfig {
    username: string;
    displayName: string;
    quotaGb?: number | null;
    enabled: boolean;
    homeDir: string;
}

export interface CloudStorageConfig {
    sharedRootDir: string;
    totalCapacityGb: number;
    reserveFreeGb: number;
    defaultUserQuotaGb: number;
    defaultSoftQuotaGb: number;
    defaultHardQuotaGb: number;
    quotaEnabled: boolean;
    quotaMode: QuotaMode;
    warningThresholdPercent: number;
    autoExpandEnabled: boolean;
}

export interface CloudConfig {
    cluster: {
        mode: CloudClusterMode;
        gatewayPublicUrl: string;
        nodes: CloudNodeConfig[];
    };
    storage: CloudStorageConfig;
    users: CloudUserConfig[];
    backup: {
        snapshotRootDir: string;
        retentionCount: number;
        compression: 'tar.gz';
        allowUserExport: boolean;
        verifyAfterCreate: boolean;
    };
    ui: {
        appName: string;
        supportUrl: string;
        defaultLocale: 'zh-CN' | 'en-US';
    };
    auth: {
        cookieName: string;
        sessionTtlSeconds: number;
        adminFallbackEnabled: boolean;
        adminUsername: string;
    };
    feishu: {
        enabled: boolean;
        appBaseUrl: string;
        callbackBaseUrl: string;
    };
    ngrok: {
        enabled: boolean;
        apiUrl: string;
        domain: string;
        tunnelName: string;
        addr: string;
    };
}

export interface LoadedCloudConfig {
    config: CloudConfig;
    configPath: string;
    version: string;
    updatedAt: string;
    source: 'magus-config' | 'cloud-config';
}
