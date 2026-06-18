import { kvStore } from '../_lib/store.js'
/**
 * Envia o ESTUDO do valor do m² por email (Resend) após pagamento aprovado.
 *   POST /api/estudo-email { email, nome?, pdf_b64, filename, codigo, payment_id }
 * Requer RESEND_KEY. Remetente: laudo@viniciusgraton.com.br.
 */
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const temKV = (env) => env && env.ENGAGEMENT && typeof env.ENGAGEMENT.get === 'function'
const MP = 'https://api.mercadopago.com'

async function verificarPagamento(env, paymentId, codigo) {
  const token = String((env && env.MP_ACCESS_TOKEN) || '').trim()
  if (!token || !paymentId) return false
  try {
    const r = await fetch(`${MP}/v1/payments/${paymentId}`, { headers: { authorization: 'Bearer ' + token } })
    const pay = await r.json()
    const aprovado = pay && pay.status === 'approved'
    const valorOk = pay && Number(pay.transaction_amount) >= 4
    const refOk = !codigo || (pay && String(pay.external_reference || '').includes(codigo))
    return !!(aprovado && valorOk && refOk)
  } catch { return false }
}

export async function onRequestPost({ env, request }) {
  env = { ...env, ENGAGEMENT: kvStore(env) }
  try {
    const key = String((env && env.RESEND_KEY) || '').trim()
    if (!key) return json({ ok: false, semEmail: true })

    const b = await request.json().catch(() => ({}))
    const email = String(b.email || '').trim().toLowerCase()
    const nome = String(b.nome || '').trim().slice(0, 80) || 'cliente'
    const pdf_b64 = String(b.pdf_b64 || '')
    const filename = String(b.filename || 'estudo-m2.pdf').replace(/[^a-z0-9._-]/gi, '').slice(0, 60) || 'estudo-m2.pdf'
    const codigo = String(b.codigo || '').replace(/[^\w-]/g, '').slice(0, 16)
    const paymentId = String(b.payment_id || '').replace(/\D/g, '')

    if (!emailOk(email)) return json({ error: 'email-invalido' }, 400)
    if (!pdf_b64 || pdf_b64.length < 100) return json({ error: 'pdf-vazio' }, 400)
    if (pdf_b64.length > 10_000_000) return json({ error: 'pdf-grande' }, 413)

    const pago = await verificarPagamento(env, paymentId, codigo)
    if (!pago) return json({ ok: false, erro: 'pagamento-nao-verificado' }, 402)

    if (temKV(env)) {
      const ip = request.headers.get('cf-connecting-ip') || 'sem-ip'
      const rlIp = 'rl:estudo-ip:' + ip
      const rlDest = 'rl:estudo-dest:' + email.replace(/[^a-z0-9@.]/g, '')
      const [usosIp, usosDest] = await Promise.all([
        env.ENGAGEMENT.get(rlIp).then(v => parseInt(v, 10) || 0),
        env.ENGAGEMENT.get(rlDest).then(v => parseInt(v, 10) || 0),
      ])
      if (usosIp >= 4) return json({ ok: false, erro: 'Muitas tentativas. Tente em 1 hora.' }, 429)
      if (usosDest >= 3) return json({ ok: false, erro: 'Já enviamos para este e-mail hoje.' }, 429)
      await Promise.all([
        env.ENGAGEMENT.put(rlIp, String(usosIp + 1), { expirationTtl: 3600 }),
        env.ENGAGEMENT.put(rlDest, String(usosDest + 1), { expirationTtl: 86400 }),
      ])
    }

    const body = {
      from: 'Vinícius Graton <laudo@viniciusgraton.com.br>',
      to: [email],
      subject: `Seu estudo do valor do m² — Imóvel cód. ${codigo}`,
      html: `<div style="font-family:sans-serif;color:#1a1f2b;max-width:540px;margin:0 auto">
  <div style="background:#16181e;padding:20px 24px;border-radius:12px 12px 0 0">
    <p style="color:#ecc869;font-weight:700;font-size:13px;margin:0">VINÍCIUS GRATON · IMÓVEIS</p>
    <p style="color:#a8aebb;font-size:11px;margin:4px 0 0">Rotina Imobiliária · Uberlândia/MG</p>
  </div>
  <div style="background:#f7f5f0;padding:24px;border-radius:0 0 12px 12px">
    <p style="font-size:16px;font-weight:700;margin:0 0 12px">Olá${nome ? ', ' + escHtml(nome.split(' ')[0]) : ''}!</p>
    <p style="color:#3a404c;line-height:1.6;margin:0 0 14px">Segue em anexo o <b>estudo do valor do m²</b> do imóvel de código <b>${codigo}</b>, com a comparação do preço pedido em relação ao mercado do bairro.</p>
    <p style="color:#3a404c;line-height:1.6;margin:0 0 20px">Use como referência na hora de negociar. Qualquer dúvida, é só me chamar no WhatsApp.</p>
    <a href="https://api.whatsapp.com/send?phone=5534991570494" style="display:inline-block;background:#ecc869;color:#14100a;font-weight:700;padding:12px 22px;border-radius:8px;text-decoration:none">💬 Falar com o Vinícius</a>
    <hr style="border:none;border-top:1px solid #e0d8c8;margin:24px 0 16px">
    <p style="color:#888;font-size:11px;margin:0">Vinícius Graton · Consultor de Imóveis · Rotina Imobiliária · (34) 99157-0494<br>Este é um email automático. Não responda diretamente.</p>
  </div>
</div>`,
      attachments: [{ filename, content: pdf_b64 }],
    }

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + key, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!r.ok) {
      const e = await r.json().catch(() => ({}))
      return json({ ok: false, erro: e.message || `Resend ${r.status}` })
    }
    return json({ ok: true })
  } catch (e) {
    console.error('estudo-email:', e)
    return json({ ok: false, erro: 'Erro interno. Tente novamente.' }, 500)
  }
}
