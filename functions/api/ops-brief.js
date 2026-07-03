import { kvStore } from '../_lib/store.js'

/**
 * Briefing matinal — monta o resumo do dia e devolve a MENSAGEM pronta (texto).
 * Quem envia no WhatsApp é o GitHub Actions (scripts/ops-brief.mjs), que tem a CALLMEBOT_KEY.
 * Esta function só LÊ os dados (kvStore) — não envia nada e não grava nada.
 *
 *   POST /api/ops-brief   (header x-backup-key: <BACKUP_CRON_KEY>)
 *     -> { ok, msg, resumo:{ novos, frios, conv, captados } }
 *
 * Cobre 2 das automações: "Briefing matinal" + "Caça-lead frio" (seção 🧊), numa só mensagem.
 */

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
const eqStr = (a, b) => { if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length || !a) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0 }

const DIA = 86400000
const diaISO = (off = 0) => new Date(Date.now() - off * DIA).toISOString().slice(0, 10)
const fone = (f) => String(f || '').replace(/\D/g, '')

// Lê todas as chaves de um prefixo. Usa entries() (D1: 1 query só) quando disponível;
// senão cai no list()+get() limitado (evita estourar o teto de subrequests sem D1).
async function lerTudo(store, prefix) {
  if (store && typeof store.entries === 'function') {
    try { return await store.entries({ prefix }) } catch {}
  }
  try {
    const l = await store.list({ prefix })
    // sem D1: limita p/ não estourar o teto de subrequests do Free; paralelo p/ falhar rápido/limpo
    const keys = (l.keys || []).slice(0, 200)
    const vals = await Promise.all(keys.map((k) => store.get(k.name, 'json').then((v) => ({ name: k.name, value: v })).catch(() => null)))
    return vals.filter((x) => x && x.value)
  } catch { return [] }
}

