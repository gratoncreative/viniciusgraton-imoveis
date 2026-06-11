/**
 * Cloudflare Pages Function — login do cliente por e-mail + senha.
 * Senha guardada com hash PBKDF2 (nunca em texto puro). O token da conta é
 * derivado do e-mail, então a mesma conta abre em qualquer aparelho.
 *
 *   POST /api/auth { acao:'login'|'cadastrar', email, senha, nome? }
 *     -> { ok:true, token, nome, email } | { error:'...' }
 */
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
const temKV = (env) => env && env.ENGAGEMENT && typeof env.ENGAGEMENT.get === 'function'
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const hexBuf = (h) => new Uint8Array((h.match(/.{2}/g) || []).map((x) => parseInt(x, 16)))
const sha256 = async (s) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))

async function derivar(senha, saltHex) {
  const salt = saltHex ? hexBuf(saltHex) : crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256)
  return { hash: hex(bits), salt: hex(salt) }
}

export async function onRequestPost({ request, env }) {
  try {
  const b = await request.json().catch(() => ({}))
  const acao = b.acao === 'cadastrar' ? 'cadastrar' : 'login'
  const email = String(b.email || '').trim().toLowerCase()
  const senha = String(b.senha || '')
  if (!email || !/.+@.+\..+/.test(email)) return json({ error: 'email-invalido' }, 400)
  if (senha.length < 6) return json({ error: 'senha-curta' }, 400)
  if (!temKV(env)) return json({ error: 'indisponivel' }, 503)

  // rate-limit por IP (anti força-bruta)
  const ip = request.headers.get('cf-connecting-ip') || 'sem-ip'
  const rlKey = 'rl:auth:' + ip
  const usos = parseInt(await env.ENGAGEMENT.get(rlKey), 10) || 0
  if (usos >= 20) return json({ error: 'muitas-tentativas' }, 429)
  await env.ENGAGEMENT.put(rlKey, String(usos + 1), { expirationTtl: 600 })

  const idEmail = await sha256(email)
  const key = 'auth:' + idEmail
  const token = 'e_' + idEmail
  const reg = await env.ENGAGEMENT.get(key, 'json').catch(() => null)

  if (acao === 'cadastrar') {
    if (reg) return json({ error: 'ja-existe' })
    const { hash, salt } = await derivar(senha)
    const nome = String(b.nome || '').slice(0, 80)
    const tokenAleatorio = 'e_' + hex(crypto.getRandomValues(new Uint8Array(20)))
    await env.ENGAGEMENT.put(key, JSON.stringify({ hash, salt, nome, email, token: tokenAleatorio, criadoEm: Date.now() }))
    return json({ ok: true, token: tokenAleatorio, nome, email })
  }

  if (!reg) return json({ error: 'nao-encontrado' })
  const { hash } = await derivar(senha, reg.salt)
  if (hash !== reg.hash) return json({ error: 'senha-errada' })
  // backward-compat: contas antigas não têm token aleatório armazenado
  return json({ ok: true, token: reg.token || token, nome: reg.nome || '', email })
  } catch (e) {
    console.error('auth:', e)
    return json({ error: 'interno' }, 500)
  }
}
