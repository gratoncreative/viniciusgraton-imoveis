import { kvStore } from '../_lib/store.js'
/**
 * Webhook do Mercado Pago para assinaturas da Área do Corretor.
 * Ativa o código de acesso automaticamente quando MP notifica pagamento aprovado,
 * sem depender do usuário retornar ao site (essencial para pagamentos mobile).
 *
 *   POST /api/corretor-webhook?evento=mp  (notificação do MP)  -> { ok: true }
 *   GET  /api/corretor-webhook?evento=mp  (validação do MP)    -> { ok: true }
 *
 * Requer: MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET (mesmos do impulsionar).
 */
const json = (o, s = 200) => new Response(JSON.stringify(o), {
  status: s,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
})
const MP = 'https://api.mercadopago.com'

async function verificarAssinatura(request, env, dataId) {
  const secret = String((env && env.MP_WEBHOOK_SECRET) || '').trim()
  if (!secret) return false
  const xSig = request.headers.get('x-signature') || ''
  const xReqId = request.headers.get('x-request-id') || ''
  const ts = (xSig.match(/ts=([^,]+)/) || [])[1]
  const v1 = (xSig.match(/v1=([^,]+)/) || [])[1]
  if (!ts || !v1) return false
  const partes = []
  if (dataId) partes.push('id:' + dataId)
  if (xReqId) partes.push('request-id:' + xReqId)
  partes.push('ts:' + ts)
  const manifesto = partes.join(';') + ';'
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifesto))
  const computed = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
  if (computed.length !== v1.length) return false
  let diff = 0
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ v1.charCodeAt(i)
  return diff === 0
}

const PLANOS = {
  semanal: { dias: 7,  label: 'Semanal' },
  mensal:  { dias: 30, label: 'Mensal'  },
}

function gerarCodigo(prefixo) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(10)
  crypto.getRandomValues(bytes)
  const raw = Array.from(bytes, b => chars[b % chars.length]).join('')
  return (prefixo || 'PRO') + '-' + raw.slice(0, 4) + '-' + raw.slice(4, 8) + '-' + raw.slice(8)
}

async function ativarAcesso(env, pagamento) {
  if (!env || !env.ENGAGEMENT) return
  const paymentId   = String(pagamento.id || '')
  const externalRef = String(pagamento.external_reference || '')
  if (!paymentId || !externalRef) return

  // idempotência — já ativou este pagamento?
  const ativKey = `corretor:ativado:${paymentId}`
  const jaCriado = await env.ENGAGEMENT.get(ativKey, 'json').catch(() => null)
  if (jaCriado) return // já ativo, nada a fazer

  // lê dados pendentes
  const pendKey = `corretor:pending:${externalRef}`
  const pend = await env.ENGAGEMENT.get(pendKey, 'json').catch(() => null)
  if (!pend) return // dados expiraram (> 2h) — impossível ativar

  const planoInfo = PLANOS[pend.plano] || PLANOS.mensal
  const ttl       = planoInfo.dias * 86400
  const expiresAt = Date.now() + ttl * 1000
  const codigo    = gerarCodigo(pend.plano === 'semanal' ? 'SEM' : 'MEN')

  await env.ENGAGEMENT.put(
    `corretor:code:${codigo}`,
    JSON.stringify({ nome: pend.nome, fone: pend.fone, email: pend.email || '', creci: pend.creci || '', plano: pend.plano, expiresAt, createdAt: Date.now(), paymentId }),
    { expirationTtl: ttl },
  )
  await env.ENGAGEMENT.put(
    ativKey,
    JSON.stringify({ codigo, expiresAt, nome: pend.nome, plano: pend.plano }),
    { expirationTtl: 7776000 },
  )
  await env.ENGAGEMENT.delete(pendKey).catch(() => {})
}

async function handle({ env, request }) {
  const token = String((env && env.MP_ACCESS_TOKEN) || '').trim()
  if (!token) return json({ ok: true })

  let payId = new URL(request.url).searchParams.get('data.id') || new URL(request.url).searchParams.get('id')
  if (!payId) {
    const body = await request.json().catch(() => ({}))
    payId = body?.data?.id || body?.id || null
  }
  if (!payId) return json({ ok: true })

  if (!(await verificarAssinatura(request, env, payId))) {
    console.error('corretor-webhook: assinatura inválida')
    return json({ error: 'assinatura' }, 403)
  }

  try {
    const r = await fetch(`${MP}/v1/payments/${payId}`, { headers: { authorization: 'Bearer ' + token } })
    const pay = await r.json()
    // só processa pagamentos aprovados de assinatura corretor
    if (pay && pay.status === 'approved' && pay.metadata?.tipo === 'corretor-assinatura') {
      await ativarAcesso(env, pay)
    }
  } catch (e) {
    console.error('corretor-webhook:', e)
  }
  return json({ ok: true })
}

export const onRequestPost = ({ env, request }) => handle({ env, request })
export const onRequestGet  = ({ env, request }) => handle({ env, request })
