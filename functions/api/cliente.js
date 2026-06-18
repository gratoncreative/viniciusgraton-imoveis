import { kvStore } from '../_lib/store.js'
/**
 * Página personalizada do cliente (CRM). Público, acessado por um token
 * impossível de adivinhar (?t=<id>). Devolve SÓ dados seguros para montar a
 * página de sugestões — NUNCA o WhatsApp nem anotações internas.
 */
const json = (o, s = 200) => new Response(JSON.stringify(o), {
  status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
})

export async function onRequestGet({ env, request }) {
  env = { ...env, ENGAGEMENT: kvStore(env) }
  const id = (new URL(request.url).searchParams.get('t') || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40)
  if (!id || !(env && env.ENGAGEMENT)) return json({ error: 'nao-encontrado' }, 404)
  const v = await env.ENGAGEMENT.get('crm:' + id, 'json').catch(() => null)
  if (!v) return json({ error: 'nao-encontrado' }, 404)
  return json({
    ok: true,
    cliente: {
      nome: v.nome || '',
      finalidade: v.finalidade || '',
      tipos: v.tipos || [],
      bairros: v.bairros || [],
      precoMin: v.precoMin || 0,
      precoMax: v.precoMax || 0,
      quartosMin: v.quartosMin || 0,
      suitesMin: v.suitesMin || 0,
      vagasMin: v.vagasMin || 0,
      areaMin: v.areaMin || 0,
      sugeridos: v.sugeridos || [],
      feedback: v.feedback || {},
      foto: v.foto || '',
      temEmail: !!v.email, // #16 — só p/ saber se ainda pedimos o e-mail (não expõe o valor)
    },
  })
}
