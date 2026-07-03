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

// ————————————————————————————————————————————————————————————————
// Sessão REAPROVEITÁVEL + cooldown — reduz drasticamente o nº de logins.
// Toda ação (owner-fetch/lote, atendimentos, cron) fazia login do zero (4 fetches);
// num backup de bairro isso vira dezenas de logins seguidos do mesmo IP, que é o padrão
// que dispara bloqueio da conta. Aqui o cookie é cacheado no KV por uma janela curta e
// só re-loga se a sessão sumir/expirar. Sem KV (env sem ENGAGEMENT) cai no login normal.
// ————————————————————————————————————————————————————————————————
const SESS_KEY = 'imoview:sess'
const SESS_TTL_S = 15 * 60          // reusa a sessão por até 15 min
const COOLDOWN_KEY = 'imoview:cooldown'

// A resposta veio a ser a PÁGINA DE LOGIN? (sessão expirou no meio da janela cacheada)
export function ehPaginaLogin(html) {
  const s = String(html || '')
  if (!s) return false
  const temLogin = /Login\/LogOn|RetornarConvenios|name="__RequestVerificationToken"|urlReturn/i.test(s)
  const temConteudo = /Detalhes|Proprietar|Atendimento|PessoaF|PessoaJ|data-codigos/i.test(s)
  return temLogin && !temConteudo
}

// Cooldown: após uma falha de login, não fica martelando o Imoview por alguns minutos.
export async function imoviewEmCooldown(env) {
  try { const t = parseInt(await env.ENGAGEMENT.get(COOLDOWN_KEY), 10) || 0; return Date.now() < t } catch { return false }
}
export async function marcarImoviewCooldown(env, ms = 20 * 60 * 1000) {
  try { await env.ENGAGEMENT.put(COOLDOWN_KEY, String(Date.now() + ms), { expirationTtl: Math.ceil(ms / 1000) + 60 }) } catch {}
}

// Devolve { ok, cookies, baseUrl, cached }. Usa o cookie cacheado quando possível.
// force=true ignora o cache (usar quando a sessão cacheada se mostrou expirada).
export async function imoviewSession(env, { force = false } = {}) {
  const kv = env && env.ENGAGEMENT
  if (!force && kv && typeof kv.get === 'function') {
    try {
      const s = await kv.get(SESS_KEY, 'json')
      if (s && s.cookies && s.exp && Date.now() < s.exp) return { ok: true, cookies: s.cookies, baseUrl: WEB, cached: true }
    } catch {}
  }
  const res = await imoviewLogin(env, {})
  if (res && res.ok && res.cookies && kv && typeof kv.put === 'function') {
    try { await kv.put(SESS_KEY, JSON.stringify({ cookies: res.cookies, exp: Date.now() + SESS_TTL_S * 1000 }), { expirationTtl: SESS_TTL_S + 60 }) } catch {}
  }
  return { ok: !!(res && res.ok), cookies: (res && res.cookies) || '', baseUrl: WEB, cached: false, dbg: res && res.dbg }
}
export const IMOVIEW_WEB = WEB
export const IMOVIEW_UA = UA
