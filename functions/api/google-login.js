/**
 * Cloudflare Pages Function — login com Google (gratuito, sem segredo).
 * Recebe o ID token (JWT) emitido pelo botão do Google Identity Services no
 * navegador, valida no endpoint oficial do Google (assinatura + expiração) e
 * devolve o perfil verificado. O front usa o `sub` (id estável do Google) como
 * token da conta, então a mesma conta Google abre em qualquer aparelho.
 *
 *   POST /api/google-login { credential }  -> { ok:true, perfil:{ sub, nome, email, foto } }
 *
 * Requer a variável de ambiente GOOGLE_CLIENT_ID no Cloudflare (mesmo Client ID
 * usado no front). Não usa Client Secret.
 */
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
const str = (v, n) => String(v == null ? '' : v).slice(0, n)
const ORIGIN = 'https://viniciusgraton.com.br'
const originOk = (req) => { const o = req.headers.get('origin'); return !o || o === ORIGIN }

// ── helpers para gerar token admin (mesma lógica de admin.js) ─────────────────
const enc = new TextEncoder()
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
async function hmacHex(key, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return toHex(await crypto.subtle.sign('HMAC', k, enc.encode(msg)))
}
const TTL_MS = 12 * 60 * 60 * 1000
async function makeToken(signKey) {
  const exp = Date.now() + TTL_MS
  return `${exp}.${await hmacHex(signKey, String(exp))}`
}
async function getSignKey(env) {
  try {
    if (env && env.ENGAGEMENT && typeof env.ENGAGEMENT.get === 'function') {
      const auth = await env.ENGAGEMENT.get('admin:auth', 'json')
      if (auth && auth.tokenKey) return auth.tokenKey
    }
  } catch {}
  return String((env && env.ADMIN_PASS) || '')
}

export async function onRequestPost({ env, request }) {
  try {
  if (!originOk(request)) return json({ error: 'origem' }, 403)
  const b = await request.json().catch(() => ({}))
  const credential = String(b.credential || '')
  if (!credential) return json({ error: 'credential obrigatorio' }, 400)

  // Client ID é público — pode ficar no código. Usa a env do Cloudflare se existir.
  const clientId = (env && env.GOOGLE_CLIENT_ID) || '522410029650-rrsga1dakfh4j3b5bqqepp1ha0bnfc5d.apps.googleusercontent.com'
  if (!clientId) return json({ error: 'login google nao configurado' }, 503)

  // valida o ID token no endpoint oficial do Google (confere assinatura e validade)
  let info
  try {
    const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential))
    if (!r.ok) return json({ error: 'token invalido' }, 401)
    info = await r.json()
  } catch {
    return json({ error: 'falha ao validar com o Google' }, 502)
  }

  // checagens de segurança: o token tem que ser PRA NOSSA aplicação e emitido pelo Google
  const audOk = info.aud === clientId
  const issOk = info.iss === 'accounts.google.com' || info.iss === 'https://accounts.google.com'
  if (!audOk || !issOk) return json({ error: 'token nao confere' }, 401)

  const emailVerificado = info.email_verified === 'true' || info.email_verified === true
  const perfil = {
    sub: str(info.sub, 40),
    nome: str(info.name, 80),
    email: emailVerificado ? str(info.email, 120) : '',
    foto: str(info.picture, 300),
  }
  if (!perfil.sub) return json({ error: 'sem identificador' }, 401)

  // se o email do Google bate com ADMIN_GOOGLE_EMAIL, gera token de admin automaticamente
  const ownerEmail = String((env && env.ADMIN_GOOGLE_EMAIL) || '').trim().toLowerCase()
  let adminToken = null
  if (ownerEmail && emailVerificado && perfil.email.toLowerCase() === ownerEmail) {
    const signKey = await getSignKey(env)
    if (signKey) adminToken = await makeToken(signKey)
  }

  return json({ ok: true, perfil, ...(adminToken ? { adminToken, ehProprietario: true } : {}) })
  } catch (e) {
    console.error('google-login:', e)
    return json({ error: 'interno' }, 500)
  }
}
