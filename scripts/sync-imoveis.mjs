/**
 * sync-imoveis.mjs
 * -----------------------------------------------------------------------------
 * Atualiza a seção "Imóveis em destaque" do site a partir da lista de imóveis
 * publicados na web da Rotina Imobiliária (Imoview).
 *
 * COMO FUNCIONA (rotina diária):
 *   1. Uma sessão do Claude (já logada no Imoview no Chrome do Vinícius) abre:
 *        app.imoview.com.br/Imovel/FiltrarDetalhado?Finalidade=2&...&PublicarNaWeb=1&Pagina=1&Ordenacao=0
 *      e salva o TEXTO da página (get_page_text) em scripts/_imoview-dump.txt
 *   2. Roda este script:  node scripts/sync-imoveis.mjs
 *        - faz o parse dos imóveis
 *        - baixa a capa pública de cada um (cdn.imoview.com.br/.../avatar.jpg)
 *        - regrava src/imoveis-destaque.json
 *   3. git add -A && git commit && git push  -> Netlify publica sozinho.
 *
 * Não usa API nem credenciais: lê só o que já está aberto na tela do corretor
 * e as imagens que a própria Rotina já publica publicamente.
 * -----------------------------------------------------------------------------
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import https from 'node:https'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DUMP = process.argv[2] || resolve(__dirname, '_imoview-dump.txt')
const FOTOS = resolve(__dirname, '_imoview-fotos.json') // mapa opcional { "96587": "https://cdn.../foto.jpg" }
const OUT_JSON = resolve(ROOT, 'src/imoveis-destaque.json')
const IMG_DIR = resolve(ROOT, 'public/imoveis')
const CDN = (codigo) => `https://cdn.imoview.com.br/rotina/Imoveis/${codigo}/avatar.jpg`

// fotos em alta capturadas das páginas de detalhe (opcional); fallback = capa do CDN
let FOTO_HD = {}
if (existsSync(FOTOS)) {
  try { FOTO_HD = JSON.parse(readFileSync(FOTOS, 'utf8')) } catch { FOTO_HD = {} }
}

const MAX_IMOVEIS = 12
// tipos que NÃO entram no destaque (não rendem foto bonita)
const TIPOS_EXCLUIDOS = /terreno|lote|galp[aã]o|barrac[aã]o/i

// deixa o nome do tipo mais elegante para exibição
function normalizarTipo(t) {
  const s = (t || '').toLowerCase()
  if (/casa.*condom[ií]nio|condom[ií]nio.*casa/.test(s)) return 'Casa em condomínio'
  if (/cobertura/.test(s)) return 'Cobertura'
  if (/ch[aá]cara/.test(s)) return 'Chácara'
  if (/apartamento/.test(s)) return 'Apartamento'
  if (/casa/.test(s)) return 'Casa'
  if (/loja/.test(s)) return 'Loja'
  if (/sala|comercial/.test(s)) return 'Comercial'
  // título normal: primeira letra maiúscula
  return (t || '').replace(/\s+/g, ' ').trim().replace(/^\w/, (c) => c.toUpperCase())
}

// ---------- helpers ----------
const num = (s) => {
  if (!s) return 0
  const n = String(s).replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '')
  return parseFloat(n) || 0
}

function baixarImagem(codigo) {
  return new Promise((res) => {
    const dest = resolve(IMG_DIR, `${codigo}.jpg`)
    const url = FOTO_HD[codigo] || CDN(codigo) // alta resolução se disponível
    const file = []
    https
      .get(url, (r) => {
        if (r.statusCode !== 200) {
          r.resume()
          return res({ codigo, ok: false, status: r.statusCode })
        }
        r.on('data', (d) => file.push(d))
        r.on('end', () => {
          writeFileSync(dest, Buffer.concat(file))
          res({ codigo, ok: true, bytes: Buffer.concat(file).length })
        })
      })
      .on('error', (e) => res({ codigo, ok: false, erro: e.message }))
  })
}

// ---------- parse do texto do Imoview ----------
function parse(texto) {
  // cada imóvel começa em "Cód. 12345"
  const blocos = texto.split(/Cód\.\s*/).slice(1)
  const imoveis = []

  for (const b of blocos) {
    const codigo = (b.match(/^(\d+)/) || [])[1]
    if (!codigo) continue

    // linha de cabeçalho: "96587 - Aux. ... | Venda | Apartamento | / Brasil / ..."
    const header = (b.split('\n')[0] || '')
    const partes = header.split('|').map((p) => p.trim())
    const finalidade = partes[1] || ''
    const tipo = (partes[2] || '').trim()
    let bairroRaw = (partes[3] || '').replace(/^\/\s*/, '').trim()
    // pega o primeiro segmento relevante do bairro
    let bairro = bairroRaw.split('/')[0].trim()
    bairro = bairro.replace(/^Cond\.\s*/i, '').replace(/^Loteamento\s*/i, '').trim()

    const preco = num((b.match(/R\$\s*([\d.,]+)/) || [])[1])
    const quartos = parseInt((b.match(/Quartos\s*\n?\s*(\d+)/i) || [])[1] || '0', 10)
    const suites = parseInt((b.match(/Su[ií]tes\s*\n?\s*(\d+)/i) || [])[1] || '0', 10)
    const banheiros = parseInt((b.match(/Banheiros\s*\n?\s*(\d+)/i) || [])[1] || '0', 10)
    const vagas = parseInt((b.match(/Vagas\s*\n?\s*(\d+)/i) || [])[1] || '0', 10)
    const area = num((b.match(/Área interna:\s*([\d.,]+)\s*m/i) || [])[1])

    imoveis.push({ codigo, tipo: normalizarTipo(tipo), tipoRaw: tipo, finalidade, bairro, cidade: 'Uberlândia', uf: 'MG', preco, quartos, suites, banheiros, vagas, area, img: `./imoveis/${codigo}.jpg` })
  }
  return imoveis
}

