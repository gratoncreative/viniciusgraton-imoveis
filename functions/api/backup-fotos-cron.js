import { kvStore } from '../_lib/store.js'

/**
 * Espelho GRADUAL das FOTOS dos imóveis no Cloudflare R2 — Pages Function.
 *
 * O backup diário (/api/backup-cron) guarda os DADOS insubstituíveis (CRM, leads, clientes,
 * proprietários, endereços). Este aqui completa o seguro guardando as FOTOS: caminha o
 * catálogo alguns imóveis por chamada e grava cada foto como um objeto em
 * `backup/fotos/<cod>/NN.jpg` + um `_index.json` por imóvel. É restart-safe (cursor
 * persistido em `backup:fotos`) e circular (ao terminar, recomeça e só refaz o que estiver
 * velho — > 21 dias — mantendo o espelho fresco sem re-baixar tudo toda vez).
 *
 * As fotos vêm do CDN PÚBLICO (nunca loga no Imoview → não bloqueia a conta).
 * Autenticado pela MESMA chave secreta do backup diário (env.BACKUP_CRON_KEY, header
 * `x-backup-key`). Chamado pelo GitHub Actions "Backup de fotos" (backup-fotos.yml).
 *
 *   POST/GET /api/backup-fotos-cron?lote=2&maxFotos=15   (header x-backup-key)
 *     -> { ok, de, ate, total, copiadas, imoveisOk, puladosFrescos, voltaCompleta }
 */

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
const eqStr = (a, b) => { if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length || !a) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0 }

const FRESCO_MS = 21 * 24 * 60 * 60 * 1000 // fotos re-copiadas só se o índice tiver > 21 dias

export async function onRequest({ request, env }) {
  env = { ...env, ENGAGEMENT: kvStore(env) }

  // — autenticação por chave secreta (mesma do backup diário); SÓ via header, nunca na URL —
  const chave = request.headers.get('x-backup-key') || ''
  const segredo = String(env.BACKUP_CRON_KEY || '')
  if (!segredo) return json({ ok: false, motivo: 'sem-chave', msg: 'Defina BACKUP_CRON_KEY no Cloudflare (e no GitHub).' }, 503)
  if (!eqStr(chave, segredo)) return json({ ok: false, error: 'nao-autorizado' }, 401)

  const R2 = env.BACKUPS
  if (!R2) return json({ ok: false, motivo: 'r2', msg: 'Crie o bucket R2 vg-backups + binding BACKUPS (docs/backup-r2-setup.md).' }, 503)

  const url = new URL(request.url)
  // limites conservadores p/ caber nos ~50 subrequests da Function (fetch conta; put no R2 não):
  //   1 (catálogo) + lote × (1 rotina-imovel + maxFotos fetch de foto)  — clamp dinâmico
  //   garante pior caso < 48 mesmo com parâmetros manuais. Default 10 fotos/imóvel mantém o
  //   espelho inteiro (~3.400 imóveis) dentro dos 10 GB grátis do R2.
  const lote = Math.min(3, Math.max(1, parseInt(url.searchParams.get('lote'), 10) || 2))
  const tetoFotos = Math.floor(46 / lote) - 1
  const maxFotos = Math.min(tetoFotos, Math.max(4, parseInt(url.searchParams.get('maxFotos'), 10) || 10))
  const force = url.searchParams.get('force') === '1'

  try {
    const cat = await fetch(new URL('/catalogo.json', request.url)).then((r) => r.json()).catch(() => null)
    const imoveis = (cat && Array.isArray(cat.imoveis)) ? cat.imoveis : []
    if (!imoveis.length) return json({ ok: false, msg: 'Catálogo vazio agora. Tente de novo.' })

    const manifest = (await env.ENGAGEMENT.get('backup:fotos', 'json')) || { cursor: 0, imoveisFeitos: 0, fotos: 0, voltas: 0 }
    let cursor = Number.isFinite(manifest.cursor) ? manifest.cursor : 0
    let voltas = manifest.voltas || 0
    if (cursor >= imoveis.length) { cursor = 0; voltas += 1 }

    const slice = imoveis.slice(cursor, cursor + lote)
    let copiadas = 0, imoveisOk = 0, puladosFrescos = 0
    const agora = Date.now()

    for (const im of slice) {
      const cod = String(im.codigo)
      try {
        // pula imóvel cujo índice ainda está fresco (evita re-baixar o catálogo inteiro toda volta)
        if (!force) {
          const idx = await R2.get(`backup/fotos/${cod}/_index.json`).catch(() => null)
          if (idx) {
            const meta = await idx.json().catch(() => null)
            if (meta && meta.em && (agora - Date.parse(meta.em)) < FRESCO_MS) { puladosFrescos++; continue }
          }
        }

        const det = await fetch(new URL(`/api/rotina-imovel?codigo=${encodeURIComponent(cod)}&soFotos=1`, request.url)).then((r) => r.json()).catch(() => null)
        const fotos = (det && det.imovel && Array.isArray(det.imovel.fotos) && det.imovel.fotos.length) ? det.imovel.fotos : (im.img ? [im.img] : [])
        const lim = fotos.slice(0, maxFotos)

        await R2.put(`backup/fotos/${cod}/_index.json`, JSON.stringify({ cod, bairro: im.bairro || '', total: fotos.length, guardadas: lim.length, urls: fotos, em: new Date().toISOString() }), { httpMetadata: { contentType: 'application/json; charset=utf-8' } })

        let acc = 0 // orçamento de memória do Worker (~128MB)
        for (let i = 0; i < lim.length; i++) {
          try {
            const r = await fetch(lim[i], { headers: { 'user-agent': 'ViniciusGratonBackup/1.0' }, signal: AbortSignal.timeout(12000) })
            if (!r.ok) continue
            const cl = +(r.headers.get('content-length') || 0)
            if (cl && cl > 8 * 1024 * 1024) continue // pula imagem gigante sem materializar
            const buf = await r.arrayBuffer()
            acc += buf.byteLength
            if (acc > 80 * 1024 * 1024) break
            const ext = ((String(lim[i]).match(/\.(jpe?g|png|webp)(?=$|\?)/i) || [])[1] || 'jpg').toLowerCase()
            await R2.put(`backup/fotos/${cod}/${String(i + 1).padStart(2, '0')}.${ext}`, buf, { httpMetadata: { contentType: r.headers.get('content-type') || 'image/jpeg' } })
            copiadas++
          } catch {}
        }
        imoveisOk++
      } catch (e) { try { console.error('backup-fotos', cod, String((e && e.message) || e).slice(0, 120)) } catch {} }
    }

    cursor += slice.length
    const m = {
      cursor, voltas, total: imoveis.length,
      imoveisFeitos: (manifest.imoveisFeitos || 0) + imoveisOk,
      fotos: (manifest.fotos || 0) + copiadas,
      atualizadoEm: agora,
    }
    await env.ENGAGEMENT.put('backup:fotos', JSON.stringify(m))
    return json({ ok: true, de: cursor - slice.length, ate: cursor, total: imoveis.length, copiadas, imoveisOk, puladosFrescos, voltaCompleta: cursor >= imoveis.length })
  } catch (e) {
    return json({ ok: false, error: 'falha', msg: String((e && e.message) || e).slice(0, 200) }, 500)
  }
}
