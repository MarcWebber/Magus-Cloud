// server/logger.ts
import winston from 'winston';
import path from 'path';
import fs from 'fs';

const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(info => `${info.timestamp} [${info.level.toUpperCase()}] ${info.message}`)
    ),
    transports: [
        new winston.transports.File({ filename: path.join(logDir, 'server.log') }),
        new winston.transports.Console()
    ],
});

export default logger;
