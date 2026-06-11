/**
 * Cloudflare Pages Function — contas dos clientes (área do cliente).
 * Sincroniza perfil + favoritos + histórico no KV (binding ENGAGEMENT) e
 * permite o Vinícius acompanhar os cadastros (leads qualificados).
 *
 *   POST /api/conta { token, nome, email, fone, ... }  -> { ok }
 *   GET  /api/conta?token=XXXX        -> perfil (restaurar em outro aparelho)
 *
 * A lista de clientes (uso do Vinícius) é vista SOMENTE no painel seguro /admin
 * (functions/api/admin.js). Não há mais listagem por chave fixa.
 */
const temKV = (env) => env && env.ENGAGEMENT && typeof env.ENGAGEMENT.get === 'function'
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
const str = (v, n) => String(v == null ? '' : v).slice(0, n)
const ORIGIN = 'https://viniciusgraton.com.br'
const originOk = (req) => { const o = req.headers.get('origin'); return !o || o === ORIGIN }

export async function onRequestPost({ env, request }) {
  try {
    if (!originOk(request)) return json({ error: 'origem' }, 403)
    const b = await request.json().catch(() => ({}))
    const token = str(b.token, 60)
    if (!token) return json({ error: 'token obrigatorio' }, 400)
    if (b.site) return json({ ok: true }) // honeypot
    if (temKV(env)) {
      const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'sem-ip'
      const rlKey = 'rl:conta:' + ip
      const usos = parseInt(await env.ENGAGEMENT.get(rlKey), 10) || 0
      if (usos >= 30) return json({ ok: true, limite: true })
      await env.ENGAGEMENT.put(rlKey, String(usos + 1), { expirationTtl: 3600 })
    }
    const conta = {
      token, atualizadoEm: Date.now(), data: new Date().toISOString(),
      nome: str(b.nome, 80), email: str(b.email, 120), fone: str(b.fone, 30),
      idade: str(b.idade, 8), sexo: str(b.sexo, 20), objetivo: str(b.objetivo, 40),
      bairros: str(b.bairros, 160), faixa: str(b.faixa, 40),
      favoritos: Array.isArray(b.favoritos) ? b.favoritos.slice(0, 100).map((x) => str(x, 16)) : [],
      historico: Array.isArray(b.historico) ? b.historico.slice(0, 30).map((x) => str(x, 16)) : [],
    }
    if (temKV(env)) {
      const existente = await env.ENGAGEMENT.get('conta:' + token, 'json').catch(() => null)
      if (existente && existente.email && conta.email && existente.email !== conta.email) {
        return json({ error: 'token-invalido' }, 403)
      }
      await env.ENGAGEMENT.put('conta:' + token, JSON.stringify(conta))
    }
    return json({ ok: true, persistido: temKV(env) })
  } catch (e) {
    console.error('conta:', e)
    return json({ error: 'interno' }, 500)
  }
}

export async function onRequestGet({ env, request }) {
  try {
    const url = new URL(request.url)
    const token = str(url.searchParams.get('token'), 60)
    // só aceita o formato dos tokens emitidos (vg_ + ~13-40 chars) — descarta sondagem
    if (!/^vg_[a-z0-9]{8,40}$/i.test(token)) return json(null, 404)
    if (!temKV(env)) return json(null)
    const ip = request.headers.get('cf-connecting-ip') || 'sem-ip'
    const rlKey = 'rl:contaget:' + ip
    const usos = parseInt(await env.ENGAGEMENT.get(rlKey), 10) || 0
    if (usos >= 60) return json(null, 429)
    await env.ENGAGEMENT.put(rlKey, String(usos + 1), { expirationTtl: 3600 })
    const v = await env.ENGAGEMENT.get('conta:' + token, 'json')
    return json(v || null)
  } catch (e) {
    console.error('conta:', e)
    return json({ error: 'interno' }, 500)
  }
}
