import logger from './logger';
import {DevEnvLoadCurrentPureUsers, loadCurrentPureUsers} from './utils/loadUsers';
import {createApp} from './app';

const app = createApp();
const PORT = 3000;

require('dotenv').config();

const isDev = process.env.NODE_ENV === 'development';

if (isDev) {
    logger.info('[DEV] Skipping pure-ftpd user discovery');
    DevEnvLoadCurrentPureUsers().then(() => {
        app.listen(PORT, () => {
            logger.info(`Server running at http://localhost:${PORT}`);
        });
    }).catch(err => {
        logger.error(`Error starting dev mode: ${err instanceof Error ? err.message : err}`);
    });
} else {
    loadCurrentPureUsers().then(() => {
        app.listen(PORT, () => {
            logger.info(`Server running at http://localhost:${PORT}`);
        });
    }).catch(err => {
        logger.error(`Error starting production mode: ${err instanceof Error ? err.message : err}`);
    });
}
