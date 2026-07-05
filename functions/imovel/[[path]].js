/**
 * /imovel/<codigo> — SPA React servida pelo index.html via _redirects.
 * Robôs do WhatsApp / Instagram / Facebook / Telegram NÃO executam JS,
 * então leem as meta tags do HTML estático — que por padrão traziam
 * a foto genérica do site em vez da capa do imóvel.
 *
 * Este middleware intercepta /imovel/* antes de devolver o index.html,
 * busca os dados do imóvel na API interna e reescreve title + Open Graph
 * / Twitter Card com a foto de capa, título e descrição reais do imóvel.
 *
 * Fluxo:
 *  1. context.next() → index.html (200) já com o _redirects do SPA
 *  2. Extrai código do pathname (/imovel/84330 → "84330")
 *  3. Chama /api/rotina-imovel?codigo=84330 (mesma origem, cache 5min)
 *  4. HTMLRewriter injeta as tags antes de entregar ao bot ou browser
 *  5. Se falhar (imóvel não existe, API fora), devolve o HTML padrão
 */

const SITE = 'https://viniciusgraton.com.br'
const FALLBACK_IMG = `${SITE}/vinicius-graton.jpg`

const setContent = (val) => ({ element(el) { el.setAttribute('content', val) } })

function plural(n, s, p) { return n > 1 ? p : s }

function montarDesc(im) {
  const parts = []
  if (im.quartos > 0) parts.push(`${im.quartos} ${plural(im.quartos, 'quarto', 'quartos')}`)
  if (im.suites > 0) parts.push(`${im.suites} ${plural(im.suites, 'suíte', 'suítes')}`)
  if (im.vagas > 0) parts.push(`${im.vagas} ${plural(im.vagas, 'vaga', 'vagas')}`)
  if (im.areaNum > 0) parts.push(`${im.areaNum} m²`)
  const specs = parts.join(' · ')
  const loc = `${im.bairro || ''}${im.bairro && im.cidade ? ' - ' : ''}${im.cidade || 'Uberlândia'}/${im.uf || im.estado || 'MG'}`
  const preco = im.valor ? `${im.valor} · ` : ''
  return `${preco}${specs}${specs && loc ? '  ·  ' : ''}${loc}`.trim()
}

export async function onRequest(context) {
  // Passa o request para o SPA (index.html via _redirects)
  const res = await context.next()
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('text/html')) return res

  // Extrai o código do imóvel do pathname (/imovel/84330 → "84330")
  const url = new URL(context.request.url)
  const segments = url.pathname.replace(/^\/imovel\/?/, '').split('/').filter(Boolean)
  const codigo = segments[0] ? segments[0].replace(/\D/g, '') : ''
  if (!codigo) return res

  // Busca dados do imóvel (mesma origem, aproveita cache do CF)
  let titulo = ''
  let desc = ''
  let imgUrl = FALLBACK_IMG
  let canonical = `${SITE}/imovel/${codigo}`

  try {
    const apiRes = await fetch(`${url.origin}/api/rotina-imovel?codigo=${codigo}`, {
      headers: { 'accept': 'application/json' },
      cf: { cacheTtl: 300, cacheEverything: true },
    })
    if (apiRes.ok) {
      const data = await apiRes.json()
      const im = data && data.imovel
      if (im) {
        const tipo = im.tipo || 'Imóvel'
        const bairro = im.bairro ? ` no ${im.bairro}` : ''
        const cidade = im.cidade || 'Uberlândia'
        const preco = im.valor ? ` - ${im.valor}` : ''
        titulo = `${tipo}${bairro}${preco} · ${cidade} | Rotina Imobiliária`
        desc = montarDesc(im)
        // Usa a foto de capa do imóvel (URL direta do CDN da Rotina — pública)
        const foto = (im.fotos && im.fotos.length > 0 ? im.fotos[0] : im.foto) || ''
        if (foto && /^https?:\/\//.test(foto)) imgUrl = foto
      }
    }
  } catch (_) {
    // Mantém defaults em caso de erro
  }

  // Sem título específico = imóvel não encontrado, devolve HTML sem alteração
  if (!titulo) return res

  return new HTMLRewriter()
    .on('meta[property="og:title"]', setContent(titulo))
    .on('meta[property="og:description"]', setContent(desc))
    .on('meta[property="og:image"]', setContent(imgUrl))
    .on('meta[property="og:image:alt"]', setContent(titulo))
    .on('meta[property="og:image:type"]', setContent('image/jpeg'))
    .on('meta[property="og:image:width"]', setContent('1200'))
    .on('meta[property="og:image:height"]', setContent('800'))
    .on('meta[property="og:url"]', setContent(canonical))
    .on('meta[property="og:type"]', setContent('product'))
    .on('meta[name="twitter:title"]', setContent(titulo))
    .on('meta[name="twitter:description"]', setContent(desc))
    .on('meta[name="twitter:image"]', setContent(imgUrl))
    .on('title', { element(el) { el.setInnerContent(titulo) } })
    .transform(res)
}
