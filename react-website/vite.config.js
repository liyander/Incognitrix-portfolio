import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 7777,
    proxy: {
      '/api/public': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true
      },
      '/api': {
        target: 'http://127.0.0.1:1337',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://127.0.0.1:1337',
        changeOrigin: true
      }
    }
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss(),
        autoprefixer(),
      ],
    },
  },
})
