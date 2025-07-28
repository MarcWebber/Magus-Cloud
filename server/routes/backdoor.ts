import { Router, Request, Response } from 'express';
import logger from '../logger';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

const router = Router();
const upload = multer({ dest: '/tmp' });

// 康检查接口
router.get('/health-check', (req: Request, res: Response) => {
    logger.info('✅ Health check endpoint accessed');
    res.json({ status: 'ok' });
});

// 简易权限验证函数（基于 Header）
function isAuthorized(req: Request): boolean {
    const token = req.headers['x-api-key'];
    return token === 'admin-secret'; // 建议从环境变量中读取
}

// 快速上传文件（带权限验证）,一个后门接口, 不建议广泛使用
// 会在未来版本中移除
router.post('/quick-upload', upload.single('file'), (req: Request, res: Response) => {
    if (!isAuthorized(req)) {
        return res.status(403).json({ error: '未授权' });
    }

    const tempPath = req.file?.path;
    const targetPath = path.join('/www/wwwroot/uploads', req.file?.originalname || 'unknown');
    res.json({ message: '这是一个后门接口，建议通过网页端上传，这个命令仅限于不能使用图形化界面的环境使用...' });
    fs.rename(tempPath!, targetPath, err => {
        if (err) {
            logger.error('❌ 文件保存失败', err);
            return res.status(500).json({ error: '文件保存失败' });
        }
        logger.info(`✅ 文件已上传至: ${targetPath}`);
        res.json({ message: '文件上传成功', path: targetPath });
    });
});

// 快速下载文件（带权限验证），仅限应急情况使用，只适用于临时文件
// 会在未来版本中移除
router.get('/quick-download', (req: Request, res: Response) => {
    if (!isAuthorized(req)) {
        return res.status(403).json({ error: '未授权' });
    }

    const filename = req.query.name as string;
    const filePath = path.join('/www/wwwroot/uploads', filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: '文件不存在' });
    }
    logger.info(`✅ 下载文件: ${filePath}`);


    // 给出提示，告知用户这是一个后门接口，不建议广泛使用
    res.setHeader('X-Info', '这是一个后门接口，不建议广泛使用');
    res.setHeader('X-Warning', '此接口可能在未来版本中被移除，请谨慎使用');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.download(filePath);
    res.json({ message: '下载已完成，这是一个后门接口，建议通过网页端下载，这个命令仅限于不能使用图形化界面的环境使用...' });

});

export default router;
