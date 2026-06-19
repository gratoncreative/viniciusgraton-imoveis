import { kvStore } from '../_lib/store.js'
/**
 * Cadastro GRATUITO e self-service da Área do Corretor.
 * O corretor preenche nome + WhatsApp (CRECI/e-mail opcionais) e ganha acesso
 * PERMANENTE (sem expiração) a todas as ferramentas. Reaproveita o mesmo formato
 * de "código de acesso" dos planos pagos (corretor:code:<codigo>), mas sem TTL.
 *
 * Um cadastro por número de WhatsApp — se já existir, devolve o mesmo código
 * (login em outro dispositivo). Registra também em corretor:reg:<id> para o
 * Vinícius ver quem se cadastrou no /admin.
 *
 *   POST /api/corretor-cadastro { nome, fone, creci?, email?, imobiliaria? }
 *     -> { ok: true, codigo, nome, jaCadastrado? }
 *     -> { ok: false, erro }
 */
const json = (o, s = 200) => new Response(JSON.stringify(o), {
  status: s,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
})

function gerarCodigo() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(10)
  crypto.getRandomValues(bytes)
  return 'VG' + Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

export async function onRequestPost({ request, env }) {
  env = { ...env, ENGAGEMENT: kvStore(env) }
  try {
    if (!env || !env.ENGAGEMENT) return json({ ok: false, erro: 'Serviço indisponível.' })

    // rate-limit por IP: máx 5 cadastros/hora (anti-spam)
    const ip = request.headers.get('cf-connecting-ip') || 'sem-ip'
    const rlKey = 'rl:corretor-cad:' + ip
    const usos = parseInt(await env.ENGAGEMENT.get(rlKey).catch(() => null), 10) || 0
    if (usos >= 5) return json({ ok: false, erro: 'Muitas tentativas. Tente em 1 hora.' }, 429)
    await env.ENGAGEMENT.put(rlKey, String(usos + 1), { expirationTtl: 3600 }).catch(() => {})

    let b = {}
    try { b = await request.json() } catch {}
    if (b.site) return json({ ok: true, codigo: '', nome: '' }) // honeypot

    const nome = String(b.nome || '').trim().slice(0, 80)
    const fone = String(b.fone || '').replace(/\D/g, '').slice(0, 15)
    const creci = String(b.creci || '').trim().slice(0, 30)
    const email = String(b.email || '').trim().slice(0, 120)
    const imobiliaria = String(b.imobiliaria || '').trim().slice(0, 80)

    if (nome.length < 3) return json({ ok: false, erro: 'Informe seu nome completo.' }, 400)
    if (fone.length < 10) return json({ ok: false, erro: 'WhatsApp inválido (com DDD).' }, 400)

    // Um cadastro por número — devolve o código existente (re-login)
    const foneKey = `corretor:fone:${fone}`
    const existente = await env.ENGAGEMENT.get(foneKey, 'json').catch(() => null)
    if (existente && existente.codigo) {
      return json({ ok: true, codigo: existente.codigo, nome: existente.nome || nome, jaCadastrado: true })
    }

    // Novo cadastro — código permanente (sem expiração)
    const codigo = gerarCodigo()
    const createdAt = Date.now()
    const dados = { nome, fone, creci, email, imobiliaria, plano: 'gratis', expiresAt: null, createdAt }

    // 1. código de acesso válido (mesmo formato dos pagos, porém sem TTL)
    await env.ENGAGEMENT.put(`corretor:code:${codigo}`, JSON.stringify(dados))
    // 2. dedupe por número
    await env.ENGAGEMENT.put(foneKey, JSON.stringify({ codigo, nome }))
    // 3. registro para o painel /admin
    const id = createdAt + '-' + Math.random().toString(36).slice(2, 8)
    await env.ENGAGEMENT.put(`corretor:reg:${id}`, JSON.stringify({ ...dados, id, codigo, data: new Date(createdAt).toISOString() }))

    return json({ ok: true, codigo, nome })
  } catch (e) {
    console.error('corretor-cadastro:', e)
    return json({ ok: false, erro: 'Erro interno. Tente novamente.' }, 500)
  }
}
