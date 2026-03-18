import crypto from 'crypto';
import fs from 'fs';
import fsp from 'fs/promises';
import os from 'os';
import path from 'path';
import * as tar from 'tar';
import {getCloudConfig, getConfiguredCloudUser} from '../cloud/config';
import {getStorageRoot, getUserStorageRoot} from '../runtime/paths';
import {
    getMetadataDumpTables,
    listBackupSnapshots,
    listShareRecordsByUser,
    listNodeStatuses,
    metadataQuery,
    upsertBackupSnapshot,
} from './metadata';
import {formatBytes, toBytesFromGb} from './bytes';
import {getDirectorySize} from '../../services/fileService';

type BackupManifest = {
    snapshotId: string;
    kind: 'site' | 'user-export';
    createdAt: string;
    configVersion: string;
    nodes: Array<{id: string; baseUrl: string; lastHeartbeat: string}>;
    storage: {
        rootDir: string;
        totalCapacityBytes: number;
        reserveFreeBytes: number;
        usedBytes: number;
    };
    checksum?: string;
    username?: string;
};

function buildSnapshotId(prefix: string) {
    return `${prefix}-${new Date().toISOString().replace(/[:.]/g, '-').toLowerCase()}`;
}

async function ensureDir(dirPath: string) {
    await fsp.mkdir(dirPath, {recursive: true});
}

async function hashFile(filePath: string) {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    await new Promise<void>((resolve, reject) => {
        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve());
    });

    return hash.digest('hex');
}

function escapeSqlValue(value: unknown): string {
    if (value === null || value === undefined) {
        return 'NULL';
    }
    if (Array.isArray(value)) {
        return `ARRAY[${value.map((item) => escapeSqlValue(item)).join(', ')}]`;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) ? String(value) : 'NULL';
    }
    if (typeof value === 'boolean') {
        return value ? 'TRUE' : 'FALSE';
    }
    if (value instanceof Date) {
        return `'${value.toISOString().replace(/'/g, "''")}'`;
    }
    if (typeof value === 'object') {
        return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
    }
    return `'${String(value).replace(/'/g, "''")}'`;
}

async function writeMetadataSql(targetPath: string) {
    const tables = await getMetadataDumpTables();
    const lines: string[] = ['BEGIN;'];

    for (const tableName of tables) {
        const result = await metadataQuery(`SELECT * FROM ${tableName}`);
        lines.push(`-- ${tableName}`);
        if (!result.rows.length) {
            continue;
        }

        const columns = Object.keys(result.rows[0]);
        for (const row of result.rows) {
            const values = columns.map((column) => escapeSqlValue((row as Record<string, unknown>)[column]));
            lines.push(`INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});`);
        }
    }

    lines.push('COMMIT;');
    await fsp.writeFile(targetPath, `${lines.join('\n')}\n`, 'utf8');
}

async function writeJson(targetPath: string, data: unknown) {
    await fsp.writeFile(targetPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function packDirectory(sourceDir: string, archivePath: string) {
    await tar.create({
        gzip: true,
        cwd: sourceDir,
        file: archivePath,
        portable: true,
    }, ['.']);
}

async function trimBackups() {
    const {config} = getCloudConfig();
    const snapshots = await listBackupSnapshots();
    const stale = snapshots.slice(config.backup.retentionCount);
    await Promise.all(stale.map(async (item) => {
        await Promise.allSettled([
            fsp.rm(item.archive_path, {force: true}),
            fsp.rm(item.manifest_path, {force: true}),
        ]);
    }));
}

export async function createSiteSnapshot() {
    const loaded = getCloudConfig();
    const rootDir = getStorageRoot(process.env.NODE_ENV === 'development');
    const snapshotId = buildSnapshotId('site');
    const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'magus-site-snapshot-'));
    const workspace = path.join(tempDir, snapshotId);
    const outputDir = path.resolve(process.cwd(), loaded.config.backup.snapshotRootDir);
    const archivePath = path.join(outputDir, `${snapshotId}.tar.gz`);
    const manifestPath = path.join(outputDir, `${snapshotId}.manifest.json`);

    await ensureDir(workspace);
    await ensureDir(outputDir);
    await upsertBackupSnapshot({
        snapshotId,
        kind: 'site',
        archivePath,
        manifestPath,
        status: 'running',
        metadata: {},
    });

    try {
        await writeMetadataSql(path.join(workspace, 'metadata.sql'));
        await fsp.cp(rootDir, path.join(workspace, 'storage'), {recursive: true});
        const nodes = await listNodeStatuses();
        const usedBytes = fs.existsSync(rootDir) ? getDirectorySize(rootDir) : 0;
        const manifest: BackupManifest = {
            snapshotId,
            kind: 'site',
            createdAt: new Date().toISOString(),
            configVersion: loaded.version,
            nodes: nodes.map((node) => ({
                id: node.node_id,
                baseUrl: node.base_url,
                lastHeartbeat: new Date(node.last_heartbeat).toISOString(),
            })),
            storage: {
                rootDir,
                totalCapacityBytes: toBytesFromGb(loaded.config.storage.totalCapacityGb),
                reserveFreeBytes: toBytesFromGb(loaded.config.storage.reserveFreeGb),
                usedBytes,
            },
        };
        await writeJson(path.join(workspace, 'manifest.json'), manifest);
        await packDirectory(workspace, archivePath);
        const checksum = await hashFile(archivePath);
        manifest.checksum = checksum;
        await writeJson(manifestPath, manifest);
        await upsertBackupSnapshot({
            snapshotId,
            kind: 'site',
            archivePath,
            manifestPath,
            status: loaded.config.backup.verifyAfterCreate ? 'verified' : 'ready',
            checksum,
            metadata: {
                usedBytes,
                usedLabel: formatBytes(usedBytes),
            },
        });
        await trimBackups();
        return {
            snapshotId,
            archivePath,
            manifestPath,
            checksum,
        };
    } catch (error) {
        await upsertBackupSnapshot({
            snapshotId,
            kind: 'site',
            archivePath,
            manifestPath,
            status: 'failed',
            metadata: {
                error: error instanceof Error ? error.message : String(error),
            },
        });
        throw error;
    } finally {
        await fsp.rm(tempDir, {recursive: true, force: true});
    }
}

