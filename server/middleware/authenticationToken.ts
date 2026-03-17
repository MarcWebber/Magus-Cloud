import {Request, Response, NextFunction} from 'express';
import logger from "../logger";
import {readSessionFromRequest} from '../lib/auth/session';

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
    const session = readSessionFromRequest(req);
    if (!session) {
        logger.error('Session missing');
        return res.status(401).json({error: '未登录或会话失效'});
    }

    req.user = session;
    req.username = session.username;
    logger.info(`用户 ${req.username} 验证通过`);
    next();
}

type Handler = (req: Request, res: Response, next: NextFunction) => void;

export function useGuard(guard: Handler, handler: Handler): Handler[] {
    return [guard, handler];
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const session = readSessionFromRequest(req);
    if (!session || session.role !== 'admin') {
        return res.status(403).json({error: '管理员权限不足'});
    }

    req.user = session;
    req.username = session.username;
    next();
}
