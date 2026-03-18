import {SettingsFieldSources, SystemSettings} from './types';
import {syncNgrokConfig} from '../../integrations/ngrok/config';
import {getCloudConfig, updateCloudConfig} from '../cloud/config';
import {
    getRuntimeSettingsMetadata,
    updateRuntimeSettingOverrides,
} from '../platform/appSettings';

const MASK = '********';

function getDefaultSettings(): SystemSettings {
    const loaded = getCloudConfig();
    const runtimeMetadata = getRuntimeSettingsMetadata();

    return {
        auth: {
            cookieName: loaded.config.auth.cookieName,
            sessionTtlSeconds: loaded.config.auth.sessionTtlSeconds,
            adminFallbackEnabled: loaded.config.auth.adminFallbackEnabled,
            adminUsername: loaded.config.auth.adminUsername,
        },
        feishu: {
            enabled: loaded.config.feishu.enabled,
            appId: process.env.FEISHU_APP_ID || '',
            appSecret: process.env.FEISHU_APP_SECRET || '',
            redirectUri: process.env.FEISHU_REDIRECT_URI || `${loaded.config.feishu.callbackBaseUrl.replace(/\/$/, '')}/api/auth/feishu/callback`,
            appBaseUrl: loaded.config.feishu.appBaseUrl,
            callbackBaseUrl: loaded.config.feishu.callbackBaseUrl,
        },
        ngrok: {
            enabled: loaded.config.ngrok.enabled,
            apiUrl: loaded.config.ngrok.apiUrl,
            authtoken: process.env.NGROK_AUTHTOKEN || '',
            domain: loaded.config.ngrok.domain,
            tunnelName: loaded.config.ngrok.tunnelName,
            addr: loaded.config.ngrok.addr,
        },
        ui: {
            appName: loaded.config.ui.appName,
            supportUrl: loaded.config.ui.supportUrl,
            defaultLocale: loaded.config.ui.defaultLocale,
        },
        metadata: {
            updatedAt: runtimeMetadata.updatedAt || loaded.updatedAt,
            restartRequired: runtimeMetadata.restartRequired,
            configVersion: loaded.version,
            source: 'env+service-config',
        },
    };
}

export function getDataDir() {
    return process.env.MAGUS_DATA_DIR || 'data';
}

export function getSettingsFieldSources(): SettingsFieldSources {
    return {
        auth: {
            cookieName: 'service-config',
            sessionTtlSeconds: 'service-config',
            adminFallbackEnabled: 'service-config',
            adminUsername: 'service-config',
        },
        feishu: {
            enabled: 'service-config',
            appId: 'env',
            appSecret: 'env',
            redirectUri: 'env',
            appBaseUrl: 'service-config',
            callbackBaseUrl: 'service-config',
        },
        ngrok: {
            enabled: 'service-config',
            apiUrl: 'service-config',
            authtoken: 'env',
            domain: 'service-config',
            tunnelName: 'service-config',
            addr: 'service-config',
        },
        ui: {
            appName: 'service-config',
            supportUrl: 'service-config',
            defaultLocale: 'service-config',
        },
    };
}

export function getSystemSettings(): SystemSettings {
    const settings = getDefaultSettings();
    syncNgrokConfig(settings);
    return settings;
}

export function getPublicUiSettings() {
    return getSystemSettings().ui;
}

function maskSecret(value: string) {
    if (!value) {
        return '';
    }
    if (value.length <= 4) {
        return MASK;
    }
    return `${MASK}${value.slice(-4)}`;
}

export function getMaskedSystemSettings(): SystemSettings {
    const settings = getSystemSettings();

    return {
        ...settings,
        feishu: {
            ...settings.feishu,
            appSecret: maskSecret(settings.feishu.appSecret),
        },
        ngrok: {
            ...settings.ngrok,
            authtoken: maskSecret(settings.ngrok.authtoken),
        },
    };
}

export async function updateSystemSettings(incoming: Partial<SystemSettings>) {
    const nextConfig = updateCloudConfig({
        auth: incoming.auth ? {
            cookieName: incoming.auth.cookieName,
            sessionTtlSeconds: incoming.auth.sessionTtlSeconds,
            adminFallbackEnabled: incoming.auth.adminFallbackEnabled,
            adminUsername: incoming.auth.adminUsername,
        } : undefined,
        feishu: incoming.feishu ? {
            enabled: incoming.feishu.enabled,
            appBaseUrl: incoming.feishu.appBaseUrl,
            callbackBaseUrl: incoming.feishu.callbackBaseUrl,
        } : undefined,
        ngrok: incoming.ngrok ? {
            enabled: incoming.ngrok.enabled,
            apiUrl: incoming.ngrok.apiUrl,
            domain: incoming.ngrok.domain,
            tunnelName: incoming.ngrok.tunnelName,
            addr: incoming.ngrok.addr,
        } : undefined,
        ui: incoming.ui ? {
            appName: incoming.ui.appName,
            supportUrl: incoming.ui.supportUrl,
            defaultLocale: incoming.ui.defaultLocale,
        } : undefined,
    });

    const restartRequired = Boolean(incoming.auth || incoming.feishu || incoming.ngrok);
    await updateRuntimeSettingOverrides({}, {restartRequired});
    const next = getSystemSettings();
    syncNgrokConfig(next);
    return {
        ...next,
        metadata: {
            ...next.metadata,
            updatedAt: nextConfig.updatedAt,
            restartRequired,
        },
    };
}

export function clearRestartRequiredFlag() {
    return getSystemSettings();
}
