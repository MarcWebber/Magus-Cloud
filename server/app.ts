import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import authRouter from './modules/auth/router';
import adminRouter from './modules/admin/router';
import filesRouter from './modules/files/router';
import {getMonitoringStatus} from './lib/monitoring/status';

export function createApp() {
    const app = express();

    app.use(express.json());
    app.use(cookieParser());
    app.use(express.static(path.join(process.cwd(), 'dist')));

    app.get('/api/health', async (req, res) => {
        res.json({
            ok: true,
            status: await getMonitoringStatus(),
        });
    });

    app.use('/api/auth', authRouter);
    app.use('/api/admin', adminRouter);
    app.use('/api', filesRouter);

    app.use((req, res) => {
        res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });

    return app;
}
