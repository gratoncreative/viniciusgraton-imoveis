/**
 * sync-imoveis.mjs — coleta e publicação dos "Imóveis em destaque"
 * -----------------------------------------------------------------------------
 * O site é o viniciusgraton.com.br. NÓS consultamos o painel da Rotina (Imoview),
 * onde o Vinícius é corretor, para montar uma base própria de imóveis no site
 * pessoal dele. Não usa API nem credenciais: lê só o que já está aberto na tela
 * do corretor e as imagens que a própria Rotina já publica publicamente.
 *
 * FLUXO (a coleta é automática; a PUBLICAÇÃO fica pendente da confirmação dele):
 *
 *   1) PREPARAR (rotina diária — automático):
 *        node scripts/sync-imoveis.mjs preparar
 *      - lê scripts/_imoview-dump.txt (texto da página FiltrarDetalhado)
 *      - lê scripts/_imoview-fotos.json (mapa codigo->foto em alta, opcional)
 *      - baixa as capas para scripts/_staging/imoveis/
 *      - grava scripts/_candidatos.json   (NÃO altera o site)
 *
 *   2) (Vinícius escolhe os melhores)
 *
 *   3) PUBLICAR (depois da confirmação):
 *        node scripts/sync-imoveis.mjs publicar 86237,99496,64693,...
 *        node scripts/sync-imoveis.mjs publicar        (= todos os candidatos)
 *      - copia as fotos escolhidas de _staging para public/imoveis/
 *      - grava src/imoveis-destaque.json  -> o site mostra esses imóveis
 *      (depois: git add/commit/push -> Netlify publica)
 * -----------------------------------------------------------------------------
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import https from 'node:https'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DUMP = resolve(__dirname, '_imoview-dump.txt')
const FOTOS = resolve(__dirname, '_imoview-fotos.json')      // { codigo: "url capa em alta" }
const GALERIAS = resolve(__dirname, '_imoview-galerias.json') // { codigo: ["url1","url2",...] }
const CANDIDATOS = resolve(__dirname, '_candidatos.json')
const STAGING = resolve(__dirname, '_staging/imoveis')
const OUT_JSON = resolve(ROOT, 'src/imoveis-destaque.json')
const IMG_DIR = resolve(ROOT, 'public/imoveis')
const CDN = (codigo) => `https://cdn.imoview.com.br/rotina/Imoveis/${codigo}/avatar.jpg`

const MAX_CANDIDATOS = 40
const TIPOS_EXCLUIDOS = /terreno|lote|galp[aã]o|barrac[aã]o/i

// ---------- helpers ----------
const num = (s) => {
  if (!s) return 0
  const n = String(s).replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '')
  return parseFloat(n) || 0
}

function normalizarTipo(t) {
  const s = (t || '').toLowerCase()
  if (/casa.*condom[ií]nio|condom[ií]nio.*casa/.test(s)) return 'Casa em condomínio'
  if (/cobertura/.test(s)) return 'Cobertura'
  if (/ch[aá]cara/.test(s)) return 'Chácara'
  if (/apartamento/.test(s)) return 'Apartamento'
  if (/casa/.test(s)) return 'Casa'
  if (/loja/.test(s)) return 'Loja'
  if (/sala|comercial/.test(s)) return 'Comercial'
  return (t || '').replace(/\s+/g, ' ').trim().replace(/^\w/, (c) => c.toUpperCase())
}

function baixar(url, dest) {
  return new Promise((res) => {
    const buf = []
    https
      .get(url, (r) => {
        if (r.statusCode !== 200) { r.resume(); return res({ ok: false, status: r.statusCode }) }
        r.on('data', (d) => buf.push(d))
        r.on('end', () => { writeFileSync(dest, Buffer.concat(buf)); res({ ok: true, bytes: Buffer.concat(buf).length }) })
      })
      .on('error', (e) => res({ ok: false, erro: e.message }))
  })
}

function parse(texto) {
  const blocos = texto.split(/Cód\.\s*/).slice(1)
  const imoveis = []
  for (const b of blocos) {
    const codigo = (b.match(/^(\d+)/) || [])[1]
    if (!codigo) continue
    const header = b.split('\n')[0] || ''
    const partes = header.split('|').map((p) => p.trim())
    const finalidade = partes[1] || ''
    const tipoRaw = (partes[2] || '').trim()
    let bairro = (partes[3] || '').replace(/^\/\s*/, '').trim().split('/')[0].trim()
    bairro = bairro.split(/\s+-\s+/)[0].trim() // tira sufixos tipo "- Edifício ..."
    bairro = bairro.replace(/^Cond\.\s*/i, '').replace(/^Loteamento\s*/i, '').trim()
    imoveis.push({
      codigo,
      tipo: normalizarTipo(tipoRaw),
      tipoRaw,
      finalidade,
      bairro,
      cidade: 'Uberlândia',
      uf: 'MG',
      preco: num((b.match(/R\$\s*([\d.,]+)/) || [])[1]),
      quartos: parseInt((b.match(/Quartos\s*\n?\s*(\d+)/i) || [])[1] || '0', 10),
      suites: parseInt((b.match(/Su[ií]tes\s*\n?\s*(\d+)/i) || [])[1] || '0', 10),
      banheiros: parseInt((b.match(/Banheiros\s*\n?\s*(\d+)/i) || [])[1] || '0', 10),
      vagas: parseInt((b.match(/Vagas\s*\n?\s*(\d+)/i) || [])[1] || '0', 10),
      area: num((b.match(/Área interna:\s*([\d.,]+)\s*m/i) || [])[1]),
      img: `/imoveis/${codigo}.jpg`,
    })
  }
  return imoveis
}

