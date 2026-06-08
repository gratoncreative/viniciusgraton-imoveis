/**
 * Cloudflare Pages Function — cadastro de imóvel pelo proprietário (moderação).
 * O proprietário envia os dados + fotos (alta resolução). Tudo fica salvo no KV
 * (binding ENGAGEMENT). A LEITURA/moderação é feita SOMENTE pelo painel seguro
 * /admin (ver functions/api/admin.js) — não há mais endpoint de listagem por
 * chave fixa (isso vazava dados no repositório público).
 *
 *   POST /api/anuncio  { nome, fone, ...campos, fotos:[dataURL] }  -> { ok, id }
 */
const temKV = (env) => env && env.ENGAGEMENT && typeof env.ENGAGEMENT.get === 'function'
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
const str = (v, n) => String(v || '').slice(0, n)

export async function onRequestPost({ env, request }) {
  const body = await request.json().catch(() => ({}))
  const nome = str(body.nome, 80)
  const fone = str(body.fone, 30)
  if (!nome || !fone) return json({ error: 'dados incompletos' }, 400)
  const fotos = Array.isArray(body.fotos)
    ? body.fotos.filter((f) => typeof f === 'string' && f.startsWith('data:image')).slice(0, 15)
    : []
  const ts = Date.now()
  const sub = {
    ts, data: new Date(ts).toISOString(), nome, fone,
    email: str(body.email, 120), finalidade: str(body.finalidade, 40), tipo: str(body.tipo, 40),
    bairro: str(body.bairro, 80), endereco: str(body.endereco, 180), preco: str(body.preco, 40),
    quartos: str(body.quartos, 10), suites: str(body.suites, 10), vagas: str(body.vagas, 10),
    area: str(body.area, 20), condominio: str(body.condominio, 40), iptu: str(body.iptu, 40),
    descricao: str(body.descricao, 2000), placa: str(body.placa, 140), fotos,
  }
  const id = ts + '-' + Math.random().toString(36).slice(2, 8)
  if (temKV(env)) await env.ENGAGEMENT.put('anuncio:' + id, JSON.stringify(sub))
  return json({ ok: true, id, persistido: temKV(env), fotos: fotos.length })
}
