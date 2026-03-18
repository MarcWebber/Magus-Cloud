import fs from 'fs';
import path from 'path';

export type HelpAudience = 'user' | 'admin';

const HELP_FILES: Record<HelpAudience, {title: string; filePath: string}> = {
    user: {
        title: '用户文档',
        filePath: path.resolve(process.cwd(), 'docs', 'user-guide.md'),
    },
    admin: {
        title: '管理员文档',
        filePath: path.resolve(process.cwd(), 'docs', 'admin-guide.md'),
    },
};

export function getHelpAssetRoot() {
    return path.resolve(process.cwd(), 'docs', 'assets');
}

export function getHelpDoc(audience: HelpAudience) {
    const target = HELP_FILES[audience];
    const markdown = fs.existsSync(target.filePath)
        ? fs.readFileSync(target.filePath, 'utf8')
        : `# ${target.title}\n\n文档暂未创建。`;
    const stats = fs.existsSync(target.filePath)
        ? fs.statSync(target.filePath)
        : null;

    return {
        audience,
        title: target.title,
        updatedAt: stats?.mtime.toISOString() || new Date().toISOString(),
        markdown,
    };
}
