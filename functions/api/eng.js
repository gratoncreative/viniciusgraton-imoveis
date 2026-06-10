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
// prova social: 20..90, MAIS para imóveis melhor posicionados (preço maior).
// MESMA fórmula do frontend (src/engajamento.js) p/ os números baterem sem flicker.
const SEED_V = 3
const seedDe = (cod) => {
  const h = hashCod(cod)
  const likes = 2 + (h % 44) // 2..45
  const shares = 2 + ((h >>> 7) % 44) // 2..45
  return { likes, shares }
}
const temKV = (env) => env && env.ENGAGEMENT && typeof env.ENGAGEMENT.get === 'function'
const diaHoje = () => new Date().toISOString().slice(0, 10) // YYYY-MM-DD

async function getEng(env, cod, preco) {
  if (!temKV(env)) return seedDe(cod, preco) // degrada gracioso: sem KV, devolve o seed (read-only)
  const key = 'eng:' + cod
  let data = await env.ENGAGEMENT.get(key, 'json')
  // (re)semeia se nunca existiu ou se está num esquema antigo (migra p/ a faixa 20-90)
  if (!data || typeof data.likes !== 'number' || data.v !== SEED_V) {
    const extraL = data && data.v !== SEED_V && typeof data.likesReais === 'number' ? data.likesReais : 0
    const extraS = data && data.v !== SEED_V && typeof data.sharesReais === 'number' ? data.sharesReais : 0
    const s = seedDe(cod, preco)
    data = { likes: s.likes + extraL, shares: s.shares + extraS, v: SEED_V, dia: diaHoje() }
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
  // crescimento diário DESATIVADO: os números agora ficam fixos na faixa 20-90
  // (ponderados por preço). Mantido só p/ não quebrar a rotina que chama a URL.
  if (url.searchParams.get('bumpall')) {
    return json({ ok: true, atualizados: 0, aviso: 'crescimento desativado p/ manter a faixa 20-90' })
  }
  const cod = url.searchParams.get('cod')
  if (!cod) return json({ error: 'cod obrigatorio' }, 400)
  return json(await getEng(env, cod, url.searchParams.get('p')))
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
    if (body.site) return json({ ok: true }) // honeypot (bot preencheu campo-isca)
    const nome = String(body.nome || '').slice(0, 80)
    const fone = String(body.fone || '').slice(0, 30)
    // basta o NOME pra capturar o lead — telefone é desejável mas não obrigatório
    // (senão o contato preenchido na Home/contato se perde quando o visitante não abre o WhatsApp)
    if (!nome) return json({ error: 'dados incompletos' }, 400)
    if (!temKV(env)) return json({ ok: true, persistido: false }) // sem KV: não grava, mas o WhatsApp do visitante já abre
    // rate-limit por IP: máx. 8 leads por hora (anti-spam)
    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'sem-ip'
    const rlKey = 'rl:lead:' + ip
    const usos = parseInt(await env.ENGAGEMENT.get(rlKey), 10) || 0
    if (usos >= 8) return json({ ok: true, limite: true })
    await env.ENGAGEMENT.put(rlKey, String(usos + 1), { expirationTtl: 3600 })
    const ts = Date.now()
    const lead = {
      ts, nome, fone,
      cod: String(cod || '').slice(0, 12),
      bairro: String(body.bairro || '').slice(0, 120),
      email: String(body.email || '').slice(0, 120),
      objetivo: String(body.objetivo || '').slice(0, 60),
      detalhes: String(body.detalhes || '').slice(0, 400),
      origem: String(body.origem || '').slice(0, 30),
      data: new Date(ts).toISOString(),
    }
    await env.ENGAGEMENT.put('lead:' + ts + '-' + Math.random().toString(36).slice(2, 8), JSON.stringify(lead))
    return json({ ok: true, persistido: true })
  }

  if (!cod || !['like', 'unlike', 'share'].includes(tipo)) return json({ error: 'requisicao invalida' }, 400)
  const data = await getEng(env, cod, body.p)
  if (tipo === 'like') data.likes += 1
  else if (tipo === 'unlike') data.likes = Math.max(0, data.likes - 1)
  else if (tipo === 'share') data.shares += 1
  if (temKV(env)) await env.ENGAGEMENT.put('eng:' + cod, JSON.stringify(data))
  return json(data)
}
