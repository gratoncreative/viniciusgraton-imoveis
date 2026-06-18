import { kvStore } from '../_lib/store.js'
/**
 * Ativa o código de acesso após pagamento aprovado no Mercado Pago.
 * Chamado automaticamente quando o usuário retorna da tela de pagamento do MP.
 *
 *   POST /api/corretor-ativar { payment_id, external_reference }
 *     -> { ok: true, codigo, expiresAt, nome, plano }
 *     -> { ok: false, erro, pendente?: true }
 */
const json = (o, s = 200) => new Response(JSON.stringify(o), {
  status: s,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
})

const MP = 'https://api.mercadopago.com'

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

export async function onRequestPost({ request, env }) {
  env = { ...env, ENGAGEMENT: kvStore(env) }
  const token = String((env && env.MP_ACCESS_TOKEN) || '').trim()
  if (!token) return json({ ok: false, erro: 'Serviço não configurado.' })
  if (!env || !env.ENGAGEMENT) return json({ ok: false, erro: 'KV indisponível.' })

  let b = {}
  try { b = await request.json() } catch {}

  const paymentId      = String(b.payment_id || '').trim()
  const externalRef    = String(b.external_reference || '').trim()

  if (!paymentId || !externalRef) return json({ ok: false, erro: 'Dados incompletos.' }, 400)

  // 1. Verifica o pagamento no MP
  let pagamento
  try {
    const r = await fetch(`${MP}/v1/payments/${paymentId}`, {
      headers: { authorization: 'Bearer ' + token },
    })
    pagamento = await r.json()
  } catch (e) {
    return json({ ok: false, erro: 'Falha ao verificar pagamento: ' + e.message })
  }

  if (pagamento.status !== 'approved') {
    return json({ ok: false, erro: 'Pagamento não aprovado.', pendente: pagamento.status === 'pending' })
  }

  // 2. Garante que o external_reference do MP bate com o enviado (segurança)
  if (pagamento.external_reference !== externalRef) {
    return json({ ok: false, erro: 'Referência inválida.' }, 400)
  }

  // 3. Idempotência — já foi ativado antes?
  const ativKey = `corretor:ativado:${paymentId}`
  const jaCriado = await env.ENGAGEMENT.get(ativKey, 'json').catch(() => null)
  if (jaCriado) {
    return json({ ok: true, codigo: jaCriado.codigo, expiresAt: jaCriado.expiresAt, nome: jaCriado.nome, plano: jaCriado.plano })
  }

  // 4. Lê os dados pendentes do KV
  const pendKey = `corretor:pending:${externalRef}`
  const pend = await env.ENGAGEMENT.get(pendKey, 'json').catch(() => null)
  if (!pend) return json({ ok: false, erro: 'Dados do cadastro não encontrados. O pagamento foi aprovado — entre em contato pelo WhatsApp informando o ID ' + paymentId + '.' })

  const planoInfo = PLANOS[pend.plano] || PLANOS.mensal
  const ttl       = planoInfo.dias * 86400
  const expiresAt = Date.now() + ttl * 1000
  const codigo    = gerarCodigo(pend.plano === 'semanal' ? 'SEM' : 'MEN')

  // 5. Grava o código de acesso no KV com TTL automático
  await env.ENGAGEMENT.put(
    `corretor:code:${codigo}`,
    JSON.stringify({ nome: pend.nome, fone: pend.fone, email: pend.email || '', creci: pend.creci || '', plano: pend.plano, expiresAt, createdAt: Date.now(), paymentId }),
    { expirationTtl: ttl },
  )

  // 6. Marca pagamento como ativado (idempotência, TTL 90 dias)
  await env.ENGAGEMENT.put(
    ativKey,
    JSON.stringify({ codigo, expiresAt, nome: pend.nome, plano: pend.plano }),
    { expirationTtl: 7776000 },
  )

  // 7. Remove o pending (limpeza — ignora erro se já expirou)
  await env.ENGAGEMENT.delete(pendKey).catch(() => {})

  return json({ ok: true, codigo, expiresAt, nome: pend.nome, plano: pend.plano })
}
