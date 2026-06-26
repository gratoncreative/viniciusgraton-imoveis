import { kvStore } from '../_lib/store.js'
/**
 * Upload de um Tour 3D (Gaussian Splatting) por um CORRETOR cadastrado.
 * Recebe multipart/form-data { arquivo(.ply|.sog), titulo, fone, nome }.
 * Grava o arquivo no R2 (binding TOURS) e o metadado via kvStore.
 *
 * Plano grátis: 1 tour ativo por corretor, expira em 30 dias.
 * Gate: o `fone` precisa existir em corretor:fone:<fone> (cadastro grátis).
 *
 *   -> { ok:true, id, url:'/tour/<id>', expiresAt }
 *   -> { ok:false, naoConfigurado } | { ok:false, limite } | { ok:false, erro }
 */
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
const temR2 = (env) => env && env.TOURS && typeof env.TOURS.put === 'function'
const MAX = 60 * 1024 * 1024 // 60 MB
const TTL_DIAS = 30
const QUOTA_GRATIS = 1

export async function onRequestPost({ env, request }) {
  env = { ...env, ENGAGEMENT: kvStore(env) }
  try {
    if (!env.ENGAGEMENT) return json({ ok: false, erro: 'Serviço indisponível.' }, 503)
    if (!temR2(env)) return json({ ok: false, naoConfigurado: true, erro: 'O armazenamento dos tours 3D ainda não foi configurado pelo administrador.' }, 503)

    // rate-limit por IP (anti-abuso)
    const ip = request.headers.get('cf-connecting-ip') || 'sem-ip'
    const rlKey = 'rl:tour-up:' + ip
    const usos = parseInt(await env.ENGAGEMENT.get(rlKey).catch(() => null), 10) || 0
    if (usos >= 10) return json({ ok: false, erro: 'Muitas tentativas. Tente mais tarde.' }, 429)
    await env.ENGAGEMENT.put(rlKey, String(usos + 1), { expirationTtl: 3600 }).catch(() => {})

    const form = await request.formData().catch(() => null)
    if (!form) return json({ ok: false, erro: 'Envio inválido.' }, 400)
    const fone = String(form.get('fone') || '').replace(/\D/g, '').slice(0, 15)
    const nome = String(form.get('nome') || '').trim().slice(0, 80)
    const titulo = String(form.get('titulo') || '').trim().slice(0, 100) || 'Tour 3D'
    const file = form.get('arquivo')

    // gate: corretor cadastrado
    if (fone.length < 10) return json({ ok: false, erro: 'Cadastro não identificado.' }, 401)
    const reg = await env.ENGAGEMENT.get('corretor:fone:' + fone, 'json').catch(() => null)
    if (!reg || !reg.codigo) return json({ ok: false, erro: 'Faça o cadastro grátis de corretor para criar tours.' }, 401)

    // valida o arquivo
    if (!file || typeof file === 'string' || !file.name) return json({ ok: false, erro: 'Selecione o arquivo do tour.' }, 400)
    const m = String(file.name).toLowerCase().match(/\.(ply|sog)$/)
    if (!m) return json({ ok: false, erro: 'O arquivo precisa ser .ply (PLY comprimido) ou .sog — exporte assim no SuperSplat.' }, 400)
    const ext = m[1]
    if (file.size > MAX) return json({ ok: false, erro: 'Arquivo muito grande (máx. 60 MB). Reduza/otimize no SuperSplat.' }, 400)

    // quota do plano grátis: 1 tour ativo. De quebra, limpa os expirados.
    const ownerKey = 'tour:owner:' + fone
    let ids = await env.ENGAGEMENT.get(ownerKey, 'json').catch(() => null)
    if (!Array.isArray(ids)) ids = []
    const agora = Date.now()
    const mantidos = []
    let ativos = 0
    for (const tid of ids) {
      const meta = await env.ENGAGEMENT.get('tour:meta:' + tid, 'json').catch(() => null)
      if (!meta) continue
      if (meta.expiresAt && meta.expiresAt < agora) {
        try { await env.TOURS.delete(meta.r2key) } catch {}
        await env.ENGAGEMENT.delete('tour:meta:' + tid).catch(() => {})
        continue
      }
      mantidos.push(tid); ativos++
    }
    if (ativos >= QUOTA_GRATIS) {
      await env.ENGAGEMENT.put(ownerKey, JSON.stringify(mantidos)).catch(() => {})
      return json({ ok: false, limite: true, erro: 'No plano grátis você mantém 1 tour ativo. Exclua o atual para criar outro (ou faça upgrade em breve).' }, 403)
    }

    // grava no R2
    const id = agora.toString(36) + Math.random().toString(36).slice(2, 8)
    const r2key = `tours/${fone}/${id}.${ext}`
    const buf = await file.arrayBuffer()
    await env.TOURS.put(r2key, buf, { httpMetadata: { contentType: 'application/octet-stream' } })

    const meta = { id, ownerFone: fone, ownerNome: nome || reg.nome || '', titulo, r2key, ext, size: file.size, plano: 'gratis', createdAt: agora, expiresAt: agora + TTL_DIAS * 86400000, views: 0 }
    await env.ENGAGEMENT.put('tour:meta:' + id, JSON.stringify(meta))
    mantidos.push(id)
    await env.ENGAGEMENT.put(ownerKey, JSON.stringify(mantidos)).catch(() => {})

    return json({ ok: true, id, url: '/tour/' + id, expiresAt: meta.expiresAt })
  } catch (e) {
    console.error('tour3d-upload:', e)
    return json({ ok: false, erro: 'Erro interno ao subir o tour.' }, 500)
  }
}
