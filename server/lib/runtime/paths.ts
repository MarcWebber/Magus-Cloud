import path from 'path';
import {getSystemSettings} from '../config/store';

export function getStorageRoot(isDev: boolean) {
    const settings = getSystemSettings();
    return isDev ? settings.storage.devRootDir : settings.storage.rootDir;
}

export function getUserStorageRoot(username: string, isDev: boolean) {
    const rootDir = getStorageRoot(isDev);
    return isDev ? rootDir : path.join(rootDir, username);
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
