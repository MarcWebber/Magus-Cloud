import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import logger from "../logger";

const router = Router();
const isDev = process.env.NODE_ENV === 'development';

router.get('/files', (req, res) => {
    // TODO 修改路径
    if( isDev) {
        logger.info('开发模式，返回测试文件信息');
        return res.json(DevEnvGetFile());
    }
    const userDir = '/www/wwwroot/chensheng';
    try {
        const files = fs.readdirSync(userDir).map(name => {
            const stats = fs.statSync(path.join(userDir, name));
            return { name, size: stats.size + ' bytes' };
        });
        const du = spawn('du', ['-sh', userDir]);
        du.stdout.on('data', (data) => {
            const usage = data.toString().split('\t')[0];
            res.json({ files, usage });
        });
    } catch (e) {
        res.status(500).json({ error: '无法读取文件信息' });
    }
});

function DevEnvGetFile() {
    return {
        files: [
            { name: 'docs/report.pdf', size: '234567 bytes' },
            { name: 'docs/specs/design.docx', size: '87654 bytes' },
            { name: 'data/raw/data1.csv', size: '54321 bytes' },
            { name: 'data/processed/results.json', size: '66552 bytes' },
            { name: 'images/logo.png', size: '123456 bytes' },
            { name: 'archive/logs.zip', size: '88234 bytes' },
            { name: 'README.md', size: '1024 bytes' },
        ],
        usage: '512K'
    };
}

export default router;
