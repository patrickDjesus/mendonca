import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
