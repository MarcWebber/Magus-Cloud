import {Pool} from 'pg';
import {newDb} from 'pg-mem';
import {CloudNodeConfig, CloudUserConfig} from '../cloud/types';

type JsonRecord = Record<string, unknown>;

let poolPromise: Promise<Pool> | null = null;

function shouldUsePgMem() {
    return process.env.MAGUS_USE_PGMEM === 'true'
        || process.env.NODE_ENV === 'test'
        || process.env.NODE_ENV === 'development';
}

async function createPool() {
    const connectionString = process.env.MAGUS_DATABASE_URL || process.env.DATABASE_URL;
    if (connectionString) {
        return new Pool({connectionString});
    }

    if (!shouldUsePgMem()) {
        throw new Error('MAGUS_DATABASE_URL or DATABASE_URL is required outside test mode');
    }

    const db = newDb({autoCreateForeignKeyIndices: true});
    db.public.registerFunction({name: 'current_database', implementation: () => 'pg_mem'});
    const adapter = db.adapters.createPg();
    return new adapter.Pool();
}

export async function getMetadataPool() {
    if (!poolPromise) {
        poolPromise = createPool();
    }
    return poolPromise;
}

export async function metadataQuery<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
    const pool = await getMetadataPool();
    return pool.query<T>(sql, params);
}

