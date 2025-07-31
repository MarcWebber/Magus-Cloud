import jwt from 'jsonwebtoken';
import {Request, Response, NextFunction} from 'express';
import logger from "../logger";
import {JWT_SECRET} from '../constants';
// 可以继续执行下一个方法
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
    // const authHeader = req.headers['authorization'];
    // const token = authHeader?.split(' ')[1];
    // 使用 cookie 中的 token而不是 Authorization 头部
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ error: '未登录或 token 缺失' });

    if (!token) {
        logger.error('Token 缺失');
        return res.status(401).json({error: 'Token 缺失'});
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        logger.info(`验证用户: ${user ? user : '未知用户'}`);
        if (err) return res.status(403).json({error: 'Token 无效'});
        req.user = user; // 挂载用户信息
        req.username = user['username'];
        // TODO 这里可能存在问题
        logger.info(`用户 ${req.username} 验证通过`);
        next();
    });
}

type Handler = (req: Request, res: Response, next: NextFunction) => void;

export function useGuard(guard: Handler, handler: Handler): Handler[] {
    return [guard, handler];
}
