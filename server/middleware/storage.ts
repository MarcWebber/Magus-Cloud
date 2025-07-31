import multer from 'multer';
import {NextFunction, Request, Response} from "express";
import logger from "../logger";

// 定义文件存储位置
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        logger.info(`用户 ${req.username || 'default'} 上传文件`);
        // 使用 req.username 来确定存储目录
        cb(null, `/www/wwwroot/${req.username || 'default'}`);
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const uniqueName = `${timestamp}-${file.originalname}`;
        cb(null, uniqueName);
    },
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

// 定义文件上传中间件
export const upload = multer({storage});