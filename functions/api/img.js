import { kvStore } from '../_lib/store.js'
/**
 * Cloudflare Pages Function — serve as fotos enviadas pelo painel admin.
 *
 *   GET /api/img?id=imgupload:<codigo>:<uuid>
 *
 * As imagens são gravadas no KV (ENGAGEMENT) pela ação 'img-upload' do /api/admin,
 * como { ct, b64 }. Só servimos ids com o prefixo 'imgupload:' (nada mais do KV
 * fica exposto). Cache longo e imutável — cada upload tem um id único (uuid).
 */
const b64ToBytes = (b64) => {
  const bin = atob(b64)
  const len = bin.length
  const out = new Uint8Array(len)
  for (let i = 0; i < len; i++) out[i] = bin.charCodeAt(i)
  return out
}

export async function onRequestGet({ env, request }) {
  env = { ...env, ENGAGEMENT: kvStore(env) }
  const id = new URL(request.url).searchParams.get('id') || ''
  if (!/^imgupload:[a-zA-Z0-9]{1,12}:[a-f0-9-]{8,40}$/.test(id)) {
    return new Response('id inválido', { status: 400 })
  }
  if (!(env && env.ENGAGEMENT && typeof env.ENGAGEMENT.get === 'function')) {
    return new Response('sem banco', { status: 503 })
  }
  const rec = await env.ENGAGEMENT.get(id, 'json').catch(() => null)
  if (!rec || !rec.b64) return new Response('não encontrada', { status: 404 })
  const bytes = b64ToBytes(rec.b64)
  return new Response(bytes, {
    headers: {
      'content-type': rec.ct || 'image/jpeg',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  })
}
