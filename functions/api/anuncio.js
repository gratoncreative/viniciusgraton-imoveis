/**
 * Cloudflare Pages Function — cadastro de imóvel pelo proprietário (moderação).
 * O proprietário envia os dados + fotos (alta resolução). Tudo fica salvo no KV
 * (binding ENGAGEMENT) para o Vinícius avaliar e, se aprovar, publicar.
 *
 *   POST /api/anuncio  { nome, fone, ...campos, fotos:[dataURL] }  -> { ok, id }
 *   GET  /api/anuncio?ver=graton2026   -> página HTML com todos os anúncios + fotos
 */
const SEGREDO = 'graton2026'
const temKV = (env) => env && env.ENGAGEMENT && typeof env.ENGAGEMENT.get === 'function'
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
const str = (v, n) => String(v || '').slice(0, n)

export async function onRequestPost({ env, request }) {
  const body = await request.json().catch(() => ({}))
  const nome = str(body.nome, 80)
  const fone = str(body.fone, 30)
  if (!nome || !fone) return json({ error: 'dados incompletos' }, 400)
  const fotos = Array.isArray(body.fotos)
    ? body.fotos.filter((f) => typeof f === 'string' && f.startsWith('data:image')).slice(0, 15)
    : []
  const ts = Date.now()
  const sub = {
    ts, data: new Date(ts).toISOString(), nome, fone,
    email: str(body.email, 120), finalidade: str(body.finalidade, 40), tipo: str(body.tipo, 40),
    bairro: str(body.bairro, 80), endereco: str(body.endereco, 180), preco: str(body.preco, 40),
    quartos: str(body.quartos, 10), suites: str(body.suites, 10), vagas: str(body.vagas, 10),
    area: str(body.area, 20), condominio: str(body.condominio, 40), iptu: str(body.iptu, 40),
    descricao: str(body.descricao, 2000), fotos,
  }
  const id = ts + '-' + Math.random().toString(36).slice(2, 8)
  if (temKV(env)) await env.ENGAGEMENT.put('anuncio:' + id, JSON.stringify(sub))
  return json({ ok: true, id, persistido: temKV(env), fotos: fotos.length })
}

export async function onRequestGet({ env, request }) {
  const url = new URL(request.url)
  if (url.searchParams.get('ver') !== SEGREDO) return new Response('nao autorizado', { status: 403 })
  if (!temKV(env)) return new Response('KV nao configurado', { status: 200 })
  const lista = await env.ENGAGEMENT.list({ prefix: 'anuncio:' })
  const subs = []
  for (const k of lista.keys) { const v = await env.ENGAGEMENT.get(k.name, 'json'); if (v) subs.push(v) }
  subs.sort((a, b) => (b.ts || 0) - (a.ts || 0))
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  const cards = subs.map((s) => `
    <div class="c">
      <h2>${esc(s.nome)} &middot; <a href="https://wa.me/55${esc((s.fone || '').replace(/\\D/g, ''))}" target="_blank">${esc(s.fone)}</a></h2>
      <p class="m">${esc(s.data)} &middot; ${esc(s.finalidade)} &middot; ${esc(s.tipo)} &middot; ${esc(s.bairro)} &middot; ${esc(s.email)}</p>
      <p><b>${esc(s.preco)}</b> &middot; ${esc(s.quartos)} quartos &middot; ${esc(s.suites)} suítes &middot; ${esc(s.vagas)} vagas &middot; ${esc(s.area)} m² &middot; cond. ${esc(s.condominio)} &middot; IPTU ${esc(s.iptu)}</p>
      <p>${esc(s.endereco)}</p>
      <p>${esc(s.descricao)}</p>
      <div class="g">${(s.fotos || []).map((f, i) => `<a href="${f}" download="imovel-${i + 1}.jpg" target="_blank"><img src="${f}" loading="lazy"></a>`).join('')}</div>
    </div>`).join('')
  const html = `<!doctype html><html lang=pt-br><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Anúncios para moderação</title><style>body{font-family:system-ui,Segoe UI,sans-serif;background:#0b0e16;color:#e7e9ee;margin:0;padding:24px}h1{color:#e0b556;font-size:1.4rem}.c{background:#11151d;border:1px solid #2a2f3a;border-radius:14px;padding:18px;margin:0 0 18px;max-width:980px}.c h2{margin:0 0 4px;color:#f4d98a;font-size:1.05rem}.m{color:#8b93a3;font-size:.82rem;margin:.2rem 0}.c p{margin:.25rem 0;font-size:.92rem;line-height:1.5}.g{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.g img{width:150px;height:150px;object-fit:cover;border-radius:8px;border:1px solid #2a2f3a}a{color:#e0b556}</style><h1>Anúncios de imóveis para moderação — ${subs.length}</h1><p style="color:#8b93a3;max-width:980px">Clique numa foto para abrir/baixar em alta resolução. Dados enviados pelos proprietários pelo site.</p>${cards || '<p>Nenhum anúncio recebido ainda.</p>'}</html>`
  return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } })
}
