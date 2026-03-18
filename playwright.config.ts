import {defineConfig} from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    webServer: {
        command: 'npm run build && cross-env NODE_ENV=development MAGUS_USE_PGMEM=true MAGUS_ADMIN_PASSWORD=secret MAGUS_DATABASE_URL= DATABASE_URL= node server-dist/index.js',
        url: 'http://127.0.0.1:3000',
        reuseExistingServer: true,
        timeout: 120000,
    },
    use: {
        baseURL: 'http://127.0.0.1:3000',
        headless: true,
    },
});
