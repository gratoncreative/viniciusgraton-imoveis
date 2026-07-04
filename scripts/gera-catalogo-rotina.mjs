// Gera public/catalogo.json — feed LEVE de todos os imóveis À VENDA da Rotina (Uberlândia).
// Também gera public/alugueis.json + public/aluguel-stats.json (LOCAÇÃO, feed SEPARADO) — usados
// pela rentabilidade por bairro; NÃO entram no catálogo "à venda".
// O catálogo do site carrega esse feed em runtime (não vai no bundle). Detalhe busca via /api/rotina-imovel.
import fs from 'node:fs'

// ATENÇÃO: valortratado/valorcondominio chegam como NÚMERO com decimais (ex.: 3100853.75).
// A versão antiga removia o ponto decimal como se fosse milhar (3100853.75 → 310085375, preço ×100!).
// Número entra direto (arredondado); string pt-BR ("R$ 9.000.000,00") é parseada de verdade.
const n = (v) => {
  if (v == null || v === '') return 0
  if (typeof v === 'number') return isFinite(v) ? Math.round(v) : 0
  let s = String(v).trim().replace(/[R$\s]/g, '')
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if (!/^\d+\.\d{1,2}$/.test(s)) s = s.replace(/\./g, '')
  const x = parseFloat(s)
  return isFinite(x) ? Math.round(x) : 0
}
const f = (v) => { const x = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(x) ? x : 0 }
const ehApto = (t) => /apart|kit|studio|stúdio|loft|flat|cobertura/i.test(t || '')
// extrai só o NOME da rua (sem número/complemento/bairro) — privacidade + autocomplete limpo
const ruaLimpa = (e) => {
  if (!e) return ''
  let s = String(e).split(/[,–-]| n[º°.]/i)[0].trim()   // antes de vírgula/traço/"nº"
  s = s.replace(/\s+\d{1,6}[a-z]?\s*$/i, '').trim()       // tira número no fim, se sobrou
  return s.length >= 4 ? s.slice(0, 80) : ''
}

async function getCodes() {
  const r = await fetch('https://www.rotina.com.br/sitemap.xml')
  const xml = await r.text()
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  const udi = locs.filter((u) => u.includes('/imovel/') && u.includes('uberlandia'))
  const cod = (u) => u.split('/').pop()
  const venda = [...new Set(udi.filter((u) => !/para-alugar|aluguel/.test(u)).map(cod))]
  const aluguel = [...new Set(udi.filter((u) => /para-alugar|aluguel/.test(u)).map(cod))]
  return { venda, aluguel }
}

async function fetchImovel(cod, finalidade = 'Venda') {
  try {
    const r = await fetch('https://www.rotina.com.br/retornar-imoveis-codigo', {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'Mozilla/5.0' },
      body: 'codigo=' + cod + '&pagina=1',
    })
    const j = await r.json()
    const im = j && j.lista && j.lista[0]
    if (!im) return null
    const preco = n(im.valortratado)
    if (!preco) return null // sem preço (sob consulta) — fora
    const rec = {
      codigo: String(im.codigo),
      tipo: im.tipo || '',
      finalidade,
      bairro: im.bairro || '',
      cidade: im.cidade || 'Uberlândia',
      uf: im.estado || 'MG',
      preco,
      quartos: n(im.numeroquartos),
      suites: n(im.numerosuites),
      banheiros: n(im.numerobanhos),
      vagas: n(im.numerovagas),
      area: Math.round(f(im.areaprincipal) || n(im.areaprincipaltratado) / 100) || 0,
      condominio: n(im.valorcondominio),
      descricao: (im.descricao || '').trim().slice(0, 220),
      img: im.urlfotoprincipal || '',
      rotina: true,
    }
    // rua (logradouro) p/ o filtro de busca por rua — SEM o número (privacidade)
    const rua = ruaLimpa(im.endereco)
    if (rua) rec.rua = rua
    if (ehApto(rec.tipo)) {
      if (String(im.numeroandar || '') !== '') rec.andar = n(im.numeroandar)
      rec.elevador = n(im.numeroelevador) > 0
    }
    return rec
  } catch { return null }
}

