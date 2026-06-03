import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// https://vitejs.dev/config/
export default defineConfig({
  envDir: rootDir,
  envPrefix: 'DEFAULT_',
  resolve: {
    alias: {
      '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src'),
    },
  },
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
    },
  },
})
