import { kvStore } from '../_lib/store.js'
/**
 * Cloudflare Pages Function — overrides PÚBLICOS dos imóveis publicados.
 * Devolve SOMENTE os campos do anúncio editados no painel (preço, descrição, tour360, etc.)
 * e o flag "oculto". NUNCA devolve dados do proprietário (esses só pelo /api/admin com login).
 *
 *   GET /api/imoveis-pub  ->  { ov: { "<codigo>": { preco, ... , tour360, oculto } }, ap: [...] }
 *
 * PERF (corrigido jun/2026): lê SÓ os imóveis EDITADOS. Antes fazia list()+get() em TODAS as
 * chaves imovel:* — quando a captação de proprietários encheu imovel:* (1 chave por imóvel),
 * isso estourava o teto de subrequests do Cloudflare e o endpoint caía em 503 (os overrides
 * sumiam do site inteiro). Agora filtra no próprio D1 por quem tem "campos", em 1 query.
 */
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=120' } })
const temKV = (env) => env && env.ENGAGEMENT && typeof env.ENGAGEMENT.get === 'function'
const CAMPOS = ['preco', 'precoAnterior', 'baixouEm', 'tipo', 'bairro', 'finalidade', 'cidade', 'quartos', 'suites', 'banheiros', 'vagas', 'area', 'areaLote', 'condominio', 'andar', 'elevador', 'titulo', 'descricao', 'endereco', 'pontoReferencia', 'video', 'tour360', 'tour3d', 'destaque', 'destaqueAte', 'oculto', 'fotos']

// Extrai só os campos PÚBLICOS do anúncio (owner JAMAIS entra aqui). null se não houver edição.
function soCampos(v) {
  if (!v || !v.campos) return null
  const c = {}
  for (const f of CAMPOS) if (f in v.campos) c[f] = v.campos[f]
  return c
}

export async function onRequestGet({ env }) {
  const ov = {}
  const ap = []
  const db = env && env.DB && typeof env.DB.prepare === 'function' ? env.DB : null

  // Caminho rápido (D1): 1 query que já filtra por quem tem "campos" (poucos imóveis editados),
  // sem varrer os milhares de imovel:* só com proprietário. O LIKE '%"campos":%' não casa com
  // "enderecoCampos" (precisa da aspa antes de "campos"), e o soCampos() ainda re-filtra.
  if (db) {
    try { await db.exec('CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT, meta TEXT, exp INTEGER)') } catch {}
    try {
      const res = await db.prepare("SELECT k, v FROM kv WHERE k LIKE 'imovel:%' AND v LIKE '%\"campos\":%'").all()
      for (const r of (res.results || [])) {
        let val = null; try { val = JSON.parse(r.v) } catch {}
        const c = soCampos(val)
        if (c) ov[r.k.slice('imovel:'.length)] = c
      }
      const apr = await db.prepare("SELECT k FROM kv WHERE k LIKE 'aprovado:%'").all()
      for (const r of (apr.results || [])) ap.push(r.k.slice('aprovado:'.length))
      return json({ ov, ap })
    } catch { /* se a query falhar, cai no caminho KV abaixo */ }
  }

  // Fallback sem D1 (ou erro): KV puro, LIMITADO p/ não estourar subrequests.
  const store = kvStore(env)
  if (!temKV({ ENGAGEMENT: store })) return json({ ov, ap })
  try {
    const lista = await store.list({ prefix: 'imovel:' })
    for (const k of (lista.keys || []).slice(0, 60)) {
      const c = soCampos(await store.get(k.name, 'json'))
      if (c) ov[k.name.slice('imovel:'.length)] = c
    }
  } catch {}
  try {
    const apr = await store.list({ prefix: 'aprovado:' })
    for (const k of (apr.keys || [])) ap.push(k.name.slice('aprovado:'.length))
  } catch {}
  return json({ ov, ap })
}
