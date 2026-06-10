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
const imoveis = (dados.imoveis || []).filter((im) => !im.pendente) // pendentes só entram após aprovação
// espelho completo da Rotina (feed leve) — gera página estática única p/ cada um (SEO)
const feedAll = (() => { try { return JSON.parse(readFileSync(resolve(ROOT, 'public/catalogo.json'), 'utf8')).imoveis || [] } catch { return [] } })()
const bundleCods = new Set(imoveis.map((im) => String(im.codigo)))
const feed = feedAll.filter((im) => im && im.codigo && !bundleCods.has(String(im.codigo)))
const construtoras = JSON.parse(readFileSync(resolve(ROOT, 'src/construtoras.json'), 'utf8')).construtoras || []
const condominios = JSON.parse(readFileSync(resolve(ROOT, 'src/condominios.json'), 'utf8')).condominios || []
// posts do blog (extrai os slugs do src/blog.js sem precisar de bundler)
const blogSrc = readFileSync(resolve(ROOT, 'src/blog.js'), 'utf8')
const blogSlugsBase = [...blogSrc.matchAll(/slug:\s*'([^']+)'/g)].map((m) => m[1])
const blogExtra = JSON.parse(readFileSync(resolve(ROOT, 'src/blog-extra.json'), 'utf8'))
const blogSlugs = [...new Set([...blogSlugsBase, ...blogExtra.map((p) => p.slug)])]
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

// Descrição PRÓPRIA e única por imóvel (não copia a da Rotina) — varia por código + bairro + specs.
function descricaoUnica(im) {
  const t = im.tipo || 'Imóvel'
  const tl = t.toLowerCase()
  const b = im.bairro || 'Uberlândia'
  const seed = [...String(im.codigo)].reduce((a, c) => a + c.charCodeAt(0), 0)
  const pick = (arr, off = 0) => arr[(seed + off) % arr.length]
  const ehApto = /apart|kit|studio|stúdio|loft|flat|cobertura/i.test(t)
  const specs = [
    im.area > 0 && `${im.area} m²`,
    im.quartos > 0 && `${im.quartos} ${plural(im.quartos, 'quarto', 'quartos')}`,
    im.suites > 0 && `${im.suites} ${plural(im.suites, 'suíte', 'suítes')}`,
    im.banheiros > 0 && `${im.banheiros} ${plural(im.banheiros, 'banheiro', 'banheiros')}`,
    im.vagas > 0 && `${im.vagas} ${plural(im.vagas, 'vaga', 'vagas')}`,
  ].filter(Boolean)
  const andar = ehApto && im.andar != null && im.andar !== '' ? (Number(im.andar) === 0 ? 'no térreo' : `no ${im.andar}º andar`) : ''
  const elev = ehApto && typeof im.elevador === 'boolean' ? (im.elevador ? 'prédio com elevador' : 'prédio sem elevador') : ''
  const ab = [
    `Conheça este ${tl} à venda no bairro ${b}, em Uberlândia.`,
    `Oportunidade no ${b}, Uberlândia: ${tl} à venda com atendimento personalizado.`,
    `${t} à venda no ${b}, uma das regiões procuradas de Uberlândia.`,
    `Disponível no ${b}, em Uberlândia, este ${tl} pode ser o seu próximo endereço.`,
  ]
  const me = [
    `São ${specs.join(', ')}${andar ? ', ' + andar : ''}${elev ? ', ' + elev : ''}.`,
    `O imóvel conta com ${specs.join(', ')}${andar ? ' ' + andar : ''}${elev ? ' e ' + elev : ''}.`,
    `Oferece ${specs.join(', ')}${andar ? ', ' + andar : ''}${elev ? ', ' + elev : ''}.`,
  ]
  const fe = [
    `Atendimento pessoal do Vinícius Graton, consultor da Rotina Imobiliária — agende uma visita e tire suas dúvidas.`,
    `Fale com o Vinícius Graton (Rotina Imobiliária) para visitar, simular o financiamento e negociar com segurança.`,
    `Com a curadoria e o acompanhamento do Vinícius Graton, da Rotina Imobiliária, do primeiro contato à entrega das chaves.`,
  ]
  return `${pick(ab)} ${specs.length ? pick(me, 1) + ' ' : ''}${im.condominio ? `Condomínio de R$ ${Number(im.condominio).toLocaleString('pt-BR')}. ` : ''}${pick(fe, 2)}`
}

