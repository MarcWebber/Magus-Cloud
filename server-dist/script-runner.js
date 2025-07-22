"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runScript = runScript;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const whitelistPath = path_1.default.join(__dirname, '../server/whitelist.json');
const whitelist = JSON.parse(fs_1.default.readFileSync(whitelistPath, 'utf-8'));
async function runScript(name, args) {
    if (!(name in whitelist)) {
        throw new Error(`不允许执行的脚本: ${name}`);
    }
    const scriptPath = whitelist[name];
    return new Promise((resolve, reject) => {
        const proc = (0, child_process_1.spawn)('node', [scriptPath, ...args], {
            cwd: process.cwd(),
            env: process.env,
        });
        let output = '';
        proc.stdout.on('data', (data) => (output += data.toString()));
        proc.stderr.on('data', (data) => (output += data.toString()));
        proc.on('close', (code) => {
            if (code === 0)
                resolve(output);
            else
                reject(new Error(`脚本异常退出 code=${code}`));
        });
    });
}
