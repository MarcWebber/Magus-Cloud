import express from 'express';
import path from 'path';
import logger from './logger';
import {DevEnvLoadCurrentPureUsers, loadCurrentPureUsers} from './utils/loadUsers';
import authRoutes from './routes/auth';
import fileRoutes from './routes/files';
import backdoorRoutes from './routes/backdoor';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

app.use('/api', authRoutes);
app.use('/api', fileRoutes);
app.use('/api/backdoor', backdoorRoutes);
// fallback路由
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const isDev = process.env.NODE_ENV === 'development';

if (isDev) {
    console.log('[DEV] 开发模式检测到，跳过用户加载');
    logger.info('[DEV] 开发模式启动,测试用户加载中');
    DevEnvLoadCurrentPureUsers().then(() => {
        app.listen(PORT, () => {
            logger.info(`Server running at http://localhost:${PORT}`);
        });
    }).catch(err => {
        logger.error('Error 开发模式启动失败:', err);
    });
} else {
    console.log('[PROD] 生产模式检测到，加载当前用户中...');
    loadCurrentPureUsers().then(() => {
        app.listen(PORT, () => {
            logger.info(`Server running at http://localhost:${PORT}`);
        });
    }).catch(err => {
        logger.error('Error 部署模式启动失败:', err);
    });
}
