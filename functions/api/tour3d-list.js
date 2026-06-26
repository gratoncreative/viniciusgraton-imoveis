import { kvStore } from '../_lib/store.js'
import { isAdmin } from '../_lib/admin-auth.js'
/**
 * Lista os tours 3D ativos do corretor (painel do criador).
 *   POST /api/tour3d-list { fone } -> { ok:true, tours:[{id,titulo,url,createdAt,expiresAt}] }
 * Gate: o fone precisa ser de um corretor cadastrado.
 */
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

export async function onRequestPost({ env, request }) {
  env = { ...env, ENGAGEMENT: kvStore(env) }
  try {
    let b = {}
    try { b = await request.json() } catch {}
    const ehAdmin = await isAdmin(env, String(b.adminToken || ''))
    let fone
    if (ehAdmin) {
      fone = 'admin'
    } else {
      fone = String(b.fone || '').replace(/\D/g, '').slice(0, 15)
      if (fone.length < 10) return json({ ok: false, tours: [] }, 400)
      const reg = await env.ENGAGEMENT.get('corretor:fone:' + fone, 'json').catch(() => null)
      if (!reg) return json({ ok: false, tours: [] }, 401)
    }

    let ids = await env.ENGAGEMENT.get('tour:owner:' + fone, 'json').catch(() => null)
    if (!Array.isArray(ids)) ids = []
    const agora = Date.now()
    const metas = await Promise.all(ids.map((id) => env.ENGAGEMENT.get('tour:meta:' + id, 'json').catch(() => null)))
    const tours = metas
      .filter(Boolean)
      .filter((m) => !m.expiresAt || m.expiresAt > agora)
      .map((m) => ({ id: m.id, titulo: m.titulo, url: '/tour/' + m.id, createdAt: m.createdAt, expiresAt: m.expiresAt }))
    return json({ ok: true, tours })
  } catch (e) {
    console.error('tour3d-list:', e)
    return json({ ok: false, tours: [] }, 500)
  }
}