// ---------- modo PREPARAR ----------
async function preparar() {
  if (!existsSync(DUMP)) {
    console.error(`✗ Dump não encontrado: ${DUMP}\n  Salve o texto da página FiltrarDetalhado nesse arquivo.`)
    process.exit(1)
  }
  let imoveis = parse(readFileSync(DUMP, 'utf8'))
    .filter((i) => i.tipo && !TIPOS_EXCLUIDOS.test(i.tipoRaw || i.tipo))
    .slice(0, MAX_CANDIDATOS)

  if (!imoveis.length) {
    console.error('✗ Nenhum candidato no dump. Abortado.')
    process.exit(1)
  }

  let fotosHd = {}
  if (existsSync(FOTOS)) { try { fotosHd = JSON.parse(readFileSync(FOTOS, 'utf8')) } catch {} }

  mkdirSync(STAGING, { recursive: true })
  console.log(`→ ${imoveis.length} candidatos. Baixando capas para staging...`)
  const ok = new Set()
  for (const im of imoveis) {
    const r = await baixar(fotosHd[im.codigo] || CDN(im.codigo), resolve(STAGING, `${im.codigo}.jpg`))
    console.log(`   ${r.ok ? '✓' : '✗'} ${im.codigo} ${im.tipo} · ${im.bairro} · R$ ${im.preco.toLocaleString('pt-BR')} ${r.ok ? '' : '(' + (r.status || r.erro) + ')'}`)
    if (r.ok) ok.add(im.codigo)
  }
  imoveis = imoveis.filter((i) => ok.has(i.codigo))

  writeFileSync(CANDIDATOS, JSON.stringify({ geradoEm: new Date().toISOString(), imoveis }, null, 2) + '\n')
  console.log(`\n✓ ${imoveis.length} candidatos prontos em scripts/_candidatos.json`)
  console.log('  Aguardando seleção. Para publicar: node scripts/sync-imoveis.mjs publicar <codigos>')
}

// ---------- modo PUBLICAR ----------
function publicar(codigosArg) {
  if (!existsSync(CANDIDATOS)) {
    console.error('✗ Sem candidatos. Rode "preparar" primeiro.')
    process.exit(1)
  }
  const { imoveis: candidatos } = JSON.parse(readFileSync(CANDIDATOS, 'utf8'))
  let selecao = candidatos
  if (codigosArg) {
    const codes = codigosArg.split(/[,\s]+/).filter(Boolean)
    selecao = codes.map((c) => candidatos.find((i) => i.codigo === c)).filter(Boolean)
  }
  if (!selecao.length) {
    console.error('✗ Nenhum imóvel selecionado.')
    process.exit(1)
  }

  let galerias = {}
  if (existsSync(GALERIAS)) { try { galerias = JSON.parse(readFileSync(GALERIAS, 'utf8')) } catch {} }

  mkdirSync(IMG_DIR, { recursive: true })
  for (const im of selecao) {
    const src = resolve(STAGING, `${im.codigo}.jpg`)
    if (existsSync(src)) copyFileSync(src, resolve(IMG_DIR, `${im.codigo}.jpg`))
  }

  // remove campos internos e monta a galeria (capa hospedada + demais fotos do CDN público)
  const limpos = selecao.map(({ tipoRaw, ...rest }) => {
    const extras = (galerias[rest.codigo] || []).filter((u) => u && !/avatar\.jpg/i.test(u))
    const fotos = [rest.img, ...extras]
    return { ...rest, fotos }
  })
  const out = {
    geradoEm: new Date().toISOString(),
    fonte: 'Imoview / Rotina Imobiliária — imóveis publicados na web',
    imoveis: limpos,
  }
  writeFileSync(OUT_JSON, JSON.stringify(out, null, 2) + '\n')
  console.log(`✓ ${limpos.length} imóveis publicados em src/imoveis-destaque.json`)
  console.log('  Agora: git add -A && git commit && git push  (Netlify republica)')
}

// ---------- entrada ----------
const modo = (process.argv[2] || 'preparar').toLowerCase()
if (modo === 'preparar') preparar()
else if (modo === 'publicar') publicar(process.argv[3])
else { console.error(`Modo desconhecido: ${modo}. Use "preparar" ou "publicar".`); process.exit(1) }
