import { kvStore } from '../_lib/store.js'
import { imoviewSession, imoviewEmCooldown, marcarImoviewCooldown } from '../_lib/imoview.js'
import { scrapeOwnerCod } from './admin.js'

/**
 * EXPORTADOR diário Rotina → aicapitei — Cloudflare Pages Function (cron).
 *
 * Envia aos poucos os imóveis do catálogo público (casas e apartamentos à venda a partir
 * de R$ 500.000, maiores valores primeiro) para o cadastro do aicapitei via
 * POST https://aicapitei.com.br/api/imovel-ingest. O proprietário vai junto quando já
 * existe no cache `imovel:<cod>.owner` (ou quando dá pra raspar na hora, com a mesma
 * sessão gentil do captar-cron). Se o Imoview estiver indisponível o imóvel vai MESMO
 * ASSIM, sem proprietário — o enriquecimento reenvia depois, quando o owner aparecer.
 *
 * Ritmo: LOTE=4 novos por chamada + até 4 reenvios de enriquecimento, teto de 50 imóveis
 * NOVOS por dia (data de Brasília). Um cron (GitHub Actions) chama em loop de madrugada.
 *
 *   POST /api/exporta-aicapitei   (header x-backup-key: <segredo BACKUP_CRON_KEY>)
 *     -> { ok, novos, enriquecidos, restantes, done? }   (done => o cron para)
 *   POST /api/exporta-aicapitei   { status:true }   -> { ok, status }   (só lê o progresso)
 */

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
const eqStr = (a, b) => { if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length || !a) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0 }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const INGEST_URL = 'https://aicapitei.com.br/api/imovel-ingest'
const LOTE = 4            // imóveis NOVOS por chamada (mesmo teto seguro do captar-cron)
const ENRIQUECE_LOTE = 4  // reenvios de enriquecimento por chamada (não contam no teto)
const PAUSA_MS = 1200     // respiro entre raspagens (gentil com o Imoview)
const TETO_DIA = 50       // imóveis NOVOS por dia
const PRECO_MIN = 500000
// teto de sanidade: acima disso em Uberlândia é dado sujo do catálogo (centavos colados:
// R$ 3.100.853,75 vira "310085375") — não exportar; corrigir na origem é outra frente
const PRECO_MAX = 20000000

const KEY_EXPORTADOS = 'aicapitei:exportados'   // map { cod: { em, owner:true/false } }
const KEY_ENR_CURSOR = 'aicapitei:enr-cursor'   // janela rotativa do enriquecimento

// data de HOJE no fuso de Brasília (YYYY-MM-DD) — evita o bug do "dia UTC"
const hojeSP = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

const semAcento = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

// Elegível: à venda, preço >= 500 mil, tipo casa/apartamento (nunca terreno, lote, rural,
// comercial, chácara, sítio; cobertura só entraria se o tipo COMEÇASSE com "apartamento").
const TIPOS_EXCLUIDOS = /terreno|lote|rural|comercial|chacara|sitio|cobertura/
function elegivel(im) {
  if (semAcento(im && im.finalidade) !== 'venda') return false
  const preco = Number(im && im.preco)
  if (!(preco >= PRECO_MIN) || preco > PRECO_MAX) return false
  // dado sujo também aparece como R$/m2 impossível (mercado real de Uberlândia <= ~23 mil/m2)
  const area = Number(im && im.area)
  if (area > 20 && preco / area > 25000) return false
  const t = semAcento(im && im.tipo)
  if (!t || TIPOS_EXCLUIDOS.test(t)) return false
  return /^casa/.test(t) || /^(apartamento|apto)/.test(t)
}

// Monta o bloco `prop` do contrato a partir do owner cacheado ({ nome, fone, email,
// dados?, enderecoImovel?, enderecoCampos? }). Só existe se tiver nome ou telefone.
function montarProp(owner) {
  if (!owner || !(owner.nome || owner.fone)) return null
  const acha = (re) => ((owner.dados || []).find((d) => d && re.test(d.rotulo)) || {}).valor || ''
  const prop = {
    nome: String(owner.nome || '').slice(0, 120),
    telefone: String(owner.fone || '').slice(0, 40),
    celular: String(acha(/^Celular$|WhatsApp/) || '').slice(0, 40),
    email: String(owner.email || '').slice(0, 160),
    cpf: String(acha(/^CPF$/) || '').slice(0, 20),
  }
  if (owner.enderecoImovel) prop.enderecoImovel = String(owner.enderecoImovel).slice(0, 300)
  // o scraper devolve enderecoCampos como array de {rotulo, valor}; o ingest do aicapitei
  // espera OBJETO com chaves normalizadas (contrato) — converte aqui
  if (Array.isArray(owner.enderecoCampos) && owner.enderecoCampos.length) {
    const MAPA = { logradouro: 'logradouro', rua: 'logradouro', endereco: 'logradouro', numero: 'numero', n: 'numero', complemento: 'complemento', cep: 'cep', bairro: 'bairro', cidade: 'cidade', estado: 'uf', uf: 'uf' }
    const ec = {}
    for (const c of owner.enderecoCampos) {
      if (!c || !c.rotulo) continue
      const rot = String(c.rotulo).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '')
      const k = MAPA[rot]
      const v = String(c.valor || '').trim().slice(0, 160)
      if (k && v && !ec[k]) ec[k] = v
    }
    if (Object.keys(ec).length) prop.enderecoCampos = ec
  }
  return prop
}

