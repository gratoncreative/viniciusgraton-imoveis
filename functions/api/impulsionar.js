import { kvStore } from '../_lib/store.js'
/**
 * Impulsionamento pago de anúncio — Mercado Pago (Checkout Pro).
 *
 *  POST /api/impulsionar { action:'criar', codigo, plano }  -> { ok, url }   (cria a preferência e devolve o link de pagamento)
 *  POST/GET /api/impulsionar?evento=mp  (webhook do Mercado Pago)            -> confirma pagamento e ATIVA o destaque
 *
 * Preço/dias são definidos AQUI no servidor (nunca confia no que o cliente envia).
 * Precisa do segredo MP_ACCESS_TOKEN (Cloudflare). Sem ele -> { naoConfigurado:true }.
 */
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
const temKV = (env) => env && env.ENGAGEMENT && typeof env.ENGAGEMENT.get === 'function'
const SITE = 'https://viniciusgraton.com.br'
const MP = 'https://api.mercadopago.com'

// Verificação de assinatura HMAC-SHA256 do Mercado Pago
// Docs: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
async function verificarAssinatura(request, env, dataId) {
  const secret = String(env.MP_WEBHOOK_SECRET || '').trim()
  if (!secret) return false // segredo obrigatório: rejeitar se não configurado
  const xSig = request.headers.get('x-signature') || ''
  const xReqId = request.headers.get('x-request-id') || ''
  const ts = (xSig.match(/ts=([^,]+)/) || [])[1]
  const v1 = (xSig.match(/v1=([^,]+)/) || [])[1]
  if (!ts || !v1) return false // header ausente → rejeitar
  // Manifesto canônico: partes não-vazias separadas por ';', terminado por ';'
  const partes = []
  if (dataId) partes.push('id:' + dataId)
  if (xReqId) partes.push('request-id:' + xReqId)
  partes.push('ts:' + ts)
  const manifesto = partes.join(';') + ';'
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifesto))
  const computed = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
  // Comparação em tempo constante (evita timing attack)
  if (computed.length !== v1.length) return false
  let diff = 0
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ v1.charCodeAt(i)
  return diff === 0
}

// planos (autoritativos no servidor)
const PLANOS = {
  p7: { nome: 'Destaque 7 dias', dias: 7, preco: 29.9 },
  p15: { nome: 'Destaque 15 dias', dias: 15, preco: 49.9 },
  p30: { nome: 'Super Destaque 30 dias', dias: 30, preco: 89.9 },
}

async function ativarDestaque(env, codigo, dias, paymentId) {
  if (!temKV(env)) return
  // Idempotência: cada pagamento só ativa uma vez
  if (paymentId) {
    const ativKey = `imp:ativado:${paymentId}`
    const jaAtivou = await env.ENGAGEMENT.get(ativKey).catch(() => null)
    if (jaAtivou) return
    await env.ENGAGEMENT.put(ativKey, '1', { expirationTtl: 7776000 })
  }
  const key = 'imovel:' + codigo
  let reg = await env.ENGAGEMENT.get(key, 'json')
  if (!reg || typeof reg !== 'object') reg = { owner: {}, campos: {} }
  reg.campos = reg.campos || {}
  reg.campos.destaque = true
  reg.campos.destaqueAte = Date.now() + dias * 86400000
  reg.impulsionadoEm = Date.now()
  await env.ENGAGEMENT.put(key, JSON.stringify(reg))
}

export async function onRequestPost({ env, request }) {
  env = { ...env, ENGAGEMENT: kvStore(env) }
  const url = new URL(request.url)
  const token = String(env.MP_ACCESS_TOKEN || '').trim()

  // ---- Webhook do Mercado Pago ----
  if (url.searchParams.get('evento') === 'mp' || url.searchParams.get('type') === 'payment' || url.searchParams.get('topic') === 'payment') {
    if (!token) return json({ ok: true })
    let payId = url.searchParams.get('data.id') || url.searchParams.get('id')
    let body = null
    if (!payId) { body = await request.json().catch(() => ({})); payId = (body && (body.data?.id || body.id)) || null }
    if (!payId) return json({ ok: true })
    // Verifica assinatura HMAC antes de processar
    if (!(await verificarAssinatura(request, env, payId))) {
      console.error('impulsionar: assinatura inválida, rejeitando webhook')
      return json({ error: 'assinatura' }, 403)
    }
    try {
      const r = await fetch(`${MP}/v1/payments/${payId}`, { headers: { authorization: 'Bearer ' + token } })
      const pay = await r.json()
      if (pay && pay.status === 'approved' && pay.external_reference) {
        const [codigo, planoId] = String(pay.external_reference).split('|')
        const plano = PLANOS[planoId]
        if (codigo && plano) await ativarDestaque(env, codigo, plano.dias, payId)
      }
    } catch {}
    return json({ ok: true })
  }

  // ---- Criar preferência de pagamento ----
  const b = await request.json().catch(() => ({}))
  if (b.action !== 'criar') return json({ error: 'acao' }, 400)
  const codigo = String(b.codigo || '').replace(/[^\w-]/g, '').slice(0, 16)
  const plano = PLANOS[b.plano]
  if (!codigo || !plano) return json({ error: 'dados', msg: 'Informe o código do imóvel e o plano.' }, 400)
  if (!token) return json({ ok: false, naoConfigurado: true })
  try {
    const pref = {
      items: [{ title: `${plano.nome} — imóvel ${codigo}`, quantity: 1, unit_price: plano.preco, currency_id: 'BRL' }],
      external_reference: `${codigo}|${b.plano}`,
      back_urls: { success: `${SITE}/impulsionar?status=sucesso`, pending: `${SITE}/impulsionar?status=pendente`, failure: `${SITE}/impulsionar?status=falha` },
      auto_return: 'approved',
      notification_url: `${SITE}/api/impulsionar?evento=mp`,
      statement_descriptor: 'VINICIUS GRATON',
      metadata: { codigo, plano: b.plano, dias: plano.dias },
    }
    const r = await fetch(`${MP}/checkout/preferences`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token }, body: JSON.stringify(pref),
    })
    const pj = await r.json()
    if (!pj.init_point) return json({ ok: false, erro: (pj.message || 'falha ao criar pagamento') })
    return json({ ok: true, url: pj.init_point })
  } catch (e) { return json({ ok: false, erro: e.message }) }
}

// MP às vezes valida o webhook por GET
export async function onRequestGet({ env, request }) {
  env = { ...env, ENGAGEMENT: kvStore(env) }
  const url = new URL(request.url)
  if (url.searchParams.get('type') === 'payment' || url.searchParams.get('topic') === 'payment' || url.searchParams.get('evento') === 'mp') {
    return onRequestPost({ env, request })
  }
  return json({ ok: true })
}
