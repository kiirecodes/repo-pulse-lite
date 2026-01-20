import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    proxy: {
      '/auth': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      '/callback': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      '/repos': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      '/pulls': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      '/issues': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      '/commits': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      }
    }
  }
})
