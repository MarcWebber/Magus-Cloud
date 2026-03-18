// Load .env before importing other modules that may read process.env at import time.
require('dotenv').config();

const logger = require('./logger').default;
const {createApp} = require('./app');

const app = createApp();
const PORT = Number(process.env.PORT || 3000);

app.listen(PORT, () => {
    logger.info(`Server running at http://localhost:${PORT}`);
    logger.info('Magus Cloud is using cloud.config.json + PostgreSQL metadata bootstrap');
});
