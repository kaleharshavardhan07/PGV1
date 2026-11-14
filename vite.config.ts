import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Same-origin API calls in development: the SPA calls /api/*, Vite proxies
    // it to Express. In production Express serves both the API and the SPA.
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
