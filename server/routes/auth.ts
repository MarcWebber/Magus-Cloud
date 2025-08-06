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


/**
 * 以下是飞书登录
 */

router.get('/feishu-login', (req, res) => {
    // windows 的 fallback
    logger.info(`${process.env.FEISHU_APP_ID}`);
    logger.info('飞书登录请求');
    const authUrl = `https://open.feishu.cn/open-apis/authen/v1/index?app_id=${process.env.FEISHU_APP_ID}&redirect_uri=${encodeURIComponent(process.env.FEISHU_REDIRECT_URI)}`;
    res.redirect(authUrl);
});

// 飞书登录接口回调
router.get('/feishu-callback', async (req, res) => {
    try {
        logger.info('飞书登录回调');
        const {code} = req.query;
        logger.info(`飞书登录回调，收到code: ${code}`);
        // 获得acc_token
        const tokenResponse = await fetch(`https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal`, {
            method: 'POST',
            // grant_type: 'authorization_code',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                grant_type: 'authorization_code',
                code: code,
                app_id: process.env.FEISHU_APP_ID,
                app_secret: process.env.FEISHU_APP_SECRET,
            }),
            // grant_type: 'authorization_code',
        });
        const tokenJson = tokenResponse.ok ? await tokenResponse.json() : {};
        const { app_access_token } = tokenJson;

        logger.info(`飞书 App Access Token: ${app_access_token}`);


        const userResponse = await fetch(`https://open.feishu.cn/open-apis/authen/v1/access_token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${app_access_token}`,
            },
            body: JSON.stringify({
                // grant_type: 'authorization_code',
                // code: code,
                // app_id: process.env.FEISHU_APP_ID,
                // app_secret: process.env.FEISHU_APP_SECRET,
                grant_type: 'authorization_code',
                code: code,
            }),
        });
        const userInfo = userResponse.ok ? await userResponse.json() : {};
        logger.info(`飞书用户信息: ${JSON.stringify(userInfo)}`);
    } catch (err) {
        logger.error(`飞书登录异常: ${err.message}`);
        return res.status(500).json({error: '飞书登录失败'});
    }

});
export default router;
