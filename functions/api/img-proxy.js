// Proxy de imagem same-origin — só para baixar fotos do CDN do Imoview no navegador.
// O CDN é de terceiro e bloqueia o fetch direto por CORS; aqui o servidor busca a imagem
// (sem restrição de CORS) e devolve same-origin. Restrito aos hosts do Imoview para não
// virar proxy aberto (sem risco de SSRF). As imagens já são públicas no anúncio.
//
//   GET /api/img-proxy?u=<url https do CDN do Imoview>
const ALLOW = new Set(['cdn.imoview.com.br', 's3.imoview.com.br', 'app.imoview.com.br'])

export async function onRequestGet({ request }) {
  const u = new URL(request.url).searchParams.get('u') || ''
  let target
  try { target = new URL(u) } catch { return new Response('bad url', { status: 400 }) }
  if (target.protocol !== 'https:' || !ALLOW.has(target.hostname)) {
    return new Response('forbidden host', { status: 403 })
  }
  try {
    const r = await fetch(target.toString(), {
      headers: { 'user-agent': 'Mozilla/5.0', accept: 'image/*,*/*' },
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
    })
    if (!r.ok) return new Response('upstream ' + r.status, { status: 502 })
    return new Response(r.body, {
      headers: {
        'content-type': r.headers.get('content-type') || 'image/jpeg',
        'cache-control': 'public, max-age=86400',
        'access-control-allow-origin': '*',
      },
    })
  } catch (e) {
    return new Response('proxy error', { status: 502 })
  }
}
