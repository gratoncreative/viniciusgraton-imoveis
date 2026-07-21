import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Gera public/blog-preview.json (metadados sem `conteudo`) antes de cada build e dev start.
// BlogVG.jsx, BlogPostVG.jsx e SecoesVG.jsx fazem fetch desse arquivo — assim o JSON completo (1.25 MB) não vai no bundle.
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
        // FUNÇÃO, e só pros PESADOS LAZY. A forma de objeto punha o preload-helper
        // do Vite dentro do chunk playcanvas → modulepreload de 1,9MB em toda página
        // (LCP mobile 9,9s). NÃO separar react/react-dom manualmente: a 1ª tentativa
        // (chunk react + chunk helpers) criou ciclo de inicialização e QUEBROU a
        // produção ("Cannot set properties of undefined (setting 'Children')").
        // react/router/motion/lenis ficam no default do Rollup, que resolve a ordem.
        manualChunks(id) {
          // o preload-helper do Vite é importado por TODO lazy import; se ficar
          // dentro de um chunk pesado (caía no playcanvas), o chunk pesado vira
          // dependência de todos. Chunk próprio minúsculo resolve.
          if (id.includes('vite/preload-helper') || id.includes('commonjsHelpers')) return 'preload'
          if (!id.includes('node_modules')) return undefined
          if (id.includes('playcanvas')) return 'playcanvas'
          if (id.includes('jspdf')) return 'pdf'
          if (id.includes('jszip')) return 'zip'
          if (id.includes('fuse.js')) return 'search'
          return undefined
        },
      },
    },
  },
})
