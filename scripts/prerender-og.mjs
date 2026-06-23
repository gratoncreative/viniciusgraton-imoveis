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
// posts do blog — agora lê blog-base.json diretamente (sem precisar de bundler)
const blogBase = JSON.parse(readFileSync(resolve(ROOT, 'src/blog-base.json'), 'utf8'))
const blogExtra = JSON.parse(readFileSync(resolve(ROOT, 'src/blog-extra.json'), 'utf8'))
const blogTodos = [...blogBase, ...blogExtra].filter((p) => p && p.slug && p.capa)
const blogSlugs = [...new Set(blogTodos.map((p) => p.slug))]
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
    im.area > 0 && `${Math.round(im.area)} m²`,
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
// Imagem social TEM que ser do próprio imóvel. O CDN da Rotina usa o padrão
// .../Imoveis/{codigo}/... — se a foto aponta para outro código (dado
// inconsistente do feed) ou não existe, devolve null para cair no fallback.
// barra final na URL canônica (forma que o servidor entrega — evita o hop 308 /x -> /x/)
const slash = (u) => { const m = String(u).match(/^([^?#]*)([?#].*)?$/); return m[1].replace(/\/+$/, '') + '/' + (m[2] || '') }
const FALLBACK_IMG = `${SITE}/casa-conceito.jpg`
const imgDoImovel = (im) => {
  if (!im.img) return null
  const m = im.img.match(/\/Imoveis\/(\d+)\//i)
  if (m && String(m[1]) !== String(im.codigo)) return null
  return im.img
}
const slugify = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

// FAQ factual por imóvel — vira FAQPage (JSON-LD) + texto visível no HTML estático
function faqImovel(im) {
  const t = (im.tipo || 'imóvel').toLowerCase()
  const b = im.bairro || 'Uberlândia'
  const qa = []
  qa.push({ q: `Qual o valor deste ${t} no ${b}?`, a: `O ${t} no ${b}, em Uberlândia, está à venda por ${formatPreco(im.preco)}${im.condominio ? `, com condomínio de R$ ${Number(im.condominio).toLocaleString('pt-BR')}` : ''}. Fale com o Vinícius Graton para condições e financiamento.` })
  if (im.area > 0) qa.push({ q: 'Qual a área do imóvel?', a: `Este ${t} tem ${Math.round(im.area)} m².` })
  const comp = [im.quartos > 0 && `${im.quartos} ${plural(im.quartos, 'quarto', 'quartos')}`, im.suites > 0 && `${im.suites} ${plural(im.suites, 'suíte', 'suítes')}`, im.banheiros > 0 && `${im.banheiros} ${plural(im.banheiros, 'banheiro', 'banheiros')}`, im.vagas > 0 && `${im.vagas} ${plural(im.vagas, 'vaga', 'vagas')}`].filter(Boolean)
  if (comp.length) qa.push({ q: 'Quantos quartos e vagas tem?', a: `O imóvel oferece ${comp.join(', ')}.` })
  qa.push({ q: 'Onde fica este imóvel?', a: `Fica no bairro ${b}, em Uberlândia - MG. A localização exata é informada no atendimento.` })
  qa.push({ q: 'Como agendar uma visita?', a: 'É só falar com o Vinícius Graton, consultor da Rotina Imobiliária, pelo WhatsApp (34) 99157-0494.. ele acompanha do primeiro contato à entrega das chaves.' })
  return qa
}

// Descrição PRÓPRIA e única por imóvel (não copia a da Rotina) — varia por código + bairro + specs.
function descricaoUnica(im) {
  const t = im.tipo || 'Imóvel'
  const tl = t.toLowerCase()
  const b = im.bairro || 'Uberlândia'
  const seed = [...String(im.codigo)].reduce((a, c) => a + c.charCodeAt(0), 0)
  const pick = (arr, off = 0) => arr[(seed + off) % arr.length]
  const ehApto = /apart|kit|studio|stúdio|loft|flat|cobertura/i.test(t)
  const specs = [
    im.area > 0 && `${Math.round(im.area)} m²`,
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
    `Atendimento pessoal do Vinícius Graton, consultor da Rotina Imobiliária.. agende uma visita e tire suas dúvidas.`,
    `Fale com o Vinícius Graton (Rotina Imobiliária) para visitar, simular o financiamento e negociar com segurança.`,
    `Com a curadoria e o acompanhamento do Vinícius Graton, da Rotina Imobiliária, do primeiro contato à entrega das chaves.`,
  ]
  return `${pick(ab)} ${specs.length ? pick(me, 1) + ' ' : ''}${im.condominio ? `Condomínio de R$ ${Number(im.condominio).toLocaleString('pt-BR')}. ` : ''}${pick(fe, 2)}`
}

// bloco de conteúdo estático único dentro do #root (crawler lê; o React substitui ao montar)
function bodySeo(im, descUnica) {
  const specs = [
    im.area > 0 && `Área: ${Math.round(im.area)} m²`,
    im.quartos > 0 && `Quartos: ${im.quartos}`,
    im.suites > 0 && `Suítes: ${im.suites}`,
    im.banheiros > 0 && `Banheiros: ${im.banheiros}`,
    im.vagas > 0 && `Vagas: ${im.vagas}`,
    im.condominio > 0 && `Condomínio: R$ ${Number(im.condominio).toLocaleString('pt-BR')}`,
  ].filter(Boolean)
  const faqs = faqImovel(im)
  return `<main class="pre-seo"><h1>${esc(im.tipo)} à venda no ${esc(im.bairro)}, Uberlândia · Cód. ${esc(im.codigo)}</h1>` +
    `<p>${esc(descUnica)}</p>` +
    `<ul>${specs.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` +
    `<p>Imóvel à venda em ${esc(im.bairro)}, ${esc(im.cidade || 'Uberlândia')} - MG, com Vinícius Graton, consultor credenciado da Rotina Imobiliária. Veja fotos, localização e fale comigo para agendar uma visita.</p>` +
    `<section><h2>Perguntas frequentes sobre este imóvel</h2>${faqs.map((qa) => `<h3>${esc(qa.q)}</h3><p>${esc(qa.a)}</p>`).join('')}</section>` +
    `<p><a href="/imoveis/uberlandia/${esc(slugify(im.bairro))}">Ver outros imóveis em ${esc(im.bairro)}</a> · <a href="/imoveis">Ver todos os imóveis em Uberlândia</a></p></main>`
}

function render(im) {
  const areaTit = im.area > 0 ? ` · ${Math.round(im.area)} m²` : ''
  const precoTit = im.preco > 0 ? `R$ ${Math.round(im.preco).toLocaleString('pt-BR')}` : 'Sob consulta'
  const titulo = `${im.tipo} ${im.bairro} · ${precoTit}${areaTit} · Uberlândia`
  const descUnica = descricaoUnica(im)
  const desc = trunc(descUnica)
  const url = slash(`${SITE}/imovel/${im.codigo}`)
  const ownImg = imgDoImovel(im)
  const image = ownImg ? abs(ownImg) : FALLBACK_IMG
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        '@id': `${url}#imovel`,
        name: `${im.tipo} no ${im.bairro}, Uberlândia`,
        description: descUnica,
        image: ownImg ? (im.fotos && im.fotos.length ? im.fotos : [im.img]).map(abs) : [FALLBACK_IMG],
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
          { '@type': 'ListItem', position: 3, name: `Imóveis em ${im.bairro}`, item: `${SITE}/imoveis/uberlandia/${slugify(im.bairro)}` },
          { '@type': 'ListItem', position: 4, name: `${im.tipo} no ${im.bairro}`, item: url },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqImovel(im).map((qa) => ({ '@type': 'Question', name: qa.q, acceptedAnswer: { '@type': 'Answer', text: qa.a } })),
      },
    ],
  }

  let html = baseHtml
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(titulo)}</title>`)
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
const editoriais = ['Jardim Karaíba', 'Morada da Colina', 'Cidade Jardim', 'Gávea', 'Granja Marileusa', 'Vigilato Pereira', 'Santa Maria', 'Jardim Sul', 'Jardim Finotti', 'Parque Una', 'Patrimônio', 'Lídice', 'Santa Mônica', 'Tabajaras', 'Nova Uberlândia', 'Tubalina']
const bairrosSeo = [...new Set([...editoriais, ...imoveis.map((im) => im.bairro), ...feed.map((im) => im.bairro)])]
  .filter(Boolean)
  .map((nome) => ({ nome, slug: slugify(nome) }))

const _fmtC = (v) => v >= 1e6 ? `R$ ${(v / 1e6).toFixed(v % 1e6 === 0 ? 0 : 1).replace('.', ',')} mi` : v > 0 ? `R$ ${Math.round(v / 1000)} mil` : ''
const _fmtM2 = (v) => `R$ ${Math.round(v).toLocaleString('pt-BR')}/m²`

// Estatísticas reais do bairro (catálogo) → meta única, FAQ hiperlocal e FAQPage no HTML estático
function bairroStats(b) {
  const todos = [...imoveis, ...feed].filter((im) => im.bairro && slugify(im.bairro) === b.slug)
  const precos = todos.filter((im) => im.preco > 0 && im.preco < 5e7).map((im) => im.preco).sort((a, z) => a - z)
  const m2 = todos.filter((im) => im.preco > 0 && im.area > 0).map((im) => im.preco / im.area).filter((v) => v >= 1000 && v <= 30000).sort((a, z) => a - z)
  const m2med = m2.length ? m2[Math.floor(m2.length / 2)] : 0
  const pct = (a, p) => a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : 0
  const precoLo = pct(precos, 0.1), precoHi = pct(precos, 0.9) // faixa típica (sem outliers)
  const m2lo = pct(m2, 0.1), m2hi = pct(m2, 0.9)
  const nApto = todos.filter((im) => /apart|kit|st[uú]dio|loft|flat|cobertura/i.test(im.tipo || '')).length
  const nCasa = todos.filter((im) => /casa|sobrado/i.test(im.tipo || '')).length
  const nLote = todos.filter((im) => /lote|terreno/i.test(im.tipo || '')).length
  const faq = []
  if (m2.length >= 3) faq.push({ q: `Quanto custa o metro quadrado no ${b.nome}?`, a: `Considerando os imóveis à venda hoje no ${b.nome}, o preço fica em torno de ${_fmtM2(m2med)} (a maioria entre ${_fmtM2(m2lo)} e ${_fmtM2(m2hi)}). É uma referência de mercado a partir dos anúncios; para avaliar um imóvel específico, fale com o Vinícius Graton.` })
  if (precos.length) faq.push({ q: `Quanto custa um imóvel no ${b.nome}, Uberlândia?`, a: `Os imóveis à venda no ${b.nome} vão de ${_fmtC(precoLo)} a ${_fmtC(precoHi)}${todos.length >= 3 ? `, com ${todos.length} opções na curadoria agora` : ''}.` })
  const tp = []; if (nApto) tp.push(`${nApto} ${nApto === 1 ? 'apartamento' : 'apartamentos'}`); if (nCasa) tp.push(`${nCasa} ${nCasa === 1 ? 'casa' : 'casas'}`); if (nLote) tp.push(`${nLote} ${nLote === 1 ? 'lote/terreno' : 'lotes/terrenos'}`)
  if (tp.length) faq.push({ q: `Tem apartamento ou casa à venda no ${b.nome}?`, a: `No momento há ${tp.join(', ')} à venda no ${b.nome}. Veja todas no catálogo ou fale com o Vinícius Graton para opções que cabem no seu perfil.` })
  const desc = `${todos.length ? `${todos.length} imóveis à venda em ${b.nome}, Uberlândia` : `Imóveis à venda em ${b.nome}, Uberlândia`}${precos.length ? ` de ${_fmtC(precoLo)} a ${_fmtC(precoHi)}` : ''}.${m2.length >= 3 ? ` Preço médio ${_fmtM2(m2med)}.` : ''} Curadoria de Vinícius Graton.`.slice(0, 158)
  return { doBairro: todos.slice(0, 24), faq, desc }
}

function bairroBody(b, stats) {
  const { doBairro, faq } = stats
  const outros = bairrosSeo.filter((x) => x.slug !== b.slug).slice(0, 30)
  return `<main class="pre-seo"><h1>Imóveis à venda em ${esc(b.nome)}, Uberlândia</h1>` +
    `<p>Veja imóveis à venda em ${esc(b.nome)}, Uberlândia - MG, com o atendimento pessoal do Vinícius Graton, consultor da Rotina Imobiliária.. do primeiro contato à entrega das chaves.</p>` +
    (doBairro.length ? `<ul>${doBairro.map((im) => `<li><a href="/imovel/${esc(im.codigo)}">${esc(im.tipo)} no ${esc(im.bairro)} · ${esc(formatPreco(im.preco))} (cód. ${esc(im.codigo)})</a></li>`).join('')}</ul>` : '') +
    (faq.length ? `<section><h2>Perguntas sobre imóveis no ${esc(b.nome)}</h2>${faq.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}</section>` : '') +
    `<p>Ferramentas: <a href="/mercado">preço do m² por bairro em Uberlândia</a> · <a href="/ferramentas">calculadoras e estudo do m²</a> · <a href="/imoveis">todos os imóveis em Uberlândia</a></p>` +
    `<nav><h2>Imóveis em outros bairros de Uberlândia</h2>${outros.map((x) => `<a href="/imoveis/uberlandia/${x.slug}">${esc(x.nome)}</a>`).join(' · ')}</nav></main>`
}

function renderBairro(b) {
  const stats = bairroStats(b)
  const titulo = `Imóveis à venda em ${b.nome}, Uberlândia`
  const desc = stats.desc
  const url = slash(`${SITE}/imoveis/uberlandia/${b.slug}`)
  const graph = [
    { '@type': 'CollectionPage', name: titulo, description: desc, url, about: { '@type': 'Place', name: `${b.nome}, Uberlândia, MG` } },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Imóveis', item: `${SITE}/imoveis` },
      { '@type': 'ListItem', position: 3, name: b.nome, item: url },
    ] },
  ]
  if (stats.faq.length) graph.push({ '@type': 'FAQPage', mainEntity: stats.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) })
  const ld = { '@context': 'https://schema.org', '@graph': graph }
  return baseHtml
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(titulo)} — preços e guia | Vinícius Graton</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(titulo)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${esc(url)}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(titulo)}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${esc(url)}$2`)
    .replace('</head>', `<script type="application/ld+json">${JSON.stringify(ld)}</script>\n</head>`)
    .replace('<div id="root"></div>', `<div id="root">${bairroBody(b, stats)}</div>`)
}

