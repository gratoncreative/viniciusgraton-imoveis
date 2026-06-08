/**
 * Cloudflare Pages Function — engajamento por imóvel (curtidas / compartilhamentos / leads).
 * Persistente e compartilhado entre todos os visitantes via Workers KV (binding ENGAGEMENT).
 *
 *   GET  /api/eng?cod=86237          -> { likes, shares }   (cria seed na 1ª vez)
 *   POST /api/eng  { cod, tipo }     tipo: 'like' | 'unlike' | 'share'  -> { likes, shares }
 *   POST /api/eng  { tipo:'lead', cod, nome, fone }  -> grava o lead    -> { ok:true }
 *
 * A LEITURA dos leads é feita SOMENTE pelo painel seguro /admin
 * (functions/api/admin.js). Não há mais listagem por chave fixa.
 */
const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1))
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

// seed determinístico (djb2) — MESMO hash do frontend (src/engajamento.js)
// p/ os números baterem quando o KV ainda não está ligado (sem flicker)
function hashCod(cod) {
  const s = String(cod)
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h
}
const seedDe = (cod) => ({ likes: 50 + (hashCod(cod) % 41), shares: 50 + ((hashCod(cod) >>> 5) % 31) })
const temKV = (env) => env && env.ENGAGEMENT && typeof env.ENGAGEMENT.get === 'function'

async function getEng(env, cod) {
  if (!temKV(env)) return seedDe(cod) // degrada gracioso: sem KV, devolve o seed (read-only)
  const key = 'eng:' + cod
  let data = await env.ENGAGEMENT.get(key, 'json')
  if (!data || typeof data.likes !== 'number') {
    data = { likes: rand(50, 90), shares: rand(50, 80) } // prova social inicial
    await env.ENGAGEMENT.put(key, JSON.stringify(data))
  }
  return data
}

export async function onRequestGet({ env, request }) {
  const url = new URL(request.url)
  // leituras do blog (todas de uma vez): /api/eng?blogviews=1 -> { views: { slug: n } }
  if (url.searchParams.get('blogviews')) {
    if (!temKV(env)) return json({ views: {} })
    const lista = await env.ENGAGEMENT.list({ prefix: 'bview:' })
    const views = {}
    for (const k of lista.keys) {
      const n = parseInt(await env.ENGAGEMENT.get(k.name), 10)
      if (n) views[k.name.slice(6)] = n
    }
    return json({ views })
  }
  const cod = url.searchParams.get('cod')
  if (!cod) return json({ error: 'cod obrigatorio' }, 400)
  return json(await getEng(env, cod))
}

export async function onRequestPost({ env, request }) {
  const body = await request.json().catch(() => ({}))
  const { cod, tipo } = body

  // leitura de post do blog: incrementa contador real
  if (tipo === 'view') {
    const slug = String(cod || '').slice(0, 80)
    if (!slug) return json({ error: 'cod obrigatorio' }, 400)
    if (!temKV(env)) return json({ views: 0 })
    const key = 'bview:' + slug
    const views = (parseInt(await env.ENGAGEMENT.get(key), 10) || 0) + 1
    await env.ENGAGEMENT.put(key, String(views))
    return json({ views })
  }

  if (tipo === 'lead') {
    const nome = String(body.nome || '').slice(0, 80)
    const fone = String(body.fone || '').slice(0, 30)
    if (!nome || !fone) return json({ error: 'dados incompletos' }, 400)
    if (!temKV(env)) return json({ ok: true, persistido: false }) // sem KV: não grava, mas o WhatsApp do visitante já abre
    const ts = Date.now()
    const lead = { ts, nome, fone, cod: String(cod || '').slice(0, 12), bairro: String(body.bairro || '').slice(0, 60), data: new Date(ts).toISOString() }
    await env.ENGAGEMENT.put('lead:' + ts + '-' + Math.random().toString(36).slice(2, 8), JSON.stringify(lead))
    return json({ ok: true, persistido: true })
  }

  if (!cod || !['like', 'unlike', 'share'].includes(tipo)) return json({ error: 'requisicao invalida' }, 400)
  const data = await getEng(env, cod)
  if (tipo === 'like') data.likes += 1
  else if (tipo === 'unlike') data.likes = Math.max(0, data.likes - 1)
  else if (tipo === 'share') data.shares += 1
  if (temKV(env)) await env.ENGAGEMENT.put('eng:' + cod, JSON.stringify(data))
  return json(data)
}
