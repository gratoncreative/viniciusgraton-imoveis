import { kvStore } from '../_lib/store.js'
/**
 * Ativa o teste gratuito de 24h da Área do Corretor.
 * Uma única vez por número de WhatsApp — validado no KV.
 *
 *   POST /api/corretor-trial { nome, fone }
 *     -> { ok: true, codigo, expiresAt }       (trial novo)
 *     -> { ok: true, codigo, expiresAt, ativo } (trial ainda ativo — devolve o mesmo código)
 *     -> { ok: false, expirado: true }          (trial já foi usado e expirou)
 *     -> { ok: false, erro }
 */
const json = (o, s = 200) => new Response(JSON.stringify(o), {
  status: s,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
})

const TTL = 86400 // 24 horas

function gerarCodigo() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  const raw = Array.from(bytes, b => chars[b % chars.length]).join('')
  return 'TRIAL-' + raw.slice(0, 4) + raw.slice(4)
}

export async function onRequestPost({ request, env }) {
  env = { ...env, ENGAGEMENT: kvStore(env) }
  try {
    if (!env || !env.ENGAGEMENT) return json({ ok: false, erro: 'Serviço indisponível.' })

    // rate-limit por IP: máx 3 tentativas/hora
    const ip = request.headers.get('cf-connecting-ip') || 'sem-ip'
    const rlKey = 'rl:trial:' + ip
    const usos = parseInt(await env.ENGAGEMENT.get(rlKey).catch(() => null), 10) || 0
    if (usos >= 3) return json({ ok: false, erro: 'Muitas tentativas. Tente em 1 hora.' }, 429)
    await env.ENGAGEMENT.put(rlKey, String(usos + 1), { expirationTtl: 3600 })

    let b = {}
    try { b = await request.json() } catch {}

    const nome = String(b.nome || '').trim().slice(0, 80)
    const fone = String(b.fone || '').replace(/\D/g, '').slice(0, 15)

    if (nome.length < 3) return json({ ok: false, erro: 'Informe seu nome completo.' }, 400)
    if (fone.length < 10) return json({ ok: false, erro: 'WhatsApp inválido.' }, 400)

    const trialKey = `corretor:trial:${fone}`

    // Verifica se já existe um trial para esse número
    const existente = await env.ENGAGEMENT.get(trialKey, 'json').catch(() => null)

    if (existente) {
      const agora = Date.now()
      if (agora < existente.expiresAt) {
        // Trial ainda ativo — devolve o código existente
        return json({ ok: true, codigo: existente.codigo, expiresAt: existente.expiresAt, ativo: true })
      } else {
        // Trial já expirou
        return json({ ok: false, expirado: true })
      }
    }

    // Novo trial — gera código
    const codigo = gerarCodigo()
    const expiresAt = Date.now() + TTL * 1000

    // Salva no KV como código de acesso válido (mesmo formato dos assinantes pagos)
    await env.ENGAGEMENT.put(
      `corretor:code:${codigo}`,
      JSON.stringify({ nome, fone, plano: 'trial', expiresAt, createdAt: Date.now() }),
      { expirationTtl: TTL },
    )

    // Marca o número como trial usado (expira junto)
    await env.ENGAGEMENT.put(
      trialKey,
      JSON.stringify({ codigo, expiresAt, nome }),
      { expirationTtl: TTL },
    )

    return json({ ok: true, codigo, expiresAt })
  } catch (e) {
    console.error('corretor-trial:', e)
    return json({ error: 'interno' }, 500)
  }
}
