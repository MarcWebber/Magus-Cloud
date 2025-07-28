import express from 'express';
import path from 'path';
import logger from './logger';
import { loadCurrentPureUsers } from './utils/loadUsers';
import authRoutes from './routes/auth';
import fileRoutes from './routes/files';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

app.use('/api', authRoutes);
app.use('/api', fileRoutes);

loadCurrentPureUsers().then(() => {
    app.listen(PORT, () => {
        logger.info(`✅ Server running at http://localhost:${PORT}`);
    });
}).catch(err => {
    logger.error('❌ 启动失败:', err);
});
