import {v4 as uuidv4} from 'uuid';
import {
    bumpShareStats,
    createShareRecord,
    deleteShareRecord,
    getShareRecord,
    listShareRecordsByUser,
} from '../../lib/platform/metadata';

export interface ShareRecord {
    shareId: string;
    username: string;
    fileName: string;
    type: 'file' | 'folder';
    expireAt: number | null;
    accessCode: string;
    createdAt: number;
    clickCount: number;
    downloadCount: number;
}

function generateAccessCode() {
    return Math.random().toString(36).slice(2, 6).toLowerCase();
}

function mapRecord(record: {
    share_id: string;
    username: string;
    file_name: string;
    type: 'file' | 'folder';
    expire_at: Date | null;
    access_code: string;
    created_at: Date;
    click_count: number;
    download_count: number;
}): ShareRecord {
    return {
        shareId: record.share_id,
        username: record.username,
        fileName: record.file_name,
        type: record.type,
        expireAt: record.expire_at ? new Date(record.expire_at).getTime() : null,
        accessCode: record.access_code,
        createdAt: new Date(record.created_at).getTime(),
        clickCount: record.click_count,
        downloadCount: record.download_count,
    };
}

export async function createShare(input: {
    username: string;
    fileName: string;
    type: 'file' | 'folder';
    expireDays?: number;
    hasCode?: boolean;
}) {
    const expireAt = input.expireDays && input.expireDays > 0
        ? new Date(Date.now() + input.expireDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

    const record = {
        shareId: `s_${uuidv4().slice(0, 6)}`,
        username: input.username,
        fileName: input.fileName,
        type: input.type,
        expireAt,
        accessCode: input.hasCode ? generateAccessCode() : '',
    };

    await createShareRecord(record);
    return {
        shareId: record.shareId,
        username: record.username,
        fileName: record.fileName,
        type: record.type,
        expireAt: expireAt ? new Date(expireAt).getTime() : null,
        accessCode: record.accessCode,
        createdAt: Date.now(),
        clickCount: 0,
        downloadCount: 0,
    };
}

export async function getShareById(shareId: string) {
    const record = await getShareRecord(shareId);
    return record ? mapRecord(record) : null;
}

export async function listSharesByUser(username: string) {
    const records = await listShareRecordsByUser(username);
    return records.map(mapRecord);
}

export async function deleteShare(shareId: string, username: string) {
    return deleteShareRecord(shareId, username);
}

export async function updateShare(shareId: string, updater: (record: ShareRecord) => ShareRecord) {
    const current = await getShareById(shareId);
    if (!current) {
        return null;
    }

    const next = updater(current);
    if (next.clickCount > current.clickCount) {
        await bumpShareStats(shareId, 'click_count');
    }
    if (next.downloadCount > current.downloadCount) {
        await bumpShareStats(shareId, 'download_count');
    }
    return getShareById(shareId);
}
