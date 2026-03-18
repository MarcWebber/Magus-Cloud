import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {CloudConfig, CloudUserConfig, LoadedCloudConfig} from './types';

const CONFIG_DIR = path.resolve(process.cwd(), 'config');
const DEFAULT_SERVICE_CONFIG_PATH = path.join(CONFIG_DIR, 'magus.config.json');
const DEFAULT_LEGACY_CONFIG_PATH = path.join(CONFIG_DIR, 'cloud.config.json');

function normalizeHomeDir(username: string, homeDir?: string) {
    const raw = (homeDir || username).replace(/\\/g, '/').replace(/^\/+/, '');
    return raw || username;
}

function buildDefaultUsers(): CloudUserConfig[] {
    const adminUsername = process.env.MAGUS_ADMIN_USERNAME || 'admin';

    return [
        {
            username: adminUsername,
            displayName: 'Administrator',
            enabled: true,
            quotaGb: 20,
            homeDir: adminUsername,
        },
        {
            username: 'test',
            displayName: 'Test User',
            enabled: true,
            quotaGb: 20,
            homeDir: 'test',
        },
    ];
}

function buildDefaultConfig(): CloudConfig {
    const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    const appBaseUrl = process.env.MAGUS_PUBLIC_APP_URL || 'http://localhost:3000';
    const apiBaseUrl = process.env.MAGUS_PUBLIC_API_URL || appBaseUrl;
    const adminUsername = process.env.MAGUS_ADMIN_USERNAME || 'admin';
    const defaultHardQuotaGb = Math.max(Number(process.env.MAGUS_USER_QUOTA_GB) || 20, 0.001);

    return {
        cluster: {
            mode: 'shared-storage',
            gatewayPublicUrl: appBaseUrl,
            nodes: [
                {
                    id: process.env.MAGUS_NODE_ID || 'node-local',
                    baseUrl: apiBaseUrl,
                    enabled: true,
                    tags: ['primary', process.env.NODE_ENV || 'development'],
                },
            ],
        },
        storage: {
            sharedRootDir: isDev
                ? (process.env.MAGUS_DEV_STORAGE_ROOT || path.resolve(process.cwd(), 'uploads'))
                : (process.env.MAGUS_STORAGE_ROOT || '/www/wwwroot'),
            totalCapacityGb: Math.max(Number(process.env.MAGUS_TOTAL_CAPACITY_GB) || 500, 1),
            reserveFreeGb: Math.max(Number(process.env.MAGUS_RESERVE_FREE_GB) || 20, 0),
            defaultUserQuotaGb: defaultHardQuotaGb,
            defaultSoftQuotaGb: Math.max(Number(process.env.MAGUS_USER_SOFT_QUOTA_GB) || 200, 0.001),
            defaultHardQuotaGb,
            quotaEnabled: (process.env.MAGUS_QUOTA_ENABLED || 'true') !== 'false',
            quotaMode: 'hard',
            warningThresholdPercent: Math.min(Math.max(Number(process.env.MAGUS_WARNING_THRESHOLD_PERCENT) || 85, 1), 99),
            autoExpandEnabled: false,
        },
        users: buildDefaultUsers(),
        backup: {
            snapshotRootDir: process.env.MAGUS_SNAPSHOT_ROOT || path.resolve(process.cwd(), 'snapshots'),
            retentionCount: Math.max(Number(process.env.MAGUS_BACKUP_RETENTION) || 10, 1),
            compression: 'tar.gz',
            allowUserExport: (process.env.MAGUS_ALLOW_USER_EXPORT || 'true') !== 'false',
            verifyAfterCreate: (process.env.MAGUS_VERIFY_BACKUP || 'true') !== 'false',
        },
        ui: {
            appName: process.env.MAGUS_APP_NAME || 'Magus Cloud',
            supportUrl: process.env.MAGUS_SUPPORT_URL || '',
            defaultLocale: 'zh-CN',
        },
        auth: {
            cookieName: process.env.MAGUS_COOKIE_NAME || 'magus_session',
            sessionTtlSeconds: Number(process.env.MAGUS_SESSION_TTL || 2 * 60 * 60),
            adminFallbackEnabled: true,
            adminUsername,
        },
        feishu: {
            enabled: Boolean(process.env.FEISHU_APP_ID && process.env.FEISHU_APP_SECRET),
            appBaseUrl,
            callbackBaseUrl: apiBaseUrl,
        },
        ngrok: {
            enabled: Boolean(process.env.NGROK_AUTHTOKEN),
            apiUrl: process.env.NGROK_API_URL || 'http://ngrok:4040',
            domain: process.env.NGROK_DOMAIN || '',
            tunnelName: process.env.NGROK_TUNNEL_NAME || 'magus-cloud',
            addr: process.env.NGROK_ADDR || 'app:3000',
        },
    };
}

