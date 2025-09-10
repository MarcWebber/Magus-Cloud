import {Router} from "express";
import {JWT_SECRET} from "../constants";
import jwt from "jsonwebtoken";
import logger from "../logger";

const router = Router();
const isDev = process.env.NODE_ENV === 'development';
router.post('/user/me', (req, res) => {
    const token = req.cookies?.token;
    logger.info(`用户信息请求，Token: ${token ? '已提供' : '未提供'}`);
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({error: 'Token 无效'});
        }
        const username = user;
        const avatarUrl = req.cookies?.avatarUrl || '';
        logger.info(`用户信息请求: ${username}, 头像URL: ${avatarUrl ? '已提供' : '未提供'}`);
        // ok
        res.status(200);
        res.json({username, avatarUrl});
    });
});

export default router;