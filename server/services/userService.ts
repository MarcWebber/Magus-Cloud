import fs from 'fs';
import { spawn } from 'child_process';
import { toPinyin } from '../utils/utils';
import logger from '../logger';

export async function registerUser(realName: string, password: string): Promise<string> {
    const username = toPinyin(realName);
    const dir = `/www/wwwroot/${username}`;
    logger.info(`注册用户: ${username}, 目录: ${dir}`);

    fs.mkdirSync(dir, { recursive: true });
    fs.chownSync(dir, 1000, 1000);

    return new Promise((resolve, reject) => {
        const proc = spawn('pure-pw', ['useradd', username, '-u', 'www', '-g', 'www', '-d', dir]);
        proc.stdin.write(password + '\n');
        proc.stdin.write(password + '\n');
        proc.stdin.end();

        proc.on('close', (code) => {
            if (code !== 0) return reject(new Error('添加失败'));
            spawn('pure-pw', ['mkdb']).on('close', () => resolve('注册成功'));
        });
    });
}

export async function changePassword(username: string, newPassword: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const proc = spawn('pure-pw', ['passwd', username]);
        proc.stdin.write(newPassword + '\n');
        proc.stdin.write(newPassword + '\n');
        proc.stdin.end();

        proc.on('close', (code) => {
            if (code !== 0) return reject(new Error('修改失败'));
            spawn('pure-pw', ['mkdb']).on('close', () => resolve('修改成功'));
        });
    });
}
