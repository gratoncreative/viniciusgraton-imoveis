import { kvStore } from '../_lib/store.js'
import { imoviewSession, imoviewEmCooldown, marcarImoviewCooldown } from '../_lib/imoview.js'
import { scrapeOwnerCod, registrarProprietario } from './admin.js'

/**
 * Captação GRADUAL de proprietários — Cloudflare Pages Function (cron).
 *
 * Varre o catálogo aos poucos e capta o proprietário (nome/telefone/e-mail/endereço) de
 * cada imóvel no Imoview, salvando no cache `imovel:<cod>.owner`. Assim os backups (Drive/R2)
 * e os pacotes por bairro vão ficando completos SEM precisar captar os 3.400 de uma vez
 * (o que bloquearia a conta). É a "3ª etapa": enche o cache em ritmo seguro, por dias.
 *
 * Cada chamada processa só ~4 imóveis (1 login, cache-first, dentro do teto de subrequests),
 * com pausa entre eles. Um cron (GitHub Actions) chama em loop algumas vezes por dia.
 * Se o Imoview recusar o login, PARA na hora (não insiste — protege a conta).
 *
 *   POST /api/captar-cron   (header x-backup-key: <segredo BACKUP_CRON_KEY>)
 *     -> { ok, cursor, total, restantes, ultimoLote:{ alvos, capturados, pulados } }
 *   POST /api/captar-cron   { status:true }   -> { ok, status }   (só lê o progresso)
 */

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
const eqStr = (a, b) => { if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length || !a) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0 }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const LOTE = 4          // imóveis por chamada (teto seguro de subrequests do plano free)
const PAUSA_MS = 1200   // respiro entre imóveis (gentil com o Imoview)

export async function onRequest({ request, env }) {
  env = { ...env, ENGAGEMENT: kvStore(env) }

  // auth por chave secreta (mesma do backup); só via header, nunca na URL
  const chave = request.headers.get('x-backup-key') || ''
  const segredo = String(env.BACKUP_CRON_KEY || '')
  if (!segredo) return json({ ok: false, motivo: 'sem-chave', msg: 'Defina BACKUP_CRON_KEY no Cloudflare e no cron.' }, 503)
  if (!eqStr(chave, segredo)) return json({ ok: false, error: 'nao-autorizado' }, 401)

  let body = {}; try { body = await request.json() } catch {}
  if (body && body.status) {
    const status = await env.ENGAGEMENT.get('captar:status', 'json').catch(() => null)
    return json({ ok: true, status: status || null })
  }

  // lista de códigos do catálogo
  const cat = await fetch(new URL('/catalogo.json', request.url), { signal: AbortSignal.timeout(8000) }).then((r) => r.json()).catch(() => null)
  const cods = (((cat && cat.imoveis) || []).map((im) => String(im.codigo)).filter(Boolean))
  const total = cods.length
  if (!total) return json({ ok: false, msg: 'Catálogo vazio.' })

  // cursor circular: ao terminar uma varredura, recomeça (mantém o cache fresco)
  const cursorAntigo = parseInt((await env.ENGAGEMENT.get('captar:cursor')) || '0', 10) || 0
  let cursor = cursorAntigo >= total ? 0 : cursorAntigo

  // cooldown ativo (falha de login recente): nem tenta logar, e NÃO mexe no cursor — assim os
  // mesmos alvos são retentados quando a conta voltar, em vez de pulados em silêncio.
  if (await imoviewEmCooldown(env)) {
    return json({ ok: false, motivo: 'cooldown', cursor: cursorAntigo, total })
  }

  // junta os próximos LOTE códigos que ainda NÃO têm proprietário cacheado
  const alvos = []
  let i = cursor, pulados = 0
  while (alvos.length < LOTE && i < total) {
    const cod = cods[i]; i++
    let jaTem = false
    try { const s = await env.ENGAGEMENT.get('imovel:' + cod, 'json'); jaTem = !!(s && s.owner && (s.owner.nome || s.owner.fone)) } catch {}
    if (jaTem) { pulados++; continue }
    alvos.push(cod)
  }
  const proximoCursor = i // só será gravado se o lote for de fato processado

  let capturados = 0
  if (alvos.length) {
    let ses = await imoviewSession(env).catch(() => null)
    if (!(ses && ses.ok && ses.cookies)) {
      // login recusado (senha/2FA/bloqueio) OU transitório: marca cooldown, NÃO avança o cursor,
      // e registra o erro (o briefing das 7h avisa o Vinícius). O cron para ao ver 'imoview-login'.
      await marcarImoviewCooldown(env)
      const st = { ts: Date.now(), cursor: cursorAntigo, total, restantes: total - cursorAntigo, erro: 'imoview-login' }
      await env.ENGAGEMENT.put('captar:status', JSON.stringify(st)).catch(() => {})
      await env.ENGAGEMENT.put('captar:cursor', String(cursorAntigo)).catch(() => {}) // mantém a posição
      return json({ ok: false, motivo: 'imoview-login', ...st })
    }
    for (const cod of alvos) {
      try {
        let owner = await scrapeOwnerCod(ses.cookies, cod, Date.now() + 18000)
        // sessão cacheada morreu no meio: re-loga UMA vez e refaz este código
        if (owner && owner.__loginExpired && ses.cached) {
          ses = await imoviewSession(env, { force: true }).catch(() => null)
          if (!(ses && ses.ok && ses.cookies)) { await marcarImoviewCooldown(env); break }
          owner = await scrapeOwnerCod(ses.cookies, cod, Date.now() + 18000)
        }
        if (owner && (owner.nome || owner.fone || (owner.dados && owner.dados.length) || owner.enderecoImovel)) {
          const prev = await env.ENGAGEMENT.get('imovel:' + cod, 'json').catch(() => null)
          await env.ENGAGEMENT.put('imovel:' + cod, JSON.stringify({ ...(prev || {}), owner, atualizadoEm: Date.now() }))
          try { await registrarProprietario(env, cod, owner) } catch {} // aparece em /admin → Leads, igual à captação manual
          capturados++
        }
      } catch {}
      await sleep(PAUSA_MS)
    }
  }

  // só agora avança o cursor (lote processado). Ao fechar uma volta completa, zera o acumulado
  // pra o contador do briefing refletir "donos únicos nesta passada", não somar voltas.
  cursor = proximoCursor
  await env.ENGAGEMENT.put('captar:cursor', String(cursor)).catch(() => {})
  const fechouVolta = proximoCursor >= total
  const acumulado = fechouVolta ? 0 : (((await env.ENGAGEMENT.get('captar:status', 'json').catch(() => null)) || {}).totalCaptados || 0)
  const status = { ts: Date.now(), cursor, total, restantes: Math.max(0, total - cursor), totalCaptados: acumulado + capturados, ultimoLote: { alvos: alvos.length, capturados, pulados } }
  await env.ENGAGEMENT.put('captar:status', JSON.stringify(status)).catch(() => {})
  return json({ ok: true, ...status })
}
