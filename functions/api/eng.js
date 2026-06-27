import { kvStore } from '../_lib/store.js'
import { avisaWhats } from '../_lib/whatsapp.js'
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
const SEED_V = 4
const seedDe = (cod, boost) => {
  const h = hashCod(cod)
  if (boost) {
    const likes = 29 + (h % 15) // 29..43 (sempre acima do teto normal)
    const shares = 26 + ((h >>> 7) % 13) // 26..38
    return { likes, shares }
  }
  const likes = 5 + (h % 24) // 5..28
  const shares = 5 + ((h >>> 7) % 24) // 5..28
  return { likes, shares }
}
const temKV = (env) => env && env.ENGAGEMENT && typeof env.ENGAGEMENT.get === 'function'
const diaHoje = () => new Date().toISOString().slice(0, 10) // YYYY-MM-DD

// LEITURA NUNCA GRAVA NO KV. O seed é determinístico (mesma fórmula no cliente),
// então não precisa ser persistido — só recalculado. Persistimos apenas quando há
// ação real (like/share), no POST. Isso evita semear milhares de chaves ao abrir as
// listagens (o que estourava o limite diário de gravações do KV no plano grátis).
async function getEng(env, cod, preco, boost) {
  const seed = seedDe(cod, boost)
  if (!temKV(env)) return seed // sem KV: devolve o seed (read-only)
  const data = await env.ENGAGEMENT.get('eng:' + cod, 'json')
  if (!data) return seed // nunca teve ação real -> devolve o seed, SEM gravar
  if (typeof data.likes === 'number' && data.v === SEED_V) return data // formato atual
  // esquema antigo: soma os reais por cima do seed atual (sem gravar — só na próxima ação)
  const extraL = typeof data.likesReais === 'number' ? data.likesReais : 0
  const extraS = typeof data.sharesReais === 'number' ? data.sharesReais : 0
  if (extraL || extraS) return { likes: seed.likes + extraL, shares: seed.shares + extraS, v: SEED_V }
  if (typeof data.likes === 'number') return data // formato absoluto antigo
  return seed
}

export async function onRequestGet({ env, request }) {
  env = { ...env, ENGAGEMENT: kvStore(env) }
  try {
    const url = new URL(request.url)
    // leituras do blog (todas de uma vez): /api/eng?blogviews=1 -> { views: { slug: n } }
    if (url.searchParams.get('blogviews')) {
      if (!temKV(env)) return json({ views: {} })
      const lista = await env.ENGAGEMENT.list({ prefix: 'bview:' })
      const views = {}
      for (const k of (lista?.keys || [])) {
        const n = parseInt(await env.ENGAGEMENT.get(k.name), 10)
        if (n) views[k.name.slice(6)] = n
      }
      return json({ views })
    }
    // estatísticas de CONVERSÃO (cliques de contato: WhatsApp/telefone/e-mail) — agregadas por dia.
    // Dados não-pessoais (só contagens por página). Lido pelo painel /admin.
    if (url.searchParams.get('convstats')) {
      if (!temKV(env)) return json({ totalGeral: 0, ev: {}, dias: [], topPaths: [] })
      const lista = await env.ENGAGEMENT.list({ prefix: 'conv:' })
      const dias = []; const paths = {}; const evTot = {}; let totalGeral = 0
      for (const k of (lista?.keys || [])) {
        const d = await env.ENGAGEMENT.get(k.name, 'json')
        if (!d) continue
        dias.push({ dia: d.dia, total: d.total || 0, ev: d.ev || {} })
        totalGeral += d.total || 0
        for (const p in (d.paths || {})) paths[p] = (paths[p] || 0) + d.paths[p]
        for (const e in (d.ev || {})) evTot[e] = (evTot[e] || 0) + d.ev[e]
      }
      dias.sort((a, b) => (a.dia < b.dia ? 1 : -1))
      const topPaths = Object.entries(paths).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([path, n]) => ({ path, n }))
      return json({ totalGeral, ev: evTot, dias: dias.slice(0, 90), topPaths })
    }
    // crescimento diário DESATIVADO: os números agora ficam fixos na faixa 20-90
    // (ponderados por preço). Mantido só p/ não quebrar a rotina que chama a URL.
    if (url.searchParams.get('bumpall')) {
      return json({ ok: true, atualizados: 0, aviso: 'crescimento desativado p/ manter a faixa 20-90' })
    }
    const cod = url.searchParams.get('cod')
    if (!cod) return json({ error: 'cod obrigatorio' }, 400)
    return json(await getEng(env, cod, url.searchParams.get('p'), url.searchParams.get('b') === '1'))
  } catch (e) {
    console.error('eng:', e)
    return json({ error: 'interno' }, 500)
  }
}

