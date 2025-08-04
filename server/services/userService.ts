import fs from 'fs';
import { spawn } from 'child_process';
import { toPinyin } from '../utils/utils';
import logger from '../logger';

const isDev = process.env.NODE_ENV === 'development';

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


export async function loginUser(username: string, password: string): Promise<string> {
    if (isDev) {
        return DevLogin();
    }
    return new Promise((resolve, reject) => {
        const proc = spawn('pure-pw', ['login', username]);
        proc.stdin.write(password + '\n');
        proc.stdin.end();

        proc.on('close', (code) => {
            logger.info(`返回代码${code}`);
            if (code !== 0) return reject(new Error('登录失败'));
            logger.info(`用户 ${username} 登录成功`);
            resolve('登录成功');
        });
    });
}


function DevLogin(): Promise<string> {
    return new Promise((resolve) => {
        logger.info('开发模式登录模拟');
        resolve('登录成功');
    });
}

