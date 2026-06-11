/**
 * Proxy do modelo de IA MI-GAN (remoção de marca d'água no navegador).
 *
 * Serve o arquivo .onnx (hospedado no Hugging Face) a partir do MESMO domínio,
 * com cache longo. Isso resolve o CORS e contorna o limite de 25 MiB por arquivo
 * estático do Cloudflare Pages — o modelo (~27 MB) não fica no repositório.
 *
 * O onnxruntime-web baixa este arquivo 1x (depois fica em cache no navegador).
 */
const FONTE = 'https://huggingface.co/andraniksargsyan/migan/resolve/main/migan_pipeline_v2.onnx'

export async function onRequestGet({ request, waitUntil }) {
  const cache = caches.default
  const chave = new Request(new URL(request.url).origin + '/api/modelo-marca')
  const cacheado = await cache.match(chave)
  if (cacheado) return cacheado

  const upstream = await fetch(FONTE, { cf: { cacheTtl: 2592000, cacheEverything: true } })
  if (!upstream.ok) return new Response('falha ao obter o modelo', { status: 502 })

  const resp = new Response(upstream.body, {
    status: 200,
    headers: {
      'content-type': 'application/octet-stream',
      'cache-control': 'public, max-age=2592000, immutable',
      'access-control-allow-origin': 'https://viniciusgraton.com.br',
    },
  })
  waitUntil(cache.put(chave, resp.clone()))
  return resp
}
