import fs from 'fs';
import path from 'path';
import {Request, Response, Router, NextFunction} from 'express';
import {readSessionFromRequest} from '../../lib/auth/session';
import {getMaskedSystemSettings, getSystemSettings, updateSystemSettings} from '../../lib/config/store';
import {getMonitoringStatus} from '../../lib/monitoring/status';

const router = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const session = readSessionFromRequest(req);
    if (!session || session.role !== 'admin') {
        return res.status(403).json({error: '需要管理员权限'});
    }

    req.user = session;
    req.username = session.username;
    next();
}

router.get('/settings', requireAdmin, (req, res) => {
    return res.json(getMaskedSystemSettings());
});

router.put('/settings', requireAdmin, (req, res) => {
    const nextSettings = updateSystemSettings(req.body || {});
    return res.json({
        success: true,
        settings: {
            ...getMaskedSystemSettings(),
            metadata: nextSettings.metadata,
        },
    });
});

router.get('/status', requireAdmin, async (req, res) => {
    return res.json(await getMonitoringStatus());
});

router.get('/logs', requireAdmin, (req, res) => {
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 200, 2000));
    const logFile = path.resolve(process.cwd(), 'logs', 'server.log');

    if (!fs.existsSync(logFile)) {
        return res.json({lines: []});
    }

    const lines = fs.readFileSync(logFile, 'utf8')
        .split(/\r?\n/)
        .filter(Boolean)
        .slice(-limit);

    return res.json({
        lines,
        restartRequired: getSystemSettings().metadata.restartRequired,
    });
});

export default router;
