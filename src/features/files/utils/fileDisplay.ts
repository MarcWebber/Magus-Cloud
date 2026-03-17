export type RawFileNode = {
    name: string;
    size?: string;
    mtime?: string;
    type: 'file' | 'folder';
    children?: RawFileNode[];
};

export type FileNode = {
    id: string;
    name: string;
    type: 'file' | 'folder';
    sizeBytes: number;
    sizeLabel: string;
    mtime: string;
    modifiedAt: number;
    pathSegments: string[];
    children?: FileNode[];
};

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

export function parseSize(value?: string | number | null) {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0;
    }

    if (!value) {
        return 0;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return 0;
    }

    const numericValue = Number(trimmed);
    if (Number.isFinite(numericValue)) {
        return numericValue;
    }

    const match = trimmed.match(/([\d.]+)\s*([a-zA-Z]+)/);
    if (!match) {
        return 0;
    }

    const amount = Number(match[1]);
    if (!Number.isFinite(amount)) {
        return 0;
    }

    switch (match[2].toUpperCase()) {
        case 'B':
        case 'BYTE':
        case 'BYTES':
            return amount;
        case 'KB':
        case 'K':
            return amount * 1024;
        case 'MB':
        case 'M':
            return amount * 1024 ** 2;
        case 'GB':
        case 'G':
            return amount * 1024 ** 3;
        case 'TB':
        case 'T':
            return amount * 1024 ** 4;
        case 'PB':
        case 'P':
            return amount * 1024 ** 5;
        default:
            return amount;
    }
}

export function formatBytes(bytes: number) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return '0 B';
    }

    const unitIndex = Math.min(
        Math.floor(Math.log(bytes) / Math.log(1024)),
        SIZE_UNITS.length - 1
    );
    const value = bytes / 1024 ** unitIndex;
    const digits = unitIndex === 0 || value >= 100 ? 0 : value >= 10 ? 1 : 2;

    return `${value.toFixed(digits)} ${SIZE_UNITS[unitIndex]}`;
}

export function hydrateNodes(nodes: RawFileNode[], parentSegments: string[] = []): FileNode[] {
    return nodes.map((node) => {
        const pathSegments = [...parentSegments, node.name];
        const children = node.children ? hydrateNodes(node.children, pathSegments) : undefined;
        const ownSizeBytes = parseSize(node.size);
        const sizeBytes = node.type === 'folder' && children?.length
            ? children.reduce((sum, child) => sum + child.sizeBytes, 0)
            : ownSizeBytes;
        const modifiedAt = node.mtime ? new Date(node.mtime).getTime() : 0;

        return {
            id: pathSegments.join('/'),
            name: node.name,
            type: node.type,
            sizeBytes,
            sizeLabel: formatBytes(sizeBytes),
            mtime: node.mtime || '',
            modifiedAt: Number.isFinite(modifiedAt) ? modifiedAt : 0,
            pathSegments,
            children,
        };
    });
}

export function getNodesAtPath(nodes: FileNode[], pathSegments: string[]) {
    return pathSegments.reduce<FileNode[]>((items, segment) => {
        const next = items.find((item) => item.name === segment && item.type === 'folder');
        return next?.children || [];
    }, nodes);
}

export function doesPathExist(nodes: FileNode[], pathSegments: string[]) {
    let currentLevel = nodes;

    for (const segment of pathSegments) {
        const next = currentLevel.find((item) => item.name === segment && item.type === 'folder');
        if (!next) {
            return false;
        }
        currentLevel = next.children || [];
    }

    return true;
}

export function flattenNodes(nodes: FileNode[]): FileNode[] {
    return nodes.flatMap((node) => [node, ...(node.children ? flattenNodes(node.children) : [])]);
}

export function getAllFolderIds(nodes: FileNode[]): string[] {
    return nodes.flatMap((node) => {
        if (node.type !== 'folder') {
            return [];
        }

        return [node.id, ...(node.children ? getAllFolderIds(node.children) : [])];
    });
}

export function buildPathLabel(pathSegments: string[]) {
    if (pathSegments.length <= 1) {
        return '根目录';
    }

    return pathSegments.slice(0, -1).join(' / ');
}
