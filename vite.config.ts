// vite.config.ts
import { defineConfig } from 'vite';
// import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
    plugins: [
        // tailwindcss(),
    ],
    server: {
        port: 4200,  // You can change this to your preferred port
    },
    ssr: {
        optimizeDeps: {
            include: ['node-fetch', 'firebase-admin',]
        },
        external: [
            // '@google-cloud/secret-manager',
            // 'firebase-functions/params',
            // 'stripe'
        ]
    },
    build: {
        target: 'esnext',
    },
});
