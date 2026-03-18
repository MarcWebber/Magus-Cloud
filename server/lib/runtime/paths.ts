import path from 'path';
import {getCloudConfig, getConfiguredCloudUser} from '../cloud/config';

export function getStorageRoot(isDev: boolean) {
    const loaded = getCloudConfig();
    if (isDev && process.env.MAGUS_DEV_STORAGE_ROOT) {
        return path.resolve(process.cwd(), process.env.MAGUS_DEV_STORAGE_ROOT);
    }
    return path.resolve(process.cwd(), loaded.config.storage.sharedRootDir);
}

export function getUserStorageRoot(username: string, isDev: boolean) {
    const rootDir = getStorageRoot(isDev);
    const configured = getConfiguredCloudUser(username);
    const homeDir = configured?.homeDir || username;
    return path.join(rootDir, homeDir);
}

export function resolveSafeUserPath(username: string, relativePath: string, isDev: boolean) {
    const baseDir = getUserStorageRoot(username, isDev);
    const resolved = path.resolve(baseDir, relativePath);
    const realBase = path.resolve(baseDir);

    if (!resolved.startsWith(realBase)) {
        throw new Error('PathTraversal');
    }

    return resolved;
}
