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
        // FORMA DE FUNÇÃO, não objeto: a forma de objeto puxa os chunks listados
        // pro grafo INICIAL (modulepreload no index.html) mesmo quando o módulo é
        // só lazy - o playcanvas (1,9MB) estava sendo pré-carregado em TODA página
        // e explodia o LCP mobile (9,9s). Com a função, o chunk só nasce quando o
        // módulo já entrou no grafo pelo import real (lazy continua lazy).
        manualChunks(id) {
          // helpers virtuais do Vite/Rollup (preload-helper, commonjsHelpers) ganham
          // chunk PRÓPRIO - senão caem dentro do primeiro manual chunk (era o playcanvas)
          // e TODO lazy import passa a depender dele (modulepreload de 1,9MB em toda página).
          if (id.startsWith('\0') || id.includes('commonjsHelpers')) return 'helpers'
          if (!id.includes('node_modules')) return undefined
          if (id.includes('/playcanvas/') || id.includes('\\playcanvas\\')) return 'playcanvas'
          if (id.includes('react-router-dom')) return 'router'
          if (id.includes('/react/') || id.includes('\\react\\') || id.includes('react-dom')) return 'react'
          if (id.includes('/lenis/') || id.includes('\\lenis\\')) return 'lenis'
          if (id.includes('framer-motion')) return 'motion'
          if (id.includes('fuse.js')) return 'search'
          if (id.includes('/jspdf/') || id.includes('\\jspdf\\')) return 'pdf'
          if (id.includes('/jszip/') || id.includes('\\jszip\\')) return 'zip'
          return undefined
        },
      },
    },
  },
})
