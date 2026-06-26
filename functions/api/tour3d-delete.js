import { kvStore } from '../_lib/store.js'
/**
 * Exclui um tour 3D do corretor (libera a vaga do plano grátis).
 *   POST /api/tour3d-delete { fone, id } -> { ok:true }
 * Gate: só o dono (ownerFone === fone) pode excluir.
 */
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

export async function onRequestPost({ env, request }) {
  env = { ...env, ENGAGEMENT: kvStore(env) }
  try {
    let b = {}
    try { b = await request.json() } catch {}
    const fone = String(b.fone || '').replace(/\D/g, '').slice(0, 15)
    const id = String(b.id || '').slice(0, 40)
    if (!fone || !id) return json({ ok: false }, 400)

    const meta = await env.ENGAGEMENT.get('tour:meta:' + id, 'json').catch(() => null)
    if (!meta) return json({ ok: true }) // já não existe
    if (meta.ownerFone !== fone) return json({ ok: false, erro: 'sem permissão' }, 403)

    if (env.TOURS && typeof env.TOURS.delete === 'function') { try { await env.TOURS.delete(meta.r2key) } catch {} }
    await env.ENGAGEMENT.delete('tour:meta:' + id).catch(() => {})
    let ids = await env.ENGAGEMENT.get('tour:owner:' + fone, 'json').catch(() => null)
    if (Array.isArray(ids)) await env.ENGAGEMENT.put('tour:owner:' + fone, JSON.stringify(ids.filter((x) => x !== id))).catch(() => {})
    return json({ ok: true })
  } catch (e) {
    console.error('tour3d-delete:', e)
    return json({ ok: false }, 500)
  }
}
