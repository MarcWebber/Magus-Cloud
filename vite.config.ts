import {defineConfig} from "vite";

export default defineConfig({
    build: {
        rollupOptions: {
            onwarn(warning, warn) {
                if (warning.message.includes('"use client"')) {
                    return; // 忽略这类警告
                }
                warn(warning);
            }
        }
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            }
        }
    }
});