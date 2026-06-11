/**
 * Ponte Typebot -> CRM. O Typebot (nuvem ou self-host) chama este webhook ao
 * fim do fluxo e os dados caem direto no CRM do Vinícius (origem 'typebot',
 * marcado como novo / a revisar) + viram um lead no painel.
 *
 *   POST /api/typebot?k=<segredo>
 *   body (JSON, mapeie as variáveis do Typebot p/ estas chaves):
 *     { nome, whatsapp, finalidade, tipos, bairros, precoMin, precoMax,
 *       quartosMin, prazo }
 *   -> { ok:true, token }   (token = id da página /cliente/<token>)
 *
 * tipos/bairros aceitam array OU string separada por vírgula.
 */
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
const temKV = (env) => env && env.ENGAGEMENT && typeof env.ENGAGEMENT.get === 'function'
const lim = (v, n) => String(v == null ? '' : v).slice(0, n)
const num = (v) => Math.max(0, Math.min(99999999, Number(String(v).replace(/[^\d]/g, '')) || 0))
// comparação em tempo constante (evita timing attack)
const eqStr = (a, b) => { a = String(a); b = String(b); if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0 }

const lista = (v, max, n) => {
  if (Array.isArray(v)) return v.filter((x) => typeof x === 'string').slice(0, max).map((x) => lim(x, n))
  return String(v || '').split(/[,;/]+/).map((s) => s.trim()).filter(Boolean).slice(0, max).map((x) => lim(x, n))
}
const objToFinal = (o) => { const s = (o || '').toLowerCase(); if (s.includes('alug')) return 'Alugar'; if (s.includes('invest')) return 'Investir'; return 'Comprar' }

export async function onRequestPost({ env, request }) {
  try {
    const url = new URL(request.url)
    const segredo = String((env && env.TYPEBOT_KEY) || '').trim()
    if (!segredo || !eqStr(url.searchParams.get('k') || '', segredo)) return json({ error: 'nao-autorizado' }, 401)
    if (!temKV(env)) return json({ ok: true, token: '', persistido: false })

    const b = await request.json().catch(() => ({}))
    const wa = lim(b.whatsapp || b.fone || b.telefone, 20).replace(/\D/g, '').slice(0, 15)
    if (wa.length < 10) return json({ error: 'whatsapp', msg: 'WhatsApp inválido' }, 400)

    const ts = Date.now()
    const id = crypto.randomUUID()
    const reg = {
      id, criadoEm: ts, atualizadoEm: ts,
      origem: 'typebot', novo: true, status: 'A revisar',
      nome: lim(b.nome, 80), whatsapp: wa,
      finalidade: objToFinal(b.finalidade),
      tipos: lista(b.tipos, 8, 30), bairros: lista(b.bairros, 20, 40),
      precoMin: num(b.precoMin), precoMax: num(b.precoMax),
      quartosMin: num(b.quartosMin), suitesMin: 0, vagasMin: 0, areaMin: 0,
      prazo: lim(b.prazo, 40), sugeridos: [], feedback: {},
      obs: 'Veio do Typebot.',
    }
    await env.ENGAGEMENT.put('crm:' + id, JSON.stringify(reg))
    await env.ENGAGEMENT.put('lead:' + ts + '-' + Math.random().toString(36).slice(2, 8), JSON.stringify({
      ts, data: new Date(ts).toISOString(), nome: reg.nome || 'Sem nome', fone: wa,
      bairro: reg.bairros[0] || '', cod: '', origem: 'typebot', crmId: id,
      resumo: [reg.finalidade, reg.tipos.join('/'), reg.prazo].filter(Boolean).join(' · '),
    }))
    return json({ ok: true, token: id })
  } catch (e) {
    console.error('typebot:', e)
    return json({ error: 'interno' }, 500)
  }
}