function ensureConfigDir() {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, {recursive: true});
    }
}

function toNumber(value: unknown, fallback: number, minimum: number) {
    return Math.max(Number(value ?? fallback) || fallback, minimum);
}

function normalizeConfig(raw: Partial<CloudConfig>): CloudConfig {
    const defaults = buildDefaultConfig();
    const mergedUsers = (raw.users || defaults.users).map((user) => ({
        username: user.username,
        displayName: user.displayName || user.username,
        quotaGb: user.quotaGb ?? undefined,
        enabled: user.enabled !== false,
        homeDir: normalizeHomeDir(user.username, user.homeDir),
    }));

    const sharedRootDir = raw.storage?.sharedRootDir || defaults.storage.sharedRootDir;
    const totalCapacityGb = toNumber(raw.storage?.totalCapacityGb, defaults.storage.totalCapacityGb, 1);
    const reserveFreeGb = Math.max(Number(raw.storage?.reserveFreeGb ?? defaults.storage.reserveFreeGb) || defaults.storage.reserveFreeGb, 0);
    const defaultHardQuotaGb = toNumber(
        raw.storage?.defaultHardQuotaGb ?? raw.storage?.defaultUserQuotaGb,
        defaults.storage.defaultHardQuotaGb,
        0.001,
    );

    return {
        cluster: {
            mode: 'shared-storage',
            gatewayPublicUrl: raw.cluster?.gatewayPublicUrl || defaults.cluster.gatewayPublicUrl,
            nodes: (raw.cluster?.nodes || defaults.cluster.nodes).map((node) => ({
                id: node.id,
                baseUrl: node.baseUrl,
                enabled: node.enabled !== false,
                tags: Array.isArray(node.tags) ? node.tags : [],
            })),
        },
        storage: {
            sharedRootDir,
            totalCapacityGb,
            reserveFreeGb,
            defaultUserQuotaGb: toNumber(raw.storage?.defaultUserQuotaGb, defaultHardQuotaGb, 0.001),
            defaultSoftQuotaGb: toNumber(raw.storage?.defaultSoftQuotaGb, defaults.storage.defaultSoftQuotaGb, 0.001),
            defaultHardQuotaGb,
            quotaEnabled: raw.storage?.quotaEnabled ?? defaults.storage.quotaEnabled,
            quotaMode: raw.storage?.quotaMode === 'oversell' ? 'oversell' : 'hard',
            warningThresholdPercent: Math.min(
                Math.max(Number(raw.storage?.warningThresholdPercent ?? defaults.storage.warningThresholdPercent) || defaults.storage.warningThresholdPercent, 1),
                99,
            ),
            autoExpandEnabled: raw.storage?.autoExpandEnabled ?? defaults.storage.autoExpandEnabled,
        },
        users: mergedUsers,
        backup: {
            snapshotRootDir: raw.backup?.snapshotRootDir || defaults.backup.snapshotRootDir,
            retentionCount: toNumber(raw.backup?.retentionCount, defaults.backup.retentionCount, 1),
            compression: 'tar.gz',
            allowUserExport: raw.backup?.allowUserExport ?? defaults.backup.allowUserExport,
            verifyAfterCreate: raw.backup?.verifyAfterCreate ?? defaults.backup.verifyAfterCreate,
        },
        ui: {
            appName: raw.ui?.appName || defaults.ui.appName,
            supportUrl: raw.ui?.supportUrl || defaults.ui.supportUrl,
            defaultLocale: raw.ui?.defaultLocale || defaults.ui.defaultLocale,
        },
        auth: {
            cookieName: raw.auth?.cookieName || defaults.auth.cookieName,
            sessionTtlSeconds: toNumber(raw.auth?.sessionTtlSeconds, defaults.auth.sessionTtlSeconds, 300),
            adminFallbackEnabled: raw.auth?.adminFallbackEnabled ?? defaults.auth.adminFallbackEnabled,
            adminUsername: raw.auth?.adminUsername || defaults.auth.adminUsername,
        },
        feishu: {
            enabled: raw.feishu?.enabled ?? defaults.feishu.enabled,
            appBaseUrl: raw.feishu?.appBaseUrl || defaults.feishu.appBaseUrl,
            callbackBaseUrl: raw.feishu?.callbackBaseUrl || defaults.feishu.callbackBaseUrl,
        },
        ngrok: {
            enabled: raw.ngrok?.enabled ?? defaults.ngrok.enabled,
            apiUrl: raw.ngrok?.apiUrl || defaults.ngrok.apiUrl,
            domain: raw.ngrok?.domain || defaults.ngrok.domain,
            tunnelName: raw.ngrok?.tunnelName || defaults.ngrok.tunnelName,
            addr: raw.ngrok?.addr || defaults.ngrok.addr,
        },
    };
}

