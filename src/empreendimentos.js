// =============================================================
//  Dados de LANÇAMENTOS / CONSTRUTORAS / CONDOMÍNIOS
//  Separado de data.js de propósito: estes JSON são GRANDES
//  (construtoras ~160KB, condomínios ~77KB, Blow ~1,4MB) e só são
//  usados em páginas LAZY (lançamentos, construtoras, condomínios,
//  admin). Mantê-los fora do data.js (que é eager, importado pela
//  Home) tira ~1,6MB do bundle principal → Core Web Vitals.
//  NÃO importe este arquivo a partir de data.js nem de componentes eager.
// =============================================================
import construtorasData from './construtoras.json'
import condominiosData from './condominios.json'
import blowData from './blow_empreendimentos.json'

// Construtoras de Uberlândia (vitrine + página por construtora)
export const CONSTRUTORAS = construtorasData.construtoras || []
export const getConstrutora = (slug) => CONSTRUTORAS.find((c) => c.slug === slug)
export const getEmpreendimento = (cslug, pslug) => {
  const c = getConstrutora(cslug)
  if (!c) return null
  const p = (c.projetos || []).find((x) => x.slug === pslug)
  return p ? { construtora: c, projeto: p } : null
}
export const waConstrutora = (c, proj) =>
  `Olá Vinícius! Tenho interesse ${proj ? `no empreendimento ${proj.nome} (${c.nome})` : `nos empreendimentos da ${c.nome}`} em Uberlândia. Pode me passar mais informações e agendar uma visita?`

const _qNum = (str) => { const m = String(str).match(/(\d+)\s*(quarto|dorm|su[ií]te)/i); return m ? parseInt(m[1]) : null }
const _extraiQ = (tips = []) => { const ns = tips.map(_qNum).filter(n => n !== null); return ns.length ? { min: Math.min(...ns), max: Math.max(...ns) } : null }
const _tipo = (p) => {
  const s = `${p.nome || ''} ${p.descricao || ''} ${(p.tipologias || []).join(' ')}`.toLowerCase()
  if (/sala|comercial|loja|laje|escritório|corporativo/i.test(s)) return 'comercial'
  if (/lote|terreno|chácara/i.test(s)) return 'lote'
  return 'residencial'
}
const _statusNorm = (s = '') => {
  const sl = s.toLowerCase()
  if (/lançamento|lancamento|planta|breve/i.test(sl)) return 'Lançamento'
  if (/obras|construção|construcao/i.test(sl)) return 'Em obras'
  if (/pronto|concluí/i.test(sl)) return 'Pronto'
  return s || 'Sob consulta'
}

export const todosEmpreendimentos = () =>
  CONSTRUTORAS.flatMap(c =>
    (c.projetos || []).map(p => {
      const q = _extraiQ(p.tipologias)
      return {
        ...p,
        status: _statusNorm(p.status),
        construtoraSlug: c.slug,
        construtoraNome: c.nome,
        construtoraSeg: c.segmento,
        tipo: _tipo(p),
        quartosMin: q ? q.min : null,
        quartosMax: q ? q.max : null,
        landingPath: p.landingPath || null, // landing dedicada (ex.: Louis) — o card linka direto pra ela
        destaqueTopo: !!p.destaqueTopo, // empreendimento em campanha aparece no topo do portal
        url: p.landingPath || `/lancamentos/empreendimento/${c.slug}/${p.slug}`,
      }
    })
  )

// Empreendimentos da Blow (sincronizados diariamente)
export const BLOW_EMPREENDIMENTOS = blowData.empreendimentos || []
export const getBlowEmpreendimento = (slug) =>
  BLOW_EMPREENDIMENTOS.find((e) => e.slug === slug) || null
export const BLOW_GERADO_EM = blowData.geradoEm || null

const _blowToCard = (e) => ({
  ...e,
  galeria: e.fotos,
  amenidades: e.comodidades,
  video: e.youtube,
  quartosMin: e.quartosMin,
  quartosMax: e.quartosMax,
  url: `/lancamentos/empreendimento/blow/${e.slug}`,
  origem: 'blow',
})

export const todosEmpreendimentosBlow = () => BLOW_EMPREENDIMENTOS.map(_blowToCard)

// Junta as duas fontes (construtoras.json + Blow) removendo duplicatas do mesmo
// empreendimento (ex.: Mirah, Moove, Santa Maria) que aparecem nas duas. Mantém a
// versão de construtoras.json (cujo card linka certo para /construtoras/:slug/:projeto).
export const todosEmpreendimentosTodos = () => {
  const _k = (e) => `${String(e.nome || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')}|${String(e.bairro || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')}`
  const base = todosEmpreendimentos()
  const vistos = new Set(base.map(_k))
  const blow = todosEmpreendimentosBlow().filter((e) => !vistos.has(_k(e)))
  return [...base, ...blow]
}

export const bairrosComEmpreendimentos = () => {
  const todos = todosEmpreendimentosTodos()
  const mapa = {}
  todos.forEach(e => {
    if (!e.bairro) return
    if (!mapa[e.bairro]) mapa[e.bairro] = []
    mapa[e.bairro].push(e)
  })
  return Object.entries(mapa).sort((a, b) => b[1].length - a[1].length).map(([bairro, lista]) => ({ bairro, lista }))
}

// Condomínios fechados horizontais (casas, lotes, chácaras) de Uberlândia
export const CONDOMINIOS = condominiosData.condominios || []
export const getCondominio = (slug) => CONDOMINIOS.find((c) => c.slug === slug)
