import { kvStore } from '../_lib/store.js'
/**
 * Cloudflare Pages Function — imóveis em DESTAQUE no topo do catálogo.
 * Leitura PÚBLICA (só os códigos). A escrita é feita pelo /api/admin (com token),
 * ação 'catalogo-destaque'. Guardado em KV na chave config:catalogo-topo.
 *
 *   GET /api/destaque  ->  { codigos: ["99472", ...] }  (no máx. 3)
 */
const json = (o, s = 200) => new Response(JSON.stringify(o), {
  status: s,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=10' },
})

export async function onRequestGet({ env }) {
  env = { ...env, ENGAGEMENT: kvStore(env) }
  try {
    if (!env || !env.ENGAGEMENT || typeof env.ENGAGEMENT.get !== 'function') return json({ codigos: [] })
    const v = await env.ENGAGEMENT.get('config:catalogo-topo', 'json')
    const codigos = v && Array.isArray(v.codigos) ? v.codigos.map(String).slice(0, 3) : []
    return json({ codigos })
  } catch {
    return json({ codigos: [] })
  }
}
