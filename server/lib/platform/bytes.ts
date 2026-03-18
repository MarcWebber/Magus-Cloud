export function formatBytes(bytes: number, decimals = 2) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return '0 Bytes';
    }

    const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, unitIndex);
    return `${value.toFixed(unitIndex === 0 ? 0 : decimals)} ${units[unitIndex]}`;
}

export function toBytesFromGb(value: number) {
    return Math.max(Number(value) || 0, 0) * 1024 ** 3;
}

export function safePercent(used: number, total: number) {
    if (!total || total <= 0) {
        return 0;
    }

    return Math.min(Number(((used / total) * 100).toFixed(1)), 100);
}
