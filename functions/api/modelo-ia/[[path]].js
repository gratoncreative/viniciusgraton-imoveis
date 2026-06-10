/**
 * Proxy genérico dos arquivos de modelo do Hugging Face (super-resolução com IA).
 * Serve a partir do MESMO domínio (resolve CORS + CSP 'self' + limite de tamanho
 * estático). O Transformers.js é configurado para buscar os modelos por aqui:
 *   env.remoteHost = origin ; env.remotePathTemplate = 'api/modelo-ia/{model}/resolve/{revision}'
 *   -> GET /api/modelo-ia/<model>/resolve/<revision>/<arquivo>
 * Só repassa caminhos do huggingface.co (não é proxy aberto). Cache longo.
 */
export async function onRequestGet({ request, waitUntil }) {
  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/api\/modelo-ia\//, '')
  if (!path || path.includes('..')) return new Response('caminho invalido', { status: 400 })

  const cache = caches.default
  const chave = new Request(url.origin + '/api/modelo-ia/' + path)
  const cacheado = await cache.match(chave)
  if (cacheado) return cacheado

  const alvo = 'https://huggingface.co/' + path + (url.search || '')
  let upstream
  try {
    upstream = await fetch(alvo, { cf: { cacheTtl: 2592000, cacheEverything: true }, redirect: 'follow' })
  } catch {
    return new Response('falha ao obter o modelo', { status: 502 })
  }
  if (!upstream.ok) return new Response('modelo nao encontrado', { status: upstream.status })

  const resp = new Response(upstream.body, {
    status: 200,
    headers: {
      'content-type': upstream.headers.get('content-type') || 'application/octet-stream',
      'cache-control': 'public, max-age=2592000, immutable',
      'access-control-allow-origin': '*',
    },
  })
  waitUntil(cache.put(chave, resp.clone()))
  return resp
}
