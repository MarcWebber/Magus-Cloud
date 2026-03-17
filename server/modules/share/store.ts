import fs from 'fs';
import path from 'path';
import {v4 as uuidv4} from 'uuid';
import {getDataDir} from '../../lib/config/store';

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

const SHARE_FILE = path.join(getDataDir(), 'shares.json');

function ensureShareFile() {
    if (!fs.existsSync(SHARE_FILE)) {
        fs.writeFileSync(SHARE_FILE, '[]', 'utf8');
    }
}

function readShares() {
    ensureShareFile();
    try {
        return JSON.parse(fs.readFileSync(SHARE_FILE, 'utf8')) as ShareRecord[];
    } catch {
        return [];
    }
}

function writeShares(shares: ShareRecord[]) {
    ensureShareFile();
    fs.writeFileSync(SHARE_FILE, JSON.stringify(shares, null, 2), 'utf8');
}

function cleanupExpired(shares: ShareRecord[]) {
    const now = Date.now();
    const next = shares.filter((item) => item.expireAt === null || item.expireAt > now);
    if (next.length !== shares.length) {
        writeShares(next);
    }
    return next;
}

function generateAccessCode() {
    return Math.random().toString(36).slice(2, 6).toLowerCase();
}

export function createShare(input: {
    username: string;
    fileName: string;
    type: 'file' | 'folder';
    expireDays?: number;
    hasCode?: boolean;
}) {
    const shares = cleanupExpired(readShares());
    const expireAt = input.expireDays && input.expireDays > 0
        ? Date.now() + input.expireDays * 24 * 60 * 60 * 1000
        : null;

    const record: ShareRecord = {
        shareId: `s_${uuidv4().slice(0, 6)}`,
        username: input.username,
        fileName: input.fileName,
        type: input.type,
        expireAt,
        accessCode: input.hasCode ? generateAccessCode() : '',
        createdAt: Date.now(),
        clickCount: 0,
        downloadCount: 0,
    };

    shares.push(record);
    writeShares(shares);
    return record;
}

export function getShareById(shareId: string) {
    const shares = cleanupExpired(readShares());
    return shares.find((item) => item.shareId === shareId) || null;
}

export function listSharesByUser(username: string) {
    const shares = cleanupExpired(readShares());
    return shares
        .filter((item) => item.username === username)
        .sort((a, b) => b.createdAt - a.createdAt);
}

export function deleteShare(shareId: string, username: string) {
    const shares = cleanupExpired(readShares());
    const next = shares.filter((item) => !(item.shareId === shareId && item.username === username));
    const deleted = next.length !== shares.length;

    if (deleted) {
        writeShares(next);
    }

    return deleted;
}

export function updateShare(shareId: string, updater: (record: ShareRecord) => ShareRecord) {
    const shares = cleanupExpired(readShares());
    const index = shares.findIndex((item) => item.shareId === shareId);
    if (index === -1) {
        return null;
    }

    shares[index] = updater(shares[index]);
    writeShares(shares);
    return shares[index];
}
