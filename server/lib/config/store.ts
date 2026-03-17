import fs from 'fs';
import path from 'path';
import {SystemSettings} from './types';
import {syncNgrokConfig} from '../../integrations/ngrok/config';

const DATA_DIR = path.resolve(process.cwd(), process.env.MAGUS_DATA_DIR || 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'system-settings.json');

const MASK = '********';
const SENSITIVE_FIELDS: Array<[keyof SystemSettings, string]> = [
    ['feishu', 'appSecret'],
    ['ngrok', 'authtoken'],
];

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, {recursive: true});
    }
}

function getDefaultSettings(): SystemSettings {
    const now = new Date().toISOString();
    const appBaseUrl = process.env.MAGUS_PUBLIC_APP_URL || process.env.FRONTEND_URL || process.env.PUBLIC_APP_URL || 'http://localhost:3000';
    const callbackBaseUrl = process.env.MAGUS_PUBLIC_API_URL || process.env.PUBLIC_SERVER_URL || appBaseUrl;

    return {
        auth: {
            cookieName: process.env.MAGUS_COOKIE_NAME || 'magus_session',
            sessionTtlSeconds: Number(process.env.MAGUS_SESSION_TTL || 2 * 60 * 60),
            adminFallbackEnabled: true,
            adminUsername: process.env.MAGUS_ADMIN_USERNAME || 'admin',
        },
        feishu: {
            enabled: Boolean(process.env.FEISHU_APP_ID && process.env.FEISHU_APP_SECRET),
            appId: process.env.FEISHU_APP_ID || '',
            appSecret: process.env.FEISHU_APP_SECRET || '',
            appBaseUrl,
            callbackBaseUrl,
        },
        ngrok: {
            enabled: Boolean(process.env.NGROK_AUTHTOKEN),
            apiUrl: process.env.NGROK_API_URL || 'http://ngrok:4040',
            authtoken: process.env.NGROK_AUTHTOKEN || '',
            domain: process.env.NGROK_DOMAIN || '',
            tunnelName: process.env.NGROK_TUNNEL_NAME || 'magus-cloud',
            addr: process.env.NGROK_ADDR || 'app:3000',
        },
        storage: {
            rootDir: process.env.MAGUS_STORAGE_ROOT || '/www/wwwroot',
            devRootDir: process.env.MAGUS_DEV_STORAGE_ROOT || path.resolve(process.cwd(), 'uploads'),
            quotaEnabled: (process.env.MAGUS_QUOTA_ENABLED || 'false') === 'true',
            defaultUserQuotaGb: Math.max(Number(process.env.MAGUS_USER_QUOTA_GB || 20), 0.001),
        },
        ui: {
            appName: process.env.MAGUS_APP_NAME || 'Magus Cloud',
            supportUrl: process.env.MAGUS_SUPPORT_URL || '',
        },
        metadata: {
            updatedAt: now,
            restartRequired: false,
        },
    };
}

function normalizeLegacySettings(incoming: Partial<SystemSettings> & {
    feishu?: Partial<SystemSettings['feishu']> & {redirectBaseUrl?: string};
}) {
    const normalized = JSON.parse(JSON.stringify(incoming || {})) as Partial<SystemSettings> & {
        feishu?: Partial<SystemSettings['feishu']> & {redirectBaseUrl?: string};
    };

    if (normalized.feishu?.redirectBaseUrl) {
        normalized.feishu.appBaseUrl ||= normalized.feishu.redirectBaseUrl;
        normalized.feishu.callbackBaseUrl ||= normalized.feishu.redirectBaseUrl;
        delete normalized.feishu.redirectBaseUrl;
    }

    return normalized as Partial<SystemSettings>;
}

function mergeSettings(base: SystemSettings, incoming: Partial<SystemSettings>): SystemSettings {
    return {
        ...base,
        ...incoming,
        auth: {
            ...base.auth,
            ...(incoming.auth || {}),
        },
        feishu: {
            ...base.feishu,
            ...(incoming.feishu || {}),
        },
        ngrok: {
            ...base.ngrok,
            ...(incoming.ngrok || {}),
        },
        storage: {
            ...base.storage,
            ...(incoming.storage || {}),
        },
        ui: {
            ...base.ui,
            ...(incoming.ui || {}),
        },
        metadata: {
            ...base.metadata,
            ...(incoming.metadata || {}),
        },
    };
}

function looksMasked(value: unknown) {
    return typeof value === 'string' && (value === MASK || /^\*+$/.test(value));
}

function sanitizeIncoming(existing: SystemSettings, incoming: Partial<SystemSettings>): Partial<SystemSettings> {
    const sanitized = normalizeLegacySettings(JSON.parse(JSON.stringify(incoming || {})) as Partial<SystemSettings>);

    for (const [section, field] of SENSITIVE_FIELDS) {
        const target = sanitized[section] as Record<string, string> | undefined;
        if (!target || !(field in target)) {
            continue;
        }

        const nextValue = target[field];
        const currentValue = (existing[section] as Record<string, string>)[field];

        if (looksMasked(nextValue)) {
            target[field] = currentValue;
        }
    }

    return sanitized;
}

function readSettingsFile(): Partial<SystemSettings> {
    ensureDataDir();
    if (!fs.existsSync(SETTINGS_FILE)) {
        return {};
    }

    try {
        return normalizeLegacySettings(JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) as Partial<SystemSettings>);
    } catch {
        return {};
    }
}

function writeSettingsFile(settings: SystemSettings) {
    ensureDataDir();
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
    syncNgrokConfig(settings);
}

export function getDataDir() {
    ensureDataDir();
    return DATA_DIR;
}

export function getSettingsFilePath() {
    return SETTINGS_FILE;
}

export function getSystemSettings(): SystemSettings {
    const settings = mergeSettings(getDefaultSettings(), readSettingsFile());
    writeSettingsFile(settings);
    return settings;
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

export function updateSystemSettings(incoming: Partial<SystemSettings>) {
    const current = getSystemSettings();
    const merged = mergeSettings(current, sanitizeIncoming(current, incoming));
    const next = {
        ...merged,
        storage: {
            ...merged.storage,
            defaultUserQuotaGb: Math.max(Number(merged.storage.defaultUserQuotaGb) || 1, 0.001),
        },
        metadata: {
            updatedAt: new Date().toISOString(),
            restartRequired: true,
        },
    };

    writeSettingsFile(next);
    return next;
}

export function clearRestartRequiredFlag() {
    const current = getSystemSettings();
    const next = {
        ...current,
        metadata: {
            ...current.metadata,
            restartRequired: false,
            updatedAt: new Date().toISOString(),
        },
    };

    writeSettingsFile(next);
    return next;
}
