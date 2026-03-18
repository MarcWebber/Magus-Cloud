import fs from 'fs';
import {getCloudConfig} from '../cloud/config';
import {getResolvedUiSettings, hydrateUiOverrides} from './appSettings';
import {
    ensureMetadataSchema,
    getMetadataPool,
    recordConfigVersion,
    syncUsersFromCloudConfig,
    upsertNodeStatus,
} from './metadata';
import {getStorageRoot} from '../runtime/paths';
import {readPackageVersion} from '../monitoring/status';

let bootPromise: Promise<void> | null = null;
const startedAt = new Date().toISOString();

export function getNodeRuntimeInfo() {
    return {
        nodeId: process.env.MAGUS_NODE_ID || 'node-local',
        startedAt,
    };
}

export async function ensureRuntimeReady() {
    if (!bootPromise) {
        bootPromise = (async () => {
            const loaded = getCloudConfig();
            await ensureMetadataSchema();
            await getMetadataPool();
            await hydrateUiOverrides();
            await syncUsersFromCloudConfig(loaded.config.users);
            await recordConfigVersion(loaded.version, loaded.configPath, getNodeRuntimeInfo().nodeId);
            const storageRoot = getStorageRoot(process.env.NODE_ENV === 'development');
            fs.mkdirSync(storageRoot, {recursive: true});
            await upsertNodeStatus({
                nodeId: getNodeRuntimeInfo().nodeId,
                baseUrl: loaded.config.cluster.nodes.find((node) => node.id === getNodeRuntimeInfo().nodeId)?.baseUrl
                    || process.env.MAGUS_PUBLIC_API_URL
                    || process.env.MAGUS_PUBLIC_APP_URL
                    || 'http://localhost:3000',
                enabled: true,
                tags: loaded.config.cluster.nodes.find((node) => node.id === getNodeRuntimeInfo().nodeId)?.tags || [],
                version: readPackageVersion(),
                environment: process.env.NODE_ENV || 'production',
                startedAt,
                storageMounted: fs.existsSync(storageRoot),
                storageRoot,
                databaseOk: true,
                metadata: {
                    appName: getResolvedUiSettings().appName,
                },
            });
        })();
    }

    return bootPromise;
}
