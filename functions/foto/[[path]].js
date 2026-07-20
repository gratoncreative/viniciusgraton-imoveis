/**
 * Proxy de FOTO no nosso domínio — esconde de onde vêm as imagens.
 *
 * Antes, o HTML mostrava `https://cdn.imoview.com.br/...` milhares de vezes:
 * quem abrisse o código-fonte descobria na hora qual é o sistema por trás.
 * Agora todas as fotos saem como `https://viniciusgraton.com.br/foto/<cod>/<n>.jpg`
 * e o endereço real nunca aparece — nem na URL, nem codificado nela.
 *
 *   /foto/74812.jpg      → capa do imóvel 74812
 *   /foto/74812/3.jpg    → 3ª foto do imóvel 74812
 *
 * Ganho de velocidade junto: resposta cacheada na borda da Cloudflare por 30
 * dias (immutable), então a mesma foto só é buscada na origem uma vez.
 *
 * Sem lista aberta: só resolve códigos que existem no nosso catálogo, e só
 * busca em domínios de imagem conhecidos. Não serve como proxy aberto.
 */

// Cache do índice por isolate (evita reprocessar o catálogo a cada requisição).
let INDICE = null
let INDICE_EM = 0
const TTL_INDICE = 10 * 60 * 1000 // 10 min

const HOST_OK = (h) =>
  /(^|\.)imoview\.com\.br$/.test(h) ||
  /(^|\.)rotina\.com\.br$/.test(h) ||
  /(^|\.)blob\.core\.windows\.net$/.test(h) ||
  /(^|\.)amazonaws\.com$/.test(h)

async function carregarIndice(env, origin) {
  const agora = Date.now()
  if (INDICE && agora - INDICE_EM < TTL_INDICE) return INDICE
  const mapa = new Map()
  try {
    // Índice pronto (catálogo + curados), gerado no build por scripts/gen-fotos-index.mjs.
    // Antes o índice saía só do catálogo, então imóvel curado que tinha saído da
    // base da Rotina ficava sem foto. ASSETS serve o arquivo direto (não passa
    // pela blindagem que barra o acesso externo).
    const r = await env.ASSETS.fetch(new Request(`${origin}/_fotos.json`))
    if (r.ok) {
      const d = await r.json()
      for (const cod of Object.keys(d)) {
        const fotos = (d[cod] || []).filter(Boolean)
        if (fotos.length) mapa.set(String(cod), fotos)
      }
    }
  } catch { /* segue com o que tiver */ }
  INDICE = mapa
  INDICE_EM = agora
  return mapa
}

export async function onRequestGet(context) {
  const { request, env, params } = context
  const origin = new URL(request.url).origin
  const partes = Array.isArray(params.path) ? params.path : String(params.path || '').split('/')
  if (!partes.length) return new Response('não encontrado', { status: 404 })

  // <cod>.jpg  |  <cod>/<n>.jpg
  const codigo = String(partes[0] || '').replace(/\.(jpe?g|png|webp)$/i, '')
  const idx = partes.length > 1 ? parseInt(String(partes[1]).replace(/\.\w+$/, ''), 10) || 1 : 1
  if (!/^\d{1,10}$/.test(codigo)) return new Response('código inválido', { status: 400 })

  // resposta já na borda?
  const cache = caches.default
  const chaveCache = new Request(`${origin}/foto/${codigo}/${idx}.jpg`, { method: 'GET' })
  const naBorda = await cache.match(chaveCache)
  if (naBorda) return naBorda

  const indice = await carregarIndice(env, origin)
  const fotos = indice.get(codigo)
  if (!fotos || !fotos.length) return new Response('foto não encontrada', { status: 404 })

  const alvoStr = fotos[Math.min(Math.max(idx, 1), fotos.length) - 1]
  let alvo
  try { alvo = new URL(alvoStr, origin) } catch { return new Response('origem inválida', { status: 502 }) }

  // foto já é nossa (arquivo local)? devolve direto pelo próprio site
  if (alvo.origin === origin) return env.ASSETS.fetch(new Request(alvo.toString()))
  if (alvo.protocol !== 'https:' || !HOST_OK(alvo.hostname)) return new Response('origem não permitida', { status: 403 })

  let r
  try {
    r = await fetch(alvo.toString(), {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; ViniciusGratonImoveis/1.0)' },
      cf: { cacheEverything: true, cacheTtl: 2592000 },
    })
  } catch {
    return new Response('falha ao buscar a foto', { status: 502 })
  }
  if (!r.ok) return new Response('foto não encontrada', { status: 404 })
  const ct = r.headers.get('content-type') || 'image/jpeg'
  if (!/^image\//.test(ct)) return new Response('não é imagem', { status: 415 })

  const resp = new Response(r.body, {
    headers: {
      'content-type': ct,
      // 30 dias na borda e no navegador: a mesma foto não é buscada de novo
      'cache-control': 'public, max-age=2592000, immutable',
      'x-content-type-options': 'nosniff',
      // não conta de onde veio
      'referrer-policy': 'same-origin',
    },
  })
  context.waitUntil(cache.put(chaveCache, resp.clone()))
  return resp
}
