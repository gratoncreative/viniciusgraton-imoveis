import { kvStore } from '../_lib/store.js'
/**
 * Valida o código de acesso da Área do Corretor.
 * Aceita códigos dinâmicos no KV (pagos e trials de 24h) e o código fixo ROTINA_CODIGO como fallback.
 *
 *   POST /api/corretor-acesso { codigo }
 *     -> { ok: true, nome?, plano?, expiresAt? }
 *     -> { ok: false, expirado: true }
 *     -> { ok: false, naoConfigurado: true }
 *     -> { ok: false }
 */
const json = (o, s = 200) => new Response(JSON.stringify(o), {
  status: s,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
})

export async function onRequestPost({ request, env }) {
  env = { ...env, ENGAGEMENT: kvStore(env) }
  let body = {}
  try { body = await request.json() } catch {}
  const codigo = String(body.codigo || '').trim()
  if (!codigo) return json({ ok: false })

  // rate-limit por IP: máx 10 tentativas/hora
  if (env && env.ENGAGEMENT) {
    const ip = request.headers.get('cf-connecting-ip') || 'sem-ip'
    const rlKey = 'rl:acesso:' + ip
    const usos = parseInt(await env.ENGAGEMENT.get(rlKey).catch(() => null), 10) || 0
    if (usos >= 10) return json({ ok: false, erro: 'Muitas tentativas. Tente mais tarde.' }, 429)
    await env.ENGAGEMENT.put(rlKey, String(usos + 1), { expirationTtl: 3600 }).catch(() => {})
  }

  // valida formato antes de consultar KV
  if (!/^(TRIAL-[A-Z0-9]{8}|[A-Z0-9]{4,32})$/.test(codigo)) return json({ ok: false })

  // 1. Código dinâmico no KV (pago ou trial)
  if (env && env.ENGAGEMENT) {
    const dado = await env.ENGAGEMENT.get(`corretor:code:${codigo}`, 'json').catch(() => null)
    if (dado) {
      if (dado.expiresAt && Date.now() > dado.expiresAt) {
        return json({ ok: false, expirado: true })
      }
      return json({ ok: true, nome: dado.nome || '', plano: dado.plano || '', expiresAt: dado.expiresAt || null })
    }
  }

  // 2. Fallback: código fixo (ROTINA_CODIGO secret — backward compat)
  const esperado = String((env && env.ROTINA_CODIGO) || '').trim()
  if (!esperado) return json({ ok: false, naoConfigurado: true })
  if (codigo.toLowerCase() === esperado.toLowerCase()) return json({ ok: true })
  return json({ ok: false })
}