let nb = 0
for (const b of bairrosSeo) {
  const dir = resolve(DIST, 'imoveis', 'uberlandia', b.slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(resolve(dir, 'index.html'), renderBairro(b))
  nb++
}
console.log(`✓ prerender bairros: ${nb} páginas em dist/imoveis/uberlandia/{bairro}/`)

// ── páginas long-tail: bairro × tipo (apartamentos / casas / terrenos) ──
// Só gera onde há estoque real (>= MIN_LT) pra não criar página fininha. Regras em sincronia com src/tiposSeo.js.
const TIPOS_LT = [
  { slug: 'apartamentos', plural: 'Apartamentos', singular: 'apartamento', re: /apart|kit|st[uú]dio|loft|flat|cobertura/i },
  { slug: 'casas', plural: 'Casas', singular: 'casa', re: /casa|sobrado/i },
  { slug: 'terrenos', plural: 'Terrenos e lotes', singular: 'terreno', re: /lote|terreno/i },
]
const MIN_LT = 3
const rotasTipo = []
const _art = (t) => (t.singular === 'casa' ? 'uma casa' : `um ${t.singular}`)
function statsTipo(b, t) {
  const todos = [...imoveis, ...feed].filter((im) => im.bairro && slugify(im.bairro) === b.slug && t.re.test(im.tipo || ''))
  const precos = todos.filter((im) => im.preco > 0 && im.preco < 5e7).map((im) => im.preco).sort((a, z) => a - z)
  const m2 = todos.filter((im) => im.preco > 0 && im.area > 0).map((im) => im.preco / im.area).filter((v) => v >= 1000 && v <= 30000).sort((a, z) => a - z)
  const pct = (a, p) => a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : 0
  return { todos, n: todos.length, precosN: precos.length, precoLo: pct(precos, 0.1), precoHi: pct(precos, 0.9), m2n: m2.length, m2med: m2.length ? m2[Math.floor(m2.length / 2)] : 0, m2lo: pct(m2, 0.1), m2hi: pct(m2, 0.9) }
}
function renderBairroTipo(b, t, s) {
  const titulo = `${t.plural} à venda em ${b.nome}, Uberlândia`
  const desc = `${s.n} ${s.n === 1 ? t.singular : t.plural.toLowerCase()} à venda em ${b.nome}, Uberlândia${s.precosN ? ` de ${_fmtC(s.precoLo)} a ${_fmtC(s.precoHi)}` : ''}.${s.m2n >= 3 ? ` m² em torno de ${_fmtM2(s.m2med)}.` : ''} Curadoria de Vinícius Graton.`.slice(0, 158)
  const url = slash(`${SITE}/imoveis/uberlandia/${b.slug}/${t.slug}`)
  const bairroUrl = slash(`${SITE}/imoveis/uberlandia/${b.slug}`)
  const faq = []
  if (s.precosN) faq.push({ q: `Quanto custa ${_art(t)} no ${b.nome}, Uberlândia?`, a: `${t.plural} à venda no ${b.nome} vão de ${_fmtC(s.precoLo)} a ${_fmtC(s.precoHi)}, com ${s.n} ${s.n === 1 ? 'opção' : 'opções'} na curadoria agora.` })
  if (s.m2n >= 3) faq.push({ q: `Quanto custa o metro quadrado de ${t.plural.toLowerCase()} no ${b.nome}?`, a: `O m² de ${t.plural.toLowerCase()} no ${b.nome} fica em torno de ${_fmtM2(s.m2med)} (a maioria entre ${_fmtM2(s.m2lo)} e ${_fmtM2(s.m2hi)}), a partir dos anúncios à venda hoje.` })
  faq.push({ q: `Tem ${t.plural.toLowerCase()} à venda no ${b.nome}?`, a: `Sim — no momento há ${s.n} ${s.n === 1 ? t.singular : t.plural.toLowerCase()} à venda no ${b.nome}. Veja a lista ou fale com o Vinícius Graton.` })
  const graph = [
    { '@type': 'CollectionPage', name: titulo, description: desc, url, about: { '@type': 'Place', name: `${b.nome}, Uberlândia, MG` } },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Imóveis', item: `${SITE}/imoveis` },
      { '@type': 'ListItem', position: 3, name: b.nome, item: bairroUrl },
      { '@type': 'ListItem', position: 4, name: t.plural, item: url },
    ] },
    { '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ]
  const ld = { '@context': 'https://schema.org', '@graph': graph }
  const body = `<main class="pre-seo"><h1>${esc(titulo)}</h1>` +
    `<p>${esc(t.plural)} à venda em ${esc(b.nome)}, Uberlândia - MG, com o atendimento pessoal do Vinícius Graton, consultor da Rotina Imobiliária.</p>` +
    `<ul>${s.todos.slice(0, 24).map((im) => `<li><a href="/imovel/${esc(im.codigo)}">${esc(im.tipo)} no ${esc(im.bairro)} · ${esc(formatPreco(im.preco))} (cód. ${esc(im.codigo)})</a></li>`).join('')}</ul>` +
    `<section><h2>Perguntas sobre ${esc(t.plural.toLowerCase())} no ${esc(b.nome)}</h2>${faq.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}</section>` +
    `<p><a href="/imoveis/uberlandia/${b.slug}">Todos os imóveis no ${esc(b.nome)}</a> · <a href="/mercado">preço do m² por bairro</a> · <a href="/imoveis">imóveis em Uberlândia</a></p></main>`
  return baseHtml
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(titulo)} — preços | Vinícius Graton</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(titulo)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${esc(url)}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(titulo)}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${esc(url)}$2`)
    .replace('</head>', `<script type="application/ld+json">${JSON.stringify(ld)}</script>\n</head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`)
}
let nbt = 0
for (const b of bairrosSeo) {
  for (const t of TIPOS_LT) {
    const s = statsTipo(b, t)
    if (s.n < MIN_LT) continue
    const dir = resolve(DIST, 'imoveis', 'uberlandia', b.slug, t.slug)
    mkdirSync(dir, { recursive: true })
    writeFileSync(resolve(dir, 'index.html'), renderBairroTipo(b, t, s))
    rotasTipo.push(`/imoveis/uberlandia/${b.slug}/${t.slug}`)
    nbt++
  }
}
console.log(`✓ prerender bairro×tipo: ${nbt} páginas long-tail em dist/imoveis/uberlandia/{bairro}/{tipo}/`)

// páginas de empreendimento (construtora) — ficha completa, meta + JSON-LD
function renderEmpre(c, p) {
  const titulo = `${p.nome} · ${c.nome}, ${p.bairro || 'Uberlândia'}`
  const desc = trunc(`${p.descricao || ''} Fale com o Vinícius Graton e agende uma visita ao ${p.nome}, da ${c.nome}, em Uberlândia.`)
  const url = slash(`${SITE}/construtoras/${c.slug}/${p.slug}`)
  const image = p.capa ? abs(p.capa) : `${SITE}/vinicius-graton.jpg`
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Residence',
    name: `${p.nome} · ${c.nome}`,
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
    .replace('<div id="root"></div>', `<div id="root">${empreBodySeo(c, p)}</div>`)
}

function empreBodySeo(c, p) {
  const specs = [
    p.area > 0 && `Área privativa a partir de ${p.area} m²`,
    p.quartos > 0 && `${p.quartos}+ quartos`,
    p.vagas > 0 && `${p.vagas}+ vagas`,
    p.unidades > 0 && `${p.unidades} unidades`,
    p.entrega && `Previsão de entrega: ${esc(p.entrega)}`,
  ].filter(Boolean)
  return `<main class="pre-seo"><h1>${esc(p.nome)} · ${esc(c.nome)}, Uberlândia</h1>` +
    `<p>${esc(p.descricao || `Conheça o ${p.nome}, empreendimento da ${c.nome} em ${p.bairro || 'Uberlândia'}.`)}</p>` +
    (specs.length ? `<ul>${specs.map((s) => `<li>${s}</li>`).join('')}</ul>` : '') +
    `<p>Atendimento com Vinícius Graton, consultor credenciado da Rotina Imobiliária.. agende uma visita e tire suas dúvidas.</p>` +
    `<p><a href="/construtoras/${esc(c.slug)}">Ver todos os empreendimentos da ${esc(c.nome)}</a> · <a href="/construtoras">Construtoras em Uberlândia</a></p></main>`
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

// ===== Landing dedicada do Louis (lançamento) — SEO forte p/ captação de leads =====
function renderLouis() {
  const url = slash(`${SITE}/lancamentos/louis-studios-umuarama`)
  const titulo = 'Louis Studios Umuarama — Investir ao lado da UFU e dos hospitais'
  const desc = trunc('Louis Living Experience: studios de 35 a 37 m² no Umuarama, Uberlândia — ao lado do Campus UFU, do Hospital do Câncer e do HCU. A partir de R$ 387.000, entrada de R$ 38.700, gestão Housi e locação por temporada. Renda estimada de R$ 4.000 a R$ 6.000/mês.')
  const image = `${SITE}/lancamentos/louis/og.jpg`
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['Product', 'Residence'],
        name: 'Louis Living Experience — Studios no Umuarama',
        description: 'Studios de 35 a 37 m² no bairro Umuarama, Uberlândia/MG, ao lado do Campus Umuarama da UFU, do Hospital do Câncer e do Hospital de Clínicas (HCU). Locação por temporada com gestão Housi.',
        image: [`${SITE}/lancamentos/louis/tower.jpg`, image],
        brand: { '@type': 'Brand', name: 'Select Construtora' },
        url,
        address: { '@type': 'PostalAddress', streetAddress: 'Rua Dr. Luiz Antônio Waack, 1.163', addressLocality: 'Uberlândia', addressRegion: 'MG', addressCountry: 'BR' },
        offers: { '@type': 'Offer', priceCurrency: 'BRL', price: '387000', availability: 'https://schema.org/InStock', url, seller: { '@type': 'RealEstateAgent', name: 'Vinícius Graton — Rotina Imobiliária' } },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Início', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: 'Lançamentos', item: `${SITE}/lancamentos` },
          { '@type': 'ListItem', position: 3, name: 'Louis Studios Umuarama', item: url },
        ],
      },
    ],
  }
  const body = `<main class="pre-seo">` +
    `<h1>Louis Living Experience — studios para investir no Umuarama, Uberlândia</h1>` +
    `<p>Lançamento da Select Construtora no bairro Umuarama, em Uberlândia/MG, na Rua Dr. Luiz Antônio Waack, 1.163. Studios de 35,53 a 37,09 m² privativos, pensados para investimento e locação por temporada com gestão profissional da Housi.</p>` +
    `<ul>` +
    `<li>Valor da unidade a partir de R$ 387.000</li>` +
    `<li>Sinal (entrada) de R$ 38.700 + 36 parcelas de R$ 998 + 3 balões anuais de R$ 15.840</li>` +
    `<li>Renda estimada de temporada entre R$ 4.000 e R$ 6.000 por mês (cenários de referência, não garantidos)</li>` +
    `<li>Gestão de locação Housi · locação por temporada (Airbnb) autorizada em convenção</li>` +
    `</ul>` +
    `<h2>Por que o Umuarama</h2>` +
    `<p>Ao lado do Campus Umuarama da UFU (cerca de 20 mil alunos), do Hospital do Câncer de Uberlândia (mais de 8.200 pacientes) e do Hospital de Clínicas (HCU), terceiro maior hospital universitário do Brasil. Demanda constante de estudantes, profissionais da saúde e acompanhantes de pacientes o ano inteiro.</p>` +
    `<p>Atendimento com Vinícius Graton, consultor da Rotina Imobiliária. Receba a tabela de preços e a disponibilidade por andar.</p>` +
    `<p><a href="/lancamentos">Ver outros lançamentos de Uberlândia</a></p></main>`
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
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`)
}
{
  const dir = resolve(DIST, 'lancamentos', 'louis-studios-umuarama')
  mkdirSync(dir, { recursive: true })
  writeFileSync(resolve(dir, 'index.html'), renderLouis())
  console.log('✓ prerender landing Louis: dist/lancamentos/louis-studios-umuarama/')
}

