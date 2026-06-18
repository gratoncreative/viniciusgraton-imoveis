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

export async function onRequestGet({ env }) {
  try {
    if (!env || !env.ENGAGEMENT || typeof env.ENGAGEMENT.get !== 'function') {
      return json({ ok: true, promo: null })
    }
    const v = await env.ENGAGEMENT.get('config:promo', 'json')
    return json({ ok: true, promo: v || null }, 200, 60)
  } catch {
    return json({ ok: true, promo: null })
  }
}
