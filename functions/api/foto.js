/**
 * Cloudflare Pages Function — proxy de imagem (só p/ montar os posts no painel).
 * Serve uma foto do CDN da Rotina/Imoview pela MESMA origem, com CORS liberado,
 * pra poder desenhar no <canvas> e exportar o post sem "tainting".
 *
 *   GET /api/foto?u=<url-encoded da foto no cdn.imoview/rotina>
 *
 * Restrito aos domínios de imagem da Rotina/Imoview (não é proxy aberto).
 */
export async function onRequestGet({ request }) {
  const u = new URL(request.url).searchParams.get('u') || ''
  let alvo
  try { alvo = new URL(u) } catch { return new Response('url invalida', { status: 400 }) }
  if (alvo.protocol !== 'https:') return new Response('protocolo invalido', { status: 400 })
  // só CDNs de imagem da Rotina/Imoview (evita uso como proxy aberto)
  const host = alvo.hostname
  const permitido = /(^|\.)imoview\.com\.br$/.test(host) || /(^|\.)rotina\.com\.br$/.test(host)
  if (!permitido) return new Response('dominio nao permitido', { status: 403 })

  let r
  try {
    r = await fetch(alvo.toString(), { headers: { 'user-agent': 'Mozilla/5.0 (compatible; ViniciusGratonImoveis/1.0)' } })
  } catch {
    return new Response('falha ao buscar', { status: 502 })
  }
  if (!r.ok) return new Response('imagem nao encontrada', { status: r.status })
  const ct = r.headers.get('content-type') || 'image/jpeg'
  if (!/^image\//.test(ct)) return new Response('nao e imagem', { status: 415 })
  const origem = request.headers.get('origin') || ''
  const corsOrigin = origem === 'https://viniciusgraton.com.br' ? origem : 'null'
  return new Response(r.body, {
    headers: {
      'content-type': ct,
      'access-control-allow-origin': corsOrigin,
      'cache-control': 'public, max-age=86400',
    },
  })
}
