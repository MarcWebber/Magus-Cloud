import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const whitelistPath = path.join(__dirname, '../server/whitelist.json');

const whitelist = JSON.parse(
    fs.readFileSync(whitelistPath, 'utf-8')
) as Record<string, string>
export async function runScript(name: string, args: string[]): Promise<string> {
    if (!(name in whitelist)) {
        throw new Error(`不允许执行的脚本: ${name}`);
    }

    const scriptPath = whitelist[name];

    return new Promise((resolve, reject) => {
        const proc = spawn('node', [scriptPath, ...args], {
            cwd: process.cwd(),
            env: process.env,
        });

        let output = '';
        proc.stdout.on('data', (data) => (output += data.toString()));
        proc.stderr.on('data', (data) => (output += data.toString()));

        proc.on('close', (code) => {
            if (code === 0) resolve(output);
            else reject(new Error(`脚本异常退出 code=${code}`));
        });
    });
}