// ---------- main ----------
async function main() {
  if (!existsSync(DUMP)) {
    console.error(`✗ Arquivo de dump não encontrado: ${DUMP}\n  Salve o texto da página FiltrarDetalhado nesse arquivo primeiro.`)
    process.exit(1)
  }
  const texto = readFileSync(DUMP, 'utf8')
  let imoveis = parse(texto)

  // filtra: tira terrenos/galpões e mantém só os que têm capa boa
  imoveis = imoveis.filter((i) => i.tipo && !TIPOS_EXCLUIDOS.test(i.tipoRaw || i.tipo))
  imoveis = imoveis.slice(0, MAX_IMOVEIS)

  if (!imoveis.length) {
    console.error('✗ Nenhum imóvel encontrado no dump. Abortei para não apagar dados bons.')
    process.exit(1)
  }

  if (!existsSync(IMG_DIR)) mkdirSync(IMG_DIR, { recursive: true })

  console.log(`→ ${imoveis.length} imóveis. Baixando capas...`)
  const baixados = await Promise.all(imoveis.map((i) => baixarImagem(i.codigo)))
  const ok = new Set(baixados.filter((r) => r.ok).map((r) => r.codigo))
  baixados.forEach((r) => console.log(`   ${r.ok ? '✓' : '✗'} ${r.codigo} ${r.ok ? r.bytes + 'b' : r.status || r.erro}`))

  // só mantém imóveis cuja capa baixou (evita card sem foto)
  imoveis = imoveis.filter((i) => ok.has(i.codigo))

  const out = {
    geradoEm: new Date().toISOString(),
    fonte: 'Imoview / Rotina Imobiliária — imóveis publicados na web',
    imoveis,
  }
  writeFileSync(OUT_JSON, JSON.stringify(out, null, 2) + '\n')
  console.log(`✓ ${imoveis.length} imóveis gravados em src/imoveis-destaque.json`)
}

main()
