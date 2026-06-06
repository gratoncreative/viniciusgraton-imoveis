/**
 * Cloudflare Pages Function — engajamento por imóvel (curtidas / compartilhamentos / leads).
 * Persistente e compartilhado entre todos os visitantes via Workers KV (binding ENGAGEMENT).
 *
 *   GET  /api/eng?cod=86237          -> { likes, shares }   (cria seed na 1ª vez)
 *   POST /api/eng  { cod, tipo }     tipo: 'like' | 'unlike' | 'share'  -> { likes, shares }
 *   POST /api/eng  { tipo:'lead', cod, nome, fone }  -> grava o lead    -> { ok:true }
 *   GET  /api/eng?leads=CHAVE        -> lista os leads (acesso do Vinícius)
 */
const SEGREDO_LEADS = 'graton2026' // chave simples p/ o Vinícius ver os leads

const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1))
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

async function getEng(env, cod) {
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
  // listagem de leads (uso do Vinícius): /api/eng?leads=graton2026
  const chave = url.searchParams.get('leads')
  if (chave) {
    if (chave !== SEGREDO_LEADS) return json({ error: 'nao autorizado' }, 403)
    const lista = await env.ENGAGEMENT.list({ prefix: 'lead:' })
    const leads = []
    for (const k of lista.keys) { const v = await env.ENGAGEMENT.get(k.name, 'json'); if (v) leads.push(v) }
    leads.sort((a, b) => (b.ts || 0) - (a.ts || 0))
    return json({ total: leads.length, leads })
  }
  const cod = url.searchParams.get('cod')
  if (!cod) return json({ error: 'cod obrigatorio' }, 400)
  return json(await getEng(env, cod))
}

export async function onRequestPost({ env, request }) {
  const body = await request.json().catch(() => ({}))
  const { cod, tipo } = body

  if (tipo === 'lead') {
    const nome = String(body.nome || '').slice(0, 80)
    const fone = String(body.fone || '').slice(0, 30)
    if (!nome || !fone) return json({ error: 'dados incompletos' }, 400)
    const ts = Date.now()
    const lead = { ts, nome, fone, cod: String(cod || '').slice(0, 12), bairro: String(body.bairro || '').slice(0, 60), data: new Date(ts).toISOString() }
    await env.ENGAGEMENT.put('lead:' + ts + '-' + Math.random().toString(36).slice(2, 8), JSON.stringify(lead))
    return json({ ok: true })
  }

  if (!cod || !['like', 'unlike', 'share'].includes(tipo)) return json({ error: 'requisicao invalida' }, 400)
  const data = await getEng(env, cod)
  if (tipo === 'like') data.likes += 1
  else if (tipo === 'unlike') data.likes = Math.max(0, data.likes - 1)
  else if (tipo === 'share') data.shares += 1
  await env.ENGAGEMENT.put('eng:' + cod, JSON.stringify(data))
  return json(data)
}
