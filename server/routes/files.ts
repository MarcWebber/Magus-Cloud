import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import logger from "../logger";
import { upload } from "../middleware/storage";
import { authenticateToken, useGuard } from "../middleware/authenticationToken";
import { getDirectorySize } from "../services/fileService";
import { DevEnvGetFile, DevEnvGetUserUsage } from "../mock/files";
import archiver from 'archiver';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import * as mammoth from 'mammoth';
const { exec } = require('child_process');
import fsp from 'fs/promises';
import crypto from 'crypto';
import XLSX from 'xlsx';
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
      res.json({ files, usage });

    });
  } catch (e) {
    res.status(500).json({ error: '无法读取文件信息' });
  }
}));


router.post('/upload', authenticateToken, (req, res) => {
  // 打印req.user
  upload.single('file')(req, res, (err) => {
    logger.info("api/upload被运行了");
    console.log(`用户信息: ${JSON.stringify(req.user)}`);
    logger.info(`用户信息: ${JSON.stringify(req.user)}`);
    if (!req.file) {
      return res.status(400).json({ error: '未接收到文件' });
    }
    logger.info(`上传成功: ${req.file.originalname}`);
    res.json({ message: '上传成功', file: req.file.filename });
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


// 新增：文件下载接口（支持文件和文件夹）
// router.get('/download', authenticateToken, async (req: Request, res: Response) => {
//   // 从查询参数中获取并验证name和type
//   const nameParam = req.query.name;
//   const typeParam = req.query.type;

//   // 验证参数是否为字符串
//   if (typeof nameParam !== 'string' || typeof typeParam !== 'string') {
//     return res.status(400).json({ error: '参数格式错误，需要字符串类型' });
//   }

//   if (!nameParam || !typeParam) {
//     return res.status(400).json({ error: '缺少参数：name或type' });
//   }

//   // 确定资源存储路径
//   const userDir = isDev
//     ? path.join(__dirname, '../uploads') // 开发环境
//     : `/www/wwwroot/${req.username || 'default'}`; // 生产环境

//   const resourcePath = path.join(userDir, decodeURIComponent(nameParam));

//   // 检查资源是否存在
//   if (!fs.existsSync(resourcePath)) {
//     logger.error(`资源不存在：${resourcePath}`);
//     return res.status(404).json({ error: '资源不存在' });
//   }

//   try {
//     const stats = fs.statSync(resourcePath);
//     console.log('typeParam', typeParam)
//     console.log('nameParam', typeParam)

//     // 如果是文件下载
//     if (typeParam === 'file' && stats.isFile()) {
//       res.setHeader('Content-Type', 'application/octet-stream');
//       res.setHeader(
//         'Content-Disposition',
//         `attachment; filename="${encodeURIComponent(path.basename(nameParam))}"`
//       );
//       res.setHeader('Content-Length', stats.size);

//       const fileStream = fs.createReadStream(resourcePath);
//       fileStream.pipe(res);

//       fileStream.on('error', (err) => {
//         logger.error(`文件读取失败：${err.message}`);
//         res.status(500).json({ error: '文件读取失败' });
//       });

//       return;
//     }

//     // 如果是文件夹下载
//     if (typeParam === 'folder' && stats.isDirectory()) {
//       // 创建临时ZIP文件
//       const tempZipPath = path.join(tmpdir(), `${uuidv4()}.zip`);
//       const output = fs.createWriteStream(tempZipPath);
//       const archive = archiver('zip', {
//         zlib: { level: 9 } // 最高压缩级别
//       });


//       const folderName = path.basename(resourcePath);

//       // 处理压缩过程中的错误
//       output.on('error', (err) => {
//         logger.error(`ZIP输出错误：${err.message}`);
//         cleanupTempFile(tempZipPath);
//         return res.status(500).json({ error: '压缩文件创建失败' });
//       });

//       archive.on('error', (err) => {
//         logger.error(`压缩错误：${err.message}`);
//         cleanupTempFile(tempZipPath);
//         return res.status(500).json({ error: '文件夹压缩失败' });
//       });

//       // 完成压缩后发送文件
//       output.on('close', () => {
//         try {
//           const zipStats = fs.statSync(tempZipPath);

//           res.setHeader('Content-Type', 'application/zip');
//           res.setHeader(
//             'Content-Disposition',
//             `attachment; filename="${encodeURIComponent(`${folderName}.zip`)}"`
//           );
//           res.setHeader('Content-Length', zipStats.size);

//           const zipStream = fs.createReadStream(tempZipPath);
//           zipStream.pipe(res);

//           // 发送完成后删除临时文件
//           zipStream.on('end', () => {
//             cleanupTempFile(tempZipPath);
//           });

//           zipStream.on('error', (err) => {
//             logger.error(`ZIP文件读取失败：${err.message}`);
//             cleanupTempFile(tempZipPath);
//             res.status(500).json({ error: '压缩文件读取失败' });
//           });
//         } catch (err) {
//           logger.error(`处理压缩文件失败：${err.message}`);
//           cleanupTempFile(tempZipPath);
//           res.status(500).json({ error: '处理压缩文件失败' });
//         }
//       });

//       // 开始压缩文件夹
//       archive.pipe(output);
//       logger.info(`开始压缩文件夹：${resourcePath} -> ${tempZipPath}`);
//       archive.directory(resourcePath, folderName); // 压缩包内包含「nameParam（如07）」文件夹
//       archive.finalize();

//       return;
//     }

//     // 如果类型不匹配（例如请求文件但实际是文件夹）
//     return res.status(400).json({ error: '资源类型不匹配' });

//   } catch (error) {
//     logger.error(`下载处理失败：${error.message}`);
//     return res.status(500).json({ error: '服务器处理下载失败' });
//   }
// });
// 修改原下载接口：同时支持登录用户和分享链接下载
router.get('/download', async (req: Request, res: Response) => {
  try {
    const nameParam = req.query.name as string;
    const typeParam = req.query.type as string;
    // 仅保留shareId参数（移除accessCode）
    const shareId = req.query.shareId as string;

    // 验证基础参数
    if (!nameParam || !typeParam) {
      return res.status(400).json({ error: '缺少name或type参数' });
    }

    // 区分两种模式：登录用户下载 / 分享链接下载
    let userDir: string;
    if (shareId) { // 模式1：通过分享链接下载（仅需shareId）
      // 验证分享有效性
      const shareRecord = shareStore.find(item => item.shareId === shareId);
      if (!shareRecord) {
        return res.status(404).json({ error: '分享链接不存在' });
      }
      if (shareRecord.expireAt < Date.now()) {
        return res.status(403).json({ error: '分享已过期' });
      }
      // 移除accessCode的校验（因为分享已无提取码）
      
      // 验证分享的资源是否匹配请求的资源
      if (shareRecord.fileName !== nameParam || shareRecord.type !== typeParam) {
        return res.status(400).json({ error: '分享资源不匹配' });
      }
      // 获取分享者的目录
      userDir = isDev 
        ? path.join(__dirname, '../uploads') 
        : `/www/wwwroot/${shareRecord.username}`;
    } else {
      // 模式2：登录用户下载（原有逻辑不变）
      const authResult = await new Promise((resolve) => {
        authenticateToken(req, res, (err) => resolve(err ? false : true));
      });
      if (!authResult) return; // 认证失败会由中间件直接返回响应
      userDir = isDev 
        ? path.join(__dirname, '../uploads') 
        : `/www/wwwroot/${req.username || 'default'}`;
    }

    // 后续逻辑完全复用原下载处理（文件/文件夹判断、流式传输等）
    const resourcePath = path.resolve(userDir, decodeURIComponent(nameParam));
    if (!fs.existsSync(resourcePath)) {
      return res.status(404).json({ error: '资源不存在' });
    }

    const stats = fs.statSync(resourcePath);
    // 文件下载
    if (typeParam === 'file' && stats.isFile()) {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(path.basename(nameParam))}"`
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

    // 文件夹下载（压缩为ZIP）
    if (typeParam === 'folder' && stats.isDirectory()) {
      const tempZipPath = path.join(tmpdir(), `${uuidv4()}.zip`);
      const output = fs.createWriteStream(tempZipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      const folderName = path.basename(resourcePath);
      output.on('close', () => {
        const zipStats = fs.statSync(tempZipPath);
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${encodeURIComponent(`${folderName}.zip`)}"`
        );
        res.setHeader('Content-Length', zipStats.size);
        const zipStream = fs.createReadStream(tempZipPath);
        zipStream.pipe(res);
        zipStream.on('end', () => cleanupTempFile(tempZipPath));
      });
      archive.pipe(output);
      archive.directory(resourcePath, folderName);
      archive.finalize();
      return;
    }

    return res.status(400).json({ error: '资源类型不匹配' });

  } catch (error: any) {
    logger.error(`下载失败：${error.message}`);
    res.status(500).json({ error: '下载处理失败' });
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

router.post('/delete', useGuard(authenticateToken, async (req, res) => {
  const { filename } = req.body;
  if (!filename) {
    return res.status(400).json({ error: '缺少文件名' });
  }
  console.log('delete filepath', req.body);

  // 确定文件存储路径
  const userDir = isDev
    ? path.join(__dirname, '../uploads') // 开发环境
    : `/www/wwwroot/${req.username || `default`}`; // 生产环境

  // 关键修复：使用path.resolve确保路径正确解析
  const targetPath = path.resolve(userDir, decodeURIComponent(filename));

  // 安全检查：确保不会删除用户目录之外的文件
  if (!targetPath.startsWith(userDir)) {
    logger.error(`尝试访问用户目录外的文件：${targetPath}`);
    return res.status(403).json({ error: '操作不允许' });
  }

  // 检查目标是否存在
  try {
    await fs.promises.access(targetPath);
  } catch {
    logger.error(`目标不存在：${targetPath}`);
    return res.status(404).json({ error: '目标不存在' });
  }

  // 递归删除函数 - 增加详细错误日志
  const deleteRecursive = async (pathToDelete) => {
    try {
      const stats = await fs.promises.stat(pathToDelete);

      if (stats.isDirectory()) {
        const files = await fs.promises.readdir(pathToDelete);
        for (const file of files) {
          const curPath = path.join(pathToDelete, file);
          await deleteRecursive(curPath);
        }
        await fs.promises.rmdir(pathToDelete);
        logger.debug(`已删除目录：${pathToDelete}`);
      } else {
        await fs.promises.unlink(pathToDelete);
        logger.debug(`已删除文件：${pathToDelete}`);
      }
    } catch (err) {
      logger.error(`删除${pathToDelete}失败：${err.message}`);
      throw err; // 继续抛出错误让上层处理
    }
  };

  // 执行删除操作
  try {
    await deleteRecursive(targetPath);
    logger.info(`成功删除：${targetPath}`);
    res.json({ message: '删除成功' });
  } catch (err) {
    logger.error(`删除失败：${err.message}`);
    // 返回更具体的错误信息
    res.status(500).json({
      error: '删除失败',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}));


// router.post('/delete', ...useGuard(authenticateToken, (req, res) => {
//     const { filename } = req.body;
//     if (!filename) {
//         return res.status(400).json({ error: '缺少文件名' });
//     }
//     // 确定文件存储路径（与上传路径一致）
//     const userDir = isDev
//         ? path.join(__dirname, '../uploads') // 开发环境
//         : `/www/wwwroot/${req.username || `default`}`; // 生产环境

//     const filePath = path.join(userDir, decodeURIComponent(filename));

//     // 检查文件是否存在
//     if (!fs.existsSync(filePath)) {
//         logger.error(`文件不存在：${filePath}`);
//         return res.status(404).json({ error: '文件不存在' });
//     }

//     // 删除文件
//     fs.unlink(filePath, (err) => {
//         if (err) {
//             logger.error(`删除文件失败：${err.message}`);
//             return res.status(500).json({ error: '删除文件失败' });
//         }
//         logger.info(`成功删除文件：${filePath}`);
//         res.json({ message: '文件删除成功' });
//     });

// }));

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// 获取总体的用量情况，按人分组
router.get('/usage', authenticateToken, async (req, res) => {
    if (isDev) {
        // 开发环境下返回模拟数据
        return res.json(DevEnvGetUserUsage());
    }

    // 生产环境的根目录 (假设用户目录就在此目录下)
    // ⚠ 注意：如果 /www/wwwroot 包含非用户目录，用量统计仍会不准确！
    const rootDir = `/www/wwwroot`; 

    // calculate the total size of files for each user
    try {
        // 1. 读取 rootDir 下的所有目录作为用户
        const users = fs.readdirSync(rootDir).filter(name => {
            // 确保是目录，并排除隐藏文件（例如 .git, .DS_Store 等）
            const fullPath = path.join(rootDir, name);
            return fs.statSync(fullPath).isDirectory() && !name.startsWith('.');
        });

        const usage = await Promise.all(users.map(async user => {
            // 🚀 修正：使用 path.join 来安全地拼接路径
            const userDir = path.join(rootDir, user);
            const sizeInBytes = await getDirectorySize(userDir); // 假设返回字节数 (number)
            
            // 💡 优化：在后端进行格式化，确保前端接收到带单位的字符串
            const sizeFormatted = formatBytes(sizeInBytes); 
            
            const name = user;
            
            // 返回格式化后的 size 字符串，解决了前端总用量显示格式问题
            return { name, size: sizeFormatted }; 
        }));

        logger.info(`获取用户用量信息：${JSON.stringify(usage)}`);
        res.json({ usage: usage });
    } catch (err) {
        logger.error(`获取用户用量失败：${err.message}`);
        res.status(500).json({ error: '无法获取用户用量信息' });
    }
});



// ===== MIME / 扩展名 =====
const mimeByExt: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp',
  txt: 'text/plain', md: 'text/markdown', html: 'text/plain', css: 'text/css', js: 'text/javascript',
  ts: 'text/typescript', json: 'application/json', xml: 'text/xml', csv: 'text/csv',
  py: 'text/plain', java: 'text/plain', cpp: 'text/plain', c: 'text/plain',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  rtf: 'application/rtf',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  pdf: 'application/pdf',
};
const extOf = (name: string) => name.split('.').pop()?.toLowerCase() || '';

// ===== 安全路径 & 缓存 =====
const CACHE_DIR = path.resolve(process.cwd(), 'cache-office');
const LO_PROFILE_DIR = path.join(CACHE_DIR, 'lo-profile'); // 独立的 LibreOffice 用户目录
async function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) await fsp.mkdir(CACHE_DIR, { recursive: true });
  if (!fs.existsSync(LO_PROFILE_DIR)) await fsp.mkdir(LO_PROFILE_DIR, { recursive: true });
}
function safeResolve(baseDir: string, subPath: string) {
  const realBase = path.resolve(baseDir);
  const target = path.resolve(baseDir, subPath);
  if (!target.startsWith(realBase + path.sep)) throw new Error('PathTraversal');
  return target;
}
function hashKey(filePath: string, stat: fs.Stats, target: 'html' | 'pdf') {
  const h = crypto.createHash('sha256');
  h.update(filePath);
  h.update(String(stat.size));
  h.update(String(stat.mtimeMs));
  h.update(target);
  return h.digest('hex').slice(0, 16);
}
async function detectFileByExt(dir: string, ext: string) {
  const files = await fsp.readdir(dir);
  const found = files.find(f => f.toLowerCase().endsWith('.' + ext));
  return found ? path.join(dir, found) : null;
}

// ===== 工具：验证 PDF 有效性 =====
async function isValidPdf(p: string) {
  try {
    const stat = await fsp.stat(p);
    if (!stat.size || stat.size < 128) return false;
    const fd = await fsp.open(p, 'r');
    const buf = Buffer.alloc(5);
    await fd.read(buf, 0, 5, 0);
    await fd.close();
    return buf.toString('utf8') === '%PDF-';
  } catch {
    return false;
  }
}

// ===== LibreOffice 调用 =====
function runSoffice(srcPath: string, outDir: string, fmt: 'html' | 'pdf') {
  const args = [
    `-env:UserInstallation=file://${LO_PROFILE_DIR.replace(/ /g, '%20')}`, // 独立配置，避免权限/锁问题
    '--headless', '--nologo', '--nofirststartwizard',
    '--convert-to', fmt,
    '--outdir', outDir,
    srcPath,
  ];
  return new Promise<void>((resolve, reject) => {
    const p = spawn('soffice', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    p.on('error', (e) => reject(e)); // 关键：捕获 ENOENT 等
    p.stderr.on('data', d => { err += d.toString(); });
    p.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`soffice failed(${code}): ${err.trim()}`));
    });
  });
}

async function convertWithSoffice(srcPath: string, target: 'html' | 'pdf') {
  await ensureCacheDir();
  const stat = await fsp.stat(srcPath);
  const key = hashKey(srcPath, stat, target);
  const outDir = path.join(CACHE_DIR, key);
  const done = path.join(outDir, `.done.${target}`);

  if (fs.existsSync(done)) {
    const mainCached = target === 'html'
      ? await detectFileByExt(outDir, 'html')
      : await detectFileByExt(outDir, 'pdf');
    if (mainCached) {
      if (target === 'pdf') {
        if (await isValidPdf(mainCached)) return mainCached;
      } else {
        if ((await fsp.stat(mainCached)).size > 0) return mainCached;
      }
    }
    // 缓存失效，继续重转
  }

  await fsp.rm(outDir, { recursive: true, force: true });
  await fsp.mkdir(outDir, { recursive: true });

  await runSoffice(srcPath, outDir, target);

  const main = target === 'html'
    ? await detectFileByExt(outDir, 'html')
    : await detectFileByExt(outDir, 'pdf');

  if (!main) throw new Error('Soffice output missing');
  if (target === 'pdf') {
    if (!(await isValidPdf(main))) throw new Error('Invalid PDF produced by soffice');
  } else {
    const size = (await fsp.stat(main)).size;
    if (size === 0) throw new Error('Empty HTML produced by soffice');
  }

  await fsp.writeFile(done, Date.now().toString());
  return main;
}

// ===== HTML 包裹（含“去打印页盒子”覆盖）=====
function wrapHtml(inner: string, wide = false) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  html, body { height: 100%; }
  body { margin: 0; padding: 16px; background: #fff; color: #222; box-sizing: border-box; }
  *, *::before, *::after { box-sizing: inherit; }
  .doc-container { max-width: ${wide ? '1400px' : '1000px'}; margin: 0 auto; }
  img { max-width: 100%; height: auto; }
  table { border-collapse: collapse; max-width: 100%; table-layout: auto; }
  table, td, th { border: 1px solid #ddd; }
  td, th { padding: 6px 8px; }
  .WordSection1, .Section0, .page, .sd-page {
    width: 100% !important; max-width: 100% !important;
    height: auto !important; max-height: none !important;
    overflow: visible !important;
  }
  [style*="overflow:auto"], [style*="overflow: scroll"] { overflow: visible !important; }
  [style*="height:"], [style*="max-height:"] { height: auto !important; max-height: none !important; }
  [style*="width:595"], [style*="width:596"], [style*="width:612"], [style*="width:794"], [style*="width:842"] {
    width: 100% !important; max-width: 100% !important;
  }

</style>
</head>
<body>
  <div class="doc-container">${inner}</div>
  <script>
  (function() {
    function unboxPages() {
      try {
        var nodes = Array.prototype.slice.call(document.querySelectorAll('div, section, main, article, body'));
        nodes.forEach(function(el) {
          var cs = getComputedStyle(el);
          var hasOverflow = (cs.overflowY && cs.overflowY !== 'visible') || (cs.overflowX && cs.overflowX !== 'visible');
          var hasScroll = el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;
          var fixedWidthPx = /px$/.test(cs.width);
          var fixedHeightPx = /px$/.test(cs.height);
          if (hasOverflow || hasScroll || fixedWidthPx || fixedHeightPx) {
            el.style.width = '100%';
            el.style.maxWidth = '100%';
            el.style.height = 'auto';
            el.style.maxHeight = 'none';
            el.style.overflow = 'visible';
          }
          if (cs.transform && cs.transform !== 'none') el.style.transform = 'none';
        });
        document.querySelectorAll('table').forEach(function(t) {
          t.style.width = '100%'; t.style.maxWidth = '100%'; t.style.tableLayout = 'auto';
        });
        document.querySelectorAll('img').forEach(function(img) {
          img.style.maxWidth = '100%'; img.style.height = 'auto';
        });
      } catch (e) {}
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', unboxPages);
    else unboxPages();
  })();
  </script>
</body>
</html>`;
}

// ===== 路由实现 =====
router.get('/preview', authenticateToken, async (req: Request, res: Response) => {
  try {
    const nameParam = req.query.name;
    const typeParam = req.query.type;
    const mode = String(req.query.mode || ''); // xlsx 可选 mode=json

    if (typeof nameParam !== 'string' || typeof typeParam !== 'string') {
      return res.status(400).json({ error: '参数格式错误，需要字符串类型' });
    }
    if (!nameParam || !typeParam) {
      return res.status(400).json({ error: '缺少参数：name或type' });
    }

    const userDir = isDev
      ? path.join(__dirname, '../uploads')
      : `/www/wwwroot/${(req as any).username || 'chensheng'}`;

    const filePath = safeResolve(userDir, decodeURIComponent(nameParam));
    if (!fs.existsSync(filePath)) {
      logger?.error?.(`预览文件不存在：${filePath}`);
      return res.status(404).json({ error: '文件不存在' });
    }

    const stats = fs.statSync(filePath);
    if (typeParam !== 'file' || !stats.isFile()) {
      return res.status(400).json({ error: '仅支持文件预览' });
    }

    const ext = extOf(nameParam);
    const mime = mimeByExt[ext] || 'application/octet-stream';

    // ===== Word 系列：mode=pdf 优先；若 PDF 无效则回 HTML =====
    if (mode === 'pdf' && (ext === 'doc' || ext === 'docx' || ext === 'rtf')) {
      try {
        const pdfPath = await convertWithSoffice(filePath, 'pdf');
        if (!(await isValidPdf(pdfPath))) throw new Error('Invalid PDF');
        res.setHeader('Content-Type', 'application/pdf');
        return fs.createReadStream(pdfPath).pipe(res);
      } catch (e: any) {
        logger?.error?.(`Word→PDF 失败：${e?.message || e}`);
        // 转而返回 HTML（mammoth 优先）
        try {
          if (ext === 'docx') {
            const { value: html } = await mammoth.convertToHtml({ path: filePath });
            return res.json({ type: 'text/html', content: wrapHtml(html), filename: nameParam });
          }
          const htmlPath = await convertWithSoffice(filePath, 'html');
          const html = await fsp.readFile(htmlPath, 'utf8');
          return res.json({ type: 'text/html', content: wrapHtml(html), filename: nameParam });
        } catch (e2: any) {
          logger?.error?.(`Word HTML 回退失败：${e2?.message || e2}`);
          return res.status(500).json({ error: 'Word 转换失败' });
        }
      }
    }

    // ===== 文本 / JSON =====
    if (mime.startsWith('text/') || mime === 'application/json') {
      const content = await fsp.readFile(filePath, 'utf8');
      return res.json({ type: mime, content, filename: nameParam });
    }

    // ===== 图片 =====
    if (mime.startsWith('image/')) {
      try {
        const processed = await sharp(filePath)
          .resize({ width: 1200, withoutEnlargement: true, fit: 'inside', fastShrinkOnLoad: true })
          .toBuffer();
        return res.json({
          type: mime,
          content: processed.toString('base64'),
          filename: nameParam,
          encoding: 'base64'
        });
      } catch (e: any) {
        logger?.error?.('图片处理失败: ' + e?.message);
        return res.status(500).json({ error: '图片处理失败' });
      }
    }

    // ===== DOCX：mammoth → HTML；失败回落 soffice → HTML =====
    if (ext === 'docx') {
      try {
        const { value: html } = await mammoth.convertToHtml({ path: filePath });
        return res.json({ type: 'text/html', content: wrapHtml(html), filename: nameParam });
      } catch {
        const htmlPath = await convertWithSoffice(filePath, 'html');
        const html = await fsp.readFile(htmlPath, 'utf8');
        return res.json({ type: 'text/html', content: wrapHtml(html), filename: nameParam });
      }
    }

    // ===== DOC / RTF：soffice → HTML；失败回落 PDF =====
    if (ext === 'doc' || ext === 'rtf') {
      try {
        const htmlPath = await convertWithSoffice(filePath, 'html');
        const html = await fsp.readFile(htmlPath, 'utf8');
        return res.json({ type: 'text/html', content: wrapHtml(html), filename: nameParam });
      } catch {
        const pdfPath = await convertWithSoffice(filePath, 'pdf');
        if (!(await isValidPdf(pdfPath))) {
          return res.status(500).json({ error: '文档转换失败' });
        }
        res.setHeader('Content-Type', 'application/pdf');
        return fs.createReadStream(pdfPath).pipe(res);
      }
    }

    // ===== XLS / XLSX =====
    if (ext === 'xls' || ext === 'xlsx') {
      // 强制对 .xls 使用 json 解析（更稳定）
      const wb = XLSX.readFile(filePath, { cellDates: true });
      const sheets = wb.SheetNames.map((name) => ({
        name,
        rows: XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: '' })
      }));
      return res.json({ type: 'application/vnd.custom.sheet+json', sheets, filename: nameParam });
      // if (mode === 'json') {
      //   const wb = XLSX.readFile(filePath, { cellDates: true });
      //   const sheets = wb.SheetNames.map((name) => ({
      //     name,
      //     rows: XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: '' })
      //   }));
      //   return res.json({ type: 'application/vnd.custom.sheet+json', sheets, filename: nameParam });
      // } else {
      //   const htmlPath = await convertWithSoffice(filePath, 'html');
      //   const html = await fsp.readFile(htmlPath, 'utf8');
      //   return res.json({ type: 'text/html', content: wrapHtml(html, true), filename: nameParam });
      // }
    }

    // ===== PPT / PPTX → PDF 流 =====
    if (ext === 'ppt' || ext === 'pptx') {
      const pdfPath = await convertWithSoffice(filePath, 'pdf');
      if (!(await isValidPdf(pdfPath))) {
        return res.status(500).json({ error: 'PPT 转 PDF 失败' });
      }
      res.setHeader('Content-Type', 'application/pdf');
      return fs.createReadStream(pdfPath).pipe(res);
    }

    // ===== PDF：直流 =====
    if (ext === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      return fs.createReadStream(filePath).pipe(res);
    }

    return res.status(415).json({ error: '不支持的文件类型' });

  } catch (error: any) {
    if (error?.message === 'PathTraversal') {
      return res.status(403).json({ error: '操作不允许' });
    }
    (logger || console).error(`预览处理失败：${error?.message || error}`);
    return res.status(500).json({ error: '服务器处理预览失败' });
  }
});

interface ShareRecord {
  shareId: string;        // 唯一分享ID（如 s_8f2d7c）
  username: string;       // 分享者用户名（关联用户目录）
  fileName: string;       // 分享的文件名/文件夹名
  type: 'file' | 'folder';// 资源类型
  expireAt: number;       // 过期时间（时间戳，毫秒）
  createdAt: number;      // 创建时间（时间戳，毫秒）
}
let shareStore: ShareRecord[] = []; // 内存存储（生产环境替换为数据库）

// 简化版：生成分享链接（无提取码）
router.post('/share/create', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { fileName, type } = req.body;
    const username = req.username || 'default';

    // 验证参数
    if (!fileName || !['file', 'folder'].includes(type)) {
      return res.status(400).json({ error: '参数错误：缺少fileName或type' });
    }

    // 验证资源存在性
    const userDir = isDev ? path.join(__dirname, '../uploads') : `/www/wwwroot/${username}`;
    const resourcePath = path.resolve(userDir, decodeURIComponent(fileName));
    if (!fs.existsSync(resourcePath)) {
      return res.status(404).json({ error: '资源不存在' });
    }

    // 生成分享信息（默认7天过期，无提取码）
    const shareId = `s_${uuidv4().slice(0, 6)}`; // 保留短ID用于标识分享
    const expireAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7天有效期

    // 存储分享记录（移除accessCode）
    shareStore.push({
      shareId,
      username,
      fileName,
      type,
      expireAt, // 移除accessCode字段
      createdAt: Date.now()
    });

    // 返回分享信息（移除accessCode）
    res.json({
      shareId,
      expireAt,
      message: '分享成功，有效期7天'
    });

  } catch (error: any) {
    logger.error(`生成分享失败：${error.message}`);
    res.status(500).json({ error: '生成分享链接失败' });
  }
});

export default router;
