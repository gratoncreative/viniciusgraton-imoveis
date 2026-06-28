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

  // 1) Leads novos nas últimas ~24h (janela 26h p/ pegar a virada do dia sem buraco).
  // SÓ leads de VISITANTE: exclui os proprietários captados pelo cron de madrugada
  // (chaves lead:prop-<cod>, papel:'proprietario'), senão eles inflam o "leads do dia".
  const leadsRaw = await lerTudo(store, 'lead:')
  const novos = leadsRaw
    .filter((e) => e.value && !/^lead:prop-/i.test(e.name || '') && e.value.papel !== 'proprietario')
    .map((e) => e.value)
    .filter((v) => (Number(v.ts) || Date.parse(v.data) || 0) > agora - 26 * 3600 * 1000)
    .sort((a, b) => (Number(b.ts) || 0) - (Number(a.ts) || 0))

  // 2) Leads frios do CRM: parados +5 dias e status NÃO-fechado (caça-lead frio)
  const FRIO_D = 5
  const fechado = (s) => /fech|ganho|perd|descart|conclu|inval/i.test(String(s || ''))
  const crm = (await lerTudo(store, 'crm:')).map((e) => e.value).filter(Boolean)
  const frios = crm
    .filter((c) => {
      if (fechado(c.status)) return false
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

  // ——— Monta a mensagem: explica O QUE é e DE ONDE vem cada número ———
  const hojeBR = diaISO(0).split('-').reverse().join('/')
  const L = []
  L.push(`☀️ Bom dia, Vinícius! Resumo VG · ${hojeBR}`)

  // 🆕 Leads do SITE (formulários públicos)
  L.push('', `🆕 LEADS NOVOS DO SEU SITE — viniciusgraton.com.br (24h): ${novos.length}`)
  L.push('— quem preencheu um formulário no SEU site e deixou contato. (não é OLX, Zap nem Imoview)')
  if (!novos.length) L.push('· Ninguém novo nas últimas 24h.')
  novos.slice(0, 6).forEach((v) => {
    const partes = [v.objetivo, v.bairro, v.origem && ('origem: ' + v.origem), v.fone].filter(Boolean)
    L.push(`• ${v.nome}${partes.length ? ' — ' + partes.join(' · ') : ''}`)
  })

  // 🌙 Captação no IMOVIEW (cron de madrugada)
  if (cap && cap.totalCaptados != null) {
    L.push('', `🌙 CAPTAÇÃO NO IMOVIEW: ${cap.totalCaptados} donos no cache`)
    L.push(`— o robô já varreu ${cap.cursor || 0} de ${cap.total || 0} imóveis e puxou nome, telefone e e-mail dos proprietários direto do Imoview, de madrugada, sozinho.`)
  }

  // 📊 Conversões medidas no próprio SITE
  if (conv && conv.total) {
    const ev = conv.ev || {}
    L.push('', `📞 CONTATOS INICIADOS PELO SEU SITE ONTEM: ${conv.total}`)
    L.push(`— visitantes do seu site que CLICARAM pra te chamar (de anônimo → te procurou): ${ev.whatsapp || 0} no WhatsApp · ${ev.tel || 0} telefone · ${ev.email || 0} e-mail. Não é venda fechada.`)
  }

  // 🧊 Reativar — clientes do seu CRM (/admin → Leads)
  L.push('', `🧊 REATIVAR — clientes do CRM do SEU SITE (/admin → Leads), parados +${FRIO_D}d: ${frios.length}`)
  L.push('— quem VOCÊ cadastrou/atendeu no painel do site. NÃO é o Imoview, OLX nem Zap. A origem de cada um (de onde veio) vai do lado:')
  frios.slice(0, 6).forEach((c) => {
    const partes = [c.quer, c.origem && ('origem: ' + c.origem), c.status && ('etapa: ' + c.status), `parado ${c.dias}d`, c.whatsapp].filter(Boolean)
    L.push(`• ${c.nome} — ${partes.join(' · ')}`)
  })

  // 🏠 Imóveis no ar (catálogo da Rotina)
  if (totalImoveis) L.push('', `🏠 ${totalImoveis} IMÓVEIS NO AR — catálogo da Rotina, sincronizado automático todo dia.`)

  L.push('', '💪 Bora pro dia!')

  const msg = L.join('\n')
  return json({ ok: true, msg, resumo: { novos: novos.length, frios: frios.length, conv: (conv && conv.total) || 0, captados: (cap && cap.totalCaptados) || 0 } })
}
