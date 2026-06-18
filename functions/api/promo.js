import { kvStore } from '../_lib/store.js'
/**
 * Cloudflare Pages Function — leitura PÚBLICA da peça de publicidade editável.
 *   GET /api/promo -> { ok:true, promo: {...} | null }
 * A escrita é feita pelo painel admin (POST /api/admin action 'promo-save').
 */
const json = (o, s = 200, cache = 0) =>
  new Response(JSON.stringify(o), {
    status: s,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cache > 0 ? `public, max-age=${cache}` : 'no-store',
    },
  })

export async function onRequestGet({ env, request }) {
  // diagnóstico: /api/promo?diag=1 -> diz se o D1 está realmente bindado (DB) e se o KV existe
  const d1 = !!(env && env.DB && typeof env.DB.prepare === 'function')
  const kv = !!(env && env.ENGAGEMENT && typeof env.ENGAGEMENT.get === 'function')
  env = { ...env, ENGAGEMENT: kvStore(env) }
  try {
    if (request && new URL(request.url).searchParams.get('diag')) {
      return json({ ok: true, d1, kv, storage: d1 ? 'D1' : (kv ? 'KV' : 'nenhum') })
    }
    const v = await env.ENGAGEMENT.get('config:promo', 'json')
    return json({ ok: true, promo: v || null }, 200, 60)
  } catch {
    return json({ ok: true, promo: null })
  }
}
