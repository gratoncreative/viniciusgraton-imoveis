/**
 * Cria a cobrança (Mercado Pago Checkout Pro) do laudo técnico do m² — R$ 29,90.
 * Preço definido no servidor (nunca confia no cliente). Precisa do MP_ACCESS_TOKEN.
 *
 *   POST /api/laudo-pagar { codigo } -> { ok, url } | { ok:false, naoConfigurado:true }
 */
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
const SITE = 'https://viniciusgraton.com.br'
const MP = 'https://api.mercadopago.com'
const PRECO = 29.9

export async function onRequestPost({ env, request }) {
  const token = String((env && env.MP_ACCESS_TOKEN) || '').trim()
  const b = await request.json().catch(() => ({}))
  const codigo = String(b.codigo || '').replace(/[^\w-]/g, '').slice(0, 16)
  if (!codigo) return json({ error: 'codigo' }, 400)
  if (!token) return json({ ok: false, naoConfigurado: true })
  try {
    const pref = {
      items: [{ title: `Laudo técnico do valor do m² — imóvel ${codigo}`, quantity: 1, unit_price: PRECO, currency_id: 'BRL' }],
      external_reference: `laudo|${codigo}`,
      back_urls: {
        success: `${SITE}/imovel/${codigo}?laudo=1`,
        pending: `${SITE}/imovel/${codigo}?laudo=1`,
        failure: `${SITE}/imovel/${codigo}?laudo=falha`,
      },
      auto_return: 'approved',
      statement_descriptor: 'VINICIUS GRATON',
      metadata: { tipo: 'laudo-m2', codigo },
    }
    const r = await fetch(`${MP}/checkout/preferences`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token }, body: JSON.stringify(pref),
    })
    const pj = await r.json()
    if (!pj.init_point) return json({ ok: false, erro: pj.message || 'falha ao criar pagamento' })
    return json({ ok: true, url: pj.init_point })
  } catch (e) { return json({ ok: false, erro: e.message }) }
}