function assertValidCloudConfig(config: CloudConfig) {
    if (!config.cluster.gatewayPublicUrl.trim()) {
        throw new Error('Service gatewayPublicUrl is required');
    }

    if (!config.cluster.nodes.length) {
        throw new Error('At least one cluster node is required');
    }

    if (!config.users.length) {
        throw new Error('At least one user must be configured');
    }

    const nodeIds = new Set<string>();
    for (const node of config.cluster.nodes) {
        if (!node.id.trim()) {
            throw new Error('Cluster node id is required');
        }
        if (nodeIds.has(node.id)) {
            throw new Error(`Duplicate cluster node id: ${node.id}`);
        }
        nodeIds.add(node.id);
    }

    const usernames = new Set<string>();
    for (const user of config.users) {
        if (!user.username.trim()) {
            throw new Error('Service username is required');
        }
        if (usernames.has(user.username)) {
            throw new Error(`Duplicate service username: ${user.username}`);
        }
        usernames.add(user.username);
    }
}

function writeConfigFile(configPath: string, config: CloudConfig) {
    const backupPath = `${configPath}.bak`;
    const tempPath = `${configPath}.tmp`;

    if (fs.existsSync(configPath)) {
        fs.copyFileSync(configPath, backupPath);
    }

    fs.writeFileSync(tempPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
    fs.renameSync(tempPath, configPath);
}

let cached: LoadedCloudConfig | null = null;

export function getServiceConfigPath() {
    return path.resolve(process.cwd(), process.env.MAGUS_SERVICE_CONFIG || DEFAULT_SERVICE_CONFIG_PATH);
}

export function getCloudConfigPath() {
    return path.resolve(process.cwd(), process.env.MAGUS_CLOUD_CONFIG || DEFAULT_LEGACY_CONFIG_PATH);
}

export function invalidateCloudConfigCache() {
    cached = null;
}

function createLoadedConfig(configPath: string, config: CloudConfig, source: LoadedCloudConfig['source']): LoadedCloudConfig {
    const version = crypto.createHash('sha1').update(JSON.stringify(config)).digest('hex');
    const updatedAt = fs.existsSync(configPath)
        ? fs.statSync(configPath).mtime.toISOString()
        : new Date().toISOString();

    return {
        config,
        configPath,
        version,
        updatedAt,
        source,
    };
}

export function getCloudConfig(): LoadedCloudConfig {
    if (cached) {
        return cached;
    }

    ensureConfigDir();
    const serviceConfigPath = getServiceConfigPath();
    const legacyConfigPath = getCloudConfigPath();

    if (fs.existsSync(serviceConfigPath)) {
        const parsed = JSON.parse(fs.readFileSync(serviceConfigPath, 'utf8')) as Partial<CloudConfig>;
        const config = normalizeConfig(parsed);
        assertValidCloudConfig(config);
        cached = createLoadedConfig(serviceConfigPath, config, 'magus-config');
        return cached;
    }

    if (fs.existsSync(legacyConfigPath)) {
        const parsed = JSON.parse(fs.readFileSync(legacyConfigPath, 'utf8')) as Partial<CloudConfig>;
        const config = normalizeConfig(parsed);
        assertValidCloudConfig(config);
        writeConfigFile(serviceConfigPath, config);
        cached = createLoadedConfig(serviceConfigPath, config, 'cloud-config');
        return cached;
    }

    const defaults = buildDefaultConfig();
    assertValidCloudConfig(defaults);
    writeConfigFile(serviceConfigPath, defaults);
    cached = createLoadedConfig(serviceConfigPath, defaults, 'magus-config');
    return cached;
}

export function getConfiguredCloudUser(username: string) {
    const {config} = getCloudConfig();
    return config.users.find((user) => user.username === username) || null;
}

export function updateCloudConfig(incoming: Partial<CloudConfig>) {
    ensureConfigDir();
    const loaded = getCloudConfig();
    const next = normalizeConfig({
        ...loaded.config,
        ...incoming,
        cluster: {
            ...loaded.config.cluster,
            ...(incoming.cluster || {}),
        },
        storage: {
            ...loaded.config.storage,
            ...(incoming.storage || {}),
        },
        backup: {
            ...loaded.config.backup,
            ...(incoming.backup || {}),
        },
        ui: {
            ...loaded.config.ui,
            ...(incoming.ui || {}),
        },
        auth: {
            ...loaded.config.auth,
            ...(incoming.auth || {}),
        },
        feishu: {
            ...loaded.config.feishu,
            ...(incoming.feishu || {}),
        },
        ngrok: {
            ...loaded.config.ngrok,
            ...(incoming.ngrok || {}),
        },
        users: incoming.users || loaded.config.users,
    });

    assertValidCloudConfig(next);
    const targetPath = getServiceConfigPath();
    writeConfigFile(targetPath, next);
    invalidateCloudConfigCache();
    return getCloudConfig();
}
