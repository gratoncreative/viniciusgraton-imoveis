// Valida o token de sessão do ADMIN — mesmo esquema do functions/api/admin.js
// (HMAC `exp.sig`, signKey = admin:auth.tokenKey no KV, com fallback ADMIN_PASS).
// Usado por outras funções que precisam liberar acesso total ao Vinícius.
const enc = new TextEncoder()
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const eqStr = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}
async function hmacHex(key, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return toHex(await crypto.subtle.sign('HMAC', k, enc.encode(msg)))
}

// env aqui deve ter ENGAGEMENT já como kvStore (pra ler admin:auth).
export async function isAdmin(env, token) {
  if (!token || typeof token !== 'string' || token.indexOf('.') < 0) return false
  let auth = null
  try { if (env && env.ENGAGEMENT && env.ENGAGEMENT.get) auth = await env.ENGAGEMENT.get('admin:auth', 'json') } catch {}
  const signKey = (auth && auth.tokenKey) || (env && env.ADMIN_PASS) || null
  if (!signKey) return false
  const [exp, sig] = token.split('.')
  if (!exp || !sig || Date.now() > Number(exp)) return false
  return eqStr(await hmacHex(signKey, exp), sig)
}
