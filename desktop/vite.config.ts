import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  server: {
    host: '127.0.0.1',
    port: 1422,
    strictPort: true,
    proxy: {
      '/hermes': {
        target: 'http://127.0.0.1:9119',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/hermes/, ''),
        ws: true
      },
      '/openclaw-ws': {
        target: 'ws://127.0.0.1:18789',
        changeOrigin: true,
        rewrite: () => '/',
        ws: true
      }
    }
  },
  base: './'
})
