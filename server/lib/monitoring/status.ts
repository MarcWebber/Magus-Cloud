import fs from 'fs';
import path from 'path';
import {spawnSync} from 'child_process';
import checkDiskSpace from 'check-disk-space';
import {getSystemSettings} from '../config/store';
import {getNgrokStatus} from '../../integrations/ngrok/status';
import {getStorageRoot} from '../runtime/paths';
import {getCloudConfig} from '../cloud/config';
import {formatBytes, safePercent, toBytesFromGb} from '../platform/bytes';
import {
    getLatestConfigVersion,
    getMetadataPool,
    listBackupSnapshots,
    listMetadataUsers,
    listNodeStatuses,
} from '../platform/metadata';
import {getDirectorySize} from '../../services/fileService';

function commandExists(command: string) {
    try {
        const result = spawnSync(command, ['--version'], {stdio: 'ignore', shell: process.platform === 'win32'});
        return result.status === 0 || result.status === 1;
    } catch {
        return false;
    }
}

export function readPackageVersion() {
    try {
        const packageJsonPath = path.resolve(process.cwd(), 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {version?: string};
        return packageJson.version || '0.0.0';
    } catch {
        return '0.0.0';
    }
}

async function getDatabaseStatus() {
    try {
        const pool = await getMetadataPool();
        await pool.query('SELECT 1');
        return {connected: true};
    } catch (error) {
        return {
            connected: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

async function buildStorageSnapshot(rootDir: string) {
    const loaded = getCloudConfig();
    const entries = fs.existsSync(rootDir) ? fs.readdirSync(rootDir, {withFileTypes: true}) : [];
    const users = await Promise.all(entries
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
        .map(async (entry) => {
            const userDir = path.join(rootDir, entry.name);
            const usedBytes = getDirectorySize(userDir);
            return {
                username: entry.name,
                usedBytes,
                usedLabel: formatBytes(usedBytes),
            };
        }));
    const totalUsedBytes = users.reduce((sum, item) => sum + item.usedBytes, 0);
    const totalCapacityBytes = toBytesFromGb(loaded.config.storage.totalCapacityGb);
    const reserveFreeBytes = toBytesFromGb(loaded.config.storage.reserveFreeGb);
    const allocatableBytes = Math.max(totalCapacityBytes - reserveFreeBytes, 0);
    const overQuotaUsers = loaded.config.users
        .map((user) => {
            const usage = users.find((item) => item.username === user.homeDir || item.username === user.username);
            const quotaBytes = loaded.config.storage.quotaEnabled
                ? toBytesFromGb(user.quotaGb ?? loaded.config.storage.defaultUserQuotaGb)
                : null;
            const usedBytes = usage?.usedBytes || 0;
            return {
                username: user.username,
                displayName: user.displayName,
                usedBytes,
                quotaBytes,
                percent: quotaBytes ? safePercent(usedBytes, quotaBytes) : null,
                overQuota: quotaBytes ? usedBytes > quotaBytes : false,
            };
        })
        .filter((user) => user.overQuota);

    return {
        rootDir,
        totalUsedBytes,
        totalCapacityBytes,
        reserveFreeBytes,
        allocatableBytes,
        totalUsedLabel: formatBytes(totalUsedBytes),
        totalCapacityLabel: formatBytes(totalCapacityBytes),
        reserveFreeLabel: formatBytes(reserveFreeBytes),
        allocatableLabel: formatBytes(allocatableBytes),
        users,
        overQuotaUsers,
        warningThresholdPercent: loaded.config.storage.warningThresholdPercent,
        warningTriggered: totalCapacityBytes > 0
            ? safePercent(totalUsedBytes, totalCapacityBytes) >= loaded.config.storage.warningThresholdPercent
            : false,
    };
}

export async function getMonitoringStatus() {
    const settings = getSystemSettings();
    const loaded = getCloudConfig();
    const rootDir = getStorageRoot(process.env.NODE_ENV === 'development');
    const disk = fs.existsSync(rootDir)
        ? await checkDiskSpace(rootDir).catch(() => null)
        : null;
    const ngrok = await getNgrokStatus();
    const database = await getDatabaseStatus();
    const storage = await buildStorageSnapshot(rootDir);
    const nodes = await listNodeStatuses();
    const backups = await listBackupSnapshots();
    const latestConfig = await getLatestConfigVersion();
    const users = await listMetadataUsers();

    return {
        app: {
            name: settings.ui.appName,
            version: readPackageVersion(),
            uptimeSeconds: Math.floor(process.uptime()),
            environment: process.env.NODE_ENV || 'production',
        },
        config: {
            version: latestConfig?.config_version || loaded.version,
            path: latestConfig?.config_path || loaded.configPath,
            source: settings.metadata.source,
        },
        database,
        storage: {
            rootDir: storage.rootDir,
            exists: fs.existsSync(rootDir),
            freeBytes: disk?.free || 0,
            totalBytes: disk?.size || 0,
            quotaEnabled: loaded.config.storage.quotaEnabled,
            quotaMode: loaded.config.storage.quotaMode,
            defaultUserQuotaGb: loaded.config.storage.defaultUserQuotaGb,
            defaultSoftQuotaGb: loaded.config.storage.defaultSoftQuotaGb,
            defaultHardQuotaGb: loaded.config.storage.defaultHardQuotaGb,
            warningThresholdPercent: loaded.config.storage.warningThresholdPercent,
            warningTriggered: storage.warningTriggered,
            autoExpandEnabled: loaded.config.storage.autoExpandEnabled,
            totalCapacityBytes: storage.totalCapacityBytes,
            reserveFreeBytes: storage.reserveFreeBytes,
            allocatableBytes: storage.allocatableBytes,
            usedBytes: storage.totalUsedBytes,
            users: storage.users,
            overQuotaUsers: storage.overQuotaUsers,
        },
        cluster: {
            mode: loaded.config.cluster.mode,
            gatewayPublicUrl: loaded.config.cluster.gatewayPublicUrl,
            configuredNodes: loaded.config.cluster.nodes,
            activeNodes: nodes,
            users,
        },
        backups: {
            total: backups.length,
            latest: backups[0] || null,
        },
        dependencies: {
            purePw: commandExists('pure-pw'),
        },
        ngrok,
        restartRequired: false,
    };
}
