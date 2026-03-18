import {getCloudConfig} from '../cloud/config';
import {SystemSettings} from '../config/types';
import {getAppSetting, setAppSetting} from './metadata';

export interface RuntimeSettingOverrides {
    auth?: Partial<SystemSettings['auth']>;
    feishu?: Partial<Pick<SystemSettings['feishu'], 'enabled' | 'appBaseUrl' | 'callbackBaseUrl'>>;
    ngrok?: Partial<Pick<SystemSettings['ngrok'], 'enabled' | 'apiUrl' | 'domain' | 'tunnelName' | 'addr'>>;
    ui?: Partial<Pick<SystemSettings['ui'], 'appName' | 'supportUrl'>>;
    metadata?: {
        updatedAt: string;
        restartRequired: boolean;
    };
}

export interface UiOverrides {
    appName?: string;
    supportUrl?: string;
}

const SETTINGS_KEY = 'system-overrides';
let cachedSettingOverrides: RuntimeSettingOverrides = {};

function normalizeRuntimeOverrides(raw: RuntimeSettingOverrides | null | undefined): RuntimeSettingOverrides {
    return {
        auth: raw?.auth || {},
        feishu: raw?.feishu || {},
        ngrok: raw?.ngrok || {},
        ui: raw?.ui || {},
        metadata: raw?.metadata
            ? {
                updatedAt: raw.metadata.updatedAt || new Date().toISOString(),
                restartRequired: Boolean(raw.metadata.restartRequired),
            }
            : undefined,
    };
}

function mergeDefined<T extends Record<string, unknown>>(current: T, incoming: Partial<T> | undefined) {
    const next = {...current};
    for (const [key, value] of Object.entries(incoming || {})) {
        if (value !== undefined) {
            next[key as keyof T] = value as T[keyof T];
        }
    }
    return next;
}

export async function hydrateUiOverrides() {
    cachedSettingOverrides = normalizeRuntimeOverrides(
        await getAppSetting<RuntimeSettingOverrides>(SETTINGS_KEY, {}),
    );
    return cachedSettingOverrides;
}

export function getRuntimeSettingOverrides() {
    return cachedSettingOverrides;
}

export function getUiOverrides() {
    return cachedSettingOverrides.ui || {};
}

export function getRuntimeSettingsMetadata() {
    return cachedSettingOverrides.metadata || {
        updatedAt: new Date().toISOString(),
        restartRequired: false,
    };
}

export function getResolvedUiSettings() {
    const {config} = getCloudConfig();
    return {
        ...config.ui,
        ...(cachedSettingOverrides.ui || {}),
    };
}

export async function updateRuntimeSettingOverrides(
    incoming: RuntimeSettingOverrides,
    options: {restartRequired: boolean},
) {
    cachedSettingOverrides = normalizeRuntimeOverrides({
        auth: mergeDefined(cachedSettingOverrides.auth || {}, incoming.auth),
        feishu: mergeDefined(cachedSettingOverrides.feishu || {}, incoming.feishu),
        ngrok: mergeDefined(cachedSettingOverrides.ngrok || {}, incoming.ngrok),
        ui: mergeDefined(cachedSettingOverrides.ui || {}, incoming.ui),
        metadata: {
            updatedAt: new Date().toISOString(),
            restartRequired: options.restartRequired,
        },
    });
    await setAppSetting(SETTINGS_KEY, cachedSettingOverrides);
    return cachedSettingOverrides;
}

export async function updateUiOverrides(incoming: UiOverrides) {
    await updateRuntimeSettingOverrides({ui: incoming}, {restartRequired: false});
    return getResolvedUiSettings();
}