function montarItem(im, prop) {
  const item = {
    codigo: String(im.codigo),
    tipo: im.tipo || '',
    finalidade: im.finalidade || 'Venda',
    bairro: im.bairro || '',
    cidade: im.cidade || 'Uberlândia',
    uf: im.uf || 'MG',
    rua: im.rua || '',
    preco: Number(im.preco) || 0,
    quartos: Number(im.quartos) || 0,
    suites: Number(im.suites) || 0,
    banheiros: Number(im.banheiros) || 0,
    vagas: Number(im.vagas) || 0,
    area: Number(im.area) || 0,
    condominio: Number(im.condominio) || 0,
    descricao: im.descricao || '',
    img: im.img || '',
  }
  if (prop) item.prop = prop
  return item
}

export async function onRequest({ request, env }) {
  env = { ...env, ENGAGEMENT: kvStore(env) }

  // auth por chave secreta (mesma do backup); só via header, nunca na URL
  const chave = request.headers.get('x-backup-key') || ''
  const segredo = String(env.BACKUP_CRON_KEY || '')
  if (!segredo) return json({ ok: false, motivo: 'sem-chave', msg: 'Defina BACKUP_CRON_KEY no Cloudflare e no cron.' }, 503)
  if (!eqStr(chave, segredo)) return json({ ok: false, error: 'nao-autorizado' }, 401)

  const chaveIngest = String(env.AICAPITEI_INGEST_KEY || '')
  if (!chaveIngest) return json({ ok: false, motivo: 'sem-chave-ingest', msg: 'Defina AICAPITEI_INGEST_KEY no Cloudflare (Pages do site).' }, 503)

  let body = {}; try { body = await request.json() } catch {}
  const exportados = (await env.ENGAGEMENT.get(KEY_EXPORTADOS, 'json').catch(() => null)) || {}
  const chaveDia = 'aicapitei:dia:' + hojeSP()
  const hoje = parseInt((await env.ENGAGEMENT.get(chaveDia)) || '0', 10) || 0

  if (body && body.status) {
    const total = Object.keys(exportados).length
    const comOwner = Object.values(exportados).filter((e) => e && e.owner).length
    return json({ ok: true, status: { exportados: total, comOwner, semOwner: total - comOwner, hoje, teto: TETO_DIA } })
  }

  // catálogo público (mesma técnica do captar-cron: URL relativa da própria origem)
  const cat = await fetch(new URL('/catalogo.json', request.url), { signal: AbortSignal.timeout(8000) }).then((r) => r.json()).catch(() => null)
  const todos = (cat && cat.imoveis) || []
  if (!todos.length) return json({ ok: false, msg: 'Catálogo vazio.' })

  // prioridade: maior valor primeiro
  const elegiveis = todos.filter(elegivel).sort((a, b) => (Number(b.preco) || 0) - (Number(a.preco) || 0))
  const catPorCod = new Map(todos.map((im) => [String(im.codigo), im]))

  const pendentes = elegiveis.filter((im) => !exportados[String(im.codigo)])
  const restantes = pendentes.length

  if (hoje >= TETO_DIA) return json({ ok: true, done: 'teto-diario', novos: 0, enriquecidos: 0, restantes })

  const novosAlvos = pendentes.slice(0, Math.min(LOTE, TETO_DIA - hoje))

  // ENRIQUECIMENTO: já exportados sem owner cujo cache imovel:<cod>.owner agora existe.
  // Janela rotativa pra não checar sempre os mesmos 20 códigos a cada chamada.
  const paraEnriquecer = []
  const semOwner = Object.keys(exportados).filter((c) => exportados[c] && exportados[c].owner === false)
  if (semOwner.length) {
    let ec = parseInt((await env.ENGAGEMENT.get(KEY_ENR_CURSOR)) || '0', 10) || 0
    if (ec >= semOwner.length) ec = 0
    const janela = semOwner.slice(ec, ec + 20)
    await env.ENGAGEMENT.put(KEY_ENR_CURSOR, String(ec + janela.length)).catch(() => {})
    for (const cod of janela) {
      if (paraEnriquecer.length >= ENRIQUECE_LOTE) break
      const s = await env.ENGAGEMENT.get('imovel:' + cod, 'json').catch(() => null)
      const prop = montarProp(s && s.owner)
      if (prop && catPorCod.has(cod)) paraEnriquecer.push({ im: catPorCod.get(cod), prop })
    }
  }

  // NOVOS: owner do cache; sem cache e com Imoview disponível, tenta raspar na hora.
  // Falha de login NÃO trava o export — marca cooldown e o imóvel segue sem owner.
  const novosItens = []
  let ses = null, semImoview = await imoviewEmCooldown(env)
  for (const im of novosAlvos) {
    const cod = String(im.codigo)
    let owner = null
    try { const s = await env.ENGAGEMENT.get('imovel:' + cod, 'json'); owner = s && s.owner } catch {}
    if (!montarProp(owner) && !semImoview) {
      if (!ses) {
        ses = await imoviewSession(env).catch(() => null)
        if (!(ses && ses.ok && ses.cookies)) { await marcarImoviewCooldown(env); semImoview = true; ses = null }
      }
      if (ses) {
        try {
          let o = await scrapeOwnerCod(ses.cookies, cod, Date.now() + 15000)
          // sessão cacheada morreu no meio: re-loga UMA vez e refaz este código
          if (o && o.__loginExpired && ses.cached) {
            ses = await imoviewSession(env, { force: true }).catch(() => null)
            if (ses && ses.ok && ses.cookies) o = await scrapeOwnerCod(ses.cookies, cod, Date.now() + 15000)
            else { await marcarImoviewCooldown(env); semImoview = true; ses = null; o = null }
          }
          if (o && (o.nome || o.fone)) {
            owner = o
            const prev = await env.ENGAGEMENT.get('imovel:' + cod, 'json').catch(() => null)
            await env.ENGAGEMENT.put('imovel:' + cod, JSON.stringify({ ...(prev || {}), owner: o, atualizadoEm: Date.now() })).catch(() => {})
          }
        } catch {}
        await sleep(PAUSA_MS)
      }
    }
    novosItens.push({ im, prop: montarProp(owner) })
  }

  const itens = [
    ...novosItens.map(({ im, prop }) => montarItem(im, prop)),
    ...paraEnriquecer.map(({ im, prop }) => montarItem(im, prop)),
  ] // máx 4 + 4 = 8 (o contrato aceita até 12)

  if (!itens.length) return json({ ok: true, done: 'sem-pendencias', novos: 0, enriquecidos: 0, restantes })

  // envia TODOS os do lote em UMA chamada ao ingest do aicapitei
  const r = await fetch(INGEST_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8', 'x-ingest-key': chaveIngest },
    body: JSON.stringify({ itens }),
    signal: AbortSignal.timeout(20000),
  }).catch(() => null)
  const rj = r && r.ok ? await r.json().catch(() => null) : null
  if (!(rj && rj.ok)) {
    // nada é marcado como exportado — a próxima rodada tenta os mesmos; done faz o cron parar
    return json({ ok: false, done: 'ingest-erro', httpStatus: r ? r.status : 0, novos: 0, enriquecidos: 0, restantes })
  }

  // marca exportados e incrementa o contador do dia (só os novos ACEITOS contam no teto;
  // rejeitado pelo ingest fica de fora do mapa e volta a ser tentado — não some em silêncio)
  const agora = Date.now()
  const rejeitadosIngest = new Set(((rj && rj.rejeitados) || []).map((x) => String(x && x.codigo)))
  const novosOk = novosItens.filter(({ im }) => !rejeitadosIngest.has(String(im.codigo)))
  for (const { im, prop } of novosOk) exportados[String(im.codigo)] = { em: agora, owner: !!prop }
  for (const { im } of paraEnriquecer) { const c = String(im.codigo); if (!rejeitadosIngest.has(c)) exportados[c] = { ...(exportados[c] || { em: agora }), owner: true } }
  await env.ENGAGEMENT.put(KEY_EXPORTADOS, JSON.stringify(exportados)).catch(() => {})
  const novos = novosOk.length
  if (novos) await env.ENGAGEMENT.put(chaveDia, String(hoje + novos), { expirationTtl: 3 * 86400 }).catch(() => {})

  const restantesDepois = restantes - novos
  const atingiuTeto = hoje + novos >= TETO_DIA
  const out = { ok: true, novos, comOwner: novosItens.filter((x) => x.prop).length, enriquecidos: paraEnriquecer.length, restantes: restantesDepois, ingest: { novos: rj.novos, atualizados: rj.atualizados, rejeitados: rj.rejeitados } }
  if (atingiuTeto) out.done = 'teto-diario'
  else if (restantesDepois <= 0 && !paraEnriquecer.length) out.done = 'sem-pendencias'
  return json(out)
}
