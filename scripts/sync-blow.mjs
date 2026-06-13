/**
 * sync-blow.mjs — sincroniza empreendimentos disponíveis em Uberlândia da Blow
 * Roda diariamente via GitHub Actions. Resultado salvo em src/blow_empreendimentos.json.
 * Novidades são publicadas automaticamente; publicações com mais de 1 ano são removidas.
 *
 * API pública da Blow (sem auth):
 *   GET /filtrar-empreendimentos?regiao=uberlandia&tipo_imovel=...&disponiveis=true&pagina=N
 *   GET /empreendimentos/:id
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dir, '..', 'src', 'blow_empreendimentos.json')

const API = 'https://zzp6k93jew.us-east-2.awsapprunner.com'
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; viniciusgraton-sync/1.0)',
  'Accept': 'application/json',
  'Origin': 'https://www.blow.com.br',
  'Referer': 'https://www.blow.com.br/',
}
const FILTROS = 'regiao=uberlandia&tipo_imovel=empreendimento&tipo_imovel=loteamento&tipo_imovel=imovel-avulso&disponiveis=true'
const DELAY_MS = 400   // pausa entre cada detalhe para não levar 403 por rate-limit
const UM_ANO_MS = 365 * 24 * 60 * 60 * 1000

// ——— helpers ———

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const stripHtml = (s) =>
  String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const mapStatus = (s) => {
  const sl = String(s || '').toLowerCase()
  if (/conclu/.test(sl)) return 'Pronto'
  if (/constru|obra/.test(sl)) return 'Em obras'
  if (/pre.?lan|lancamento/.test(sl)) return 'Lançamento'
  return 'Em obras'
}

const mapTipo = (e) => {
  if (e.tipo_produto === 'loteamento') return 'lote'
  if (e.finalidade === 'comercial') return 'comercial'
  return 'residencial'
}

const buildTipologias = (quartos, tipoP) => {
  if (tipoP === 'loteamento' || tipoP === 'imovel-avulso') return ['Lotes']
  if (!quartos || (!quartos.minimo && !quartos.maximo)) return []
  const min = quartos.minimo
  const max = quartos.maximo
  if (min === max) return [`${min} quarto${min > 1 ? 's' : ''}`]
  return [`${min} a ${max} quartos`]
}

const getAnexo = (anexos, categoria) =>
  (anexos || []).find((a) => a.categoria === categoria)?.link || null

const getAnexos = (anexos, categoria) =>
  (anexos || [])
    .filter((a) => a.categoria === categoria)
    .sort((a, b) => (a.ordenacao || 0) - (b.ordenacao || 0))
    .map((a) => a.link)
    .filter(Boolean)

// Fotos/plantas com legenda: [{ url, legenda }]
const getAnexosComLegenda = (anexos, categoria) =>
  (anexos || [])
    .filter((a) => a.categoria === categoria)
    .sort((a, b) => (a.ordenacao || 0) - (b.ordenacao || 0))
    .map((a) => ({ url: a.link, legenda: a.descricao || null }))
    .filter((a) => a.url)

const getLogo = (empresa) => {
  if (!empresa) return null
  const al = empresa.anexos
  if (Array.isArray(al) && al.length) return al[0].link || null
  if (al && typeof al === 'object' && al.link) return al.link
  return null
}

// Comodidades agrupadas por categoria: { "Esporte e Lazer": ["Academia", ...], ... }
const buildComodidadesGrupadas = (items) => {
  const grupos = {}
  for (const item of (items || [])) {
    const desc = item.comodidade?.descricao
    const cat = item.comodidade?.categoria || 'Estrutura'
    if (!desc) continue
    if (!grupos[cat]) grupos[cat] = []
    grupos[cat].push(desc)
  }
  return grupos
}

// Condições de pagamento: [{ descricao, percentual, quant }]
const buildParcelamentos = (items) => {
  if (!items || !items.length) return []
  return items
    .sort((a, b) => (a.parcela?.ordem || 0) - (b.parcela?.ordem || 0))
    .map((p) => ({
      descricao: p.parcela?.descricao || '',
      percentual: p.percentual || 0,
      quant: p.quant_parcelas || 1,
    }))
    .filter((p) => p.descricao)
}

// Unidades disponíveis com preço: [{ ap, tipologia, area, quartos, suites, banheiros, vagas, valor }]
const buildUnidades = (unidades) => {
  if (!unidades || !unidades.length) return []
  return unidades
    .filter((u) => u.status === 'Disponível' && u.valor > 0)
    .map((u) => ({
      ap: u.descricao || '',
      tipologia: u.tipologia || '',
      area: u.area || null,
      quartos: u.quant_quartos || null,
      suites: u.quant_suites || null,
      banheiros: u.quant_banheiros || null,
      vagas: u.quant_vagas || null,
      valor: u.valor || null,
    }))
    .sort((a, b) => (a.valor || 0) - (b.valor || 0))
    .slice(0, 12)
}

async function fetchJson(url) {
  const r = await fetch(url, { headers: HEADERS })
  if (!r.ok) throw new Error(`HTTP ${r.status} — ${url}`)
  return r.json()
}

// ——— mapa sequencial com delay (evita rate-limit da Blow) ———

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function seqMap(items, fn) {
  const out = []
  for (let i = 0; i < items.length; i++) {
    out.push(await fn(items[i], i))
    if (i < items.length - 1) await sleep(DELAY_MS)
  }
  return out
}

// ——— busca paginada ———

async function fetchLista() {
  const todos = []
  let pagina = 1
  while (true) {
    const url = `${API}/filtrar-empreendimentos?${FILTROS}&pagina=${pagina}`
    const d = await fetchJson(url)
    const items = d.dados || []
    if (!items.length) break
    todos.push(...items)
    console.log(`  página ${pagina}: ${items.length} itens (acumulado: ${todos.length})`)
    pagina++
  }
  return todos
}

// ——— busca detalhe individual ———

async function fetchDetalhe(item, idx) {
  try {
    const d = await fetchJson(`${API}/empreendimentos/${item.id}`)
    const e = d.dados || d
    return e
  } catch (err) {
    console.warn(`  [${idx + 1}] ERRO ${item.id}: ${err.message}`)
    return null
  }
}

// ——— transforma Blow → formato do site ———

function transformar(e) {
  const nomeConst = e.empresa?.nome_fantasia || e.nome_construtora || 'Construtora'
  const tipologias = buildTipologias(e.unidades_quartos, e.tipo_produto)

  return {
    blowId: e.id,
    nome: e.nome_empreendimento || '',
    slug: slugify(e.nome_empreendimento || e.id),
    construtoraNome: nomeConst,
    construtoraSlug: slugify(nomeConst),
    construtoraLogo: getLogo(e.empresa),
    construtoraPortal: e.empresa?.local_tabela_vendas || null,
    bairro: e.bairro || '',
    cidade: e.cidade || 'Uberlândia',
    status: mapStatus(e.status),
    tipo: mapTipo(e),
    capa: getAnexo(e.anexos, 'foto_principal'),
    fotos: getAnexos(e.anexos, 'fotos'),
    fotosComLegenda: getAnexosComLegenda(e.anexos, 'fotos'),
    plantas: getAnexos(e.anexos, 'plantas'),
    plantasComLegenda: getAnexosComLegenda(e.anexos, 'plantas'),
    pdfApresentacao: getAnexo(e.anexos, 'apresentacao'),
    pdfTabela: getAnexo(e.anexos, 'tabela_vendas_visualizacao'),
    tipologias,
    areaMin: e.unidades_area?.minimo || null,
    areaMax: e.unidades_area?.maximo || null,
    quartosMin: e.unidades_quartos?.minimo || null,
    quartosMax: e.unidades_quartos?.maximo || null,
    suitesMin: e.unidades_suites?.minimo || null,
    suitesMax: e.unidades_suites?.maximo || null,
    banheirosMin: e.unidades_banheiros?.minimo || null,
    banheirosMax: e.unidades_banheiros?.maximo || null,
    vagasMin: e.unidades_vagas?.minimo || null,
    vagasMax: e.unidades_vagas?.maximo || null,
    descricao: stripHtml(e.descricao),
    comodidades: (e.comodidade_empreendimentos || [])
      .map((c) => c.comodidade?.descricao).filter(Boolean),
    comodidadesGrupadas: buildComodidadesGrupadas(e.comodidade_empreendimentos),
    parcelamentos: buildParcelamentos(e.parcelamentos),
    unidadesDetalhes: buildUnidades(e.unidades),
    valorCondominio: e.valor_condominio > 1 ? e.valor_condominio : null,
    quantAndares: e.quant_andares || null,
    quantElevadores: e.quant_elevadores || null,
    fracaoVendida: typeof e.fracao_vendida === 'number' ? e.fracao_vendida : null,
    dataEntrega: e.final_construcao || null,
    aquecimento: e.aquecimento_chuveiro || null,
    arCondicionado: e.instalacao_para_ar || null,
    unidadesDisponiveis: e.unidades_disponiveis || 0,
    totalUnidades: e.quant_unidades || 0,
    lat: e.latitude || null,
    lng: e.longitude || null,
    videos: (e.videos || []).map((v) => v.url_youtube).filter(Boolean),
    youtube: e.videos?.[0]?.url_youtube || null,
    endereco: [e.endereco, e.numero].filter(Boolean).join(', '),
    primeiraPublicacao: e.primeira_publicacao_em || null,
    origem: 'blow',
  }
}

// ——— main ———

async function main() {
  const agora = Date.now()
  const limite = agora - UM_ANO_MS

  console.log('=== Blow Sync — Uberlândia ===')
  console.log('1. Buscando lista...')
  const lista = await fetchLista()
  console.log(`   Total: ${lista.length} empreendimentos`)

  console.log('2. Buscando detalhes (sequencial + delay)...')
  const detalhes = await seqMap(lista, fetchDetalhe)
  const validos = detalhes.filter(Boolean)
  console.log(`   ${validos.length} OK, ${lista.length - validos.length} erros`)

  console.log('3. Transformando e filtrando...')
  const transformados = validos.map(transformar)

  // Remove publicações com mais de 1 ano
  const filtrados = transformados.filter((e) => {
    if (!e.primeiraPublicacao) return true
    return new Date(e.primeiraPublicacao).getTime() > limite
  })
  const removidos = transformados.length - filtrados.length
  if (removidos) console.log(`   Removidos por idade (>1 ano): ${removidos}`)

  console.log(`   Final: ${filtrados.length} empreendimentos`)

  // Estatísticas extras
  const comPreco = filtrados.filter((e) => e.unidadesDetalhes.length > 0).length
  const comCondominio = filtrados.filter((e) => e.valorCondominio).length
  console.log(`   Com preços de unidades: ${comPreco}`)
  console.log(`   Com valor de condomínio: ${comCondominio}`)

  const out = {
    geradoEm: new Date().toISOString(),
    fonte: 'blow',
    empreendimentos: filtrados,
  }

  const json = JSON.stringify(out, null, 2)
  fs.writeFileSync(OUT, json, 'utf-8')
  console.log(`4. Salvo em ${OUT}`)

  // Resumo por status
  const porStatus = {}
  for (const e of filtrados) porStatus[e.status] = (porStatus[e.status] || 0) + 1
  for (const [k, v] of Object.entries(porStatus)) console.log(`   ${k}: ${v}`)
}

main().catch((err) => { console.error(err); process.exit(1) })
