// server/index.ts
import express from 'express';
import path from 'path';
import fs from 'fs';
import {spawn} from 'child_process';

const app = express();
const PORT = 3000;
const allowed_name_list = ['徐一','陈盛']
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));
// 使用cors
// const cors = require('cors');
// app.use(cors());

app.use(express.static(path.join(__dirname, '../dist')));
app.post('/api/check-name', (req, res) => {
    const realName =`${req.body.realName}`;
    console.log(`检查用户是否允许注册: ${realName}`);
    // const proc = spawn('pure-pw', ['authenticate', username]);
    // proc.stdin.write(password + '\n');
    if (realName ) {
        return res.json({allowed: true});
    }else {
        return res.json({allowed: false, error: '该真实姓名未被允许注册'});
    }
});

app.post('/api/register', (req, res) => {
    const {username, password} = req.body;
    const dir = `/www/wwwroot/${username}`;
    // 打印调试信息
    console.log(`注册用户: ${username}, 目录: ${dir}`);
    fs.mkdirSync(dir, {recursive: true});
    fs.chownSync(dir, 1000, 1000); // 假设www用户
    const proc = spawn('pure-pw', ['useradd', username, '-u', 'www', '-g', 'www', '-d', dir]);
    proc.stdin.write(password + '\n');
    proc.stdin.write(password + '\n');
    proc.stdin.end();
    proc.on('close', (code) => {
        if (code !== 0) return res.status(500).json({error: '添加失败'});
        spawn('pure-pw', ['mkdb']).on('close', () => res.json({message: '注册成功'}));
    });
});

app.post('/api/change-password', (req, res) => {
    const {username, newPassword} = req.body;
    const proc = spawn('pure-pw', ['passwd', username]);
    proc.stdin.write(newPassword + '\n');
    proc.stdin.write(newPassword + '\n');
    proc.stdin.end();
    proc.on('close', (code) => {
        if (code !== 0) return res.status(500).json({error: '修改失败'});
        spawn('pure-pw', ['mkdb']).on('close', () => res.json({message: '修改成功'}));
    });
});

app.get('/api/files', (req, res) => {
    const userDir = '/www/wwwroot/chensheng'; // 可换为动态用户名
    try {
        const files = fs.readdirSync(userDir).map(name => {
            const stats = fs.statSync(path.join(userDir, name));
            return {name, size: stats.size + ' bytes'};
        });
        const du = spawn('du', ['-sh', userDir]);
        du.stdout.on('data', (data) => {
            const usage = data.toString().split('\t')[0];
            res.json({files, usage});
        });
    } catch (e) {
        res.status(500).json({error: '无法读取文件信息'});
    }
});

app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});


// 所有未匹配的路由都返回 index.html（SPA 路由支持）
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});