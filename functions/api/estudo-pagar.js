/**
 * Cria a cobrança (Mercado Pago Checkout Pro) do download do ESTUDO do valor do m² — R$ 4,90.
 * Mesma plataforma do laudo/assinatura. Preço definido no servidor. Requer MP_ACCESS_TOKEN.
 *
 *   POST /api/estudo-pagar { codigo, origemUrl } -> { ok, url } | { ok:false, naoConfigurado:true }
 */
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
const SITE = 'https://viniciusgraton.com.br'
const MP = 'https://api.mercadopago.com'
const PRECO = 4.9

export async function onRequestPost({ env, request }) {
  const token = String((env && env.MP_ACCESS_TOKEN) || '').trim()
  const b = await request.json().catch(() => ({}))
  const codigo = String(b.codigo || '').replace(/[^\w-]/g, '').slice(0, 16)
  if (!codigo) return json({ error: 'codigo' }, 400)
  if (!token) return json({ ok: false, naoConfigurado: true })
  const origemRaw = String(b.origemUrl || '').replace(/[<>"'\n\r]/g, '').slice(0, 500)
  const origemOk = origemRaw && (origemRaw.startsWith(SITE) || /^https?:\/\/localhost/.test(origemRaw))
  const backBase = origemOk ? origemRaw : `${SITE}/estudo/${codigo}`
  const sep = backBase.includes('?') ? '&' : '?'
  try {
    const pref = {
      items: [{ title: `Estudo do valor do m² - imóvel ${codigo}`, quantity: 1, unit_price: PRECO, currency_id: 'BRL' }],
      external_reference: `estudo|${codigo}`,
      back_urls: {
        success: `${backBase}${sep}pago=1`,
        pending: `${backBase}${sep}pago=1`,
        failure: `${backBase}${sep}pago=falha`,
      },
      auto_return: 'approved',
      statement_descriptor: 'VINICIUS GRATON',
      metadata: { tipo: 'estudo-m2', codigo },
    }
    const r = await fetch(`${MP}/checkout/preferences`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token }, body: JSON.stringify(pref),
    })
    const pj = await r.json()
    if (!pj.init_point) return json({ ok: false, erro: pj.message || 'falha ao criar pagamento' })
    return json({ ok: true, url: pj.init_point })
  } catch (e) { return json({ ok: false, erro: e.message }) }
}