export async function ensureMetadataSchema() {
    await metadataQuery(`
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            display_name TEXT NOT NULL,
            quota_gb DOUBLE PRECISION,
            enabled BOOLEAN NOT NULL DEFAULT TRUE,
            home_dir TEXT NOT NULL,
            source TEXT NOT NULL DEFAULT 'cloud-config',
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS shares (
            share_id TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            file_name TEXT NOT NULL,
            type TEXT NOT NULL,
            expire_at TIMESTAMPTZ,
            access_code TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            click_count INTEGER NOT NULL DEFAULT 0,
            download_count INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS node_status (
            node_id TEXT PRIMARY KEY,
            base_url TEXT NOT NULL,
            enabled BOOLEAN NOT NULL DEFAULT TRUE,
            tags TEXT[] NOT NULL DEFAULT '{}',
            version TEXT NOT NULL,
            environment TEXT NOT NULL,
            started_at TIMESTAMPTZ NOT NULL,
            last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            storage_mounted BOOLEAN NOT NULL DEFAULT FALSE,
            storage_root TEXT NOT NULL,
            database_ok BOOLEAN NOT NULL DEFAULT TRUE,
            metadata JSONB NOT NULL DEFAULT '{}'::jsonb
        );

        CREATE TABLE IF NOT EXISTS backup_snapshots (
            snapshot_id TEXT PRIMARY KEY,
            kind TEXT NOT NULL,
            username TEXT,
            archive_path TEXT NOT NULL,
            manifest_path TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            status TEXT NOT NULL,
            checksum TEXT NOT NULL DEFAULT '',
            metadata JSONB NOT NULL DEFAULT '{}'::jsonb
        );

        CREATE TABLE IF NOT EXISTS ops_events (
            id BIGSERIAL PRIMARY KEY,
            category TEXT NOT NULL,
            level TEXT NOT NULL,
            message TEXT NOT NULL,
            details JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS applied_config_versions (
            id BIGSERIAL PRIMARY KEY,
            config_version TEXT NOT NULL,
            config_path TEXT NOT NULL,
            node_id TEXT NOT NULL,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value JSONB NOT NULL DEFAULT '{}'::jsonb,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);
}

export async function syncUsersFromCloudConfig(users: CloudUserConfig[]) {
    for (const user of users) {
        await metadataQuery(`
            INSERT INTO users (username, display_name, quota_gb, enabled, home_dir, source, updated_at)
            VALUES ($1, $2, $3, $4, $5, 'cloud-config', NOW())
            ON CONFLICT (username) DO UPDATE SET
                display_name = EXCLUDED.display_name,
                quota_gb = EXCLUDED.quota_gb,
                enabled = EXCLUDED.enabled,
                home_dir = EXCLUDED.home_dir,
                source = 'cloud-config',
                updated_at = NOW()
        `, [user.username, user.displayName, user.quotaGb ?? null, user.enabled, user.homeDir]);
    }
}

export async function getMetadataUser(username: string) {
    const result = await metadataQuery<{
        username: string;
        display_name: string;
        quota_gb: number | null;
        enabled: boolean;
        home_dir: string;
    }>('SELECT username, display_name, quota_gb, enabled, home_dir FROM users WHERE username = $1', [username]);
    return result.rows[0] || null;
}

export async function listMetadataUsers() {
    const result = await metadataQuery<{
        username: string;
        display_name: string;
        quota_gb: number | null;
        enabled: boolean;
        home_dir: string;
    }>('SELECT username, display_name, quota_gb, enabled, home_dir FROM users ORDER BY username ASC');
    return result.rows;
}

export async function upsertNodeStatus(input: {
    nodeId: string;
    baseUrl: string;
    enabled: boolean;
    tags: string[];
    version: string;
    environment: string;
    startedAt: string;
    storageMounted: boolean;
    storageRoot: string;
    databaseOk: boolean;
    metadata: JsonRecord;
}) {
    await metadataQuery(`
        INSERT INTO node_status (
            node_id, base_url, enabled, tags, version, environment, started_at,
            last_heartbeat, storage_mounted, storage_root, database_ok, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10, $11::jsonb)
        ON CONFLICT (node_id) DO UPDATE SET
            base_url = EXCLUDED.base_url,
            enabled = EXCLUDED.enabled,
            tags = EXCLUDED.tags,
            version = EXCLUDED.version,
            environment = EXCLUDED.environment,
            started_at = EXCLUDED.started_at,
            last_heartbeat = NOW(),
            storage_mounted = EXCLUDED.storage_mounted,
            storage_root = EXCLUDED.storage_root,
            database_ok = EXCLUDED.database_ok,
            metadata = EXCLUDED.metadata
    `, [
        input.nodeId,
        input.baseUrl,
        input.enabled,
        input.tags,
        input.version,
        input.environment,
        input.startedAt,
        input.storageMounted,
        input.storageRoot,
        input.databaseOk,
        JSON.stringify(input.metadata || {}),
    ]);
}

export async function listNodeStatuses() {
    const result = await metadataQuery<{
        node_id: string;
        base_url: string;
        enabled: boolean;
        tags: string[];
        version: string;
        environment: string;
        started_at: Date;
        last_heartbeat: Date;
        storage_mounted: boolean;
        storage_root: string;
        database_ok: boolean;
        metadata: JsonRecord;
    }>('SELECT * FROM node_status ORDER BY node_id ASC');
    return result.rows;
}

export async function recordConfigVersion(version: string, configPath: string, nodeId: string) {
    await metadataQuery(
        'INSERT INTO applied_config_versions (config_version, config_path, node_id) VALUES ($1, $2, $3)',
        [version, configPath, nodeId],
    );
}

export async function getLatestConfigVersion() {
    const result = await metadataQuery<{config_version: string; config_path: string; applied_at: Date}>(
        'SELECT config_version, config_path, applied_at FROM applied_config_versions ORDER BY applied_at DESC LIMIT 1',
    );
    return result.rows[0] || null;
}

export async function cleanupExpiredShares() {
    await metadataQuery('DELETE FROM shares WHERE expire_at IS NOT NULL AND expire_at <= NOW()');
}

export async function createShareRecord(record: {
    shareId: string;
    username: string;
    fileName: string;
    type: 'file' | 'folder';
    expireAt: string | null;
    accessCode: string;
}) {
    await metadataQuery(`
        INSERT INTO shares (share_id, username, file_name, type, expire_at, access_code)
        VALUES ($1, $2, $3, $4, $5, $6)
    `, [record.shareId, record.username, record.fileName, record.type, record.expireAt, record.accessCode]);
}

export async function getShareRecord(shareId: string) {
    await cleanupExpiredShares();
    const result = await metadataQuery<{
        share_id: string;
        username: string;
        file_name: string;
        type: 'file' | 'folder';
        expire_at: Date | null;
        access_code: string;
        created_at: Date;
        click_count: number;
        download_count: number;
    }>('SELECT * FROM shares WHERE share_id = $1', [shareId]);
    return result.rows[0] || null;
}

export async function listShareRecordsByUser(username: string) {
    await cleanupExpiredShares();
    const result = await metadataQuery<{
        share_id: string;
        username: string;
        file_name: string;
        type: 'file' | 'folder';
        expire_at: Date | null;
        access_code: string;
        created_at: Date;
        click_count: number;
        download_count: number;
    }>('SELECT * FROM shares WHERE username = $1 ORDER BY created_at DESC', [username]);
    return result.rows;
}

export async function deleteShareRecord(shareId: string, username: string) {
    const result = await metadataQuery('DELETE FROM shares WHERE share_id = $1 AND username = $2', [shareId, username]);
    return result.rowCount > 0;
}

export async function bumpShareStats(shareId: string, field: 'click_count' | 'download_count') {
    const result = await metadataQuery(`
        UPDATE shares
        SET ${field} = ${field} + 1
        WHERE share_id = $1
        RETURNING *
    `, [shareId]);
    return result.rows[0] || null;
}

export async function listBackupSnapshots() {
    const result = await metadataQuery<{
        snapshot_id: string;
        kind: string;
        username: string | null;
        archive_path: string;
        manifest_path: string;
        created_at: Date;
        status: string;
        checksum: string;
        metadata: JsonRecord;
    }>('SELECT * FROM backup_snapshots ORDER BY created_at DESC');
    return result.rows;
}

export async function upsertBackupSnapshot(input: {
    snapshotId: string;
    kind: 'site' | 'user-export';
    username?: string | null;
    archivePath: string;
    manifestPath: string;
    status: string;
    checksum?: string;
    metadata?: JsonRecord;
}) {
    await metadataQuery(`
        INSERT INTO backup_snapshots (
            snapshot_id, kind, username, archive_path, manifest_path, status, checksum, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
        ON CONFLICT (snapshot_id) DO UPDATE SET
            archive_path = EXCLUDED.archive_path,
            manifest_path = EXCLUDED.manifest_path,
            status = EXCLUDED.status,
            checksum = EXCLUDED.checksum,
            metadata = EXCLUDED.metadata
    `, [
        input.snapshotId,
        input.kind,
        input.username || null,
        input.archivePath,
        input.manifestPath,
        input.status,
        input.checksum || '',
        JSON.stringify(input.metadata || {}),
    ]);
}

export async function recordOpsEvent(category: string, level: string, message: string, details: JsonRecord = {}) {
    await metadataQuery(
        'INSERT INTO ops_events (category, level, message, details) VALUES ($1, $2, $3, $4::jsonb)',
        [category, level, message, JSON.stringify(details)],
    );
}

export async function listOpsEvents(limit = 200) {
    const result = await metadataQuery<{
        id: number;
        category: string;
        level: string;
        message: string;
        details: JsonRecord;
        created_at: Date;
    }>('SELECT * FROM ops_events ORDER BY created_at DESC LIMIT $1', [limit]);
    return result.rows;
}

export async function getAppSetting<T>(key: string, fallback: T): Promise<T> {
    const result = await metadataQuery<{value: T}>('SELECT value FROM app_settings WHERE key = $1', [key]);
    return result.rows[0]?.value || fallback;
}

export async function setAppSetting<T>(key: string, value: T) {
    await metadataQuery(`
        INSERT INTO app_settings (key, value, updated_at)
        VALUES ($1, $2::jsonb, NOW())
        ON CONFLICT (key) DO UPDATE SET
            value = EXCLUDED.value,
            updated_at = NOW()
    `, [key, JSON.stringify(value)]);
}

export async function getMetadataDumpTables() {
    return [
        'users',
        'shares',
        'node_status',
        'backup_snapshots',
        'ops_events',
        'applied_config_versions',
        'app_settings',
    ];
}

export function mapConfiguredNode(node: CloudNodeConfig) {
    return {
        nodeId: node.id,
        baseUrl: node.baseUrl,
        enabled: node.enabled,
        tags: node.tags,
    };
}