// ===== posts do blog — HTML estático com OG + JSON-LD + corpo COMPLETO do post =====

// Converte markdown bold **texto** → <strong>texto</strong>
const md = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

// Renderiza todos os blocos de conteúdo como HTML estático para o Google
function blogBodySeo(post) {
  const blocos = (post.conteudo || []).map((b) => {
    if (b.tipo === 'p') return `<p>${md(b.txt || '')}</p>`
    if (b.tipo === 'h' || b.tipo === 'h2') return `<h2>${esc(b.txt || '')}</h2>`
    if (b.tipo === 'h3') return `<h3>${esc(b.txt || '')}</h3>`
    if (b.tipo === 'lista') return `<ul>${(b.itens || []).map((i) => `<li>${md(String(i))}</li>`).join('')}</ul>`
    if (b.tipo === 'destaque') return `<blockquote><p>${md(b.txt || '')}</p></blockquote>`
    if (b.tipo === 'tabela' && b.cols && b.linhas) {
      const thead = `<thead><tr>${b.cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>`
      const tbody = `<tbody>${b.linhas.map((l) => `<tr>${l.map((c) => `<td>${md(String(c))}</td>`).join('')}</tr>`).join('')}</tbody>`
      return `<table>${thead}${tbody}</table>`
    }
    if (b.tipo === 'faq' && b.perguntas) {
      return `<section><h2>Perguntas frequentes</h2>${b.perguntas.map((qa) => `<h3>${esc(qa.q)}</h3><p>${md(qa.a)}</p>`).join('')}</section>`
    }
    if (b.tipo === 'cta') return `<p>${md(b.txt || '')}</p>`
    return ''
  }).join('\n')

  const categoria = post.categoria ? `<span>${esc(post.categoria)}</span> · ` : ''
  const leitura = post.leitura ? `<span>Leitura: ${esc(post.leitura)}</span>` : ''
  return `<article class="pre-seo"><h1>${esc(post.titulo)}</h1>` +
    `<p><em>${categoria}${leitura}</em></p>` +
    `<p>${esc(post.resumo || '')}</p>` +
    blocos +
    `<p>Por <strong>Vinícius Graton</strong>, consultor de imóveis em Uberlândia, Rotina Imobiliária.</p>` +
    `<nav><a href="/blog">← Voltar ao blog</a> · <a href="/imoveis">Ver imóveis em Uberlândia</a></nav></article>`
}

