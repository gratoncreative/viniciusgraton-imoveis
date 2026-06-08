/**
 * /cliente/<token> — a página é um SPA (React) servida pelo index.html via
 * _redirects. Os robôs do WhatsApp/Facebook NÃO rodam JS, então leem as meta
 * tags do HTML estático — que por padrão traziam a FOTO do Vinícius.
 *
 * Esta função intercepta /cliente/* e reescreve só as meta tags Open Graph /
 * Twitter / título / descrição para uma capa neutra de "seleção de imóveis",
 * mantendo o app React funcionando normal por cima (context.next() devolve o
 * mesmo index.html; o React hidrata e roteia como antes).
 */
const SITE = 'https://viniciusgraton.com.br'
const IMG = `${SITE}/og/selecao-cliente.png`
const TITULO = 'Sua seleção de imóveis · Vinícius Graton'
const DESC = 'Imóveis escolhidos a dedo pra você em Uberlândia. Toque para ver sua seleção e me dizer o que mais gostou.'

const setContent = (val) => ({ element(el) { el.setAttribute('content', val) } })

export async function onRequest(context) {
  const res = await context.next()
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('text/html')) return res

  return new HTMLRewriter()
    .on('meta[property="og:title"]', setContent(TITULO))
    .on('meta[property="og:description"]', setContent(DESC))
    .on('meta[property="og:image"]', setContent(IMG))
    .on('meta[property="og:image:alt"]', setContent('Seleção de imóveis em Uberlândia'))
    .on('meta[property="og:image:type"]', setContent('image/png'))
    .on('meta[property="og:image:width"]', setContent('1280'))
    .on('meta[property="og:image:height"]', setContent('720'))
    .on('meta[property="og:type"]', setContent('article'))
    .on('meta[name="twitter:title"]', setContent(TITULO))
    .on('meta[name="twitter:description"]', setContent(DESC))
    .on('meta[name="twitter:image"]', setContent(IMG))
    .on('title', { element(el) { el.setInnerContent(TITULO) } })
    .transform(res)
}
