import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { apiDevPlugin } from './server/vite-api-plugin.ts'

export default defineConfig({
  plugins: [react(), apiDevPlugin()],
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
  server: {
    proxy: {
      '/enem-api': {
        target: 'https://api.enem.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/enem-api/, '/v1'),
      },
    },
  },
})
