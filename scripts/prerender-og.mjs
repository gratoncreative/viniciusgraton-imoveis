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
const dados = JSON.parse(readFileSync(resolve(ROOT, 'src/imoveis-destaque.json'), 'utf8'))
const imoveis = dados.imoveis
const construtoras = JSON.parse(readFileSync(resolve(ROOT, 'src/construtoras.json'), 'utf8')).construtoras || []
const lastmod = (dados.geradoEm || '').slice(0, 10) || '2026-06-04'

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
    '@graph': [
      {
        '@type': 'Product',
        '@id': `${url}#imovel`,
        name: `${im.tipo} no ${im.bairro}, Uberlândia`,
        description: resumo(im),
        image: (im.fotos && im.fotos.length ? im.fotos : [im.img]).map(abs),
        category: 'Imóvel à venda',
        sku: String(im.codigo),
        offers: {
          '@type': 'Offer',
          price: im.preco,
          priceCurrency: 'BRL',
          availability: 'https://schema.org/InStock',
          url,
          seller: { '@type': 'RealEstateAgent', name: 'Vinícius Graton Imóveis', areaServed: 'Uberlândia - MG' },
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Início', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: 'Imóveis', item: `${SITE}/imoveis` },
          { '@type': 'ListItem', position: 3, name: `${im.tipo} no ${im.bairro}`, item: url },
        ],
      },
    ],
  }

  let html = baseHtml
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(titulo)} | Vinícius Graton</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(titulo)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${esc(url)}$2`)
    .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${esc(image)}$2`)
    .replace(/(<meta property="og:image:alt" content=")[^"]*(")/, `$1${esc(im.tipo + ' no ' + im.bairro + ', ' + im.cidade)}$2`)
    .replace(/(<meta property="og:image:width" content=")[^"]*(")/, `$11200$2`)
    .replace(/(<meta property="og:image:height" content=")[^"]*(")/, `$1900$2`)
    .replace(/(<meta property="og:type" content=")[^"]*(")/, `$1article$2`)
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

// páginas de bairro (SEO) — meta/canonical/JSON-LD por bairro
const slugify = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
const editoriais = ['Jardim Karaíba', 'Morada da Colina', 'Cidade Jardim', 'Gávea', 'Granja Marileusa', 'Vigilato Pereira', 'Santa Maria', 'Jardim Sul', 'Jardim Finotti', 'Parque Una', 'Patrimônio', 'Lídice', 'Santa Mônica', 'Tabajaras', 'Nova Uberlândia', 'Tubalina']
const bairrosSeo = [...new Set([...editoriais, ...imoveis.map((im) => im.bairro)])]
  .filter(Boolean)
  .map((nome) => ({ nome, slug: slugify(nome) }))

function renderBairro(b) {
  const titulo = `Imóveis à venda em ${b.nome}, Uberlândia`
  const desc = `Casas e apartamentos à venda em ${b.nome}, Uberlândia, com Vinícius Graton — consultor credenciado da Rotina Imobiliária. Veja as opções e fale comigo.`
  const url = `${SITE}/imoveis/uberlandia/${b.slug}`
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: titulo,
    description: desc,
    url,
    about: { '@type': 'Place', name: `${b.nome}, Uberlândia, MG` },
  }
  return baseHtml
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(titulo)} | Vinícius Graton</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(titulo)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${esc(url)}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(titulo)}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${esc(url)}$2`)
    .replace('</head>', `<script type="application/ld+json">${JSON.stringify(ld)}</script>\n</head>`)
}

let nb = 0
for (const b of bairrosSeo) {
  const dir = resolve(DIST, 'imoveis', 'uberlandia', b.slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(resolve(dir, 'index.html'), renderBairro(b))
  nb++
}
console.log(`✓ prerender bairros: ${nb} páginas em dist/imoveis/uberlandia/{bairro}/`)

// páginas de empreendimento (construtora) — ficha completa, meta + JSON-LD
function renderEmpre(c, p) {
  const titulo = `${p.nome} — ${c.nome}, ${p.bairro || 'Uberlândia'}`
  const desc = trunc(`${p.descricao || ''} Fale com o Vinícius Graton e agende uma visita ao ${p.nome}, da ${c.nome}, em Uberlândia.`)
  const url = `${SITE}/construtoras/${c.slug}/${p.slug}`
  const image = p.capa ? abs(p.capa) : `${SITE}/vinicius-graton.jpg`
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Residence',
    name: `${p.nome} — ${c.nome}`,
    description: p.descricao || desc,
    url,
    image,
    address: { '@type': 'PostalAddress', addressLocality: 'Uberlândia', addressRegion: 'MG', addressCountry: 'BR', streetAddress: p.endereco || p.bairro || '' },
  }
  return baseHtml
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(titulo)} | Vinícius Graton</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(titulo)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${esc(url)}$2`)
    .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${esc(image)}$2`)
    .replace(/(<meta property="og:type" content=")[^"]*(")/, `$1article$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(titulo)}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${esc(image)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${esc(url)}$2`)
    .replace('</head>', `<script type="application/ld+json">${JSON.stringify(ld)}</script>\n</head>`)
}

let nemp = 0
for (const c of construtoras) {
  for (const p of c.projetos || []) {
    const dir = resolve(DIST, 'construtoras', c.slug, p.slug)
    mkdirSync(dir, { recursive: true })
    writeFileSync(resolve(dir, 'index.html'), renderEmpre(c, p))
    nemp++
  }
}
console.log(`✓ prerender empreendimentos: ${nemp} páginas em dist/construtoras/{construtora}/{empreendimento}/`)

// sitemap.xml completo (home + catálogo + cada imóvel, com imagem p/ o Google Imagens)
const urls = [
  { loc: `${SITE}/`, freq: 'weekly', pri: '1.0' },
  { loc: `${SITE}/imoveis`, freq: 'daily', pri: '0.9' },
  { loc: `${SITE}/como-funciona`, freq: 'monthly', pri: '0.6' },
  { loc: `${SITE}/sobre`, freq: 'monthly', pri: '0.6' },
  { loc: `${SITE}/regioes`, freq: 'monthly', pri: '0.7' },
  { loc: `${SITE}/construtoras`, freq: 'weekly', pri: '0.7' },
  ...construtoras.map((c) => ({ loc: `${SITE}/construtoras/${c.slug}`, freq: 'weekly', pri: '0.6' })),
  ...construtoras.flatMap((c) => (c.projetos || []).map((p) => ({
    loc: `${SITE}/construtoras/${c.slug}/${p.slug}`,
    freq: 'weekly',
    pri: '0.7',
    img: p.capa ? abs(p.capa) : '',
    imgTitle: `${p.nome} — ${c.nome}, Uberlândia`,
  }))),
  { loc: `${SITE}/contato`, freq: 'monthly', pri: '0.5' },
  ...bairrosSeo.map((b) => ({ loc: `${SITE}/imoveis/uberlandia/${b.slug}`, freq: 'weekly', pri: '0.7' })),
  ...imoveis.map((im) => ({
    loc: `${SITE}/imovel/${im.codigo}`,
    freq: 'weekly',
    pri: '0.8',
    img: abs(im.img),
    imgTitle: `${im.tipo} no ${im.bairro}, Uberlândia`,
  })),
  { loc: `${SITE}/privacidade`, freq: 'yearly', pri: '0.2' },
]
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
  urls
    .map((u) => {
      const imgBlock = u.img
        ? `\n    <image:image>\n      <image:loc>${esc(u.img)}</image:loc>\n      <image:title>${esc(u.imgTitle)}</image:title>\n    </image:image>`
        : ''
      return `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${u.freq}</changefreq>\n    <priority>${u.pri}</priority>${imgBlock}\n  </url>`
    })
    .join('\n') +
  `\n</urlset>\n`
writeFileSync(resolve(DIST, 'sitemap.xml'), sitemap)
console.log(`✓ sitemap.xml: ${urls.length} URLs`)
