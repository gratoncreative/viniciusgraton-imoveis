/**
 * Cloudflare Pages Function — Painel ADMIN do Vinícius (seguro).
 *
 * AUTENTICAÇÃO:
 *  - Se existir `admin:auth` no KV (definido pelo painel), a senha é verificada
 *    por HASH PBKDF2 (salt + 100k iterações) e o token é assinado com uma chave
 *    secreta aleatória (tokenKey) guardada só no KV — impossível de forjar.
 *  - Senão (bootstrap), cai para a variável de ambiente ADMIN_PASS.
 *  - Trocar a senha pelo painel (action 'set-password') grava o hash no KV e
 *    passa a IGNORAR a ADMIN_PASS antiga (rotação real, sem mexer na Cloudflare).
 *
 *   POST /api/admin { action:'login', email, senha }            -> { ok, token }
 *   POST /api/admin { action:'data', token }                    -> { anuncios, leads, clientes }
 *   POST /api/admin { action:'del', token, key }                -> { ok }
 *   POST /api/admin { action:'aprovar', token, key, aprovado }  -> { ok }
 *   POST /api/admin { action:'patch', token, key, patch }       -> { ok }
 *   POST /api/admin { action:'set-password', token, novaSenha } -> { ok }
 */
const ADMIN_EMAIL_DEFAULT = 'contato@viniciusgraton.com.br'
const TTL_MS = 12 * 60 * 60 * 1000
const ORIGIN = 'https://viniciusgraton.com.br'
const originOk = (req) => { const o = req.headers.get('origin'); return !o || o === ORIGIN }

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
const temKV = (env) => env && env.ENGAGEMENT && typeof env.ENGAGEMENT.get === 'function'
const enc = new TextEncoder()
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const fromHex = (h) => new Uint8Array((h.match(/.{2}/g) || []).map((x) => parseInt(x, 16)))
const eqStr = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

async function pbkdf2(password, saltHex, iter) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: fromHex(saltHex), iterations: iter, hash: 'SHA-256' }, key, 256)
  return toHex(bits)
}
async function hmacHex(key, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(msg))
  return toHex(sig)
}
async function makeToken(signKey) {
  const exp = Date.now() + TTL_MS
  return `${exp}.${await hmacHex(signKey, String(exp))}`
}
async function validToken(signKey, token) {
  if (!signKey || !token || typeof token !== 'string' || token.indexOf('.') < 0) return false
  const [exp, sig] = token.split('.')
  if (!exp || !sig || Date.now() > Number(exp)) return false
  return eqStr(await hmacHex(signKey, exp), sig)
}
async function getAuth(env) {
  if (!temKV(env)) return null
  try { return await env.ENGAGEMENT.get('admin:auth', 'json') } catch { return null }
}