export async function onRequestPost(context) {
  const { request } = context
  let env = { ...context.env, ENGAGEMENT: kvStore(context.env) }
  try {
    const body = await request.json().catch(() => ({}))
    const { cod, tipo } = body

    // leitura de post do blog: incrementa contador real
    if (tipo === 'view') {
      const slug = String(cod || '').slice(0, 80)
      if (!slug) return json({ error: 'cod obrigatorio' }, 400)
      if (!/^[a-z0-9-]{3,80}$/.test(slug)) return json({ error: 'slug-invalido' }, 400)
      if (!temKV(env)) return json({ views: 0 })
      const key = 'bview:' + slug
      const views = (parseInt(await env.ENGAGEMENT.get(key), 10) || 0) + 1
      await env.ENGAGEMENT.put(key, String(views))
      return json({ views })
    }

    // clique de CONVERSÃO (WhatsApp / telefone / e-mail) — agrega por dia, evento e página.
    // Fire-and-forget do cliente (sendBeacon). Sem PII; só contagem por página → saber o que converte.
    if (tipo === 'conv') {
      if (!temKV(env)) return json({ ok: true, persistido: false })
      const ev = /^(whatsapp|tel|email)$/.test(String(body.ev || '')) ? body.ev : 'whatsapp'
      let path = String(body.path || '/').slice(0, 120)
      if (!/^\/[\w\-/.%]*$/.test(path)) path = '/outros'
      const key = 'conv:' + diaHoje()
      const data = (await env.ENGAGEMENT.get(key, 'json')) || { dia: diaHoje(), total: 0, ev: {}, paths: {} }
      data.total += 1
      data.ev[ev] = (data.ev[ev] || 0) + 1
      // teto de páginas distintas/dia p/ não inchar o objeto (chaves novas só até 300)
      if (data.paths[path] != null || Object.keys(data.paths).length < 300) data.paths[path] = (data.paths[path] || 0) + 1
      await env.ENGAGEMENT.put(key, JSON.stringify(data), { expirationTtl: 60 * 60 * 24 * 220 })
      return json({ ok: true })
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
      // 🔥 Alerta de LEAD QUENTE em tempo real no WhatsApp do Vinícius (não bloqueia a resposta).
      // Cap diário p/ proteger o WhatsApp de flood; no-op se CALLMEBOT_KEY não estiver no Cloudflare.
      try {
        if (env.CALLMEBOT_KEY) {
          const capKey = 'hotlead:cnt:' + diaHoje()
          const usados = parseInt(await env.ENGAGEMENT.get(capKey), 10) || 0
          if (usados < 40) {
            await env.ENGAGEMENT.put(capKey, String(usados + 1), { expirationTtl: 86400 })
            const tag = [lead.objetivo, lead.bairro && ('bairro ' + lead.bairro), lead.cod && ('imóvel ' + lead.cod)].filter(Boolean).join(' · ')
            const aviso = `🔥 LEAD AGORA no site!\n${lead.nome}${lead.fone ? ' · ' + lead.fone : ''}${tag ? '\n' + tag : ''}${lead.origem ? '\norigem: ' + lead.origem : ''}\n👉 responde rápido`
            context.waitUntil(avisaWhats(env, aviso))
          }
        }
      } catch {}
      return json({ ok: true, persistido: true })
    }

    if (!cod || !['like', 'unlike', 'share'].includes(tipo)) return json({ error: 'requisicao invalida' }, 400)
    const data = await getEng(env, cod, body.p)
    if (tipo === 'like') data.likes += 1
    else if (tipo === 'unlike') data.likes = Math.max(0, data.likes - 1)
    else if (tipo === 'share') data.shares += 1
    if (temKV(env)) await env.ENGAGEMENT.put('eng:' + cod, JSON.stringify(data))
    return json(data)
  } catch (e) {
    console.error('eng:', e)
    return json({ error: 'interno' }, 500)
  }
}
