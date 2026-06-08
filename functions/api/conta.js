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

export async function onRequestPost({ env, request }) {
  const b = await request.json().catch(() => ({}))
  const token = str(b.token, 60)
  if (!token) return json({ error: 'token obrigatorio' }, 400)
  const conta = {
    token, atualizadoEm: Date.now(), data: new Date().toISOString(),
    nome: str(b.nome, 80), email: str(b.email, 120), fone: str(b.fone, 30),
    idade: str(b.idade, 8), sexo: str(b.sexo, 20), objetivo: str(b.objetivo, 40),
    bairros: str(b.bairros, 160), faixa: str(b.faixa, 40),
    favoritos: Array.isArray(b.favoritos) ? b.favoritos.slice(0, 100).map((x) => str(x, 16)) : [],
    historico: Array.isArray(b.historico) ? b.historico.slice(0, 30).map((x) => str(x, 16)) : [],
  }
  if (temKV(env)) await env.ENGAGEMENT.put('conta:' + token, JSON.stringify(conta))
  return json({ ok: true, persistido: temKV(env) })
}

export async function onRequestGet({ env, request }) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')
  if (!token) return json({ error: 'token obrigatorio' }, 400)
  if (!temKV(env)) return json(null)
  const v = await env.ENGAGEMENT.get('conta:' + token, 'json')
  return json(v || null)
}
