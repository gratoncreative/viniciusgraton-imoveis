/**
 * Cria a cobrança no Mercado Pago para assinatura da Área do Corretor.
 * O preço é definido AQUI (servidor) — nunca confia no cliente.
 *
 *   POST /api/corretor-checkout { nome, fone, email, creci, plano }
 *     -> { ok: true, url } | { ok: false, erro }
 *
 * Planos: "semanal" (R$15 / 7 dias) | "mensal" (R$49,90 / 30 dias)
 * Após pagamento aprovado, MP redireciona para /corretor com payment_id + external_reference.
 */
const json = (o, s = 200) => new Response(JSON.stringify(o), {
  status: s,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
})

const SITE = 'https://viniciusgraton.com.br'
const MP = 'https://api.mercadopago.com'

const PLANOS = {
  semanal: { preco: 15.0,  dias: 7,  label: 'Semanal — 7 dias' },
  mensal:  { preco: 49.9,  dias: 30, label: 'Mensal — 30 dias' },
}

function gerarTempId() {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

const temKV = (env) => !!(env && env.ENGAGEMENT)
const lim = (s, n) => String(s || '').trim().slice(0, n)

export async function onRequestPost({ request, env }) {
  const token = String((env && env.MP_ACCESS_TOKEN) || '').trim()
  if (!token) return json({ ok: false, naoConfigurado: true })

  let b = {}
  try { b = await request.json() } catch {}

  const nome  = lim(b.nome, 80)
  const fone  = String(b.fone || '').replace(/\D/g, '').slice(0, 15)
  const email = lim(b.email, 120)
  const creci = lim(b.creci, 20)
  const plano = String(b.plano || '').toLowerCase()

  if (nome.length < 3) return json({ ok: false, erro: 'Informe seu nome completo.' }, 400)
  if (fone.length < 10) return json({ ok: false, erro: 'WhatsApp inválido.' }, 400)
  if (!PLANOS[plano]) return json({ ok: false, erro: 'Plano inválido.' }, 400)

  const { preco, label } = PLANOS[plano]
  const tempId = gerarTempId()

  // Salva dados pendentes no KV (expira em 2h se pagamento não for feito)
  if (temKV(env)) {
    await env.ENGAGEMENT.put(
      `corretor:pending:${tempId}`,
      JSON.stringify({ nome, fone, email, creci, plano, preco, createdAt: Date.now() }),
      { expirationTtl: 7200 },
    )
  }

  try {
    const pref = {
      items: [{
        title: `Área do Corretor · ${label}`,
        quantity: 1,
        unit_price: preco,
        currency_id: 'BRL',
      }],
      external_reference: tempId,
      payer: { name: nome, phone: { number: fone }, email: email || undefined },
      back_urls: {
        success: `${SITE}/corretor`,
        pending: `${SITE}/corretor?pg_pendente=1`,
        failure: `${SITE}/corretor?pg_falha=1`,
      },
      auto_return: 'approved',
      statement_descriptor: 'VINIC GRATON',
      metadata: { tipo: 'corretor-assinatura', plano, tempId },
    }

    const r = await fetch(`${MP}/checkout/preferences`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
      body: JSON.stringify(pref),
    })
    const pj = await r.json()
    if (!pj.init_point) return json({ ok: false, erro: pj.message || 'Falha ao criar pagamento.' })
    return json({ ok: true, url: pj.init_point })
  } catch (e) {
    return json({ ok: false, erro: e.message })
  }
}
