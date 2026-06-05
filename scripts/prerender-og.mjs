/**
 * prerender-og.mjs — roda DEPOIS do `vite build`.
 * Gera uma página HTML estática por imóvel (dist/imovel/{codigo}/index.html) com
 * as meta tags Open Graph/Twitter/Title/Descrição e o JSON-LD corretos daquele
 * imóvel. Assim, ao compartilhar o link no WhatsApp/Instagram/Facebook ou indexar
 * no Google, aparece a FOTO + PREÇO + descrição certos (crawlers não rodam JS).
 * O app React continua funcionando normalmente por cima (hidrata e roteia).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DIST = resolve(ROOT, 'dist')
const SITE = 'https://viniciusgraton.com.br'

const baseHtml = readFileSync(resolve(DIST, 'index.html'), 'utf8')
const { imoveis } = JSON.parse(readFileSync(resolve(ROOT, 'src/imoveis-destaque.json'), 'utf8'))

const formatPreco = (v) => {
  if (!v || v <= 0) return 'Sob consulta'
  if (v >= 1000000) return `R$ ${(v / 1000000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  return `R$ ${Math.round(v / 1000)} mil`
}
const plural = (n, s, p) => (n > 1 ? p : s)
const resumo = (im) => {
  if (im.descricao && im.descricao.trim()) return im.descricao.trim()
  const itens = [
    im.quartos > 0 && `${im.quartos} ${plural(im.quartos, 'quarto', 'quartos')}`,
    im.suites > 0 && `${im.suites} ${plural(im.suites, 'suíte', 'suítes')}`,
    im.vagas > 0 && `${im.vagas} ${plural(im.vagas, 'vaga', 'vagas')}`,
    im.area > 0 && `${im.area} m²`,
  ].filter(Boolean)
  return `${im.tipo} à venda no ${im.bairro}, em ${im.cidade}.${itens.length ? ' ' + itens.join(', ') + '.' : ''}`
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const trunc = (s, n = 160) => {
  const t = (s || '').trim()
  if (t.length <= n) return t
  return t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…'
}
const abs = (u) => (u && u.startsWith('http') ? u : SITE + u)

function render(im) {
  const titulo = `${im.tipo} no ${im.bairro}, Uberlândia — ${formatPreco(im.preco)}`
  const desc = trunc(resumo(im))
  const url = `${SITE}/imovel/${im.codigo}`
  const image = abs(im.img)
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${im.tipo} no ${im.bairro}, Uberlândia`,
    description: resumo(im),
    image: (im.fotos && im.fotos.length ? im.fotos : [im.img]).map(abs),
    category: 'Imóvel à venda',
    offers: {
      '@type': 'Offer',
      price: im.preco,
      priceCurrency: 'BRL',
      availability: 'https://schema.org/InStock',
      url,
      seller: { '@type': 'RealEstateAgent', name: 'Vinícius Graton Imóveis', areaServed: 'Uberlândia - MG' },
    },
  }

  let html = baseHtml
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(titulo)} | Vinícius Graton</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(titulo)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${esc(url)}$2`)
    .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${esc(image)}$2`)
    .replace(/(<meta property="og:image:alt" content=")[^"]*(")/, `$1${esc(im.tipo + ' no ' + im.bairro)}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(titulo)}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${esc(image)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${esc(url)}$2`)
    .replace('</head>', `<script type="application/ld+json">${JSON.stringify(ld)}</script>\n</head>`)

  return html
}

let n = 0
for (const im of imoveis) {
  const dir = resolve(DIST, 'imovel', String(im.codigo))
  mkdirSync(dir, { recursive: true })
  writeFileSync(resolve(dir, 'index.html'), render(im))
  n++
}
console.log(`✓ prerender-og: ${n} páginas de imóvel geradas em dist/imovel/{codigo}/index.html`)
