/**
 * Cloudflare Pages Function — Painel ADMIN do Vinícius (seguro).
 *
 * Autenticação NO SERVIDOR: a senha NUNCA fica no código/GitHub. Ela é lida da
 * variável de ambiente ADMIN_PASS (configurada criptografada no painel da Cloudflare).
 * O e-mail (público) é ADMIN_EMAIL ou o padrão abaixo.
 *
 *   POST /api/admin { action:'login', email, senha }      -> { ok, token }   (token assinado HMAC, 12h)
 *   POST /api/admin { action:'data',  token }              -> { anuncios, leads, clientes }
 *   POST /api/admin { action:'del',   token, key }         -> { ok }          (exclui anuncio:/lead:/conta:)
 *   POST /api/admin { action:'aprovar', token, key, aprovado } -> { ok, aprovado }
 *
 * Sem ADMIN_PASS definido, o login falha fechado (ninguém entra).
 */
const ADMIN_EMAIL_DEFAULT = 'contato@viniciusgraton.com.br'
const TTL_MS = 12 * 60 * 60 * 1000

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
const temKV = (env) => env && env.ENGAGEMENT && typeof env.ENGAGEMENT.get === 'function'
const enc = new TextEncoder()

async function hmacHex(key, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(msg))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
async function makeToken(pass) {
  const exp = Date.now() + TTL_MS
  return `${exp}.${await hmacHex(pass, String(exp))}`
}
async function validToken(pass, token) {
  if (!pass || !token || typeof token !== 'string' || token.indexOf('.') < 0) return false
  const [exp, sig] = token.split('.')
  if (!exp || !sig || Date.now() > Number(exp)) return false
  const good = await hmacHex(pass, exp)
  if (good.length !== sig.length) return false
  let diff = 0
  for (let i = 0; i < good.length; i++) diff |= good.charCodeAt(i) ^ sig.charCodeAt(i)
  return diff === 0
}

export async function onRequestPost({ env, request }) {
  const pass = env.ADMIN_PASS
  const email = String(env.ADMIN_EMAIL || ADMIN_EMAIL_DEFAULT).trim().toLowerCase()
  const b = await request.json().catch(() => ({}))
  const action = b.action

  if (action === 'login') {
    if (!pass) return json({ error: 'config', msg: 'Defina a variável de ambiente ADMIN_PASS no painel da Cloudflare para ativar o login.' }, 503)
    const okEmail = String(b.email || '').trim().toLowerCase() === email
    const okPass = String(b.senha || '') === String(pass)
    if (!okEmail || !okPass) return json({ error: 'credenciais', msg: 'E-mail ou senha incorretos.' }, 401)
    return json({ ok: true, token: await makeToken(pass) })
  }

  // Demais ações exigem token válido
  if (!pass) return json({ error: 'config' }, 503)
  const token = b.token || (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!(await validToken(pass, token))) return json({ error: 'sessao', msg: 'Sessão expirada. Faça login de novo.' }, 401)
  if (!temKV(env)) return json({ error: 'kv', msg: 'Banco (KV) não configurado neste ambiente.' }, 200)

  if (action === 'data') {
    const out = { anuncios: [], leads: [], clientes: [] }
    const fontes = [['anuncio:', 'anuncios'], ['lead:', 'leads'], ['conta:', 'clientes']]
    for (const [prefix, arr] of fontes) {
      const lista = await env.ENGAGEMENT.list({ prefix })
      for (const k of lista.keys) {
        const v = await env.ENGAGEMENT.get(k.name, 'json')
        if (v) { v._key = k.name; out[arr].push(v) }
      }
    }
    out.anuncios.sort((a, b) => (b.ts || 0) - (a.ts || 0))
    out.leads.sort((a, b) => (b.ts || 0) - (a.ts || 0))
    out.clientes.sort((a, b) => (b.atualizadoEm || 0) - (a.atualizadoEm || 0))
    return json(out)
  }

  if (action === 'del') {
    const key = String(b.key || '')
    if (!/^(anuncio|lead|conta):/.test(key)) return json({ error: 'key invalida' }, 400)
    await env.ENGAGEMENT.delete(key)
    return json({ ok: true })
  }

  if (action === 'aprovar') {
    const key = String(b.key || '')
    if (!/^anuncio:/.test(key)) return json({ error: 'key invalida' }, 400)
    const v = await env.ENGAGEMENT.get(key, 'json')
    if (!v) return json({ error: 'nao encontrado' }, 404)
    v.aprovado = b.aprovado !== false
    await env.ENGAGEMENT.put(key, JSON.stringify(v))
    return json({ ok: true, aprovado: v.aprovado })
  }

  return json({ error: 'acao desconhecida' }, 400)
}
