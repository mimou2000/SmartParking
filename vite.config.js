import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5174,
        proxy: {
            '/api': {
                target: 'http://localhost',            // XAMPP Apache
                changeOrigin: true,
                rewrite: (path) => '/smartparking' + path,  // /firebaseApi/x → /smartparking/firebaseApi/x
                secure: false,
            }
        }
    }
})