function renderPost(post) {
  const url = slash(`${SITE}/blog/${post.slug}`)
  const titulo = `${post.titulo} | Vinícius Graton`
  const desc = trunc(post.resumo || '', 160)
  const image = post.capa ? abs(post.capa) : `${SITE}/og/blog.png`
  const faq = (post.conteudo || []).find((b) => b.tipo === 'faq')
  const grafo = [{
    '@type': 'BlogPosting', '@id': `${url}#post`,
    headline: post.titulo, description: post.resumo, image: [image],
    datePublished: post.data, dateModified: post.atualizado || post.data,
    inLanguage: 'pt-BR', mainEntityOfPage: url,
    author: {
      '@type': 'Person', name: 'Vinícius Graton', url: `${SITE}/sobre`,
      jobTitle: 'Consultor de Imóveis', worksFor: { '@type': 'Organization', name: 'Rotina Imobiliária', identifier: 'CRECI PJ 132' },
      description: 'Consultor de imóveis em Uberlândia/MG, vinculado à Rotina Imobiliária. Atende compra, venda e investimento com curadoria e acompanhamento do início à entrega das chaves.',
      sameAs: ['https://www.instagram.com/viniciusgraton.imoveis/'],
    },
    publisher: { '@type': 'RealEstateAgent', name: 'Vinícius Graton Imóveis', areaServed: 'Uberlândia - MG', logo: { '@type': 'ImageObject', url: `${SITE}/icon-512.png` } },
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
    .replace('<div id="root"></div>', `<div id="root">${blogBodySeo(post)}</div>`)
}
let np2 = 0
for (const post of blogTodos) {
  if (!post || !post.slug) continue
  const dir = resolve(DIST, 'blog', post.slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(resolve(dir, 'index.html'), renderPost(post))
  np2++
}
console.log(`✓ prerender blog: ${np2} posts (base + extra) em dist/blog/{slug}/index.html`)

// páginas fixas com capa/OG própria (não a foto do Vinícius)
const FAQ_ESTUDIO = [
  { q: 'Como deixar uma foto de imóvel tirada em pé na horizontal?', a: "Suba a foto no estúdio, abra Ajustes e Formato e escolha 16:9 (deitado). As laterais ficam com fundo desfocado da própria foto, branco ou cortando as bordas. Dá pra aplicar em todas as fotos de uma vez." },
  { q: 'Preciso instalar algum programa ou pagar?', a: 'Não. É grátis e roda 100% no navegador, no computador ou no celular, sem criar conta.' },
  { q: 'As fotos são enviadas para algum servidor?', a: 'Não. Todo o processamento acontece no seu próprio aparelho — as imagens não saem dele.' },
  { q: 'Dá para editar várias fotos de uma vez?', a: "Sim. Suba o álbum inteiro, ajuste uma foto e use Aplicar a todas para repetir o mesmo tratamento em todas, e baixe tudo de uma vez." },
  { q: 'O que dá para fazer com as fotos do imóvel?', a: "Endireitar a inclinação, melhorar luz, cor e nitidez, converter vertical em horizontal, aplicar marca d'água e exportar em JPG, PNG ou WebP." },
  { q: 'Serve para foto de celular, para anúncio e WhatsApp?', a: 'Sim. É feito para fotos de imóvel — deixa o anúncio mais profissional e padronizado para portais, Instagram e WhatsApp.' },
]
const PAGINAS_FIXAS = [
  {
    rota: 'encontrar-imovel',
    titulo: 'Encontre seu imóvel em 1 minuto · Uberlândia',
    desc: 'Responda algumas perguntas rápidas e receba uma seleção de imóveis em Uberlândia feita sob medida pra você, com a curadoria do Vinícius Graton.',
    image: `${SITE}/og/encontrar.png`, w: 1280, h: 720,
  },
  {
    rota: 'imoveis',
    titulo: 'Imóveis à venda em Uberlândia · Catálogo completo',
    desc: `Mais de ${[...imoveis, ...feed].length} imóveis à venda em Uberlândia, com o atendimento pessoal do Vinícius Graton, consultor da Rotina Imobiliária.`,
    image: `${SITE}/vinicius-graton.jpg`, w: 1200, h: 900,
    body: `<main class="pre-seo"><h1>Imóveis à venda em Uberlândia</h1>` +
      `<p>Catálogo completo com mais de ${[...imoveis, ...feed].length} imóveis à venda em Uberlândia - MG, com o atendimento pessoal do Vinícius Graton, consultor credenciado da Rotina Imobiliária. Casas, apartamentos, terrenos, salas comerciais e lançamentos.</p>` +
      `<nav><h2>Principais bairros</h2>${bairrosSeo.slice(0, 20).map((b) => `<a href="/imoveis/uberlandia/${b.slug}">${esc(b.nome)}</a>`).join(' · ')}</nav>` +
      `</main>`,
  },
  {
    rota: 'blog',
    titulo: 'Blog Imobiliário · Guias e dicas de compra em Uberlândia',
    desc: 'Artigos práticos sobre financiamento, FGTS, ITBI, bairros e mercado imobiliário em Uberlândia. Escrito por Vinícius Graton, consultor da Rotina Imobiliária.',
    image: `${SITE}/vinicius-graton.jpg`, w: 1200, h: 900,
    body: `<main class="pre-seo"><h1>Blog Imobiliário · Guias de compra em Uberlândia</h1>` +
      `<p>Artigos práticos sobre financiamento, FGTS, ITBI, bairros e mercado imobiliário em Uberlândia. Escrito por Vinícius Graton, consultor da Rotina Imobiliária.</p>` +
      `<ul>${blogTodos.slice(0, 30).map((p) => `<li><a href="/blog/${esc(p.slug)}">${esc(p.titulo)}</a></li>`).join('')}</ul>` +
      `</main>`,
  },
  {
    rota: 'sobre',
    titulo: 'Sobre Vinícius Graton · Consultor de Imóveis em Uberlândia',
    desc: 'Conheça o Vinícius Graton, consultor credenciado da Rotina Imobiliária. Curadoria de imóveis em Uberlândia com acompanhamento do primeiro contato à entrega das chaves.',
    image: `${SITE}/vinicius-graton.jpg`, w: 1200, h: 900,
    body: `<main class="pre-seo"><h1>Vinícius Graton · Consultor de Imóveis em Uberlândia</h1>` +
      `<p>Consultor credenciado da Rotina Imobiliária em Uberlândia - MG. Ajudo você a comprar, vender e investir com segurança.. da busca à entrega das chaves.</p>` +
      `<p>Atendimento pessoal, curadoria criteriosa e acompanhamento em todas as etapas: busca, visitas, negociação, financiamento, documentação e registro.</p>` +
      `<p>WhatsApp: (34) 99157-0494 · <a href="/">viniciusgraton.com.br</a></p>` +
      `</main>`,
  },
  {
    rota: 'ferramentas',
    titulo: 'Calculadoras de Imóveis · Uberlândia',
    desc: 'Calculadoras gratuitas: financiamento, FGTS, ITBI, comparador de imóveis, ROI de investimento. Ferramentas para quem quer comprar ou investir em Uberlândia.',
    image: `${SITE}/vinicius-graton.jpg`, w: 1200, h: 900,
    body: `<main class="pre-seo"><h1>Calculadoras de Imóveis · Uberlândia</h1>` +
      `<p>Ferramentas gratuitas para quem está comprando ou investindo em imóveis em Uberlândia: simulador de financiamento, calculadora de ITBI e custos de cartório, calculadora de ROI, comparador de imóveis.</p>` +
      `<p>Desenvolvidas por Vinícius Graton, consultor da Rotina Imobiliária.</p>` +
      `</main>`,
  },
  {
    rota: 'regioes',
    titulo: 'Regiões de Uberlândia · Zona Norte, Sul, Leste e Oeste',
    desc: 'Guia completo das regiões de Uberlândia: Zona Sul (Karaíba, Finotti, Cidade Jardim), Zona Norte, Zona Leste e Zona Oeste. Compare perfil, infraestrutura e preço médio.',
    image: `${SITE}/vinicius-graton.jpg`, w: 1200, h: 900,
    body: `<main class="pre-seo"><h1>Regiões de Uberlândia · Guia completo</h1>` +
      `<p>Conheça as principais regiões de Uberlândia: Zona Sul (Jardim Karaíba, Finotti, Cidade Jardim, Gávea, Granja Marileusa), Zona Norte, Zona Leste e Zona Oeste. Compare infraestrutura, perfil e preço médio do m².</p>` +
      `<nav>${bairrosSeo.map((b) => `<a href="/imoveis/uberlandia/${b.slug}">${esc(b.nome)}</a>`).join(' · ')}</nav>` +
      `</main>`,
  },
  {
    rota: 'ferramentas/estudio-de-fotos',
    titulo: 'Estúdio de fotos de imóvel — melhorar, endireitar e deixar na horizontal',
    desc: "Ferramenta grátis para melhorar fotos de imóvel: endireitar, ajustar luz e cor, converter foto vertical em horizontal, marca d'água em lote e exportar em JPG, PNG ou WebP. Roda no navegador, sem enviar suas fotos.",
    image: `${SITE}/vinicius-graton.jpg`, w: 1200, h: 900,
    body: `<main class="pre-seo"><h1>Estúdio de fotos de imóvel</h1>` +
      `<p>Ferramenta gratuita para melhorar as fotos do seu imóvel direto no navegador: endireitar a inclinação, ajustar luz, cor e nitidez, converter foto vertical em horizontal (16:9, 4:3 ou 1:1), aplicar marca d'água em lote e exportar em JPG, PNG ou WebP. As imagens não saem do seu aparelho.</p>` +
      `<h2>Perguntas frequentes</h2>` +
      FAQ_ESTUDIO.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('') +
      `<p><a href="/ferramentas">Ver todas as ferramentas</a> · <a href="/ferramentas/converter">Conversor de fotos</a></p>` +
      `</main>`,
    ld: {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebApplication', '@id': `${SITE}/ferramentas/estudio-de-fotos#app`, name: 'Estúdio de fotos de imóvel', url: `${SITE}/ferramentas/estudio-de-fotos`, applicationCategory: 'MultimediaApplication', operatingSystem: 'Web', inLanguage: 'pt-BR', offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' }, featureList: ['Endireitar e corrigir inclinação', 'Melhorar luz, cor e nitidez', 'Converter foto vertical em horizontal', "Marca d'água em lote", 'Exportar em JPG, PNG ou WebP'], provider: { '@type': 'Person', name: 'Vinícius Graton', url: SITE } },
        { '@type': 'FAQPage', '@id': `${SITE}/ferramentas/estudio-de-fotos#faq`, mainEntity: FAQ_ESTUDIO.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
        { '@type': 'BreadcrumbList', itemListElement: [ { '@type': 'ListItem', position: 1, name: 'Início', item: `${SITE}/` }, { '@type': 'ListItem', position: 2, name: 'Ferramentas', item: `${SITE}/ferramentas` }, { '@type': 'ListItem', position: 3, name: 'Estúdio de fotos de imóvel', item: `${SITE}/ferramentas/estudio-de-fotos` } ] },
      ],
    },
  },
]
function renderFixa(p) {
  const url = slash(`${SITE}/${p.rota}`)
  let html = baseHtml
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
  if (p.ld) html = html.replace('</head>', `<script type="application/ld+json">${JSON.stringify(p.ld)}</script>\n</head>`)
  if (p.body) html = html.replace('<div id="root"></div>', `<div id="root">${p.body}</div>`)
  return html
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
    imgTitle: `${p.nome} · ${c.nome}, Uberlândia`,
  }))),
  { loc: `${SITE}/lancamentos`, freq: 'weekly', pri: '0.8' },
  { loc: `${SITE}/lancamentos/louis-studios-umuarama`, freq: 'weekly', pri: '0.9', img: `${SITE}/lancamentos/louis/og.jpg`, imgTitle: 'Louis Living Experience — studios no Umuarama, Uberlândia' },
  { loc: `${SITE}/contato`, freq: 'monthly', pri: '0.5' },
  ...bairrosSeo.map((b) => ({ loc: `${SITE}/imoveis/uberlandia/${b.slug}`, freq: 'weekly', pri: '0.7' })),
  ...rotasTipo.map((p) => ({ loc: `${SITE}${p}`, freq: 'weekly', pri: '0.6' })),
  { loc: `${SITE}/privacidade`, freq: 'yearly', pri: '0.2' },
]
// imóveis num sitemap separado (é a maior lista e a que mais muda)
const urlsImoveis = [
  ...imoveis.map((im) => ({ loc: `${SITE}/imovel/${im.codigo}`, freq: 'weekly', pri: '0.8', img: abs(im.img), imgTitle: `${im.tipo} no ${im.bairro}, Uberlândia` })),
  ...feed.map((im) => ({ loc: `${SITE}/imovel/${im.codigo}`, freq: 'weekly', pri: '0.6', img: abs(im.img), imgTitle: `${im.tipo} no ${im.bairro}, Uberlândia` })),
]
const urlset = (list) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
  list.map((u) => {
    const imgBlock = u.img
      ? `\n    <image:image>\n      <image:loc>${esc(u.img)}</image:loc>\n      <image:title>${esc(u.imgTitle)}</image:title>\n    </image:image>`
      : ''
    return `  <url>\n    <loc>${slash(u.loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${u.freq}</changefreq>\n    <priority>${u.pri}</priority>${imgBlock}\n  </url>`
  }).join('\n') +
  `\n</urlset>\n`
writeFileSync(resolve(DIST, 'sitemap-geral.xml'), urlset(urls))
writeFileSync(resolve(DIST, 'sitemap-imoveis.xml'), urlset(urlsImoveis))
// sitemap.xml = ÍNDICE apontando para os dois (é o que o robots.txt e o Google leem)
const sitemapIndex =
  `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  ['sitemap-geral.xml', 'sitemap-imoveis.xml'].map((s) => `  <sitemap>\n    <loc>${SITE}/${s}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </sitemap>`).join('\n') +
  `\n</sitemapindex>\n`
writeFileSync(resolve(DIST, 'sitemap.xml'), sitemapIndex)
console.log(`✓ sitemap índice: ${urls.length} gerais + ${urlsImoveis.length} imóveis`)

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
    <Provider>Vinícius Graton · Rotina Imobiliária</Provider>
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
