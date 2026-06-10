/**
 * Verifica no Mercado Pago se o pagamento do laudo foi APROVADO (servidor).
 *   GET /api/laudo-verificar?payment_id=<id>&codigo=<cod> -> { ok:true|false }
 * Só libera a geração do PDF quando o pagamento está aprovado e o valor confere.
 */
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
const MP = 'https://api.mercadopago.com'

export async function onRequestGet({ env, request }) {
  const url = new URL(request.url)
  const token = String((env && env.MP_ACCESS_TOKEN) || '').trim()
  const payId = String(url.searchParams.get('payment_id') || url.searchParams.get('collection_id') || '').replace(/\D/g, '')
  const codigo = String(url.searchParams.get('codigo') || '').replace(/[^\w-]/g, '')
  if (!token) return json({ ok: false, naoConfigurado: true })
  if (!payId) return json({ ok: false })
  try {
    const r = await fetch(`${MP}/v1/payments/${payId}`, { headers: { authorization: 'Bearer ' + token } })
    const pay = await r.json()
    const aprovado = pay && pay.status === 'approved'
    const valorOk = pay && Number(pay.transaction_amount) >= 29
    const refOk = !codigo || (pay && String(pay.external_reference || '').includes(codigo))
    return json({ ok: !!(aprovado && valorOk && refOk) })
  } catch (e) { return json({ ok: false, erro: e.message }) }
}
