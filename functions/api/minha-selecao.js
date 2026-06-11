/**
 * "Minha seleção" — conecta a ÁREA DO CLIENTE (conta) à página personalizada.
 * O visitante logado tem favoritos (sincronizados em conta:<token>). Este
 * endpoint garante uma página /cliente/<uuid> com esses favoritos como seleção,
 * que fica SALVA e atualiza sozinha — e aparece no CRM do Vinícius (origem
 * 'favoritos'). O vínculo conta->crm fica em contacrm:<contaToken> (chave à
 * parte, pra não conflitar com o sync da conta que reescreve conta:<token>).
 *
 *   POST /api/minha-selecao { token: <contaToken> }  -> { ok, token: <crmId> }
 */
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
const temKV = (env) => env && env.ENGAGEMENT && typeof env.ENGAGEMENT.get === 'function'
const lim = (v, n) => String(v == null ? '' : v).slice(0, n)
const objToFinal = (o) => { const s = (o || '').toLowerCase(); if (s.includes('alug')) return 'Alugar'; if (s.includes('invest')) return 'Investir'; return 'Comprar' }

export async function onRequestPost({ env, request }) {
  try {
    if (!temKV(env)) return json({ ok: true, token: '', persistido: false })
    const b = await request.json().catch(() => ({}))
    const ct = lim(b.token, 60).replace(/[^a-zA-Z0-9_-]/g, '')
    if (!ct) return json({ error: 'token' }, 400)

    const conta = await env.ENGAGEMENT.get('conta:' + ct, 'json').catch(() => null)
    if (!conta) return json({ error: 'nao-encontrado' }, 404)
    const wa = lim(conta.fone, 20).replace(/\D/g, '').slice(0, 15)
    if (wa.length < 10) return json({ error: 'sem-whatsapp', msg: 'Cadastro sem WhatsApp válido.' }, 400)

    // usa os favoritos enviados pelo cliente (estado atual) e cai pros do registro
    const fonte = Array.isArray(b.favoritos) ? b.favoritos : (Array.isArray(conta.favoritos) ? conta.favoritos : [])
    const favoritos = fonte.filter((x) => x != null).map((x) => lim(x, 12)).filter(Boolean).slice(0, 40)
    const bairros = String(conta.bairros || '').split(/[,;/]+/).map((s) => s.trim()).filter(Boolean).slice(0, 20)

    let crmId = await env.ENGAGEMENT.get('contacrm:' + ct).catch(() => null)
    let reg = crmId ? await env.ENGAGEMENT.get('crm:' + crmId, 'json').catch(() => null) : null
    const novoRegistro = !reg
    if (!crmId) crmId = crypto.randomUUID()
    if (!reg) reg = {}

    const ts = Date.now()
    reg.id = crmId
    reg.criadoEm = reg.criadoEm || ts
    reg.atualizadoEm = ts
    reg.origem = reg.origem || 'favoritos'
    if (novoRegistro) reg.novo = true
    reg.status = reg.status || 'A revisar'
    reg.nome = lim(conta.nome, 80)
    reg.whatsapp = wa
    reg.finalidade = objToFinal(conta.objetivo)
    reg.bairros = bairros
    reg.tipos = reg.tipos || []
    reg.precoMin = reg.precoMin || 0
    reg.precoMax = reg.precoMax || 0
    reg.quartosMin = reg.quartosMin || 0
    reg.suitesMin = reg.suitesMin || 0
    reg.vagasMin = reg.vagasMin || 0
    reg.areaMin = reg.areaMin || 0
    reg.sugeridos = favoritos
    reg.feedback = reg.feedback && typeof reg.feedback === 'object' ? reg.feedback : {}
    reg.obs = reg.obs || ('Conta criada no site. Email: ' + lim(conta.email, 120) + (conta.faixa ? ' · Faixa: ' + conta.faixa : ''))

    // evita escrita à toa no KV (cota): só grava se algo relevante mudou
    const sig = JSON.stringify([reg.sugeridos, reg.nome, reg.whatsapp, reg.finalidade, reg.bairros])
    if (!novoRegistro && reg._sig === sig) return json({ ok: true, token: crmId, inalterado: true })
    reg._sig = sig
    await env.ENGAGEMENT.put('crm:' + crmId, JSON.stringify(reg))
    if (novoRegistro) await env.ENGAGEMENT.put('contacrm:' + ct, crmId)
    return json({ ok: true, token: crmId })
  } catch (e) {
    console.error('minha-selecao:', e)
    return json({ error: 'interno' }, 500)
  }
}
