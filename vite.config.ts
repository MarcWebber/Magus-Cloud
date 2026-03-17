import {defineConfig} from "vite";

export default defineConfig({
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    react: ['react', 'react-dom', 'react-router-dom'],
                    antd: ['antd', '@ant-design/icons'],
                },
            },
            onwarn(warning, warn) {
                if (warning.message.includes('"use client"')) {
                    return;
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
