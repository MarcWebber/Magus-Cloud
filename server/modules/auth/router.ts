import {Router} from 'express';
import {clearSessionCookies, readSessionFromRequest, setSessionCookies} from '../../lib/auth/session';
import {buildFeishuLoginUrl, exchangeCodeForFeishuUser} from '../../integrations/feishu/client';
import {getSystemSettings} from '../../lib/config/store';

const router = Router();

router.get('/session', (req, res) => {
    const session = readSessionFromRequest(req);
    if (!session) {
        return res.json({
            authenticated: false,
        });
    }

    return res.json({
        authenticated: true,
        user: session,
    });
});

router.post('/logout', (req, res) => {
    clearSessionCookies(res);
    return res.json({success: true});
});

router.post('/admin/login', (req, res) => {
    const settings = getSystemSettings();
    const password = process.env.MAGUS_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'admin';
    const {username, password: submittedPassword} = req.body || {};

    if (!settings.auth.adminFallbackEnabled) {
        return res.status(403).json({error: '管理员兜底登录已关闭'});
    }

    if (username !== settings.auth.adminUsername || submittedPassword !== password) {
        return res.status(401).json({error: '管理员账号或密码错误'});
    }

    setSessionCookies(res, {
        username,
        role: 'admin',
        provider: 'admin',
    });

    return res.json({
        success: true,
        user: {
            username,
            role: 'admin',
            provider: 'admin',
        },
    });
});

router.get('/feishu/login', (req, res) => {
    const settings = getSystemSettings();
    if (!settings.feishu.enabled || !settings.feishu.appId || !settings.feishu.appSecret) {
        return res.status(400).json({error: '飞书登录尚未配置完成'});
    }

    return res.redirect(buildFeishuLoginUrl());
});

router.get('/feishu/callback', async (req, res) => {
    try {
        const settings = getSystemSettings();
        const code = typeof req.query.code === 'string' ? req.query.code : '';

        if (!code) {
            return res.status(400).json({error: '缺少飞书授权码'});
        }

        const user = await exchangeCodeForFeishuUser(code);
        setSessionCookies(res, {
            username: user.username,
            role: 'user',
            provider: 'feishu',
            avatarUrl: user.avatarUrl,
        });

        return res.redirect(`${settings.feishu.appBaseUrl.replace(/\/$/, '')}/dashboard`);
    } catch (error) {
        return res.status(500).json({
            error: error instanceof Error ? error.message : '飞书登录失败',
        });
    }
});

export default router;