export async function onRequestPost({ env, request }) {
  try {
  if (!originOk(request)) return json({ error: 'origem' }, 403)
  const email = String(env.ADMIN_EMAIL || ADMIN_EMAIL_DEFAULT).trim().toLowerCase()
  const b = await request.json().catch(() => ({}))
  const action = b.action
  const auth = await getAuth(env)
  const signKey = (auth && auth.tokenKey) || env.ADMIN_PASS || null

  if (action === 'login') {
    if (!auth && !env.ADMIN_PASS) return json({ error: 'config', msg: 'Defina a variável ADMIN_PASS na Cloudflare (ou troque a senha pelo painel) para ativar o login.' }, 503)
    // proteção contra força-bruta: máx. 5 tentativas falhas por IP a cada 15 min
    const kv = env && env.ENGAGEMENT && typeof env.ENGAGEMENT.get === 'function' ? env.ENGAGEMENT : null
    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'sem-ip'
    const rlKey = 'rl:adminlogin:' + ip
    if (kv) {
      const tentativas = parseInt(await kv.get(rlKey), 10) || 0
      if (tentativas >= 5) return json({ error: 'limite', msg: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' }, 429)
    }
    const okEmail = String(b.email || '').trim().toLowerCase() === email
    let okPass = false
    if (auth) okPass = eqStr(await pbkdf2(String(b.senha || ''), auth.salt, auth.iter), auth.hash)
    else okPass = eqStr(String(b.senha || ''), String(env.ADMIN_PASS))
    if (!okEmail || !okPass) {
      if (kv) { const t = parseInt(await kv.get(rlKey), 10) || 0; try { await kv.put(rlKey, String(t + 1), { expirationTtl: 900 }) } catch {} }
      await new Promise((r) => setTimeout(r, 600)) // atraso fixo contra brute-force
      return json({ error: 'credenciais', msg: 'E-mail ou senha incorretos.' }, 401)
    }
    if (kv) { try { await kv.delete(rlKey) } catch {} }
    return json({ ok: true, token: await makeToken(signKey) })
  }

  // Demais ações exigem token válido
  if (!signKey) return json({ error: 'config' }, 503)
  const token = b.token || (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!(await validToken(signKey, token))) return json({ error: 'sessao', msg: 'Sessão expirada. Faça login de novo.' }, 401)
  if (!temKV(env)) return json({ error: 'kv', msg: 'Banco (KV) não configurado neste ambiente.' }, 200)

  if (action === 'set-password') {
    const nova = String(b.novaSenha || '')
    if (nova.length < 8) return json({ error: 'curta', msg: 'A nova senha precisa ter pelo menos 8 caracteres.' }, 400)
    const salt = toHex(crypto.getRandomValues(new Uint8Array(16)))
    const iter = 100000
    const hash = await pbkdf2(nova, salt, iter)
    const tokenKey = toHex(crypto.getRandomValues(new Uint8Array(32)))
    await env.ENGAGEMENT.put('admin:auth', JSON.stringify({ salt, hash, iter, tokenKey, atualizadoEm: Date.now() }))
    return json({ ok: true, novoToken: await makeToken(tokenKey) })
  }

  if (action === 'publicar-social') {
    const fotos = (Array.isArray(b.fotos) ? b.fotos : []).filter((u) => typeof u === 'string' && /^https?:/.test(u)).slice(0, 10)
    const legenda = String(b.legenda || '').slice(0, 2200)
    const redes = b.redes || { ig: true, fb: true }
    const metaToken = String(env.META_TOKEN || '')
    const igUser = String(env.IG_USER_ID || '')
    const fbPage = String(env.FB_PAGE_ID || '')
    if (!fotos.length) return json({ error: 'fotos', msg: 'Sem fotos para publicar.' }, 400)
    if (!metaToken || (redes.ig && !igUser) || (redes.fb && !fbPage)) return json({ error: 'config', msg: 'Configure META_TOKEN + IG_USER_ID/FB_PAGE_ID nas variáveis do Cloudflare.' }, 503)
    // normaliza p/ 4:5 (1080x1350) c/ fundo branco — atende a proporção exigida pelo Instagram (proxy grátis)
    const norm = (u) => `https://images.weserv.nl/?url=${encodeURIComponent(u.replace(/^https?:\/\//, ''))}&w=1080&h=1350&fit=contain&cbg=ffffff`
    const G = 'https://graph.facebook.com/v19.0'
    const out = {}
    if (redes.ig && igUser) {
      try {
        const ids = []
        for (const f of fotos) {
          const r = await fetch(`${G}/${igUser}/media`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ image_url: norm(f), is_carousel_item: true, access_token: metaToken }) })
          const j = await r.json(); if (j.id) ids.push(j.id); else throw new Error((j.error && j.error.message) || 'falha na foto')
        }
        const c = await fetch(`${G}/${igUser}/media`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ media_type: 'CAROUSEL', children: ids, caption: legenda, access_token: metaToken }) })
        const cj = await c.json(); if (!cj.id) throw new Error((cj.error && cj.error.message) || 'falha no carrossel')
        const p = await fetch(`${G}/${igUser}/media_publish`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ creation_id: cj.id, access_token: metaToken }) })
        const pj = await p.json(); out.instagram = pj.id ? { ok: true, id: pj.id } : { ok: false, erro: (pj.error && pj.error.message) || 'falha ao publicar' }
      } catch (e) { out.instagram = { ok: false, erro: e.message } }
    }
    if (redes.fb && fbPage) {
      try {
        const att = []
        for (const f of fotos) {
          const r = await fetch(`${G}/${fbPage}/photos`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: f, published: false, access_token: metaToken }) })
          const j = await r.json(); if (j.id) att.push({ media_fbid: j.id })
        }
        const post = await fetch(`${G}/${fbPage}/feed`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: legenda, attached_media: att, access_token: metaToken }) })
        const pj = await post.json(); out.facebook = pj.id ? { ok: true, id: pj.id } : { ok: false, erro: (pj.error && pj.error.message) || 'falha ao publicar' }
      } catch (e) { out.facebook = { ok: false, erro: e.message } }
    }
    return json({ ok: true, resultados: out })
  }

  if (action === 'data') {
    const out = { anuncios: [], leads: [], clientes: [], news: [] }
    const fontes = [['anuncio:', 'anuncios'], ['lead:', 'leads'], ['conta:', 'clientes'], ['news:', 'news']]
    for (const [prefix, arr] of fontes) {
      const lista = await env.ENGAGEMENT.list({ prefix })
      for (const k of (lista?.keys || [])) {
        const v = await env.ENGAGEMENT.get(k.name, 'json')
        if (v) { v._key = k.name; out[arr].push(v) }
      }
    }
    out.anuncios.sort((a, b) => (b.ts || 0) - (a.ts || 0))
    out.leads.sort((a, b) => (b.ts || 0) - (a.ts || 0))
    out.clientes.sort((a, b) => (b.atualizadoEm || 0) - (a.atualizadoEm || 0))
    out.news.sort((a, b) => (b.ts || 0) - (a.ts || 0))
    out.aprovados = []
    const apr = await env.ENGAGEMENT.list({ prefix: 'aprovado:' })
    for (const k of (apr?.keys || [])) out.aprovados.push(k.name.slice('aprovado:'.length))
    // resumo do CRM — usa metadata do KV (sem carregar o valor completo, que pode ter fotos grandes)
    out.crmTotal = 0; out.crmNovos = 0; out.crmNovidades = 0
    const crm = await env.ENGAGEMENT.list({ prefix: 'crm:' })
    const crmKeys = crm?.keys || []
    out.crmTotal = crmKeys.length
    for (const k of crmKeys) {
      if (k.metadata?.novo) out.crmNovos++
      if (k.metadata?.temNovidade) out.crmNovidades++
    }
    return json(out)
  }

  if (action === 'del') {
    const key = String(b.key || '')
    if (!/^(anuncio|lead|conta|news):/.test(key)) return json({ error: 'key invalida' }, 400)
    await env.ENGAGEMENT.delete(key)
    return json({ ok: true })
  }

  if (action === 'aprovar') {
    const key = String(b.key || '')
    if (!/^anuncio:/.test(key)) return json({ error: 'key invalida' }, 400)
    const v = await env.ENGAGEMENT.get(key, 'json')
    if (!v) return json({ error: 'nao encontrado' }, 404)
    v.aprovado = b.aprovado !== false
    await env.ENGAGEMENT.put(key, JSON.stringify(v))
    return json({ ok: true, aprovado: v.aprovado })
  }

  // Atualiza campos de GESTÃO (CRM) num registro: status e nota (leads/anúncios/contas)
  if (action === 'patch') {
    const key = String(b.key || '')
    if (!/^(anuncio|lead|conta|news):/.test(key)) return json({ error: 'key invalida' }, 400)
    const v = await env.ENGAGEMENT.get(key, 'json')
    if (!v) return json({ error: 'nao encontrado' }, 404)
    const patch = b.patch && typeof b.patch === 'object' ? b.patch : {}
    if ('status' in patch) v.status = String(patch.status || '').slice(0, 24)
    if ('nota' in patch) v.nota = String(patch.nota || '').slice(0, 1200)
    if ('aprovado' in patch) v.aprovado = patch.aprovado !== false
    await env.ENGAGEMENT.put(key, JSON.stringify(v))
    return json({ ok: true })
  }

  // Edição de imóvel publicado + dados do PROPRIETÁRIO (confidenciais, só admin)
  if (action === 'imovel-get') {
    const codigo = String(b.codigo || '').slice(0, 12)
    if (!codigo) return json({ error: 'codigo' }, 400)
    const v = await env.ENGAGEMENT.get('imovel:' + codigo, 'json')
    return json({ ok: true, registro: v || null })
  }
  if (action === 'imovel-save') {
    const codigo = String(b.codigo || '').slice(0, 12)
    if (!codigo) return json({ error: 'codigo' }, 400)
    const o = b.owner && typeof b.owner === 'object' ? b.owner : {}
    const owner = { nome: String(o.nome || '').slice(0, 120), email: String(o.email || '').slice(0, 160), fone: String(o.fone || '').slice(0, 40) }
    const c = b.campos && typeof b.campos === 'object' ? b.campos : {}
    const campos = {}
    for (const k of ['preco', 'precoAnterior', 'quartos', 'suites', 'banheiros', 'vagas', 'area']) if (k in c) campos[k] = Number(c[k]) || 0
    for (const k of ['tipo', 'bairro', 'descricao']) if (k in c) campos[k] = String(c[k] || '').slice(0, 3000)
    for (const k of ['destaque', 'oculto']) if (k in c) campos[k] = !!c[k]
    // apartamento: andar (0 = térreo) e elevador (true/false). Só grava se informado.
    if (c.andar !== '' && c.andar !== null && c.andar !== undefined) campos.andar = Number(c.andar) || 0
    if (typeof c.elevador === 'boolean') campos.elevador = c.elevador
    if (Array.isArray(c.fotos)) campos.fotos = c.fotos.filter((s) => typeof s === 'string').slice(0, 40).map((s) => s.slice(0, 300))
    await env.ENGAGEMENT.put('imovel:' + codigo, JSON.stringify({ owner, campos, atualizadoEm: Date.now() }))
    return json({ ok: true })
  }

  // Upload de foto nova do imóvel: recebe data URL (já redimensionada no navegador),
  // guarda a imagem no KV do próprio dono e devolve a URL pública servida por /api/img.
  if (action === 'img-upload') {
    const codigo = String(b.codigo || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)
    if (!codigo) return json({ error: 'codigo' }, 400)
    const dataUrl = String(b.dataUrl || '')
    const m = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/)
    if (!m) return json({ error: 'imagem', msg: 'Formato de imagem inválido (use JPG, PNG ou WEBP).' }, 400)
    const ct = m[1]
    const b64 = m[2]
    if (b64.length > 2200000) return json({ error: 'grande', msg: 'Imagem muito grande. Tente uma com menos resolução.' }, 413)
    const id = `imgupload:${codigo}:${crypto.randomUUID()}`
    await env.ENGAGEMENT.put(id, JSON.stringify({ ct, b64, codigo, ts: Date.now() }))
    return json({ ok: true, url: `/api/img?id=${id}` })
  }

  // Aprovar (publicar) ou recusar um imóvel IMPORTADO que está pendente.
  if (action === 'imovel-aprovar') {
    const codigo = String(b.codigo || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)
    if (!codigo) return json({ error: 'codigo' }, 400)
    if (b.aprovado === false) await env.ENGAGEMENT.delete('aprovado:' + codigo)
    else await env.ENGAGEMENT.put('aprovado:' + codigo, JSON.stringify({ ts: Date.now() }))
    return json({ ok: true, aprovado: b.aprovado !== false })
  }

  // ————— CRM "Meus clientes" (preferências + sugestões + página personalizada) —————
  if (action === 'crm-list') {
    const out = []
    const lista = await env.ENGAGEMENT.list({ prefix: 'crm:' })
    for (const k of (lista?.keys || [])) {
      const v = await env.ENGAGEMENT.get(k.name, 'json')
      if (v) {
        // Strip foto (can be up to 700KB base64) — loaded lazily via crm-get when editing
        const { foto, ...rest } = v
        out.push(foto ? { ...rest, temFoto: true } : rest)
      }
    }
    out.sort((a, b) => (b.atualizadoEm || 0) - (a.atualizadoEm || 0))
    return json({ ok: true, clientes: out })
  }
  if (action === 'crm-get') {
    const id = String(b.id || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40)
    if (!id) return json({ error: 'id' }, 400)
    const v = await env.ENGAGEMENT.get('crm:' + id, 'json')
    return json({ ok: true, cliente: v || null })
  }
  if (action === 'crm-save') {
    const c = b.cliente && typeof b.cliente === 'object' ? b.cliente : {}
    const wa = String(c.whatsapp || '').replace(/\D/g, '').slice(0, 15)
    if (wa.length < 10) return json({ error: 'whatsapp', msg: 'Informe o WhatsApp com DDD (obrigatório).' }, 400)
    let id = String(c.id || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40)
    let reg = {}
    if (id) reg = (await env.ENGAGEMENT.get('crm:' + id, 'json')) || {}
    else id = crypto.randomUUID()
    const lim = (s, n) => String(s == null ? '' : s).slice(0, n)
    const arrStr = (a, max, n) => (Array.isArray(a) ? a.filter((x) => typeof x === 'string').slice(0, max).map((x) => lim(x, n)) : [])
    const novo = {
      id, criadoEm: reg.criadoEm || Date.now(), atualizadoEm: Date.now(),
      nome: lim(c.nome, 80), whatsapp: wa, finalidade: lim(c.finalidade, 20),
      tipos: arrStr(c.tipos, 8, 30), bairros: arrStr(c.bairros, 20, 40),
      precoMin: Number(c.precoMin) || 0, precoMax: Number(c.precoMax) || 0,
      quartosMin: Number(c.quartosMin) || 0, suitesMin: Number(c.suitesMin) || 0,
      vagasMin: Number(c.vagasMin) || 0, areaMin: Number(c.areaMin) || 0,
      obs: lim(c.obs, 1500), sugeridos: arrStr(c.sugeridos, 40, 12),
      nota: lim(c.nota, 1000), status: lim(c.status, 24),
      foto: lim(c.foto, 700000), // dataURL da foto do cliente (JPEG ~480px)
      // preserva o que o PRÓPRIO cliente refinou na página dele (nunca sobrescrever no save do admin)
      feedback: reg.feedback && typeof reg.feedback === 'object' ? reg.feedback : {},
      refinadoEm: reg.refinadoEm || 0,
      // origem/prazo vêm do chat de busca; ao salvar, deixa de ser "novo"
      origem: reg.origem || lim(c.origem, 20) || '',
      prazo: lim(c.prazo, 40) || reg.prazo || '',
      novo: false,
      ultimaAcaoEm: reg.ultimaAcaoEm || 0,
      temNovidade: false, // ao salvar, o Vinícius já viu
    }
    await env.ENGAGEMENT.put('crm:' + id, JSON.stringify(novo), { metadata: { novo: false, temNovidade: false } })
    return json({ ok: true, cliente: novo })
  }
  if (action === 'crm-visto') {
    const id = String(b.id || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40)
    if (id) { const r = await env.ENGAGEMENT.get('crm:' + id, 'json'); if (r && r.temNovidade) { r.temNovidade = false; await env.ENGAGEMENT.put('crm:' + id, JSON.stringify(r), { metadata: { novo: !!r.novo, temNovidade: false } }) } }
    return json({ ok: true })
  }
  if (action === 'crm-del') {
    const id = String(b.id || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40)
    if (id) await env.ENGAGEMENT.delete('crm:' + id)
    return json({ ok: true })
  }

  // Busca dados do PROPRIETÁRIO: KV primeiro, depois API do Imoview (se configurada)
  if (action === 'owner-fetch') {
    const cod = String(b.codigo || '').replace(/[^\w]/g, '').slice(0, 12)
    if (!cod) return json({ error: 'codigo' }, 400)

    // 1. Verifica KV primeiro
    const saved = await env.ENGAGEMENT.get('imovel:' + cod, 'json')
    if (saved && saved.owner && (saved.owner.nome || saved.owner.fone)) {
      return json({ ok: true, owner: saved.owner, source: 'saved' })
    }

    // 2. Tenta API autenticada do Imoview (precisa de IMOVIEW_BASE_URL + IMOVIEW_LOGIN + IMOVIEW_SENHA no Cloudflare)
    const imoviewBase = (env.IMOVIEW_BASE_URL || '').trim().replace(/\/$/, '')
    const imoviewLogin = (env.IMOVIEW_LOGIN || '').trim()
    const imoviewSenha = (env.IMOVIEW_SENHA || '').trim()
    if (imoviewBase && imoviewLogin && imoviewSenha) {
      try {
        const authR = await fetch(`${imoviewBase}/api/v1/authenticate`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'user-agent': 'ViniciusGratonImoveis/1.0' },
          body: JSON.stringify({ login: imoviewLogin, password: imoviewSenha }),
          signal: AbortSignal.timeout(8000),
        })
        const authJ = authR.ok ? await authR.json() : null
        const tok = authJ && (authJ.token || authJ.access_token || authJ.accessToken)
        if (tok) {
          const propR = await fetch(`${imoviewBase}/api/v1/imoveis/${cod}`, {
            headers: { authorization: `Bearer ${tok}`, 'user-agent': 'ViniciusGratonImoveis/1.0' },
            signal: AbortSignal.timeout(8000),
          })
          const raw = propR.ok ? ((await propR.json().catch(() => null)) || {}) : {}
          const d = raw.imovel || raw.data || raw
          const owner = {
            nome: String(d.proprietario_nome || d.proprietarioNome || d.captador_nome || d.captadorNome || d.nomePropietario || '').trim().slice(0, 120),
            email: String(d.proprietario_email || d.proprietarioEmail || d.captador_email || d.captadorEmail || d.emailProprietario || '').trim().slice(0, 160),
            fone: String(d.proprietario_fone || d.proprietarioFone || d.proprietario_celular || d.celularProprietario || d.captador_fone || d.foneProprietario || '').trim().slice(0, 40),
          }
          if (owner.nome || owner.fone) {
            const base = saved || {}
            await env.ENGAGEMENT.put('imovel:' + cod, JSON.stringify({ ...base, owner, atualizadoEm: Date.now() }))
            return json({ ok: true, owner, source: 'imoview' })
          }
        }
      } catch { /* sem credenciais ou API indisponível — segue para "none" */ }
    }

    return json({ ok: true, owner: { nome: '', email: '', fone: '' }, source: 'none' })
  }

  // Salva apenas o proprietário preservando campos existentes do imóvel
  if (action === 'owner-save') {
    const cod = String(b.codigo || '').replace(/[^\w]/g, '').slice(0, 12)
    if (!cod) return json({ error: 'codigo' }, 400)
    const o = b.owner && typeof b.owner === 'object' ? b.owner : {}
    const owner = {
      nome: String(o.nome || '').slice(0, 120),
      email: String(o.email || '').slice(0, 160),
      fone: String(o.fone || '').replace(/[^\d+\s().-]/g, '').slice(0, 40),
    }
    const existing = await env.ENGAGEMENT.get('imovel:' + cod, 'json') || {}
    await env.ENGAGEMENT.put('imovel:' + cod, JSON.stringify({ ...existing, owner, atualizadoEm: Date.now() }))
    return json({ ok: true, owner })
  }

  return json({ error: 'acao desconhecida' }, 400)
  } catch (e) {
    console.error('admin.js catch:', e)
    return json({ error: 'interno', msg: 'Erro interno no servidor. Tente novamente.' }, 500)
  }
}
