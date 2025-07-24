// server/index.ts
import express from 'express';
import path from 'path';
import fs from 'fs';
import logger from './logger';
import { spawn } from 'child_process';
import { toPinyin } from './utils';
const app = express();
const PORT = 3000;
// const allowed_name_list =  ['贝佳','侯瑞超', '武港山',  '贺云青', '许博约', '于凡', '张贝贝', '李星垣', '徐一', '胡俊驰', '刘晓旭', '李智', '王硕', '海日娜', '曹涵兮', '曹嘉琪', '莫桐', '王昭栋', '徐子豪', '陈盛', '张威', '江文钦', '刘赛赛', '张爱燕']

const allowed_name_list = [
    'beijia',
    'houruichao',
    'heyunqing',
    'xuboyue',
    'yufan',
    'zhangbeibei',
    'lixingyuan',
    'xuyi',
    'hujunchi',
    'liuxiaoxu',
    'lizhi',
    'wangshuo',
    'hairina',
    'caohanxi',
    'caojiaqi',
    'motong',
    'wangzhaodong',
    'xuzihao',
    'chensheng',
    'zhangwei',
    'jiangwenqin',
    'liusaesai',
    'zhangaiyan'
];
const current_name_set = new Set<string>();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));
// 使用cors
// const cors = require('cors');
// app.use(cors());
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, error: '用户名或密码不能为空' });
    }
    const proc = spawn('pure-pw', ['authenticate', username]);

    let stderr = '';
    proc.stderr.on('data', (data) => {
        stderr += data.toString();
    });

    proc.stdin.write(password + '\n');
    proc.stdin.end();

    proc.on('close', (code) => {
        if (code === 0) {
            logger.info(`✅ 用户 ${username} 登录成功`);
            res.json({ success: true });
        } else {
            logger.warn(`❌ 用户 ${username} 登录失败: ${stderr.trim()}`);
            res.status(401).json({ success: false, error: '用户名或密码错误' });
        }
    });

    proc.on('error', (err) => {
        logger.error(`❌ 认证进程启动失败:`, err);
        res.status(500).json({ success: false, error: '服务器内部错误' });
    });
});


app.use(express.static(path.join(__dirname, '../dist')));
app.post('/api/check-name', (req, res) => {
    const realName = toPinyin(`${req.body.realName}`);
    logger.info(`检查用户是否允许注册: ${realName}`);
    // const proc = spawn('pure-pw', ['authenticate', username]);
    // proc.stdin.write(password + '\n');
    if (allowed_name_list.includes(realName)) {
        return res.json({ allowed: true });
    } else {
        return res.json({ allowed: false, error: '该真实姓名未被允许注册' });
    }
});

app.post('/api/register', (req, res) => {
    const { realName, password } = req.body;
    const username = toPinyin(realName)
    const dir = `/www/wwwroot/${username}`;
    logger.info(`注册用户: ${username}, 目录: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
    fs.chownSync(dir, 1000, 1000); //默认www用户组
    const proc = spawn('pure-pw', ['useradd', username, '-u', 'www', '-g', 'www', '-d', dir]);
    proc.stdin.write(password + '\n');
    proc.stdin.write(password + '\n');
    proc.stdin.end();
    proc.on('close', (code) => {
        if (code !== 0) return res.status(500).json({ error: '添加失败' });
        spawn('pure-pw', ['mkdb']).on('close', () => res.json({ message: '注册成功' }));
    });
});

app.post('/api/change-password', (req, res) => {
    const { username, newPassword } = req.body;
    const proc = spawn('pure-pw', ['passwd', username]);
    proc.stdin.write(newPassword + '\n');
    proc.stdin.write(newPassword + '\n');
    proc.stdin.end();
    proc.on('close', (code) => {
        if (code !== 0) return res.status(500).json({ error: '修改失败' });
        spawn('pure-pw', ['mkdb']).on('close', () => res.json({ message: '修改成功' }));
    });
});

app.get('/api/files', (req, res) => {
    const userDir = '/www/wwwroot/chensheng';
    try {
        const files = fs.readdirSync(userDir).map(name => {
            const stats = fs.statSync(path.join(userDir, name));
            return { name, size: stats.size + ' bytes' };
        });
        const du = spawn('du', ['-sh', userDir]);
        du.stdout.on('data', (data) => {
            const usage = data.toString().split('\t')[0];
            res.json({ files, usage });
        });
    } catch (e) {
        res.status(500).json({ error: '无法读取文件信息' });
    }
});


// utils
function loadCurrentPureUsers() {
    return new Promise<void>((resolve, reject) => {
        const proc = spawn('pure-pw', ['list']);

        let output = '';
        proc.stdout.on('data', data => {
            output += data.toString();
        });

        proc.on('close', code => {
            if (code !== 0) {
                logger.error('❌ pure-pw list 命令执行失败');
                return reject(new Error('pure-pw list failed'));
            }

            // 输出格式通常为：username [uid|gid|dir]
            const lines = output.split('\n').filter(line => line.trim());
            lines.forEach(line => {
                const username = line.split(/\s+/)[0]; // 获取用户名
                current_name_set.add(username);
            });

            // 过滤掉 current_name_set 中的已存在用户
            for (const name of current_name_set) {
                const index = allowed_name_list.indexOf(name);
                if (index !== -1) allowed_name_list.splice(index, 1);
            }

            logger.info('✅ 当前已有用户:', [...current_name_set]);
            logger.info('✅ 当前允许注册用户:', allowed_name_list);
            resolve();
        });

        proc.stderr.on('data', data => {
            logger.error('stderr:', data.toString());
        });
    });
}


loadCurrentPureUsers().then(() => {
    app.listen(PORT, () => {
        logger.info(`✅ Server running at http://localhost:${PORT}`);
    });
}).catch(err => {
    logger.error('❌ 启动失败:', err);
});
