import { JwtPayload } from 'jsonwebtoken';

declare global {
    namespace Express {
        interface Request {
            username?: string;
            // 如果您使用的是 jwt.verify 后得到完整 user 对象，也可以挂 req.user
            user?: string | JwtPayload;
        }
    }
}
