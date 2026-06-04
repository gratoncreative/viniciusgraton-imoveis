import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base relativa ('./') para o build funcionar tanto em subpasta quanto na raiz do dominio (Hostinger).
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
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