// bloco de conteúdo estático único dentro do #root (crawler lê; o React substitui ao montar)
function bodySeo(im, descUnica) {
  const specs = [
    im.area > 0 && `Área: ${im.area} m²`,
    im.quartos > 0 && `Quartos: ${im.quartos}`,
    im.suites > 0 && `Suítes: ${im.suites}`,
    im.banheiros > 0 && `Banheiros: ${im.banheiros}`,
    im.vagas > 0 && `Vagas: ${im.vagas}`,
    im.condominio > 0 && `Condomínio: R$ ${Number(im.condominio).toLocaleString('pt-BR')}`,
  ].filter(Boolean)
  return `<main class="pre-seo"><h1>${esc(im.tipo)} à venda no ${esc(im.bairro)}, Uberlândia — Cód. ${esc(im.codigo)}</h1>` +
    `<p>${esc(descUnica)}</p>` +
    `<ul>${specs.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` +
    `<p>Imóvel à venda em ${esc(im.bairro)}, ${esc(im.cidade || 'Uberlândia')} - MG, com Vinícius Graton, consultor credenciado da Rotina Imobiliária. Veja fotos, localização e fale comigo para agendar uma visita.</p>` +
    `<p><a href="/imoveis">Ver mais imóveis em Uberlândia</a></p></main>`
}

function render(im) {
  const titulo = `${im.tipo} no ${im.bairro}, Uberlândia — ${formatPreco(im.preco)}`
  const descUnica = descricaoUnica(im)
  const desc = trunc(descUnica)
  const url = `${SITE}/imovel/${im.codigo}`
  const image = abs(im.img)
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        '@id': `${url}#imovel`,
        name: `${im.tipo} no ${im.bairro}, Uberlândia`,
        description: descUnica,
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
    .replace('<div id="root"></div>', `<div id="root">${bodySeo(im, descUnica)}</div>`)

  return html
}

let n = 0
for (const im of imoveis) {
  const dir = resolve(DIST, 'imovel', String(im.codigo))
  mkdirSync(dir, { recursive: true })
  writeFileSync(resolve(dir, 'index.html'), render(im))
  n++
}
// espelho da Rotina — uma página estática única por imóvel (conteúdo próprio + JSON-LD)
let nf = 0
for (const im of feed) {
  const dir = resolve(DIST, 'imovel', String(im.codigo))
  mkdirSync(dir, { recursive: true })
  writeFileSync(resolve(dir, 'index.html'), render(im))
  nf++
}
console.log(`✓ prerender-og: ${n} curados + ${nf} espelho = ${n + nf} páginas de imóvel`)

// páginas de bairro (SEO) — meta/canonical/JSON-LD por bairro
const slugify = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
const editoriais = ['Jardim Karaíba', 'Morada da Colina', 'Cidade Jardim', 'Gávea', 'Granja Marileusa', 'Vigilato Pereira', 'Santa Maria', 'Jardim Sul', 'Jardim Finotti', 'Parque Una', 'Patrimônio', 'Lídice', 'Santa Mônica', 'Tabajaras', 'Nova Uberlândia', 'Tubalina']
const bairrosSeo = [...new Set([...editoriais, ...imoveis.map((im) => im.bairro), ...feed.map((im) => im.bairro)])]
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

