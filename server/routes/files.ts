import {Router,Request, Response} from 'express';
import fs from 'fs';
import path from 'path';
import {spawn} from 'child_process';
import logger from "../logger";
import {upload} from "../middleware/storage";
import {authenticateToken, useGuard} from "../middleware/authenticationToken";
import {getDirectorySize} from "../services/fileService";
import {DevEnvGetFile, DevEnvGetUserUsage} from "../mock/files";
import archiver from 'archiver';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const isDev = process.env.NODE_ENV === 'development';

// 封装一个递归读取文件夹的函数
const readDirRecursive = (dirPath) => {
  const items = fs.readdirSync(dirPath);
  return items.map(name => {
    const fullPath = path.join(dirPath, name);
    const stats = fs.statSync(fullPath);
    const isDir = stats.isDirectory();
    return {
      name,
      size: stats.size + ' bytes',
      mtime: stats.mtime.toISOString(),
      type: isDir ? 'folder' : 'file',
      // 若为文件夹，递归读取其子内容
      ...(isDir && { children: readDirRecursive(fullPath) })
    };
  });
};

router.get('/files', ...useGuard(authenticateToken, (req, res) => {
    // TODO 修改路径
    if (isDev) {
        logger.info('开发模式，返回测试文件信息');
        return res.json(DevEnvGetFile());
    }
    const userDir = `/www/wwwroot/${req.username || `default`}`;
    try {
        const files = readDirRecursive(userDir);
        // 关键：打印即将返回给前端的完整files数组
        // console.log('后端返回的files数组:', JSON.stringify(files, null, 2));
        const du = spawn('du', ['-sh', userDir]);
        du.stdout.on('data', (data) => {
            const usage = data.toString().split('\t')[0];
            res.json({files, usage});
            
        });
    } catch (e) {
        res.status(500).json({error: '无法读取文件信息'});
    }
}));


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

// 文件夹上传
router.post('/upload-folder', authenticateToken, upload.array('folderFiles'), (req, res) => {
    try {
        // 1. 打印整个 req.files 数组（包含所有上传的文件信息）
        console.log('=== upload.array("folderFiles") 解析结果 ===');
        console.log('req.files:', req.files);
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: '未选择文件夹或文件夹为空' });
        }
        console.log('req.files.length', req.files.length, 'req.body.folderName', req.body.folderName)
        
        res.status(200).json({
            message: '文件夹上传成功',
            fileCount: req.files.length,
            folderName: req.body.folderName
        });
    } catch (error) {
        console.error('文件夹上传错误:', error);
        res.status(500).json({ message: '文件夹上传失败', error: error.message });
    }
});

// // 新增：文件下载接口
// router.get('/download', authenticateToken, (req, res) => {
//   const { filename } = req.query;
//   if (!filename) {
//     return res.status(400).json({ error: '缺少文件名' });
//   }

//   // 确定文件存储路径（与上传路径一致）
//   const userDir = isDev 
//     ? path.join(__dirname, '../uploads') // 开发环境
//     : `/www/wwwroot/${req.username || `default`}`; // 生产环境

//   const filePath = path.join(userDir, decodeURIComponent(filename as string));

//   // 检查文件是否存在
//   if (!fs.existsSync(filePath)) {
//     logger.error(`文件不存在：${filePath}`);
//     return res.status(404).json({ error: '文件不存在' });
//   }

//   // 检查是否为文件（避免下载目录）
//   const stats = fs.statSync(filePath);
//   if (!stats.isFile()) {
//     return res.status(400).json({ error: '不支持下载目录' });
//   }

//   // 设置响应头（关键：让浏览器识别为下载）
//   res.setHeader('Content-Type', 'application/octet-stream');
//   res.setHeader(
//     'Content-Disposition', 
//     `attachment; filename="${encodeURIComponent(filename as string)}"`
//   );
//   res.setHeader('Content-Length', stats.size);

