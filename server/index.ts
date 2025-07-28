import express from 'express';
import path from 'path';
import logger from './logger';
import { loadCurrentPureUsers } from './utils/loadUsers';
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

const isDev = process.env.NODE_ENV === 'development';

if (isDev) {
    console.log('[DEV] 开发模式检测到，跳过用户加载');
    logger.info('[DEV] 开发模式启动，跳过用户加载');
    app.listen(PORT, () => {
        logger.info(`Server running at http://localhost:${PORT}`);
    });
} else {
    console.log('[PROD] 生产模式检测到，加载当前用户中...');
    loadCurrentPureUsers().then(() => {
        app.listen(PORT, () => {
            logger.info(`Server running at http://localhost:${PORT}`);
        });
    }).catch(err => {
        logger.error('Error 启动失败:', err);
    });
}
