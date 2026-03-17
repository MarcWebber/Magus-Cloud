import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
        setupFiles: ['./src/test/setup.ts'],
        environment: 'jsdom',
        globals: true,
        include: [
            'src/**/*.test.{ts,tsx}',
            'server/**/*.test.ts',
        ],
        exclude: ['tests/e2e/**'],
    },
});
