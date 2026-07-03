import { kvStore } from '../_lib/store.js'
/**
 * Cloudflare Pages Function — cadastro de imóvel pelo proprietário (moderação).
 * O proprietário envia os dados + fotos (alta resolução). Tudo fica salvo no KV
 * (binding ENGAGEMENT). A LEITURA/moderação é feita SOMENTE pelo painel seguro
 * /admin (ver functions/api/admin.js) — não há mais endpoint de listagem por
 * chave fixa (isso vazava dados no repositório público).
 *
 *   POST /api/anuncio  { nome, fone, ...campos, fotos:[dataURL] }  -> { ok, id }
 */
const temKV = (env) => env && env.ENGAGEMENT && typeof env.ENGAGEMENT.get === 'function'
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
const str = (v, n) => String(v || '').slice(0, n)

export async function onRequestPost({ env, request, waitUntil }) {
  env = { ...env, ENGAGEMENT: kvStore(env) }
  try {
    const body = await request.json().catch(() => ({}))
    if (body.site) return json({ ok: true }) // honeypot (bot)
    const nome = str(body.nome, 80)
    const fone = str(body.fone, 30)
    if (!nome || !fone) return json({ error: 'dados incompletos' }, 400)
    // rate-limit por IP: máx. 5 anúncios por hora (anti-spam)
    if (temKV(env)) {
      const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'sem-ip'
      const rlKey = 'rl:anuncio:' + ip
      const usos = parseInt(await env.ENGAGEMENT.get(rlKey), 10) || 0
      if (usos >= 5) return json({ ok: true, limite: true })
      await env.ENGAGEMENT.put(rlKey, String(usos + 1), { expirationTtl: 3600 })
    }
    let fotos = Array.isArray(body.fotos)
      ? body.fotos.filter((f) => typeof f === 'string' && /^data:image\/(png|jpe?g|webp);base64,/i.test(f) && f.length < 3000000).slice(0, 15)
      : []
    // cap do total (~18MB) — evita estourar o limite do KV
    let acc = 0
    fotos = fotos.filter((f) => { acc += f.length; return acc < 18000000 })
    const ts = Date.now()
    const sub = {
      ts, data: new Date(ts).toISOString(), nome, fone,
      email: str(body.email, 120), finalidade: str(body.finalidade, 40), tipo: str(body.tipo, 40),
      bairro: str(body.bairro, 80), endereco: str(body.endereco, 180), preco: str(body.preco, 40),
      quartos: str(body.quartos, 10), suites: str(body.suites, 10), vagas: str(body.vagas, 10),
      area: str(body.area, 20), condominio: str(body.condominio, 40), iptu: str(body.iptu, 40),
      descricao: str(body.descricao, 2000), placa: str(body.placa, 140), fotos,
    }
    const id = ts + '-' + Math.random().toString(36).slice(2, 8)
    if (temKV(env)) await env.ENGAGEMENT.put('anuncio:' + id, JSON.stringify(sub))
    // ——— ACERVO DE ORIGINAIS (R2): estas fotos chegam do proprietário SEM marca d'água ———
    // Espelha cada uma pro bucket permanente em segundo plano — a resposta não espera e
    // qualquer falha aqui não afeta o cadastro (o KV continua sendo a fonte da moderação).
    const R2 = env.BACKUPS
    if (R2 && fotos.length && typeof waitUntil === 'function') {
      waitUntil((async () => {
        for (let i = 0; i < fotos.length; i++) {
          try {
            const ct = (fotos[i].match(/^data:(image\/\w+);/i) || [])[1] || 'image/jpeg'
            const bin = await fetch(fotos[i]).then((r) => r.arrayBuffer())
            const ext = ct.split('/')[1].toLowerCase().replace('jpeg', 'jpg')
            await R2.put(`acervo/anunciar/${id}/${String(i + 1).padStart(2, '0')}.${ext}`, bin, { httpMetadata: { contentType: ct } })
          } catch {}
        }
      })())
    }
    return json({ ok: true, id, persistido: temKV(env), fotos: fotos.length })
  } catch (e) {
    console.error('anuncio:', e)
    return json({ error: 'interno' }, 500)
  }
}
