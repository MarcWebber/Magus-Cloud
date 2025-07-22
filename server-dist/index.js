"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/index.ts
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
const app = (0, express_1.default)();
const PORT = 3000;
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, '../dist')));
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    const dir = `/www/wwwroot/${username}`;
    fs_1.default.mkdirSync(dir, { recursive: true });
    fs_1.default.chownSync(dir, 1000, 1000); // 假设www用户
    const proc = (0, child_process_1.spawn)('pure-pw', ['useradd', username, '-u', 'www', '-g', 'www', '-d', dir]);
    proc.stdin.write(password + '\n');
    proc.stdin.write(password + '\n');
    proc.stdin.end();
    proc.on('close', (code) => {
        if (code !== 0)
            return res.status(500).json({ error: '添加失败' });
        (0, child_process_1.spawn)('pure-pw', ['mkdb']).on('close', () => res.json({ message: '注册成功' }));
    });
});
app.post('/api/change-password', (req, res) => {
    const { username, newPassword } = req.body;
    const proc = (0, child_process_1.spawn)('pure-pw', ['passwd', username]);
    proc.stdin.write(newPassword + '\n');
    proc.stdin.write(newPassword + '\n');
    proc.stdin.end();
    proc.on('close', (code) => {
        if (code !== 0)
            return res.status(500).json({ error: '修改失败' });
        (0, child_process_1.spawn)('pure-pw', ['mkdb']).on('close', () => res.json({ message: '修改成功' }));
    });
});
app.get('/api/files', (req, res) => {
    const userDir = '/www/wwwroot/chensheng'; // 可换为动态用户名
    try {
        const files = fs_1.default.readdirSync(userDir).map(name => {
            const stats = fs_1.default.statSync(path_1.default.join(userDir, name));
            return { name, size: stats.size + ' bytes' };
        });
        const du = (0, child_process_1.spawn)('du', ['-sh', userDir]);
        du.stdout.on('data', (data) => {
            const usage = data.toString().split('\t')[0];
            res.json({ files, usage });
        });
    }
    catch (e) {
        res.status(500).json({ error: '无法读取文件信息' });
    }
});
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});
