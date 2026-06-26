import { kvStore } from '../../_lib/store.js'
/**
 * Serve o arquivo do Tour 3D a partir do R2, na MESMA ORIGEM (sem mexer no CSP).
 * A URL termina com a extensão real (.ply/.sog) para o PlayCanvas reconhecer o
 * formato:  GET /api/tour3d-file/<id>.<ext>
 */
export async function onRequestGet({ env, request, params }) {
  const kv = kvStore(env)
  const name = String((params && params.name) || '')
  const id = name.replace(/\.(ply|sog)$/i, '')
  if (!id || id === name) return new Response('not found', { status: 404 })

  const meta = await kv.get('tour:meta:' + id, 'json').catch(() => null)
  if (!meta) return new Response('not found', { status: 404 })
  if (meta.expiresAt && meta.expiresAt < Date.now()) return new Response('gone', { status: 410 })
  if (!env.TOURS || typeof env.TOURS.get !== 'function') return new Response('storage not configured', { status: 503 })

  const obj = await env.TOURS.get(meta.r2key)
  if (!obj) return new Response('not found', { status: 404 })

  const headers = new Headers()
  headers.set('content-type', 'application/octet-stream')
  headers.set('cache-control', 'public, max-age=86400')
  if (meta.size) headers.set('content-length', String(meta.size))
  return new Response(obj.body, { status: 200, headers })
}
