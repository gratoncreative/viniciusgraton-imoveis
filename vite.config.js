import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base absoluta ('/') — o site roda na raiz do dominio (Cloudflare Pages).
// Essencial para que as rotas aninhadas pre-renderizadas (/imovel/{cod}) carreguem os assets.
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          motion: ['framer-motion'],
        },
      },
    },
  },
})
