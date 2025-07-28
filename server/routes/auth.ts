import { Router } from 'express';
import { toPinyin } from '../utils/utils';
import { allowed_name_list, current_name_set } from '../constants';
import logger from '../logger';
import { registerUser, changePassword } from '../services/userService';

const router = Router();

router.post('/check-name', (req, res) => {
    const realName = toPinyin(`${req.body.realName}`);
    logger.info(`检查用户是否允许注册: ${realName}`);
    if (allowed_name_list.includes(realName)) {
        return res.json({ allowed: true });
    } else {
        return res.json({ allowed: false, error: '该真实姓名未被允许注册' });
    }
});

router.post('/register', async (req, res) => {
    const { realName, password } = req.body;
    try {
        const result = await registerUser(realName, password);
        res.json({ message: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/change-password', async (req, res) => {
    const { username, newPassword } = req.body;
    try {
        const result = await changePassword(username, newPassword);
        res.json({ message: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 登录
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (current_name_set.has(username)) {
        res.json({ message: '登录成功' });
    } else {
        res.status(401).json({ error: '用户名不存在' });
    }
});


export default router;
