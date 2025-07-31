import {Router} from 'express';
import jwt from 'jsonwebtoken';
import {toPinyin} from '../utils/utils';
import {allowed_name_list, current_name_set, JWT_EXPIRATION, JWT_EXPIRATION_MS, JWT_SECRET} from '../constants';
import logger from '../logger';
import {registerUser, changePassword, loginUser} from '../services/userService';
import {authenticateToken, useGuard} from "../middleware/authenticationToken";

const router = Router();

router.post('/check-name', (req, res) => {
    const realName = toPinyin(`${req.body.realName}`);
    logger.info(`检查用户是否允许注册: ${realName}`);
    if (allowed_name_list.includes(realName)) {
        return res.json({allowed: true});
    } else {
        return res.json({allowed: false, error: '该真实姓名未被允许注册'});
    }
});

router.post('/register', async (req, res) => {
    const {realName, password} = req.body;
    try {
        const result = await registerUser(realName, password);
        res.json({message: result});
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});


router.post('/change-password', authenticateToken, async (req, res) => {
    const {username, newPassword} = req.body;
    try {
        const result = await changePassword(username, newPassword);
        res.json({message: result});
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// 登录
router.post('/login', async (req, res) => {
    const {username, password} = req.body;
    logger.info(`用户尝试登录: ${username},使用密码: ${password ? '已提供' : '未提供'}`);

    if (!current_name_set.has(username)) {
        logger.warn(`用户 ${username} 登录失败: 用户名不存在`);
        return res.status(401).json({error: '用户名不存在'});
    }

    try {
        const result = await loginUser(username, password);
        if (result !== '登录成功') {
            logger.warn(`用户 ${username} 登录失败: ${result}`);
            return res.status(401).json({error: '用户名或密码错误', success: false});
        }
        // jwt token签发
        logger.info(`用户 ${username} 登录成功，签发JWT`);
        const token = jwt.sign({username}, JWT_SECRET, {expiresIn: JWT_EXPIRATION});
        // cookie设置
        res.cookie('token', token, {
            httpOnly: true,
            // TODO 在dev环境下可以设置为false
            secure: process.env.NODE_ENV === 'production',
            maxAge: JWT_EXPIRATION_MS //
        });
        res.json({
            message: '登录成功',
            token,
            success: true
        });
    } catch (err) {
        logger.warn(`用户 ${username} 登录异常: ${err.message}`);
        res.status(401).json({error: '登录失败，用户名或密码错误', success: false});
    }
});


export default router;
