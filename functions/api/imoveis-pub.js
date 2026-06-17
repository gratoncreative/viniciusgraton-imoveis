/**
 * Cloudflare Pages Function — overrides PÚBLICOS dos imóveis publicados.
 * Devolve SOMENTE os campos do anúncio editados no painel (preço, descrição, etc.)
 * e o flag "oculto". NUNCA devolve dados do proprietário (esses só pelo /api/admin
 * com login). É o que o site público lê para refletir as edições ao vivo.
 *
 *   GET /api/imoveis-pub  ->  { "<codigo>": { preco, tipo, bairro, ... , oculto } }
 */
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=30' } })
const temKV = (env) => env && env.ENGAGEMENT && typeof env.ENGAGEMENT.get === 'function'
const CAMPOS = ['preco', 'precoAnterior', 'baixouEm', 'tipo', 'bairro', 'finalidade', 'cidade', 'quartos', 'suites', 'banheiros', 'vagas', 'area', 'areaLote', 'condominio', 'andar', 'elevador', 'titulo', 'descricao', 'endereco', 'pontoReferencia', 'video', 'tour360', 'destaque', 'destaqueAte', 'oculto', 'fotos']

export async function onRequestGet({ env }) {
  if (!temKV(env)) return json({ ov: {}, ap: [] })
  const lista = await env.ENGAGEMENT.list({ prefix: 'imovel:' })
  const ov = {}
  for (const k of lista.keys) {
    const v = await env.ENGAGEMENT.get(k.name, 'json')
    if (v && v.campos) {
      const c = {}
      for (const f of CAMPOS) if (f in v.campos) c[f] = v.campos[f]   // só campos do anúncio — owner JAMAIS entra aqui
      ov[k.name.slice('imovel:'.length)] = c
    }
  }
  // imóveis importados que o Vinícius já aprovou (vão pro ar)
  const ap = []
  const apr = await env.ENGAGEMENT.list({ prefix: 'aprovado:' })
  for (const k of apr.keys) ap.push(k.name.slice('aprovado:'.length))
  return json({ ov, ap })
}
