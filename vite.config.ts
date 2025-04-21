// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [],
    server: {
        port: 4200,  // You can change this to your preferred port
    },
    ssr: {
        optimizeDeps: {
            include: ['node-fetch']
        },
        external: [
            '@google-cloud/secret-manager',
            'firebase-admin',
            'firebase-functions/params',
            'stripe'
        ]
    },
    build: {
        target: 'esnext',
    },
});