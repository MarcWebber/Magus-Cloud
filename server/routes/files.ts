import {Router} from 'express';
import fs from 'fs';
import path from 'path';
import {spawn} from 'child_process';
import logger from "../logger";
import {upload} from "../middleware/storage";
import {authenticateToken, useGuard} from "../middleware/authenticationToken";

const router = Router();
const isDev = process.env.NODE_ENV === 'development';

router.get('/files', ...useGuard(authenticateToken, (req, res) => {
    // TODO 修改路径
    if (isDev) {
        logger.info('开发模式，返回测试文件信息');
        return res.json(DevEnvGetFile());
    }
    const userDir = `/www/wwwroot/${req.username || `default`}`;
    try {
        const files = fs.readdirSync(userDir).map(name => {
            const stats = fs.statSync(path.join(userDir, name));
            return {name, size: stats.size + ' bytes',mtime: stats.mtime.toISOString()};
        });
        const du = spawn('du', ['-sh', userDir]);
        du.stdout.on('data', (data) => {
            const usage = data.toString().split('\t')[0];
            res.json({files, usage});
        });
    } catch (e) {
        res.status(500).json({error: '无法读取文件信息'});
    }
}));

function DevEnvGetFile() {
    return {
        files: [
            {name: 'docs/reportttttttttttttttttttttttttttttttttttttttttttttttt.pdf', size: '234567 bytes',mtime: '2023-10-01T12:00:00Z'},
            {name: 'docs/specs/design.docx', size: '87654 bytes',mtime: '2023-10-02T12:00:00Z'},
            {name: 'data/raw/data1.csv', size: '54321 bytes', mtime: '2023-10-03T12:00:00Z'},
            {name: 'data/processed/results.json', size: '66552 bytes', mtime: '2023-10-04T12:00:00Z'},
            {name: 'images/logo.png', size: '123456 bytes',mtime: '2023-10-05T12:00:00Z'},
            {name: 'archive/logs.zip', size: '88234 bytes',mtime: '2023-10-06T12:00:00Z'},
            {name: 'README.md', size: '1024 bytes', mtime: '2023-10-07T12:00:00Z'},
        ],
        usage: '512K'
    };
}

router.post('/upload', authenticateToken, (req, res) => {
    // 打印req.user
    upload.single('file')(req, res, (err) => {
        logger.info("api/upload被运行了");
        console.log(`用户信息: ${JSON.stringify(req.user)}`);
        logger.info(`用户信息: ${JSON.stringify(req.user)}`);
        if (!req.file) {
            return res.status(400).json({error: '未接收到文件'});
        }
        logger.info(`上传成功: ${req.file.originalname}`);
        res.json({message: '上传成功', file: req.file.filename});
    });
});


// 新增：文件下载接口
router.get('/download', authenticateToken, (req, res) => {
  const { filename } = req.query;
  if (!filename) {
    return res.status(400).json({ error: '缺少文件名' });
  }

  // 确定文件存储路径（与上传路径一致）
  const userDir = isDev 
    ? path.join(__dirname, '../uploads') // 开发环境
    : `/www/wwwroot/${req.username || `default`}`; // 生产环境

  const filePath = path.join(userDir, decodeURIComponent(filename as string));

  // 检查文件是否存在
  if (!fs.existsSync(filePath)) {
    logger.error(`文件不存在：${filePath}`);
    return res.status(404).json({ error: '文件不存在' });
  }

  // 检查是否为文件（避免下载目录）
  const stats = fs.statSync(filePath);
  if (!stats.isFile()) {
    return res.status(400).json({ error: '不支持下载目录' });
  }

  // 设置响应头（关键：让浏览器识别为下载）
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader(
    'Content-Disposition', 
    `attachment; filename="${encodeURIComponent(filename as string)}"`
  );
  res.setHeader('Content-Length', stats.size);

  // 流式传输文件（适合大文件）
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);

  // 处理错误
  fileStream.on('error', (err) => {
    logger.error(`文件读取失败：${err.message}`);
    res.status(500).json({ error: '文件读取失败' });
  });
});


//
router.post('/delete', ...useGuard(authenticateToken, (req, res) => {
    const { filename } = req.body;
    if (!filename) {
        return res.status(400).json({ error: '缺少文件名' });
    }
    // 确定文件存储路径（与上传路径一致）
    const userDir = isDev
        ? path.join(__dirname, '../uploads') // 开发环境
        : `/www/wwwroot/${req.username || `default`}`; // 生产环境

    const filePath = path.join(userDir, decodeURIComponent(filename));

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
        logger.error(`文件不存在：${filePath}`);
        return res.status(404).json({ error: '文件不存在' });
    }

    // 删除文件
    fs.unlink(filePath, (err) => {
        if (err) {
            logger.error(`删除文件失败：${err.message}`);
            return res.status(500).json({ error: '删除文件失败' });
        }
        logger.info(`成功删除文件：${filePath}`);
        res.json({ message: '文件删除成功' });
    });

}));

export default router;


// // 文件指定下载
// router.get('/download/:filename', (req, res) => {
//
// }