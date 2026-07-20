/**
 * Blindagem dos DADOS INTERNOS do site.
 *
 * Os .json de dados existem para o PRÓPRIO site consumir (fetch da SPA), não
 * para download direto. Sem isso, qualquer pessoa digita
 * viniciusgraton.com.br/catalogo.json e leva a carteira inteira (2,2 MB),
 * incluindo a quantidade de imóveis - justamente o que não pode aparecer.
 *
 * Regra: libera o fetch feito pelas nossas páginas; barra navegação direta
 * (digitar a URL, abrir em aba, iframe), hotlink de outro domínio e robô/curl.
 * Tolerante com navegador antigo (sem Sec-Fetch-*) desde que o Referer seja nosso,
 * para nunca quebrar o site de um visitante real.
 *
 * Só é aplicada arquivo a arquivo (functions/<arquivo>.json.js), para NÃO
 * obrigar todo o site a passar por função — o resto continua estático e rápido.
 */
const negado = () =>
  new Response('Conteúdo restrito.', {
    status: 403,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'x-robots-tag': 'noindex, nofollow',
      'cache-control': 'no-store',
      'referrer-policy': 'same-origin',
    },
  })

export async function serveInterno(context) {
  const { request, next } = context
  const url = new URL(request.url)

  const site = request.headers.get('sec-fetch-site')
  const dest = request.headers.get('sec-fetch-dest')
  const referer = request.headers.get('referer') || ''

  // 1) abrir a URL direto (aba nova, Ctrl+U, iframe, embed)
  if (dest === 'document' || dest === 'iframe' || dest === 'object' || dest === 'embed') return negado()
  // 2) outro domínio puxando nossos dados
  if (site === 'cross-site') return negado()
  // 3) sem contexto (curl/robô): só passa com Referer do próprio site
  if (site !== 'same-origin' && site !== 'same-site' && !referer.startsWith(url.origin)) return negado()

  const r = await next()
  const h = new Headers(r.headers)
  h.set('x-robots-tag', 'noindex, nofollow')
  h.set('referrer-policy', 'same-origin')
  return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h })
}