async function poolMap(items, worker, concurrency = 12) {
  const out = new Array(items.length)
  let i = 0
  async function run() { while (i < items.length) { const idx = i++; out[idx] = await worker(items[idx], idx) } }
  await Promise.all(Array.from({ length: concurrency }, run))
  return out
}

const { venda: codes, aluguel: codesAlug } = await getCodes()
console.log('Códigos de venda (UDI):', codes.length, '| aluguel:', codesAlug.length)
let feitos = 0
const recs = (await poolMap(codes, async (cod) => {
  const r = await fetchImovel(cod)
  if (++feitos % 200 === 0) console.log(feitos + '/' + codes.length + '...')
  return r
}, 12)).filter(Boolean)

// trava de segurança: se a sincronização trouxe poucos imóveis (provável bloqueio/erro),
// NÃO sobrescreve o catálogo bom — mantém o último e sai sem erro.
const escreverStatus = (o) => { try { fs.writeFileSync('public/sync-status.json', JSON.stringify(o)) } catch {} }
const MINIMO = 500
if (recs.length < MINIMO) {
  console.warn(`⚠ Só ${recs.length} imóveis (< ${MINIMO}). Provável falha/bloqueio — mantendo o catálogo anterior, sem sobrescrever.`)
  escreverStatus({ ok: false, motivo: 'poucos', recebidos: recs.length })
  process.exit(0)
}

const geradoEm = new Date().toISOString()

// diff com o catálogo anterior → NOVIDADES (recém-chegados + baixaram de preço)
let novos = []
let baixaram = []
try {
  const antigo = JSON.parse(fs.readFileSync('public/catalogo.json', 'utf8'))
  const mapaAnt = new Map((antigo.imoveis || []).map((i) => [String(i.codigo), i]))
  for (const r of recs) {
    const a = mapaAnt.get(String(r.codigo))
    if (!a) {
      // recém-chegado: carimba a data de primeira aparição e marca como novo
      r.visto = geradoEm
      r.novo = true
      novos.push(r)
    } else {
      // já existia: preserva a data de primeira aparição (se já tínhamos)
      if (a.visto) r.visto = a.visto
      // preço antigo suspeito (era o bug do ×100/×10) não vale como base de "baixou de preço"
      const antigoSujo = a.preco > 20000000 || (r.area > 20 && a.preco / r.area > 25000)
      if (a.preco && r.preco && r.preco < a.preco && !antigoSujo) {
        r.baixouEm = geradoEm
        r.precoAnterior = a.preco
        baixaram.push({ ...r })
      } else {
        if (a.baixouEm) r.baixouEm = a.baixouEm
        if (a.precoAnterior) r.precoAnterior = a.precoAnterior
      }
    }
  }
  console.log(`Novidades: ${novos.length} novos · ${baixaram.length} baixaram de preço`)
} catch { /* primeira geração: sem diff */ }
fs.writeFileSync('public/novidades.json', JSON.stringify({ geradoEm, novos: novos.slice(0, 48), baixaram: baixaram.slice(0, 48) }))

const out = { geradoEm, fonte: 'Rotina Imobiliária', total: recs.length, imoveis: recs }
fs.writeFileSync('public/catalogo.json', JSON.stringify(out))
fs.writeFileSync('public/catalogo-meta.json', JSON.stringify({ geradoEm, total: recs.length }))
const kb = Math.round(fs.statSync('public/catalogo.json').size / 1024)

// lista COMPLETA de bairros (todos os que têm imóvel) — alimenta o dropdown da busca no hero
try {
  const cont = {}
  for (const im of recs) { const b = (im.bairro || '').trim(); if (b) cont[b] = (cont[b] || 0) + 1 }
  const bairros = Object.entries(cont).sort((a, b) => a[0].localeCompare(b[0], 'pt-BR')).map(([nome, n]) => ({ nome, n }))
  fs.writeFileSync('public/bairros.json', JSON.stringify({ geradoEm, bairros }))
  console.log('OK -> public/bairros.json |', bairros.length, 'bairros')
} catch (e) { console.warn('bairros.json falhou:', e.message) }

