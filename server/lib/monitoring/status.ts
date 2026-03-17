import fs from 'fs';
import path from 'path';
import {spawnSync} from 'child_process';
import checkDiskSpace from 'check-disk-space';
import {getSystemSettings} from '../config/store';
import {getNgrokStatus} from '../../integrations/ngrok/status';
import {getStorageRoot} from '../runtime/paths';

function commandExists(command: string) {
    try {
        const result = spawnSync(command, ['--version'], {stdio: 'ignore', shell: process.platform === 'win32'});
        return result.status === 0 || result.status === 1;
    } catch {
        return false;
    }
}

function readPackageVersion() {
    try {
        const packageJsonPath = path.resolve(process.cwd(), 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {version?: string};
        return packageJson.version || '0.0.0';
    } catch {
        return '0.0.0';
    }
}

export async function getMonitoringStatus() {
    const settings = getSystemSettings();
    const rootDir = getStorageRoot(process.env.NODE_ENV === 'development');
    const disk = fs.existsSync(rootDir)
        ? await checkDiskSpace(rootDir).catch(() => null)
        : null;
    const ngrok = await getNgrokStatus();

    return {
        app: {
            name: settings.ui.appName,
            version: readPackageVersion(),
            uptimeSeconds: Math.floor(process.uptime()),
            environment: process.env.NODE_ENV || 'production',
        },
        storage: {
            rootDir,
            exists: fs.existsSync(rootDir),
            freeBytes: disk?.free || 0,
            totalBytes: disk?.size || 0,
            quotaEnabled: settings.storage.quotaEnabled,
            defaultUserQuotaGb: settings.storage.defaultUserQuotaGb,
        },
        dependencies: {
            soffice: commandExists('soffice'),
            purePw: commandExists('pure-pw'),
        },
        ngrok,
        restartRequired: settings.metadata.restartRequired,
    };
}
