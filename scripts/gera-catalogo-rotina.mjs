// Gera public/catalogo.json — feed LEVE de todos os imóveis À VENDA da Rotina (Uberlândia).
// O catálogo do site carrega esse feed em runtime (não vai no bundle). Detalhe busca via /api/rotina-imovel.
import fs from 'node:fs'

const n = (v) => { const x = parseInt(String(v == null ? '' : v).replace(/[^\d-]/g, ''), 10); return isFinite(x) ? x : 0 }
const f = (v) => { const x = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(x) ? x : 0 }
const ehApto = (t) => /apart|kit|studio|stúdio|loft|flat|cobertura/i.test(t || '')

async function getCodes() {
  const r = await fetch('https://www.rotina.com.br/sitemap.xml')
  const xml = await r.text()
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  const venda = locs.filter((u) => u.includes('/imovel/') && u.includes('uberlandia') && !/para-alugar|aluguel/.test(u))
  return [...new Set(venda.map((u) => u.split('/').pop()))]
}

async function fetchImovel(cod) {
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
      finalidade: 'Venda',
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

const codes = await getCodes()
console.log('Códigos de venda (UDI):', codes.length)
let feitos = 0
const recs = (await poolMap(codes, async (cod) => {
  const r = await fetchImovel(cod)
  if (++feitos % 200 === 0) console.log(feitos + '/' + codes.length + '...')
  return r
}, 12)).filter(Boolean)

// trava de segurança: se a sincronização trouxe poucos imóveis (provável bloqueio/erro),
// NÃO sobrescreve o catálogo bom — mantém o último e sai sem erro.
const MINIMO = 500
if (recs.length < MINIMO) {
  console.warn(`⚠ Só ${recs.length} imóveis (< ${MINIMO}). Provável falha/bloqueio — mantendo o catálogo anterior, sem sobrescrever.`)
  process.exit(0)
}

const out = { geradoEm: new Date().toISOString(), fonte: 'Rotina Imobiliária', total: recs.length, imoveis: recs }
fs.writeFileSync('public/catalogo.json', JSON.stringify(out))
const kb = Math.round(fs.statSync('public/catalogo.json').size / 1024)
console.log('OK -> public/catalogo.json |', recs.length, 'imóveis |', kb, 'KB')
