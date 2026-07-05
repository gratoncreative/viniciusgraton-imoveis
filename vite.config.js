import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Gera public/blog-preview.json (metadados sem `conteudo`) antes de cada build e dev start.
// BlogHome.jsx faz fetch desse arquivo — assim o JSON completo (1.25 MB) não vai no bundle.
function blogPreviewPlugin() {
  const generate = () => {
    const base = JSON.parse(readFileSync(resolve(__dirname, 'src/blog-base.json'), 'utf8'))
    const extra = JSON.parse(readFileSync(resolve(__dirname, 'src/blog-extra.json'), 'utf8'))
    const preview = [...base, ...extra]
      .filter((p) => p && p.capa)
      .map(({ slug, titulo, resumo, capa, cor, categoria, leitura, data, destaque, atualizado }) => ({
        slug, titulo, resumo, capa, cor, categoria, leitura, data,
        ...(destaque ? { destaque } : {}),
        ...(atualizado ? { atualizado } : {}),
      }))
    writeFileSync(resolve(__dirname, 'public/blog-preview.json'), JSON.stringify(preview), 'utf8')
  }
  return {
    name: 'blog-preview',
    buildStart: generate,
    configureServer(server) {
      generate()
      server.watcher.on('change', (f) => {
        if (f.endsWith('blog-base.json') || f.endsWith('blog-extra.json')) generate()
      })
    },
  }
}

// Base absoluta ('/') — o site roda na raiz do dominio (Cloudflare Pages).
// Essencial para que as rotas aninhadas pre-renderizadas (/imovel/{cod}) carreguem os assets.
export default defineConfig({
  plugins: [react(), blogPreviewPlugin()],
  base: '/',
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          router: ['react-router-dom'],
          lenis: ['lenis'],
          motion: ['framer-motion'],
          search: ['fuse.js'],
          pdf: ['jspdf'],
          zip: ['jszip'],
          playcanvas: ['playcanvas'],
        },
      },
    },
  },
})