export async function exportUserSnapshot(username: string) {
    const loaded = getCloudConfig();
    if (!loaded.config.backup.allowUserExport) {
        throw new Error('User export is disabled');
    }

    const configured = getConfiguredCloudUser(username);
    if (!configured || !configured.enabled) {
        throw new Error('User is not available in cloud config');
    }

    const snapshotId = buildSnapshotId(`user-${username}`);
    const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'magus-user-export-'));
    const workspace = path.join(tempDir, snapshotId);
    const outputDir = path.resolve(process.cwd(), loaded.config.backup.snapshotRootDir);
    const archivePath = path.join(outputDir, `${snapshotId}.tar.gz`);
    const manifestPath = path.join(outputDir, `${snapshotId}.manifest.json`);
    const userRoot = getUserStorageRoot(username, process.env.NODE_ENV === 'development');

    await ensureDir(workspace);
    await ensureDir(outputDir);
    await upsertBackupSnapshot({
        snapshotId,
        kind: 'user-export',
        username,
        archivePath,
        manifestPath,
        status: 'running',
        metadata: {},
    });

    try {
        const filesDir = path.join(workspace, 'files');
        await ensureDir(filesDir);
        if (fs.existsSync(userRoot)) {
            await fsp.cp(userRoot, filesDir, {recursive: true});
        }
        const shares = await listShareRecordsByUser(username);
        const usedBytes = fs.existsSync(userRoot) ? getDirectorySize(userRoot) : 0;
        const manifest: BackupManifest = {
            snapshotId,
            kind: 'user-export',
            createdAt: new Date().toISOString(),
            configVersion: loaded.version,
            nodes: [],
            storage: {
                rootDir: userRoot,
                totalCapacityBytes: toBytesFromGb(loaded.config.storage.totalCapacityGb),
                reserveFreeBytes: toBytesFromGb(loaded.config.storage.reserveFreeGb),
                usedBytes,
            },
            username,
        };
        await writeJson(path.join(workspace, 'user-manifest.json'), {
            ...manifest,
            shares,
            user: configured,
        });
        await packDirectory(workspace, archivePath);
        const checksum = await hashFile(archivePath);
        manifest.checksum = checksum;
        await writeJson(manifestPath, manifest);
        await upsertBackupSnapshot({
            snapshotId,
            kind: 'user-export',
            username,
            archivePath,
            manifestPath,
            status: loaded.config.backup.verifyAfterCreate ? 'verified' : 'ready',
            checksum,
            metadata: {
                usedBytes,
                usedLabel: formatBytes(usedBytes),
            },
        });
        await trimBackups();
        return {
            snapshotId,
            archivePath,
            manifestPath,
            checksum,
        };
    } catch (error) {
        await upsertBackupSnapshot({
            snapshotId,
            kind: 'user-export',
            username,
            archivePath,
            manifestPath,
            status: 'failed',
            metadata: {
                error: error instanceof Error ? error.message : String(error),
            },
        });
        throw error;
    } finally {
        await fsp.rm(tempDir, {recursive: true, force: true});
    }
}

async function readManifestFromArchive(archivePath: string) {
    const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'magus-import-'));
    try {
        await tar.extract({
            cwd: tempDir,
            file: archivePath,
        });
        const manifestPath = path.join(tempDir, 'user-manifest.json');
        const manifest = JSON.parse(await fsp.readFile(manifestPath, 'utf8')) as BackupManifest & {
            user: {
                username: string;
                displayName: string;
                homeDir: string;
            };
            shares: Array<Record<string, unknown>>;
        };
        return {
            tempDir,
            manifest,
        };
    } catch (error) {
        await fsp.rm(tempDir, {recursive: true, force: true});
        throw error;
    }
}

export async function importUserSnapshot(archivePath: string, targetUsername: string, dryRun: boolean) {
    const configured = getConfiguredCloudUser(targetUsername);
    if (!configured || !configured.enabled) {
        throw new Error('Target user is not configured');
    }

    const {tempDir, manifest} = await readManifestFromArchive(archivePath);
    try {
        const sourceFilesPath = path.join(tempDir, 'files');
        const targetDir = getUserStorageRoot(targetUsername, process.env.NODE_ENV === 'development');
        const result = {
            archivePath,
            targetUsername,
            dryRun,
            manifest,
            targetDir,
            willImport: fs.existsSync(sourceFilesPath),
        };

        if (!dryRun && fs.existsSync(sourceFilesPath)) {
            await ensureDir(targetDir);
            await fsp.cp(sourceFilesPath, targetDir, {recursive: true, force: true});
        }

        return result;
    } finally {
        await fsp.rm(tempDir, {recursive: true, force: true});
    }
}
