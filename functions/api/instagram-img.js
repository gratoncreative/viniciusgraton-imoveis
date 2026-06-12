/**
 * GET /api/instagram-img?k={key}
 * Serve imagem temporária do KV para o Instagram poder acessar publicamente.
 */
export async function onRequestGet({ request, env }) {
  const k = new URL(request.url).searchParams.get('k')
  if (!k || !k.startsWith('ig_tmp_')) {
    return new Response('Not found', { status: 404 })
  }
  const { value, metadata } = await env.KV.getWithMetadata(k, 'arrayBuffer')
  if (!value) return new Response('Not found', { status: 404 })
  return new Response(value, {
    headers: {
      'Content-Type': (metadata?.ct) || 'image/png',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