// ===== posts do blog (blog-extra.json) — HTML estático com OG + JSON-LD (Article + FAQ) =====
const blogExtraPosts = JSON.parse(readFileSync(resolve(ROOT, 'src/blog-extra.json'), 'utf8'))
function renderPost(post) {
  const url = `${SITE}/blog/${post.slug}`
  const titulo = `${post.titulo} | Vinícius Graton`
  const desc = trunc(post.resumo || '', 160)
  const image = post.capa ? abs(post.capa) : `${SITE}/og/blog.png`
  const faq = (post.conteudo || []).find((b) => b.tipo === 'faq')
  const grafo = [{
    '@type': 'BlogPosting', '@id': `${url}#post`,
    headline: post.titulo, description: post.resumo, image: [image],
    datePublished: post.data, dateModified: post.atualizado || post.data,
    inLanguage: 'pt-BR', mainEntityOfPage: url,
    author: { '@type': 'Person', name: 'Vinícius Graton', url: SITE },
    publisher: { '@type': 'RealEstateAgent', name: 'Vinícius Graton Imóveis', areaServed: 'Uberlândia - MG' },
    ...(post.keyword ? { keywords: post.keyword } : {}),
  }]
  if (faq && (faq.perguntas || []).length) {
    grafo.push({ '@type': 'FAQPage', mainEntity: faq.perguntas.map((q) => ({ '@type': 'Question', name: q.q, acceptedAnswer: { '@type': 'Answer', text: q.a } })) })
  }
  const ld = { '@context': 'https://schema.org', '@graph': grafo }
  return baseHtml
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(titulo)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(post.titulo)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${esc(url)}$2`)
    .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${esc(image)}$2`)
    .replace(/(<meta property="og:type" content=")[^"]*(")/, `$1article$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(post.titulo)}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${esc(image)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${esc(url)}$2`)
    .replace('</head>', `<script type="application/ld+json">${JSON.stringify(ld)}</script>\n</head>`)
}
let np2 = 0
for (const post of blogExtraPosts) {
  if (!post || !post.slug) continue
  const dir = resolve(DIST, 'blog', post.slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(resolve(dir, 'index.html'), renderPost(post))
  np2++
}
console.log(`✓ prerender blog: ${np2} posts em dist/blog/{slug}/index.html`)

// páginas fixas com capa/OG própria (não a foto do Vinícius)
const PAGINAS_FIXAS = [
  {
    rota: 'encontrar-imovel',
    titulo: 'Encontre seu imóvel em 1 minuto — Uberlândia',
    desc: 'Responda algumas perguntas rápidas e receba uma seleção de imóveis em Uberlândia feita sob medida pra você, com a curadoria do Vinícius Graton.',
    image: `${SITE}/og/encontrar.png`, w: 1280, h: 720,
  },
]
function renderFixa(p) {
  const url = `${SITE}/${p.rota}`
  return baseHtml
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(p.titulo)} | Vinícius Graton</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(p.desc)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(p.titulo)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(p.desc)}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${esc(url)}$2`)
    .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${esc(p.image)}$2`)
    .replace(/(<meta property="og:image:type" content=")[^"]*(")/, `$1image/png$2`)
    .replace(/(<meta property="og:image:width" content=")[^"]*(")/, `$1${p.w}$2`)
    .replace(/(<meta property="og:image:height" content=")[^"]*(")/, `$1${p.h}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(p.titulo)}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(p.desc)}$2`)
    .replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${esc(p.image)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${esc(url)}$2`)
}
for (const p of PAGINAS_FIXAS) {
  const dir = resolve(DIST, p.rota)
  mkdirSync(dir, { recursive: true })
  writeFileSync(resolve(dir, 'index.html'), renderFixa(p))
}
console.log(`✓ prerender páginas fixas: ${PAGINAS_FIXAS.length} (com capa própria)`)

// sitemap.xml completo (home + catálogo + cada imóvel, com imagem p/ o Google Imagens)
const urls = [
  { loc: `${SITE}/`, freq: 'weekly', pri: '1.0' },
  { loc: `${SITE}/imoveis`, freq: 'daily', pri: '0.9' },
  { loc: `${SITE}/encontrar-imovel`, freq: 'monthly', pri: '0.8' },
  { loc: `${SITE}/como-funciona`, freq: 'monthly', pri: '0.6' },
  { loc: `${SITE}/ferramentas`, freq: 'monthly', pri: '0.6' },
  { loc: `${SITE}/condominios`, freq: 'weekly', pri: '0.7' },
  { loc: `${SITE}/anunciar`, freq: 'monthly', pri: '0.7' },
  { loc: `${SITE}/avaliacao`, freq: 'monthly', pri: '0.7' },
  { loc: `${SITE}/comparar`, freq: 'monthly', pri: '0.5' },
  { loc: `${SITE}/mapa`, freq: 'monthly', pri: '0.6' },
  { loc: `${SITE}/blog`, freq: 'weekly', pri: '0.7' },
  ...blogSlugs.map((s) => ({ loc: `${SITE}/blog/${s}`, freq: 'monthly', pri: '0.6' })),
  ...condominios.map((c) => ({ loc: `${SITE}/condominios/${c.slug}`, freq: 'weekly', pri: '0.6' })),
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
  ...feed.map((im) => ({
    loc: `${SITE}/imovel/${im.codigo}`,
    freq: 'weekly',
    pri: '0.6',
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

// ===== feed.xml (VRSync — ZAP/VivaReal/Grupo OLX/Canal Pro) das captações curadas =====
const tipoPortal = (t) => /apart|kit|studio|loft|flat|cobertura/i.test(t) ? 'Residential / Apartment'
  : /casa|sobrado/i.test(t) ? 'Residential / Home'
  : /terreno|lote/i.test(t) ? 'Residential / Land Lot'
  : /comerc|sala|loja|gal/i.test(t) ? 'Commercial / Office' : 'Residential / Home'
const feedItem = (im) => `  <Listing>
    <ListingID>${esc(im.codigo)}</ListingID>
    <Title>${esc(im.tipo + ' à venda no ' + im.bairro + ', Uberlândia')}</Title>
    <TransactionType>For Sale</TransactionType>
    <Details>
      <Description>${esc((im.descricao || resumo(im)).slice(0, 1500))}</Description>
      <ListPrice currency="BRL">${im.preco || 0}</ListPrice>
      <PropertyType>${tipoPortal(im.tipo)}</PropertyType>
      <Bedrooms>${im.quartos || 0}</Bedrooms>
      <Bathrooms>${im.banheiros || 0}</Bathrooms>
      <Suites>${im.suites || 0}</Suites>
      <Garage>${im.vagas || 0}</Garage>
      <LivingArea unit="square metres">${im.area || 0}</LivingArea>${im.condominio ? `\n      <PropertyAdministrationFee currency="BRL">${im.condominio}</PropertyAdministrationFee>` : ''}
    </Details>
    <Location displayAddress="Neighborhood">
      <Country abbreviation="BR">Brasil</Country>
      <State abbreviation="MG">Minas Gerais</State>
      <City>Uberlândia</City>
      <Neighborhood>${esc(im.bairro)}</Neighborhood>
    </Location>
    <Media>${(im.fotos && im.fotos.length ? im.fotos : [im.img]).filter(Boolean).slice(0, 20).map((u) => `\n      <Item medium="image" caption="">${esc(abs(u))}</Item>`).join('')}\n    </Media>
    <ContactInfo>
      <Name>Vinícius Graton</Name>
      <Email>contato@viniciusgraton.com.br</Email>
      <Telephone>5534991570494</Telephone>
    </ContactInfo>
  </Listing>`
const feedXml = `<?xml version="1.0" encoding="UTF-8"?>
<ListingDataFeed xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Header>
    <Provider>Vinícius Graton — Rotina Imobiliária</Provider>
    <Email>contato@viniciusgraton.com.br</Email>
    <ContactName>Vinícius Graton</ContactName>
    <PublishDate>${new Date(lastmod).toISOString()}</PublishDate>
  </Header>
  <Listings>
${imoveis.map(feedItem).join('\n')}
  </Listings>
</ListingDataFeed>
`
writeFileSync(resolve(DIST, 'feed.xml'), feedXml)
console.log(`✓ feed.xml (portais): ${imoveis.length} imóveis (captações curadas)`)
