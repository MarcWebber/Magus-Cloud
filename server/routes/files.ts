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
            { name: 'report.pdf', size: '234567 bytes' },
            { name: 'data.csv', size: '54321 bytes' },
            { name: 'image.png', size: '123456 bytes' },
        ],
        usage: '395K'
    };
}

export default router;
