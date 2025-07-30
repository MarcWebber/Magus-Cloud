import multer from 'multer';
import {NextFunction, Request, Response} from "express";

// 定义文件存储位置
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, `/www/wwwroot/${req.user?.username || 'default'}`);
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const uniqueName = `${timestamp}-${file.originalname}`;
        cb(null, uniqueName);
    },
});



// 定义文件下载中间件
export function download(req: Request, res: Response, next: NextFunction) {
    const filePath = `/www/wwwroot/${req.user?.username || 'default'}/${req.params.filename}`;
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