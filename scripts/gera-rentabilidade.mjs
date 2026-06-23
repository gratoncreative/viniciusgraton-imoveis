// Gera public/rentabilidade-bairros.json — rentabilidade (yield) do aluguel por bairro de
// Uberlândia. SÓ residencial (apto + casa) e SANEADO, cruzando venda (catalogo.json) com
// aluguel (alugueis.json). Lê os feeds já capturados — não refaz a busca na Rotina.
// Importado no fim de gera-catalogo-rotina.mjs (roda junto da sincronia diária).
import fs from 'node:fs'

const slugify = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
const isResid = (im) => /apart|kit|st[uú]dio|loft|flat|cobertura|casa|sobrado/i.test(im.tipo || '')
const isApto = (im) => /apart|kit|st[uú]dio|loft|flat|cobertura/i.test(im.tipo || '')
const isCasa = (im) => /casa|sobrado/i.test(im.tipo || '')
const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
const load = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')).imoveis || [] } catch { return [] } }

const venda = load('public/catalogo.json')
const alug = load('public/alugueis.json')

if (venda.length && alug.length) {
  const MIN = 8            // amostra mínima por bairro (venda E aluguel) — corta bairro raso
  const CDI_AA = 10.5      // referência (% a.a.) — editável
  const POUP_AA = 6.17

  const acc = {}
  const get = (b) => (acc[b] = acc[b] || { nome: b, vM2: [], aM2: [], vP: [], aP: [], vAp: [], aAp: [], vCa: [], aCa: [] })
  for (const im of venda) {
    if (!isResid(im) || !(im.preco > 0) || !(im.area > 0) || !im.bairro) continue
    const m2 = im.preco / im.area; if (m2 < 800 || m2 > 30000) continue
    const x = get(im.bairro.trim()); x.vM2.push(m2); x.vP.push(im.preco)
    if (isApto(im)) x.vAp.push(m2); else if (isCasa(im)) x.vCa.push(m2)
  }
  for (const im of alug) {
    if (!isResid(im) || !(im.preco > 0) || !(im.area > 0) || !im.bairro) continue
    const m2 = im.preco / im.area; if (m2 < 4 || m2 > 250) continue
    const x = get(im.bairro.trim()); x.aM2.push(m2); x.aP.push(im.preco)
    if (isApto(im)) x.aAp.push(m2); else if (isCasa(im)) x.aCa.push(m2)
  }
  // yield por sub-tipo (só quando há amostra suficiente dos dois lados)
  const yieldDe = (aArr, vArr, minN = 6) => {
    if (aArr.length < minN || vArr.length < minN) return null
    const y = (median(aArr) * 12 / median(vArr)) * 100
    return (y >= 2 && y <= 16) ? Math.round(y * 100) / 100 : null
  }

  const rows = []
  for (const b in acc) {
    const x = acc[b]
    if (x.vM2.length < MIN || x.aM2.length < MIN) continue
    const vM2 = median(x.vM2), aM2 = median(x.aM2)
    const yieldAa = (aM2 * 12 / vM2) * 100
    if (yieldAa < 2 || yieldAa > 14) continue // fora da realidade residencial → ruído, descarta
    rows.push({
      bairro: x.nome, slug: slugify(x.nome),
      yieldAa: Math.round(yieldAa * 100) / 100,
      aluguelM2: Math.round(aM2 * 100) / 100,
      vendaM2: Math.round(vM2),
      vendaMin: Math.round(Math.min(...x.vP)),
      aluguelMediano: Math.round(median(x.aP)),
      vendaMediana: Math.round(median(x.vP)),
      paybackAnos: Math.round((100 / yieldAa) * 10) / 10,
      aptoYield: yieldDe(x.aAp, x.vAp),
      casaYield: yieldDe(x.aCa, x.vCa),
      nAluguel: x.aM2.length, nVenda: x.vM2.length, nTotal: x.vP.length + x.aP.length,
      vsCDI: Math.round((yieldAa - CDI_AA) * 10) / 10,
    })
  }
  rows.sort((a, z) => z.yieldAa - a.yieldAa)

  // ── histórico de preços por bairro → valorização ao longo do tempo ──
  // Grava 1 retrato por MÊS (public/historico-precos.json) e calcula a valorização do m²
  // contra o retrato mais antigo com >= ~5 meses. Acumula em silêncio até ter base.
  const hoje = new Date().toISOString().slice(0, 10)
  const mes = hoje.slice(0, 7)
  let hist = { snapshots: [] }
  try { const h = JSON.parse(fs.readFileSync('public/historico-precos.json', 'utf8')); if (Array.isArray(h.snapshots)) hist = h } catch {}
  if (!hist.snapshots.some((s) => String(s.data || '').slice(0, 7) === mes)) {
    const snap = { data: hoje, bairros: {} }
    for (const r of rows) snap.bairros[r.bairro] = { vM2: r.vendaM2, aM2: r.aluguelM2 }
    hist.snapshots.push(snap)
    hist.snapshots = hist.snapshots.slice(-48) // ~4 anos de histórico mensal
    fs.writeFileSync('public/historico-precos.json', JSON.stringify(hist))
    console.log('OK -> public/historico-precos.json |', hist.snapshots.length, 'retratos (mensal)')
  }
  const dias = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000)
  const base = hist.snapshots.find((s) => dias(s.data, hoje) >= 150)
  if (base) {
    for (const r of rows) {
      const antes = base.bairros[r.bairro]
      if (antes && antes.vM2 > 0) {
        r.valorizacaoM2 = Math.round(((r.vendaM2 / antes.vM2) - 1) * 1000) / 10
        r.valorizacaoMeses = Math.max(1, Math.round(dias(base.data, hoje) / 30))
      }
    }
  }

  const out = { geradoEm: new Date().toISOString(), cdiAa: CDI_AA, poupancaAa: POUP_AA, totalBairros: rows.length, bairros: rows }
  fs.writeFileSync('public/rentabilidade-bairros.json', JSON.stringify(out))
  console.log('OK -> public/rentabilidade-bairros.json |', rows.length, 'bairros' + (rows.length ? ` | top ${rows[0].bairro} ${rows[0].yieldAa}% · fundo ${rows[rows.length - 1].bairro} ${rows[rows.length - 1].yieldAa}%` : ''))
} else {
  console.warn('rentabilidade: faltam feeds (venda %s, aluguel %s) — não gerou', venda.length, alug.length)
}