// gera mercado-stats.json — medianas de preço e m² por bairro (alimenta /mercado)
try {
  const statsBairro = {}
  for (const im of recs) {
    const b = (im.bairro || '').trim()
    const p = im.preco || 0
    if (!b || p < 50000 || p > 30000000) continue
    if (!statsBairro[b]) statsBairro[b] = { precos: [], areas: [], m2s: [] }
    statsBairro[b].precos.push(p)
    if (im.area > 0) { statsBairro[b].areas.push(im.area); statsBairro[b].m2s.push(Math.round(p / im.area)) }
  }
  const med = (arr) => { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2) }
  const bairros = {}
  for (const [b, v] of Object.entries(statsBairro)) {
    if (v.precos.length < 3) continue
    bairros[b] = { count: v.precos.length, mediana_preco: med(v.precos), mediana_area: med(v.areas), mediana_m2: med(v.m2s), min_preco: Math.min(...v.precos), max_preco: Math.max(...v.precos) }
  }
  fs.writeFileSync('public/mercado-stats.json', JSON.stringify({ geradoEm, total: recs.length, bairros }))
  console.log('OK -> public/mercado-stats.json |', Object.keys(bairros).length, 'bairros')
} catch (e) { console.warn('mercado-stats falhou:', e.message) }

// ── ALUGUÉIS (locação) — feed SEPARADO + estatística de aluguel/m² por bairro.
// NÃO entra no catalogo.json (o site é "à venda"); serve à rentabilidade por bairro. ──
let totalAlug = 0
try {
  let feitosA = 0
  const recsAlug = (await poolMap(codesAlug, async (cod) => {
    const r = await fetchImovel(cod, 'Aluguel')
    if (++feitosA % 200 === 0) console.log('aluguel ' + feitosA + '/' + codesAlug.length + '...')
    return r
  }, 12)).filter(Boolean)
  totalAlug = recsAlug.length
  if (recsAlug.length >= 100) {
    fs.writeFileSync('public/alugueis.json', JSON.stringify({ geradoEm, fonte: 'Rotina Imobiliária', total: recsAlug.length, imoveis: recsAlug }))
    // mediana de aluguel e de aluguel/m² por bairro → alimenta a rentabilidade por bairro
    const med = (arr) => { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
    const stA = {}
    for (const im of recsAlug) {
      const b = (im.bairro || '').trim(); const p = im.preco || 0
      if (!b || p < 200 || p > 100000) continue
      if (!stA[b]) stA[b] = { precos: [], m2s: [] }
      stA[b].precos.push(p)
      if (im.area > 0) stA[b].m2s.push(p / im.area)
    }
    const bairrosA = {}
    for (const [b, v] of Object.entries(stA)) {
      if (v.precos.length < 3) continue
      bairrosA[b] = { count: v.precos.length, mediana_aluguel: Math.round(med(v.precos)), mediana_aluguel_m2: Math.round(med(v.m2s) * 100) / 100 }
    }
    fs.writeFileSync('public/aluguel-stats.json', JSON.stringify({ geradoEm, total: recsAlug.length, bairros: bairrosA }))
    console.log('OK -> public/alugueis.json |', recsAlug.length, 'aluguéis | aluguel-stats:', Object.keys(bairrosA).length, 'bairros')
  } else {
    console.warn(`⚠ Só ${recsAlug.length} aluguéis (< 100) — mantendo o anterior, sem sobrescrever.`)
  }
} catch (e) { console.warn('aluguéis falhou:', e.message) }

escreverStatus({ ok: true, total: recs.length, alugueis: totalAlug, novos: novos.length, baixaram: baixaram.length, geradoEm })
console.log('OK -> public/catalogo.json |', recs.length, 'imóveis |', kb, 'KB | + catalogo-meta.json')

// rentabilidade por bairro (residencial, saneado) — cruza os feeds de venda e aluguel recém-gerados
try { await import('./gera-rentabilidade.mjs') } catch (e) { console.warn('rentabilidade falhou:', e.message) }