export async function onRequest({ request, env }) {
  env = { ...env, ENGAGEMENT: kvStore(env) }

  const chave = request.headers.get('x-backup-key') || ''
  const segredo = String(env.BACKUP_CRON_KEY || '')
  if (!segredo) return json({ ok: false, motivo: 'sem-chave', msg: 'Defina BACKUP_CRON_KEY no Cloudflare.' }, 503)
  if (!eqStr(chave, segredo)) return json({ ok: false, error: 'nao-autorizado' }, 401)

  const agora = Date.now()
  const store = env.ENGAGEMENT
  // não listar o PRÓPRIO Vinícius como lead (entradas de teste com o nº dele) — compara os últimos 8 dígitos
  const meuFim = String(env.WHATS_DESTINO || '553491570494').replace(/\D/g, '').slice(-8)

  // 1) Leads novos nas últimas ~24h (janela 26h p/ pegar a virada do dia sem buraco).
  // SÓ leads de VISITANTE: exclui os proprietários captados pelo cron de madrugada
  // (chaves lead:prop-<cod>, papel:'proprietario'), senão eles inflam o "leads do dia".
  const leadsRaw = await lerTudo(store, 'lead:')
  const novos = leadsRaw
    .filter((e) => e.value && !/^lead:prop-/i.test(e.name || '') && e.value.papel !== 'proprietario')
    .map((e) => e.value)
    .filter((v) => (Number(v.ts) || Date.parse(v.data) || 0) > agora - 26 * 3600 * 1000)
    .filter((v) => fone(v.fone).slice(-8) !== meuFim)
    .sort((a, b) => (Number(b.ts) || 0) - (Number(a.ts) || 0))

  // 2) Leads frios do CRM: parados +5 dias e status NÃO-fechado (caça-lead frio)
  const FRIO_D = 5
  const fechado = (s) => /fech|ganho|perd|descart|conclu|inval/i.test(String(s || ''))
  const crm = (await lerTudo(store, 'crm:')).map((e) => e.value).filter(Boolean)
  const frios = crm
    .filter((c) => {
      if (fechado(c.status)) return false
      if (fone(c.whatsapp).slice(-8) === meuFim) return false
      const ult = Number(c.ultimaAcaoEm) || Number(c.atualizadoEm) || Number(c.criadoEm) || 0
      return ult && (agora - ult) > FRIO_D * DIA
    })
    .map((c) => {
      const ult = Number(c.ultimaAcaoEm) || Number(c.atualizadoEm) || Number(c.criadoEm) || agora
      const bairro = (Array.isArray(c.bairros) && c.bairros[0]) || ''
      const tipo = (Array.isArray(c.tipos) && c.tipos[0]) || ''
      const tagSrc = (Array.isArray(c.tags) && c.tags[0]) || ''
      return {
        nome: c.nome || '(sem nome)',
        whatsapp: fone(c.whatsapp),
        dias: Math.floor((agora - ult) / DIA),
        quer: [c.finalidade, tipo, bairro && ('no ' + bairro)].filter(Boolean).join(' '),
        origem: String(c.origem || tagSrc || '').slice(0, 24),
        status: String(c.status || '').slice(0, 24),
      }
    })
    .sort((a, b) => b.dias - a.dias)

  // 3) Conversões de ontem
  const conv = await store.get('conv:' + diaISO(1), 'json').catch(() => null)
  // 4) Captação de proprietários (status do cron)
  const cap = await store.get('captar:status', 'json').catch(() => null)
  // 5) Total de imóveis no ar (feed público)
  let totalImoveis = 0
  try { const m = await fetch(new URL('/catalogo-meta.json', request.url), { signal: AbortSignal.timeout(6000) }).then((r) => r.json()); totalImoveis = (m && m.total) || 0 } catch {}

  // ——— Mensagem "resumo + completo": resumo punchy + prioridades + lista completa com LINK clicável ———
  const DIAS_SEM = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
  const dBR = new Date(agora - 3 * 3600 * 1000) // ~Brasília p/ o dia da semana e a data
  const dataBR = `${DIAS_SEM[dBR.getUTCDay()]} ${String(dBR.getUTCDate()).padStart(2, '0')}/${String(dBR.getUTCMonth() + 1).padStart(2, '0')}`
  // link clicável de WhatsApp: normaliza pra 55+DDD+numero (quando falta o 55, prefixa)
  const waLink = (f) => { let d = String(f || '').replace(/\D/g, ''); if (!d) return ''; if (!d.startsWith('55') && d.length >= 10 && d.length <= 11) d = '55' + d; return 'wa.me/' + d }

  const L = []
  L.push(`☀️ *Bom dia, Vinícius!* · ${dataBR}`)
  L.push(`📊 ${novos.length} leads novos · ${(conv && conv.total) || 0} contatos no site · ${frios.length} pra reativar`)
  L.push(`🌙 ${(cap && cap.totalCaptados) || 0} donos no Imoview · 🏠 ${totalImoveis || 0} imóveis no ar`)

  // ⚠️ Captação de proprietários parada por login recusado (senha trocada / 2FA / bloqueio).
  // Sem isto, a captação pode ficar dias travada e o número acima nem se mexe, sem ninguém saber.
  if (cap && cap.erro === 'imoview-login' && cap.ts && (agora - cap.ts) < 30 * 3600 * 1000) {
    L.push('', '⚠️ *Captação de donos parada:* o Imoview recusou o login. Conferir senha/2FA da conta.')
  }

  if (frios.length) {
    const top = frios.slice(0, 2).map((c) => `${c.nome.split(' ')[0]} (${c.dias}d)`).join(' e ')
    L.push('', `🔥 *Prioridade hoje:* ${top} — os que estão parados há mais tempo.`)
  }

  // 🆕 Leads novos do SEU site (só quando houver) — com link clicável
  if (novos.length) {
    L.push('', `🆕 *Leads novos do seu site* (viniciusgraton.com.br):`)
    novos.slice(0, 10).forEach((v) => {
      const tag = [v.objetivo, v.bairro, v.origem && ('via ' + v.origem)].filter(Boolean).join(' · ')
      const link = waLink(v.fone)
      L.push(`• ${v.nome}${tag ? ' · ' + tag : ''}${link ? ' · ' + link : ''}`)
    })
  }

  // 🧊 Reativar — TODOS, com link clicável (CRM do próprio site /admin)
  L.push('', `🧊 *Reativar — ${frios.length} clientes parados +${FRIO_D}d* (CRM do seu site /admin · toque pra abrir):`)
  frios.slice(0, 12).forEach((c) => {
    const tag = [c.quer, c.origem && ('via ' + c.origem), c.status].filter(Boolean).join(' · ')
    const link = waLink(c.whatsapp)
    L.push(`• ${c.nome} (${c.dias}d)${tag ? ' · ' + tag : ''}${link ? ' · ' + link : ''}`)
  })

  L.push('', `💪 Bora! Comece pelo ${frios[0] ? frios[0].nome.split(' ')[0] : 'mais antigo'} — é o mais parado.`)

  const msg = L.join('\n')
  return json({ ok: true, msg, resumo: { novos: novos.length, frios: frios.length, conv: (conv && conv.total) || 0, captados: (cap && cap.totalCaptados) || 0 } })
}
