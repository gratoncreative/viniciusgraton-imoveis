// Login na sessão web do Imoview (https://app.imoview.com.br), reutilizável.
// Extraído do owner-fetch (functions/api/admin.js) para a leitura de atendimentos.
// Preferir a API REST oficial (api.imoview.com.br + header `chave`) quando houver
// env.IMOVIEW_CHAVE — esta sessão web é o FALLBACK.
const WEB = 'https://app.imoview.com.br'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

export function mergeCookies(existing, setCookieHeader) {
  const jar = {}
  const parse = (s) => { if (!s) return; s.split(';')[0].trim().split(',').forEach((c) => { const [k, ...v] = c.trim().split('='); if (k) jar[k.trim()] = v.join('=') }) }
  ;(existing || '').split(';').forEach((c) => { const [k, ...v] = c.trim().split('='); if (k) jar[k.trim()] = v.join('=') })
  ;(setCookieHeader || '').split(/,(?=[^;]+=[^;]+;)/).forEach((c) => parse(c))
  return Object.entries(jar).filter(([k]) => k).map(([k, v]) => `${k}=${v}`).join('; ')
}

export function extractCsrf(html) {
  const inputM = (html || '').match(/<input[^>]*__RequestVerificationToken[^>]*>/i)
  if (inputM) { const v = inputM[0].match(/value=["']([^"']+)["']/); if (v) return v[1] }
  const m1 = (html || '').match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/)
  if (m1) return m1[1]
  const m2 = (html || '').match(/value="([^"]+)"[^>]*name="__RequestVerificationToken"/)
  if (m2) return m2[1]
  return ''
}

// Faz login e devolve { ok, cookies, baseUrl, dbg }. NÃO lança (sempre retorna objeto).
export async function imoviewLogin(env, { debug = false } = {}) {
  const email = (env.IMOVIEW_LOGIN || '').trim()
  const senha = (env.IMOVIEW_SENHA || '').trim()
  const dbg = {}
  if (!email || !senha) return { ok: false, cookies: '', baseUrl: WEB, dbg: { erro: 'sem-credenciais' } }
  try {
    const convR = await fetch(`${WEB}/Login/RetornarConvenios?email=${encodeURIComponent(email)}`, { headers: { 'user-agent': UA, accept: 'application/json' }, redirect: 'follow', signal: AbortSignal.timeout(8000) })
    const conv = await convR.json().catch(() => ({}))
    const it = (conv.lista || [])[0] || {}
    const codigoConvenio = it.codigo || '', rota = it.rota || ''
    const LOGIN = `${WEB}/Login/LogOn?ReturnUrl=%2f`
    const pg = await fetch(LOGIN, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(10000) })
    let cookies = mergeCookies('', pg.headers.get('set-cookie') || '')
    await pg.text()
    const loginR = await fetch(LOGIN, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8', cookie: cookies, 'user-agent': UA, referer: LOGIN, origin: WEB, 'x-requested-with': 'XMLHttpRequest' },
      body: JSON.stringify({ codigoConvenio, rota, login: email, senha, gRecaptcha: '', urlReturn: '' }),
      redirect: 'manual', signal: AbortSignal.timeout(10000),
    })
    cookies = mergeCookies(cookies, loginR.headers.get('set-cookie') || '')
    let lj = {}
    try { lj = JSON.parse(await loginR.text()) } catch {}
    if (lj.Autorizado === true && lj.Url) {
      const loc = lj.Url.startsWith('http') ? lj.Url : `${WEB}${lj.Url}`
      const rr = await fetch(loc, { headers: { cookie: cookies, 'user-agent': UA }, redirect: 'manual', signal: AbortSignal.timeout(8000) })
      cookies = mergeCookies(cookies, rr.headers.get('set-cookie') || '')
    }
    if (debug) { dbg.codigoConvenio = codigoConvenio; dbg.rota = rota; dbg.loginStatus = loginR.status; dbg.autorizado = lj.Autorizado }
    return { ok: lj.Autorizado === true, cookies, baseUrl: WEB, dbg }
  } catch (e) {
    return { ok: false, cookies: '', baseUrl: WEB, dbg: { erro: String(e).slice(0, 120) } }
  }
}

export const IMOVIEW_WEB = WEB
export const IMOVIEW_UA = UA
