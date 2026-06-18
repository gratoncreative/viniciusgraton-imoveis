import { kvStore } from '../_lib/store.js'
/**
 * Chat de qualificação ("Encontre seu imóvel") — público.
 * Recebe as respostas do visitante, cria um cliente no CRM já qualificado
 * (marcado como novo / a revisar) e devolve o token da página personalizada.
 * Também registra um lead na caixa de leads do painel.
 *
 *   POST /api/buscar  { finalidade, tipos[], bairros[], precoMin, precoMax,
 *                       quartosMin, prazo, nome, whatsapp, sugeridos[], site }
 *     -> { ok:true, token }
 *
 * Anti-spam.. campo-isca (site) + limite por IP no KV. Nada de dados sensíveis
 * em URL; tudo via POST. O Vinícius revisa os novos no painel antes de tratar
 * como cliente oficial (regra: tudo passa por aprovação).
 */
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
const temKV = (env) => env && env.ENGAGEMENT && typeof env.ENGAGEMENT.get === 'function'
const lim = (v, n) => String(v == null ? '' : v).slice(0, n)
const num = (v) => Math.max(0, Math.min(99999999, Number(v) || 0))
const arrStr = (a, max, n) => (Array.isArray(a) ? a.filter((x) => typeof x === 'string').slice(0, max).map((x) => lim(x, n)) : [])

export async function onRequestPost({ env, request }) {
  env = { ...env, ENGAGEMENT: kvStore(env) }
  try {
    const b = await request.json().catch(() => ({}))
    // campo-isca: bot preenche, humano não vê. Devolve ok silenciosamente.
    if (b.site) return json({ ok: true, token: '' })

    const wa = lim(b.whatsapp, 20).replace(/\D/g, '').slice(0, 15)
    if (wa.length < 10) return json({ error: 'whatsapp', msg: 'Preciso de um WhatsApp válido com DDD.' }, 400)

    if (!temKV(env)) return json({ ok: true, token: '', persistido: false })

    // limite por IP (anti-spam) — máx. 6 envios por hora
    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'sem-ip'
    const rlKey = 'rl:busca:' + ip
    const usos = parseInt(await env.ENGAGEMENT.get(rlKey), 10) || 0
    if (usos >= 6) return json({ error: 'limite', msg: 'Muitos envios. Tenta de novo daqui a pouco ou me chama no WhatsApp.' }, 429)
    await env.ENGAGEMENT.put(rlKey, String(usos + 1), { expirationTtl: 3600 })

    const ts = Date.now()
    const id = crypto.randomUUID()
    const reg = {
      id, criadoEm: ts, atualizadoEm: ts,
      origem: 'site', novo: true, status: 'A revisar',
      nome: lim(b.nome, 80), whatsapp: wa,
      finalidade: lim(b.finalidade, 20) || 'Comprar',
      tipos: arrStr(b.tipos, 8, 30), bairros: arrStr(b.bairros, 20, 40),
      precoMin: num(b.precoMin), precoMax: num(b.precoMax),
      quartosMin: num(b.quartosMin), suitesMin: 0, vagasMin: 0, areaMin: 0,
      prazo: lim(b.prazo, 40),
      sugeridos: arrStr(b.sugeridos, 12, 12),
      feedback: {}, nota: '',
      pedido: lim(b.descricao, 600),
      obs: 'Veio do chat "Encontre seu imóvel" do site.' + (b.descricao ? `\n\nNas palavras do cliente: "${lim(b.descricao, 600)}"` : ''),
    }
    await env.ENGAGEMENT.put('crm:' + id, JSON.stringify(reg), { metadata: { novo: true, temNovidade: false } })

    // espelha como lead na caixa de leads do painel
    const lead = {
      ts, data: new Date(ts).toISOString(), nome: reg.nome || 'Sem nome', fone: wa,
      bairro: (reg.bairros[0] || ''), cod: '', origem: 'chat-busca', crmId: id,
      resumo: [reg.finalidade, reg.tipos.join('/'), reg.prazo].filter(Boolean).join(' · '),
    }
    await env.ENGAGEMENT.put('lead:' + ts + '-' + Math.random().toString(36).slice(2, 8), JSON.stringify(lead))

    return json({ ok: true, token: id })
  } catch (e) {
    console.error('buscar:', e)
    return json({ error: 'interno' }, 500)
  }
}