//   // 流式传输文件（适合大文件）
//   const fileStream = fs.createReadStream(filePath);
//   fileStream.pipe(res);
//   fileStream.on('error', (err) => {
//     logger.error(`文件读取失败：${err.message}`);
//     res.status(500).json({ error: '文件读取失败' });
//   });
// });
// 新增：文件下载接口（支持文件和文件夹）
router.get('/download', authenticateToken, async (req: Request, res: Response) => {
  // 从查询参数中获取并验证name和type
  const nameParam = req.query.name;
  const typeParam = req.query.type;
  
  // 验证参数是否为字符串
  if (typeof nameParam !== 'string' || typeof typeParam !== 'string') {
    return res.status(400).json({ error: '参数格式错误，需要字符串类型' });
  }
  
  if (!nameParam || !typeParam) {
    return res.status(400).json({ error: '缺少参数：name或type' });
  }

  // 确定资源存储路径
  const userDir = isDev 
    ? path.join(__dirname, '../uploads') // 开发环境
    : `/www/wwwroot/${req.username || 'default'}`; // 生产环境

  const resourcePath = path.join(userDir, decodeURIComponent(nameParam));

  // 检查资源是否存在
  if (!fs.existsSync(resourcePath)) {
    logger.error(`资源不存在：${resourcePath}`);
    return res.status(404).json({ error: '资源不存在' });
  }

  try {
    const stats = fs.statSync(resourcePath);
    console.log('typeParam',typeParam)
    
    // 如果是文件下载
    if (typeParam === 'file' && stats.isFile()) {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader(
        'Content-Disposition', 
        `attachment; filename="${encodeURIComponent(nameParam)}"`
      );
      res.setHeader('Content-Length', stats.size);

      const fileStream = fs.createReadStream(resourcePath);
      fileStream.pipe(res);
      
      fileStream.on('error', (err) => {
        logger.error(`文件读取失败：${err.message}`);
        res.status(500).json({ error: '文件读取失败' });
      });
      
      return;
    }
    
    // 如果是文件夹下载
    if (typeParam === 'folder' && stats.isDirectory()) {
      // 创建临时ZIP文件
      const tempZipPath = path.join(tmpdir(), `${uuidv4()}.zip`);
      const output = fs.createWriteStream(tempZipPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // 最高压缩级别
      });
      
      // 处理压缩过程中的错误
      output.on('error', (err) => {
        logger.error(`ZIP输出错误：${err.message}`);
        cleanupTempFile(tempZipPath);
        return res.status(500).json({ error: '压缩文件创建失败' });
      });
      
      archive.on('error', (err) => {
        logger.error(`压缩错误：${err.message}`);
        cleanupTempFile(tempZipPath);
        return res.status(500).json({ error: '文件夹压缩失败' });
      });
      
      // 完成压缩后发送文件
      output.on('close', () => {
        try {
          const zipStats = fs.statSync(tempZipPath);
          
          res.setHeader('Content-Type', 'application/zip');
          res.setHeader(
            'Content-Disposition', 
            `attachment; filename="${encodeURIComponent(`${nameParam}.zip`)}"`
          );
          res.setHeader('Content-Length', zipStats.size);
          
          const zipStream = fs.createReadStream(tempZipPath);
          zipStream.pipe(res);
          
          // 发送完成后删除临时文件
          zipStream.on('end', () => {
            cleanupTempFile(tempZipPath);
          });
          
          zipStream.on('error', (err) => {
            logger.error(`ZIP文件读取失败：${err.message}`);
            cleanupTempFile(tempZipPath);
            res.status(500).json({ error: '压缩文件读取失败' });
          });
        } catch (err) {
          logger.error(`处理压缩文件失败：${err.message}`);
          cleanupTempFile(tempZipPath);
          res.status(500).json({ error: '处理压缩文件失败' });
        }
      });
      
      // 开始压缩文件夹
      archive.pipe(output);
      logger.info(`开始压缩文件夹：${resourcePath} -> ${tempZipPath}`);
      archive.directory(resourcePath, nameParam); // 压缩包内包含「nameParam（如07）」文件夹
      archive.finalize();
      
      return;
    }
    
    // 如果类型不匹配（例如请求文件但实际是文件夹）
    return res.status(400).json({ error: '资源类型不匹配' });
    
  } catch (error) {
    logger.error(`下载处理失败：${error.message}`);
    return res.status(500).json({ error: '服务器处理下载失败' });
  }
});

// 清理临时文件的辅助函数
function cleanupTempFile(filePath: string) {
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      logger.info(`临时文件已清理：${filePath}`);
    } catch (err) {
      logger.warn(`清理临时文件失败：${err.message}`);
    }
  }
}
    
    

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

// 获取总体的用量情况，按人分组
router.get('/usage', authenticateToken, async (req, res) => {
    if (isDev) {
        return res.json(DevEnvGetUserUsage());
    }
    const rootDir = isDev ? path.join(__dirname, '../uploads') : `/www/wwwroot`;
    // calculate the total size of files for each user
    try {
        const users = fs.readdirSync(rootDir).filter(name => {
            return fs.statSync(path.join(rootDir, name)).isDirectory();
        });

        const usage = await Promise.all(users.map(async user => {
            const userDir = path.join(rootDir, user);
            const size = await getDirectorySize(userDir);
            const name = user;
            return {name, size};
        }));

        logger.info(`获取用户用量信息：${JSON.stringify(usage)}`);
        res.json({usage: usage});
    } catch (err) {
        logger.error(`获取用户用量失败：${err.message}`);
        res.status(500).json({error: '无法获取用户用量信息'});
    }
});

export default router;
