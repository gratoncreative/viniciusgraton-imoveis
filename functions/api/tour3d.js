import { kvStore } from '../_lib/store.js'
/**
 * Metadado PÚBLICO de um Tour 3D, para a página /tour/:id renderizar o viewer.
 *   GET /api/tour3d?id=<id>
 *     -> { ok:true, tour:{ id, titulo, dono, plano, expiresAt, fileUrl } }
 *     -> { ok:false, expirado } (410) | { ok:false } (404)
 * fileUrl aponta para /api/tour3d-file/<id>.<ext> (mesma origem; extensão na URL
 * para o PlayCanvas reconhecer o formato).
 */
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

export async function onRequestGet({ env, request }) {
  env = { ...env, ENGAGEMENT: kvStore(env) }
  try {
    const id = (new URL(request.url).searchParams.get('id') || '').slice(0, 40)
    if (!id) return json({ ok: false }, 400)
    const meta = await env.ENGAGEMENT.get('tour:meta:' + id, 'json').catch(() => null)
    if (!meta) return json({ ok: false }, 404)
    if (meta.expiresAt && meta.expiresAt < Date.now()) return json({ ok: false, expirado: true }, 410)
    return json({
      ok: true,
      tour: {
        id: meta.id,
        titulo: meta.titulo || 'Tour 3D',
        dono: meta.ownerNome || '',
        plano: meta.plano || 'gratis',
        expiresAt: meta.expiresAt || null,
        fileUrl: `/api/tour3d-file/${meta.id}.${meta.ext || 'ply'}`,
      },
    })
  } catch (e) {
    console.error('tour3d:', e)
    return json({ ok: false }, 500)
  }
}
