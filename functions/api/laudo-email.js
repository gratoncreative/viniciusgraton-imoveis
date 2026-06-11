/**
 * Envia o laudo técnico do m² por email via Resend após pagamento aprovado.
 *   POST /api/laudo-email { email, nome?, pdf_b64, filename, codigo }
 *   -> { ok:true } | { ok:false, semEmail:true } | { ok:false, erro:string }
 *
 * Requer RESEND_KEY nas variáveis de ambiente do Cloudflare Pages.
 * Domínio remetente: laudo@viniciusgraton.com.br (configure no Resend).
 */
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

export async function onRequestPost({ env, request }) {
  const key = String((env && env.RESEND_KEY) || '').trim()
  if (!key) return json({ ok: false, semEmail: true })

  const b = await request.json().catch(() => ({}))
  const email = String(b.email || '').trim().toLowerCase()
  const nome = String(b.nome || '').trim().slice(0, 80) || 'cliente'
  const pdf_b64 = String(b.pdf_b64 || '')
  const filename = String(b.filename || 'laudo-m2.pdf').replace(/[^a-z0-9._-]/gi, '').slice(0, 60) || 'laudo-m2.pdf'
  const codigo = String(b.codigo || '').replace(/[^\w-]/g, '').slice(0, 16)

  if (!emailOk(email)) return json({ error: 'email-invalido' }, 400)
  if (!pdf_b64 || pdf_b64.length < 100) return json({ error: 'pdf-vazio' }, 400)

  const body = {
    from: 'Vinícius Graton <laudo@viniciusgraton.com.br>',
    to: [email],
    subject: `Seu laudo técnico do m² — Imóvel cód. ${codigo}`,
    html: `<div style="font-family:sans-serif;color:#1a1f2b;max-width:540px;margin:0 auto">
  <div style="background:#16181e;padding:20px 24px;border-radius:12px 12px 0 0">
    <p style="color:#ecc869;font-weight:700;font-size:13px;margin:0">VINÍCIUS GRATON · IMÓVEIS</p>
    <p style="color:#a8aebb;font-size:11px;margin:4px 0 0">Rotina Imobiliária · Uberlândia/MG</p>
  </div>
  <div style="background:#f7f5f0;padding:24px;border-radius:0 0 12px 12px">
    <p style="font-size:16px;font-weight:700;margin:0 0 12px">Olá${nome ? ', ' + nome.split(' ')[0] : ''}!</p>
    <p style="color:#3a404c;line-height:1.6;margin:0 0 14px">Segue em anexo o <b>laudo técnico do valor do m²</b> referente ao imóvel de código <b>${codigo}</b>, elaborado com a metodologia <b>ABNT NBR 14653</b>.</p>
    <p style="color:#3a404c;line-height:1.6;margin:0 0 14px">Este documento pode ser usado como referência para negociação de preço e financiamento bancário.</p>
    <p style="color:#3a404c;line-height:1.6;margin:0 0 20px">Qualquer dúvida, é só me chamar pelo WhatsApp.</p>
    <a href="https://api.whatsapp.com/send?phone=5534991570494" style="display:inline-block;background:#ecc869;color:#14100a;font-weight:700;padding:12px 22px;border-radius:8px;text-decoration:none">💬 Falar com o Vinícius</a>
    <hr style="border:none;border-top:1px solid #e0d8c8;margin:24px 0 16px">
    <p style="color:#888;font-size:11px;margin:0">Vinícius Graton · Consultor de Imóveis · Rotina Imobiliária · (34) 99157-0494<br>Este é um email automático. Não responda diretamente.</p>
  </div>
</div>`,
    attachments: [{ filename, content: pdf_b64 }],
  }

  try {
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
    return json({ ok: false, erro: e.message })
  }
}
