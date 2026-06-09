/**
 * Captura de inscritos da newsletter (base para e-mail marketing / MailerLite).
 * Guarda no KV (news:<ts>-<rand>). Público, com campo-isca anti-spam.
 *
 *   POST /api/news { email, nome?, site? }  -> { ok:true }
 *
 * A leitura é só pelo painel (admin data) / backup. Nada de listagem pública.
 */
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
const temKV = (env) => env && env.ENGAGEMENT && typeof env.ENGAGEMENT.get === 'function'
const lim = (v, n) => String(v == null ? '' : v).slice(0, n)
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
const ML_GRUPO = '189784570197968877' // grupo "Site Imóveis — Newsletter" no MailerLite (id público, não é segredo)

// envia o inscrito pro MailerLite — SÓ se a chave estiver configurada como secret
// (env.MAILERLITE_API_KEY) na Cloudflare. Nunca falha o cadastro se der erro aqui.
async function enviarMailerLite(env, email, nome) {
  if (!env || !env.MAILERLITE_API_KEY) return
  try {
    await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json', authorization: 'Bearer ' + env.MAILERLITE_API_KEY },
      body: JSON.stringify({ email, ...(nome ? { fields: { name: nome } } : {}), groups: [ML_GRUPO] }),
    })
  } catch {}
}

export async function onRequestPost({ env, request }) {
  const b = await request.json().catch(() => ({}))
  if (b.site) return json({ ok: true }) // bot
  const email = lim(b.email, 140).trim().toLowerCase()
  if (!emailOk(email)) return json({ error: 'email', msg: 'E-mail inválido.' }, 400)
  if (!temKV(env)) return json({ ok: true, persistido: false })
  // evita duplicar o mesmo e-mail
  const idx = 'newsidx:' + email
  const existe = await env.ENGAGEMENT.get(idx)
  if (existe) return json({ ok: true, jaInscrito: true })
  const ts = Date.now()
  const reg = { ts, data: new Date(ts).toISOString(), email, nome: lim(b.nome, 80), origem: lim(b.origem, 30) || 'site' }
  await env.ENGAGEMENT.put('news:' + ts + '-' + Math.random().toString(36).slice(2, 8), JSON.stringify(reg))
  await env.ENGAGEMENT.put(idx, '1')
  await enviarMailerLite(env, email, reg.nome)
  return json({ ok: true })
}
