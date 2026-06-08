/**
 * Proxy dos arquivos do onnxruntime-web (wasm + glue .mjs) a partir do MESMO
 * domínio. Necessário porque carregar esses módulos/worker de um CDN externo
 * (jsdelivr) quebra com a CSP/origem cruzada ("Failed to fetch dynamically
 * imported module"). Servindo em /ort/* same-origin, a CSP 'self' cobre tudo.
 *
 * /ort/ort-wasm-simd-threaded.jsep.wasm  -> jsdelivr ...onnxruntime-web@1.26.0/dist/<arquivo>
 */
const VER = '1.26.0'
const BASE = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${VER}/dist/`

function tipo(nome) {
  if (nome.endsWith('.wasm')) return 'application/wasm'
  if (nome.endsWith('.mjs') || nome.endsWith('.js')) return 'text/javascript; charset=utf-8'
  return 'application/octet-stream'
}

export async function onRequestGet({ params, request, waitUntil }) {
  const partes = Array.isArray(params.path) ? params.path : [params.path]
  const arquivo = partes.join('/')
  // só permite os artefatos do ort (nada de path traversal)
  if (!/^ort-[a-z0-9.\-]+\.(wasm|mjs|js)$/i.test(arquivo)) {
    return new Response('arquivo inválido', { status: 400 })
  }
  const cache = caches.default
  const chave = new Request(new URL(request.url).origin + '/ort/' + arquivo)
  const cacheado = await cache.match(chave)
  if (cacheado) return cacheado

  const upstream = await fetch(BASE + arquivo, { cf: { cacheTtl: 2592000, cacheEverything: true } })
  if (!upstream.ok) return new Response('falha ao obter ' + arquivo, { status: 502 })

  const resp = new Response(upstream.body, {
    status: 200,
    headers: {
      'content-type': tipo(arquivo),
      'cache-control': 'public, max-age=2592000, immutable',
    },
  })
  waitUntil(cache.put(chave, resp.clone()))
  return resp
}
