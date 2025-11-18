import multer from 'multer';
import {NextFunction, Request, Response} from "express";
import logger from "../logger";
const path = require('path');
const fs = require('fs');

// 定义文件存储位置
// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         // 确定用户根目录
//         const userRoot = process.env.NODE_ENV === 'development'
//             ? path.join(__dirname, '../uploads')
//             : `/www/wwwroot/${req.username || 'default'}`;
//         console.log('file.originalname',file.originalname)
//
//         // 处理文件夹上传，保留完整目录结构
//         if (file.originalname.includes('/')) {
//             // 分离目录路径和文件名
//             const dirPath = path.dirname(file.originalname);
//             const fullDirPath = path.join(userRoot, dirPath);
//
//             // 确保目录存在（递归创建）
//             if (!fs.existsSync(fullDirPath)) {
//                 fs.mkdirSync(fullDirPath, { recursive: true });
//             }
//             return cb(null, fullDirPath);
//         }
//
//         // 普通文件直接存放在用户根目录
//         logger.info(`用户 ${req.username || 'default'} 上传文件`);
//         cb(null, userRoot);
//     },
//     filename: function (req, file, cb) {
//         // 只保留文件名部分（去掉路径）
//         const fileName = path.basename(file.originalname);
//         // const fileName = file.originalname;
//         // 处理可能的编码问题
//         cb(null, Buffer.from(fileName, 'latin1').toString('utf8'));
//     },
// });

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // 设定一个统一的临时目录
        const tempDir = path.join(__dirname, '../temp_uploads');

        // 确保临时目录存在
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        cb(null, tempDir);
    },
    filename: function (req, file, cb) {
        // 生成一个唯一的临时文件名，防止文件名冲突
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // 这里不需要关心中文乱码，因为这只是临时文件名
        cb(null, file.fieldname + '-' + uniqueSuffix);
    }
});
// 定义文件下载中间件
export function download(req: Request, res: Response, next: NextFunction) {
    const filePath = `/www/wwwroot/${req.username || 'default'}/${req.params.filename}`;
    res.download(filePath, (err) => {
        if (err) {
            console.error('文件下载失败:', err);
            res.status(404).send('文件未找到');
        }
    });
    next();
}


// // 定义文件上传中间件
// export const upload = multer({storage});
// 🌟 关键：禁用 Multer 的文件名自动转义
export const upload = multer({
  storage: storage,
  preservePath: true, // 保留原始路径（关键配置）
});