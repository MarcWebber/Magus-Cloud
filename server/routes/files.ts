import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const router = Router();

router.get('/files', (req, res) => {
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

export default router;
