import { spawn } from 'child_process';
import logger from '../logger';
import { allowed_name_list, current_name_set } from '../constants';
import {error} from "winston";

const isDev = process.env.NODE_ENV === 'development';
export function DevEnvLoadCurrentPureUsers(): Promise<void> {
    // 返回测试用户test
    if (isDev) {
        logger.info('开发模式，test用户已加载');
        current_name_set.add('test');
        // 可注册用户为register
        logger.info('开发模式，允许注册用户register');
        allowed_name_list.push('register');
        return Promise.resolve();
    }
    error('❌ 非开发环境调用了开发环境的代码，请检查代码逻辑');
}
export function loadCurrentPureUsers(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const proc = spawn('pure-pw', ['list']);
        let output = '';

        proc.stdout.on('data', data => output += data.toString());

        proc.on('close', code => {
            if (code !== 0) {
                logger.error('❌ pure-pw list 命令执行失败');
                return reject(new Error('pure-pw list failed'));
            }

            const lines = output.split('\n').filter(Boolean);
            for (const line of lines) {
                const username = line.split(/\s+/)[0];
                current_name_set.add(username);
            }

            for (const name of current_name_set) {
                const index = allowed_name_list.indexOf(name);
                if (index !== -1) allowed_name_list.splice(index, 1);
            }

            logger.info('✅ 当前已有用户:', [...current_name_set]);
            logger.info('✅ 当前允许注册用户:', allowed_name_list);
            resolve();
        });

        proc.stderr.on('data', data => logger.error('stderr:', data.toString()));
    });
}
