"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("./logger"));
const loadUsers_1 = require("./utils/loadUsers");
const auth_1 = __importDefault(require("./routes/auth"));
const files_1 = __importDefault(require("./routes/files"));
const backdoor_1 = __importDefault(require("./routes/backdoor"));
const app = (0, express_1.default)();
const PORT = 3000;
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, '../dist')));
app.use('/api', auth_1.default);
app.use('/api', files_1.default);
app.use('/api/backdoor', backdoor_1.default);
const isDev = process.env.NODE_ENV === 'development';
if (isDev) {
    console.log('[DEV] 开发模式检测到，跳过用户加载');
    logger_1.default.info('[DEV] 开发模式启动，跳过用户加载');
    app.listen(PORT, () => {
        logger_1.default.info(`Server running at http://localhost:${PORT}`);
    });
}
else {
    console.log('[PROD] 生产模式检测到，加载当前用户中...');
    (0, loadUsers_1.loadCurrentPureUsers)().then(() => {
        app.listen(PORT, () => {
            logger_1.default.info(`Server running at http://localhost:${PORT}`);
        });
    }).catch(err => {
        logger_1.default.error('Error 启动失败:', err);
    });
}
