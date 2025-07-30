import jwt from 'jsonwebtoken';
import {Request, Response, NextFunction} from 'express';
import logger from "../logger";

// TODO 配置secret key
const SECRET = "your-secret-key";

// 可以继续执行下一个方法
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];

    if (!token) {
        logger.error('Token 缺失');
        return res.status(401).json({error: 'Token 缺失'});
    }

    jwt.verify(token, SECRET, (err, user) => {
        logger.info(`验证用户: ${user ? user : '未知用户'}`);
        if (err) return res.status(403).json({error: 'Token 无效'});
        req.user = user; // 挂载用户信息
        next();
    });
}

type Handler = (req: Request, res: Response, next: NextFunction) => void;

export function useGuard(guard: Handler, handler: Handler): Handler[] {
    return [guard, handler];
}
