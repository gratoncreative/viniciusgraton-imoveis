import { kvStore } from '../_lib/store.js'

/**
 * Backup AUTOMÁTICO dos dados insubstituíveis do site — Cloudflare Pages Function.
 *
 * Exporta TUDO que só existe no site (e não na Rotina/GitHub) num único JSON, versionado
 * por dia, no Cloudflare R2 (bucket vg-backups). É o "seguro de verdade": CRM, leads,
 * clientes, newsletter, proprietários captados (imovel:<cod>.owner), conversões e config.
 * Também snapshota o catálogo (catalogo.json) — leve.
 *
 * NÃO usa token de admin (o cron não tem sessão): é autenticado por uma CHAVE SECRETA
 * (env.BACKUP_CRON_KEY) no header `x-backup-key` ou em `?key=`. Chamado por um cron
 * (GitHub Actions) — ver docs/backup-automatico-setup.md.
 *
 *   POST/GET /api/backup-cron   (header x-backup-key: <segredo>)   -> { ok, contagem, arquivo }
 *
 * Fotos NÃO entram aqui (são pesadas e já vivem na Rotina/CDN) — vão num backup à parte.
 */

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
const eqStr = (a, b) => { if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length || !a) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0 }

// Leitura em lote tolerante (igual à do admin): usa entries() do facade (1 query no D1)
// quando existir; senão cai no list+get do KV.
async function bulkEntries(store, prefix) {
  try {
    if (store && typeof store.entries === 'function') return await store.entries({ prefix })
    const lk = await store.list({ prefix })
    const vals = await Promise.all((lk.keys || []).map((k) =>
      store.get(k.name, 'json').then((v) => (v ? { name: k.name, value: v, metadata: k.metadata } : null)).catch(() => null)
    ))
    return vals.filter(Boolean)
  } catch { return [] }
}

async function exportarPrefixo(store, prefix) {
  const ents = await bulkEntries(store, prefix)
  return (ents || []).map((e) => ({ chave: e.name, ...(e.value && typeof e.value === 'object' ? { dados: e.value } : { valor: e.value }), ...(e.metadata ? { meta: e.metadata } : {}) }))
}

export async function onRequest({ request, env }) {
  env = { ...env, ENGAGEMENT: kvStore(env) }

  // — autenticação por chave secreta (não é o token de admin); SÓ via header, nunca na URL
  //   (URL vaza em log/Referer/histórico) —
  const chave = request.headers.get('x-backup-key') || ''
  const segredo = String(env.BACKUP_CRON_KEY || '')
  if (!segredo) return json({ ok: false, motivo: 'sem-chave', msg: 'Defina o segredo BACKUP_CRON_KEY no Cloudflare (e no cron).' }, 503)
  if (!eqStr(chave, segredo)) return json({ ok: false, error: 'nao-autorizado' }, 401)

  const R2 = env.BACKUPS
  if (!R2) return json({ ok: false, motivo: 'r2', msg: 'Crie o bucket R2 vg-backups e o binding BACKUPS (docs/backup-r2-setup.md).' }, 503)

  try {
    const s = env.ENGAGEMENT
    // os dados que SÓ existem no site (insubstituíveis)
    const [anuncios, leads, clientes, corretores, news, crm, imoveis, conversoes, laudos, aprovados, config] = await Promise.all([
      exportarPrefixo(s, 'anuncio:'),
      exportarPrefixo(s, 'lead:'),       // inclui donos captados (lead:prop-<cod>)
      exportarPrefixo(s, 'conta:'),      // clientes/contas
      exportarPrefixo(s, 'corretor:'),   // cadastros GRÁTIS da Área do Corretor (nome/WhatsApp/CRECI/email) — PII só aqui
      exportarPrefixo(s, 'news:'),
      exportarPrefixo(s, 'crm:'),
      exportarPrefixo(s, 'imovel:'),     // proprietário captado + campos por imóvel (o ouro)
      exportarPrefixo(s, 'conv:'),       // conversões (cliques de contato)
      exportarPrefixo(s, 'laudo:'),      // pareceres/PTAM pagos (TTL no KV — vale guardar snapshot)
      exportarPrefixo(s, 'aprovado:'),   // flags de aprovação editorial
      exportarPrefixo(s, 'config:'),
    ])

    const geradoEm = new Date().toISOString()
    const contagem = {
      anuncios: anuncios.length, leads: leads.length, clientes: clientes.length, corretores: corretores.length,
      news: news.length, crm: crm.length, imoveis: imoveis.length,
      imoveisComProprietario: imoveis.filter((x) => x.dados && x.dados.owner && (x.dados.owner.nome || x.dados.owner.fone)).length,
      conversoes: conversoes.length, laudos: laudos.length,
    }
    const pacote = { geradoEm, fonte: 'viniciusgraton.com.br', tipo: 'dados-do-site', contagem, anuncios, leads, clientes, corretores, news, crm, imoveis, conversoes, laudos, aprovados, config }
    const corpo = JSON.stringify(pacote)
    const dia = geradoEm.slice(0, 10) // YYYY-MM-DD

    // versionado por dia + cópia "atual" (sobrescreve)
    await R2.put(`backup/dados/${dia}.json`, corpo, { httpMetadata: { contentType: 'application/json; charset=utf-8' } })
    await R2.put('backup/dados/atual.json', corpo, { httpMetadata: { contentType: 'application/json; charset=utf-8' } })
    // meta LEVE (só data + contagem) — o painel lê isto pro "selo de saúde" sem baixar o JSON inteiro
    await R2.put('backup/dados/_meta.json', JSON.stringify({ geradoEm, dia, contagem, bytes: corpo.length }), { httpMetadata: { contentType: 'application/json; charset=utf-8' } })

    // snapshot leve do catálogo (dados públicos dos imóveis) — útil ter junto
    try {
      const cat = await fetch(new URL('/catalogo.json', request.url)).then((r) => r.text())
      if (cat && cat.length > 100) await R2.put('backup/dados/catalogo.json', cat, { httpMetadata: { contentType: 'application/json; charset=utf-8' } })
    } catch {}

    return json({ ok: true, arquivo: `backup/dados/${dia}.json`, bytes: corpo.length, contagem })
  } catch (e) {
    return json({ ok: false, error: 'falha', msg: String((e && e.message) || e).slice(0, 200) }, 500)
  }
}
