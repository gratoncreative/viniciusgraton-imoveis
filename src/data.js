// =============================================================
//  CONFIG CENTRAL — dados reais do negócio
// =============================================================
export const CONFIG = {
  nome: 'Vinícius Graton',
  marca: 'Vinícius Graton Imóveis',
  papel: 'Consultor de Imóveis em Uberlândia',
  whatsapp: '5534991570494', // (34) 99157-0494
  whatsappMsg: 'Olá Vinícius! Vi seu site e quero ajuda para encontrar o imóvel certo.',
  instagram: 'https://www.instagram.com/viniciusgraton.imoveis/',
  cidade: 'Uberlândia / MG',
  email: 'contato@viniciusgraton.com.br',
  gaId: 'G-MYTY0KBK9E', // ID do Google Analytics 4; vazio = analytics desligado
  // Login com Google (gratuito). Client ID OAuth (público — pode ficar no código).
  // Criado no Google Cloud (projeto gen-lang-client). Enquanto vazio, o botão fica oculto.
  googleClientId: '522410029650-rrsga1dakfh4j3b5bqqepp1ha0bnfc5d.apps.googleusercontent.com',
  // Imagem realista da capa (troque por uma foto sua/local quando quiser)
  heroImg: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1920&auto=format&fit=crop',
}

// aceita uma mensagem personalizada por contexto; usa a padrão se nenhuma for passada
export const linkWhatsApp = (msg) =>
  `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg || CONFIG.whatsappMsg)}`

// ——— Validação de WhatsApp/celular brasileiro ———
// Aceita com ou sem +55. Exige DDD válido (11–99) + 9 + 8 dígitos (celular).
export const soDigitos = (s) => String(s || '').replace(/\D/g, '')
export const validarWhatsappBR = (s) => {
  let n = soDigitos(s)
  if (n.startsWith('55') && n.length > 11) n = n.slice(2)
  return /^[1-9][0-9]9\d{8}$/.test(n)
}
// normaliza pro formato wa.me (55 + DDD + número)
export const normalizarWhatsappBR = (s) => {
  let n = soDigitos(s)
  if (n.startsWith('55') && n.length > 11) n = n.slice(2)
  return '55' + n
}
// máscara amigável enquanto digita: (34) 99157-0494
export const formatarFoneBR = (s) => {
  let n = soDigitos(s)
  if (n.startsWith('55') && n.length > 11) n = n.slice(2)
  n = n.slice(0, 11)
  if (n.length > 10) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
  if (n.length > 6) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`
  if (n.length > 2) return `(${n.slice(0, 2)}) ${n.slice(2)}`
  if (n.length > 0) return `(${n}`
  return ''
}

// Mensagens pré-salvas por área do site
export const WA = {
  navbar: 'Olá Vinícius! Vim pelo seu site e quero falar com você sobre imóveis em Uberlândia.',
  hero: 'Olá Vinícius! Quero sua ajuda para comprar meu imóvel em Uberlândia sem medo de errar.',
  imoveis: 'Olá Vinícius! Quero te contar o que procuro em um imóvel. Pode me ajudar?',
  contato: 'Olá Vinícius! Vim pelo seu site e quero conversar sobre um imóvel.',
  flutuante: 'Olá Vinícius! Estou no seu site e queria tirar uma dúvida rápida.',
  banda1: 'Olá Vinícius! Quero encontrar o imóvel certo pra minha rotina. Pode me ajudar?',
  banda2: 'Olá Vinícius! Quero começar a procurar meu imóvel com a sua ajuda, do início ao fim.',
  destaque: 'Olá Vinícius! Quero ver os imóveis em destaque que estão no seu site.',
}

// =============================================================
//  IMÓVEIS EM DESTAQUE — alimentado automaticamente (ver scripts/sync-imoveis.mjs)
//  O arquivo imoveis-destaque.json é regerado na rotina diária a partir
//  da lista de imóveis publicados na web da Rotina Imobiliária (Imoview).
// =============================================================
import destaqueData from './imoveis-destaque.json'
import construtorasData from './construtoras.json'
import condominiosData from './condominios.json'
import bairrosM2 from './bairros-m2.json'

const TODOS_IMOVEIS = destaqueData.imoveis || []
// Imóveis importados entram como `pendente` e ficam FORA do site até o Vinícius aprovar.
export const IMOVEIS = TODOS_IMOVEIS.filter((i) => !i.pendente)

// Vitrine/publicidade do próprio site enquanto não há cliente pagando o impulsionamento.
// São imóveis REAIS (do Vinícius) usados como demonstração do recurso. Ficam sempre
// sinalizados no card com selo "Publicidade · Impulsionado" — transparente ao visitante,
// que entende que é um anúncio em destaque e que pode fazer o mesmo (link p/ /impulsionar).
const DEMO_IMPULSIONADOS = new Set(['29144'])
function marcarDemoImpulsionados() {
  for (const im of IMOVEIS) {
    if (DEMO_IMPULSIONADOS.has(String(im.codigo))) { im.destaque = true; im.impulsionado = true }
  }
}
marcarDemoImpulsionados()
export const IMOVEIS_PENDENTES = TODOS_IMOVEIS.filter((i) => i.pendente)
export const IMOVEIS_INFO = { geradoEm: destaqueData.geradoEm, fonte: destaqueData.fonte }

// Aplica os overrides do painel (campos editados / ocultar) vindos de /api/imoveis-pub.
// Só campos PÚBLICOS do anúncio — dados do proprietário NUNCA chegam aqui.
const CAMPOS_OVERRIDE = ['preco', 'precoAnterior', 'tipo', 'bairro', 'quartos', 'suites', 'banheiros', 'vagas', 'area', 'andar', 'elevador', 'descricao', 'destaque']
export function aplicarOverridesImoveis(mapa, aprovados) {
  // Reinsere no site os imóveis pendentes que o Vinícius já aprovou (lista vinda do KV).
  const apSet = new Set((aprovados || []).map(String))
  for (const im of IMOVEIS_PENDENTES) {
    if (apSet.has(String(im.codigo)) && !IMOVEIS.some((x) => String(x.codigo) === String(im.codigo))) {
      IMOVEIS.push(im)
    }
  }
  if (!mapa || typeof mapa !== 'object') return
  for (const im of IMOVEIS) {
    const o = mapa[String(im.codigo)]
    if (o && !o.oculto) {
      for (const f of CAMPOS_OVERRIDE) if (f in o && o[f] !== '' && o[f] != null) im[f] = o[f]
      if (Array.isArray(o.fotos) && o.fotos.length) { im.fotos = o.fotos; im.img = o.fotos[0] }
      // impulsionamento pago: destaque vale só até a data paga (expira sozinho)
      if (o.destaque && o.destaqueAte) im.destaque = Date.now() < Number(o.destaqueAte)
      if (im.destaque) im.impulsionado = !!o.destaqueAte
    }
  }
  for (let i = IMOVEIS.length - 1; i >= 0; i--) {
    const o = mapa[String(IMOVEIS[i].codigo)]
    if (o && o.oculto) IMOVEIS.splice(i, 1)
  }
  marcarDemoImpulsionados() // mantém a vitrine impulsionada após aplicar overrides
}

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

// Condomínios fechados horizontais (casas, lotes, chácaras) de Uberlândia
export const CONDOMINIOS = condominiosData.condominios || []
export const getCondominio = (slug) => CONDOMINIOS.find((c) => c.slug === slug)

// Formata preço em reais por extenso, padrão brasileiro: R$ 550.000,00
export const formatPreco = (v) => {
  if (!v || v <= 0) return 'Sob consulta'
  return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const formatArea = (a) =>
  a ? `${a.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} m²` : null

// Sinais de OPORTUNIDADE — 100% legítimos e verificáveis (sem preço inventado):
//  - desconto real: só quando o proprietário registra um "preço anterior" maior que o atual
//  - abaixo do mercado: preço/m² do imóvel < m² médio do bairro (fontes públicas IPD/ZAP)
const _norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
const _m2Bairro = (bairro) => { const r = (bairrosM2 || []).find((x) => _norm(x.bairro) === _norm(bairro)); return (r && r.m2) || 0 }
export function oportunidade(im) {
  const out = { temDesconto: false, pctDesconto: 0, precoAnterior: 0, abaixoMercado: false, pctAbaixo: 0 }
  if (!im) return out
  const ant = Number(im.precoAnterior) || 0
  if (ant > 0 && im.preco > 0 && ant > im.preco) {
    out.temDesconto = true
    out.precoAnterior = ant
    out.pctDesconto = Math.round((1 - im.preco / ant) * 100)
  }
  const m2 = _m2Bairro(im.bairro)
  const area = Number(im.area) || 0
  if (m2 > 0 && area > 0 && im.preco > 0) {
    const precoM2 = im.preco / area
    if (precoM2 < m2 * 0.93) { out.abaixoMercado = true; out.pctAbaixo = Math.round((1 - precoM2 / m2) * 100) }
  }
  return out
}

// ——— Estudo do valor do m² (comparativo de mercado, individual por imóvel) ———
const _quantil = (sorted, q) => {
  if (!sorted.length) return 0
  const pos = (sorted.length - 1) * q
  const b = Math.floor(pos), resto = pos - b
  return sorted[b + 1] !== undefined ? sorted[b] + resto * (sorted[b + 1] - sorted[b]) : sorted[b]
}
const _tipoGrupo = (t) => {
  const s = _norm(t)
  if (/apart|kit|stud|loft|flat|cobertura/.test(s)) return 'apartamento'
  if (/casa|sobrado/.test(s)) return 'casa'
  if (/terreno|lote|area|chacara|sitio|fazenda/.test(s)) return 'terreno'
  if (/comerc|sala|loja|ponto|gal|barrac|predio/.test(s)) return 'comercial'
  return 'outro'
}
// recebe o imóvel e a base completa (catalogo) -> análise de preço/m²
export function estudoM2(im, base) {
  if (!im || !(im.preco > 0) || !(im.area > 0)) return { ok: false }
  const precoM2 = im.preco / im.area
  const grupo = _tipoGrupo(im.tipo)
  const norm = _norm(im.bairro)
  const lista = Array.isArray(base) ? base : []
  const m2de = (x) => (x && x.preco > 0 && x.area > 0 ? x.preco / x.area : 0)
  const ok = (x) => String(x.codigo) !== String(im.codigo) && _tipoGrupo(x.tipo) === grupo && m2de(x) > 0
  const compBairro = lista.filter((x) => ok(x) && _norm(x.bairro) === norm).map(m2de).sort((a, b) => a - b)
  const compCidade = lista.filter((x) => ok(x)).map(m2de).sort((a, b) => a - b)
  const est = (arr) => arr.length ? { n: arr.length, min: arr[0], max: arr[arr.length - 1], mediana: _quantil(arr, 0.5), p25: _quantil(arr, 0.25), p75: _quantil(arr, 0.75) } : null
  const bairro = est(compBairro)
  const cidade = est(compCidade)
  const refIPD = _m2Bairro(im.bairro)
  const refRow = (bairrosM2 || []).find((x) => _norm(x.bairro) === norm)
  let referencia = 0, baseLabel = ''
  if (bairro && bairro.n >= 5) { referencia = bairro.mediana; baseLabel = `mediana de ${bairro.n} imóveis semelhantes no ${im.bairro}` }
  else if (refIPD > 0) { referencia = refIPD; baseLabel = `índice de mercado do ${im.bairro}${refRow?.fonte ? ` (${refRow.fonte})` : ''}` }
  else if (cidade && cidade.n >= 5) { referencia = cidade.mediana; baseLabel = `mediana de ${cidade.n} imóveis do mesmo tipo em ${im.cidade || 'Uberlândia'}` }
  if (!referencia) return { ok: false }
  const diffPct = Math.round((precoM2 / referencia - 1) * 100)
  const veredito = diffPct <= -10 ? 'abaixo' : diffPct >= 10 ? 'acima' : 'dentro'
  const fatores = [
    `Tipo do imóvel: ${im.tipo || grupo}`,
    `Bairro: ${im.bairro}`,
    `Área de referência: ${Math.round(im.area)} m²`,
    bairro ? `${bairro.n} imóveis comparáveis no bairro` : 'Poucos comparáveis no bairro — usamos índice de mercado/cidade',
    im.condominio > 0 ? `Condomínio de ${formatPreco(im.condominio)} (entra no custo mensal)` : null,
    im.vagas > 0 ? `${im.vagas} vaga(s) de garagem` : null,
    typeof im.elevador === 'boolean' ? (im.elevador ? 'Prédio com elevador' : 'Prédio sem elevador') : null,
    im.andar ? `Andar: ${im.andar}` : null,
  ].filter(Boolean)
  return { ok: true, precoM2, area: im.area, referencia, baseLabel, diffPct, veredito, bairro, cidade, refIPD, refFonte: refRow?.fonte, refRef: refRow?.ref, grupo, fatores }
}

// Mensagem de WhatsApp personalizada por imóvel
export const waImovel = (im) =>
  `Olá Vinícius! Tenho interesse no imóvel cód. ${im.codigo} — ${im.tipo} no ${im.bairro} (${formatPreco(im.preco)}). Pode me passar mais informações?`

// Busca um imóvel pelo código
export const getImovel = (codigo) =>
  IMOVEIS.find((i) => String(i.codigo) === String(codigo)) ||
  IMOVEIS_PENDENTES.find((i) => String(i.codigo) === String(codigo))

// ————— CRM: casa as preferências do cliente com os imóveis do site —————
const _semAcento = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
// pontua o quanto um imóvel combina com as preferências (e por quê)
export const avaliarMatch = (im, p) => {
  if (!im || !p) return { ok: false, score: 0, motivos: [] }
  const motivos = []
  let score = 0
  // tipo (filtro forte)
  if (Array.isArray(p.tipos) && p.tipos.length) {
    const t = _semAcento(im.tipo)
    const bate = p.tipos.some((x) => t.includes(_semAcento(x)) || _semAcento(x).includes(t))
    if (!bate) return { ok: false, score: 0, motivos: [] }
    motivos.push(`É ${(im.tipo || '').toLowerCase()}, exatamente o tipo que você procura`)
    score += 30
  }
  // preço (filtro forte com leve tolerância)
  if (p.precoMax > 0) {
    if (im.preco > p.precoMax * 1.08) return { ok: false, score: 0, motivos: [] }
    if (im.preco <= p.precoMax) { motivos.push('Dentro do seu orçamento'); score += 25 }
  }
  if (p.precoMin > 0 && im.preco < p.precoMin * 0.9) return { ok: false, score: 0, motivos: [] }
  // Quartos e área: filtro FORTE (campos confiáveis/preenchidos no feed).
  if (p.quartosMin > 0) { if ((im.quartos || 0) < p.quartosMin) return { ok: false, score: 0, motivos: [] }; motivos.push(`${im.quartos} quartos — atende o que você precisa`); score += 12 }
  if (p.areaMin > 0) { if ((im.area || 0) < p.areaMin) return { ok: false, score: 0, motivos: [] }; motivos.push(`${im.area} m² — bom espaço`); score += 8 }
  // Suítes e vagas: a Rotina muitas vezes NÃO preenche (0 = "não informado").
  // Então só excluímos quando o imóvel TEM o dado e ele é menor que o pedido — senão, mantém (benefício da dúvida).
  if (p.suitesMin > 0) { if (im.suites > 0 && im.suites < p.suitesMin) return { ok: false, score: 0, motivos: [] }; if ((im.suites || 0) >= p.suitesMin) { motivos.push(`${im.suites} suíte${im.suites > 1 ? 's' : ''}`); score += 8 } }
  if (p.vagasMin > 0) { if (im.vagas > 0 && im.vagas < p.vagasMin) return { ok: false, score: 0, motivos: [] }; if ((im.vagas || 0) >= p.vagasMin) { motivos.push(`${im.vagas} vaga${im.vagas > 1 ? 's' : ''} de garagem`); score += 8 } }
  // bairro (filtro FORTE: se o cliente escolheu bairros, só entram imóveis nesses bairros)
  if (Array.isArray(p.bairros) && p.bairros.length) {
    const b = _semAcento(im.bairro)
    const bate = p.bairros.some((x) => _semAcento(x) === b)
    if (!bate) return { ok: false, score: 0, motivos: [] }
    motivos.push(`No ${im.bairro}, um dos bairros que você curtiu`); score += 20
  }
  return { ok: true, score, motivos }
}
// retorna os imóveis que fazem sentido p/ o cliente, ranqueados (melhor primeiro)
export const filtrarParaCliente = (p, lista = IMOVEIS) =>
  lista
    .filter((im) => !im.oculto)
    .map((im) => ({ im, m: avaliarMatch(im, p) }))
    .filter((x) => x.m.ok)
    .sort((a, b) => b.m.score - a.m.score)

// Galeria de fotos (usa fotos[] se houver; senão a capa)
export const fotosDe = (im) =>
  im && im.fotos && im.fotos.length ? im.fotos : im && im.img ? [im.img] : []

const _plural = (n, s, p) => (n > 1 ? p : s)

// Resumo curto do imóvel: usa a descrição real (da fonte) se houver;
// senão monta um resumo factual a partir dos dados reais (nada inventado)
export const resumoImovel = (im) => {
  if (!im) return ''
  if (im.descricao && im.descricao.trim()) return im.descricao.trim()
  const itens = [
    im.quartos > 0 && `${im.quartos} ${_plural(im.quartos, 'quarto', 'quartos')}`,
    im.suites > 0 && `${im.suites} ${_plural(im.suites, 'suíte', 'suítes')}`,
    im.vagas > 0 && `${im.vagas} ${_plural(im.vagas, 'vaga', 'vagas')}`,
    im.area > 0 && `${formatArea(im.area)}`,
  ].filter(Boolean)
  return `${im.tipo} à venda no ${im.bairro}, em ${im.cidade}.${itens.length ? ' ' + itens.join(', ') + '.' : ''}`
}

// Trunca texto preservando palavras (para a vitrine)
export const truncar = (s, n = 200) => {
  if (!s) return ''
  const t = s.trim()
  if (t.length <= n) return t
  return t.slice(0, n - 1).replace(/\s+\S*$/, '').trimEnd() + '…'
}

// É imóvel em condomínio fechado?
export const ehCondominio = (im) => !!im && /condom[ií]nio/i.test(im.tipo || '')

// Subtítulo persuasivo montado SÓ com dados reais (specs/tipo/bairro) — nada inventado.
// Dá uma frase de venda mesmo para imóveis sem descrição cadastrada.
export const subtituloImovel = (im) => {
  if (!im) return ''
  const specs = [
    im.suites > 0 && `${im.suites} ${_plural(im.suites, 'suíte', 'suítes')}`,
    im.quartos > 0 && im.suites === 0 && `${im.quartos} ${_plural(im.quartos, 'quarto', 'quartos')}`,
    im.area > 0 && `${formatArea(im.area)}`,
    im.vagas > 0 && `${im.vagas} ${_plural(im.vagas, 'vaga', 'vagas')}`,
  ].filter(Boolean)
  const lista = specs.length
    ? ` São ${specs.join(', ')}, pensados para você viver com conforto, espaço e segurança.`
    : ' Um imóvel pensado para você viver com conforto e segurança.'
  return `${im.tipo} no ${im.bairro} — um dos endereços mais procurados de ${im.cidade}.${lista}`
}

// procura um termo (com acento-insensível) no título + descrição do imóvel
const _txtImovel = (im) => _semAcento(`${im?.titulo || ''} ${im?.descricao || ''}`)
const _ehTerreno = (im) => /terreno|lote|[áa]rea|ch[áa]car/i.test(im?.tipo || '')
// imóvel de esquina? (detecta pela descrição/título — dado real da fonte)
export const ehEsquina = (im) => !!im && /\besquina\b/.test(_txtImovel(im))

// VANTAGENS reais do imóvel (selling points) — derivadas só de dados verdadeiros (specs,
// oportunidade legítima e termos presentes na descrição da fonte). Nada inventado.
export function vantagensImovel(im) {
  if (!im) return []
  const t = _txtImovel(im)
  const tem = (re) => re.test(t)
  const terreno = _ehTerreno(im)
  const op = oportunidade(im)
  const v = []
  if (op.temDesconto) v.push(`Preço reduzido — ${op.pctDesconto}% abaixo do valor anterior`)
  if (op.abaixoMercado) v.push('Abaixo do preço médio do bairro')
  if (ehEsquina(im)) v.push(terreno ? 'Lote de esquina — mais frente, iluminação e valorização' : 'Imóvel de esquina — mais arejado, iluminado e valorizado')
  if (terreno) {
    if (im.area > 0) v.push(`Terreno amplo de ${formatArea(im.area)} — espaço pra projetar do seu jeito`)
    if (tem(/plano|topografia|nivelad/)) v.push('Terreno plano, fácil de construir')
    if (tem(/murad/)) v.push('Já murado')
    if (tem(/document|escritur|registr/)) v.push('Documentação em ordem')
    if (tem(/condominio fechado|portaria|seguranca 24/)) v.push('Em condomínio fechado, com segurança')
  } else {
    if (im.suites > 0) v.push(`${im.suites} ${_plural(im.suites, 'suíte', 'suítes')}`)
    else if (im.quartos > 0) v.push(`${im.quartos} ${_plural(im.quartos, 'quarto', 'quartos')}`)
    if (im.vagas > 0) v.push(`${im.vagas} ${_plural(im.vagas, 'vaga', 'vagas')} de garagem`)
    if (im.area > 0) v.push(`${formatArea(im.area)} de área`)
    if (tem(/piscina/)) v.push('Com piscina')
    if (tem(/churrasqueira|gourmet/)) v.push('Espaço gourmet / churrasqueira')
    if (tem(/elevador/)) v.push('Prédio com elevador')
    if (tem(/mobiliad/)) v.push('Mobiliado')
    if (tem(/reformad|novo|nova/)) v.push('Pronto pra morar')
  }
  if (im.aceitaFinanciamento || tem(/financia|fgts|minha casa/)) v.push('Aceita financiamento')
  if (im.bairro) v.push(`Bem localizado no ${im.bairro}`)
  return [...new Set(v)].slice(0, 5)
}

// Destaques (benefícios) — entre 6 e 12 cards, derivados dos specs + características reais
// (e de palavras-chave da descrição real p/ imóveis sem o grid de características). Nada inventado.
export const destaquesImovel = (im) => {
  if (!im) return []
  const c = im.caracteristicas || {}
  const blob = ([...(c.internas || []), ...(c.externas || []), ...(c.extras || []), im.descricao || ''].join(' ')).toLowerCase()
  const tem = (re) => re.test(blob)
  const d = []
  // specs (sempre disponíveis → garantem o mínimo de 6)
  if (ehCondominio(im) || /condom/i.test(im.condominio || '')) d.push({ icon: 'shield', titulo: 'Condomínio fechado', sub: 'Segurança e tranquilidade' })
  if (im.suites > 0) d.push({ icon: 'sparkle', titulo: `${im.suites} ${_plural(im.suites, 'suíte', 'suítes')}`, sub: 'Conforto e privacidade' })
  if (im.quartos > im.suites) d.push({ icon: 'bed', titulo: `${im.quartos} ${_plural(im.quartos, 'quarto', 'quartos')}`, sub: 'Espaço para todos' })
  if (im.area > 0) d.push({ icon: 'area', titulo: formatArea(im.area), sub: 'Amplo espaço interno' })
  if (im.vagas > 0) d.push({ icon: 'car', titulo: `${im.vagas} ${_plural(im.vagas, 'vaga', 'vagas')} na garagem`, sub: 'Espaço para os carros' })
  if (im.banheiros > 0) d.push({ icon: 'bath', titulo: `${im.banheiros} ${_plural(im.banheiros, 'banheiro', 'banheiros')}`, sub: 'Comodidade no dia a dia' })
  if (im.areaLote > 0) d.push({ icon: 'home', titulo: `Lote ${formatArea(im.areaLote)}`, sub: 'Terreno amplo' })
  // diferenciais reais (características / descrição)
  if (tem(/piscina/)) d.push({ icon: 'sparkle', titulo: 'Piscina', sub: 'Lazer e bem-estar em casa' })
  if (tem(/varanda gourmet/)) d.push({ icon: 'sparkle', titulo: 'Varanda gourmet', sub: 'Perfeito para receber' })
  if (tem(/churrasqueira/)) d.push({ icon: 'sparkle', titulo: 'Churrasqueira', sub: 'Encontros com a família' })
  if (tem(/fotovolta|energia solar|aquec.*solar/)) d.push({ icon: 'sparkle', titulo: 'Energia/aquec. solar', sub: 'Economia e sustentabilidade' })
  if (tem(/closet/)) d.push({ icon: 'sparkle', titulo: 'Closet', sub: 'Organização e sofisticação' })
  if (tem(/elevador/)) d.push({ icon: 'building', titulo: 'Elevador', sub: 'Acesso prático e exclusivo' })
  if (tem(/portaria 24|seguran[çc]a 24|portaria monitorada|reconhecimento facial/)) d.push({ icon: 'shield', titulo: 'Segurança 24h', sub: 'Portaria e monitoramento' })
  if (tem(/academia/)) d.push({ icon: 'sparkle', titulo: 'Academia', sub: 'Saúde sem sair de casa' })
  if (tem(/salão de festas|salao de festas/)) d.push({ icon: 'sparkle', titulo: 'Salão de festas', sub: 'Espaço para comemorar' })
  // localização (sempre por último)
  if (im.pontoReferencia) d.push({ icon: 'pin', titulo: 'Bem localizado', sub: im.pontoReferencia })
  else d.push({ icon: 'pin', titulo: im.bairro, sub: `Localização valorizada em ${im.cidade}` })
  return d.slice(0, 12)
}

// Opções de filtro derivadas dos imóveis reais (para o catálogo)
export const TIPOS_IMOVEL = [...new Set(IMOVEIS.map((i) => i.tipo))].sort()
export const BAIRROS_IMOVEL = [...new Set(IMOVEIS.map((i) => i.bairro))].sort((a, b) => a.localeCompare(b, 'pt-BR'))

// Faixas de preço para filtro do catálogo
export const FAIXAS_PRECO = [
  { label: 'Até R$ 300 mil', min: 0, max: 300000 },
  { label: 'R$ 300 mil a R$ 600 mil', min: 300000, max: 600000 },
  { label: 'R$ 600 mil a R$ 1 mi', min: 600000, max: 1000000 },
  { label: 'R$ 1 mi a R$ 2 mi', min: 1000000, max: 2000000 },
  { label: 'Acima de R$ 2 mi', min: 2000000, max: Infinity },
]

// Faixas cinematográficas (mesmo estilo da capa) inseridas a cada 2 seções
// Faixas cinematográficas com IMÓVEIS REAIS da carteira (foto hospedada + selo clicável)
export const BANDS = {
  b1: {
    img: '/imoveis/99549/1.jpg',
    light: true,
    eyebrow: 'Padrão que você merece',
    frase: 'O imóvel certo muda a sua rotina inteira.',
    cta: 'Quero encontrar o meu',
    wa: 'banda1',
    // imóvel REAL da carteira (alto padrão, Alphaville) — selo verdadeiro que leva ao anúncio.
    // Sem "imagem ilustrativa" e sem inventar venda. Trocar p/ selo "Vendido recentemente" quando houver venda real.
    imovel: { codigo: '99549', tipo: 'Casa em condomínio', bairro: 'Alphaville', preco: 3900000 },
  },
  b2: {
    img: '/imoveis/99496.jpg',
    eyebrow: 'Do primeiro contato às chaves',
    frase: 'Da primeira conversa à chave na sua mão.',
    cta: 'Começar agora',
    wa: 'banda2',
    imovel: { codigo: '99496', tipo: 'Casa em condomínio', bairro: 'Alphaville', preco: 2800000 },
  },
}

// Pilares do atendimento (qualitativos, sem métricas inventadas)
export const PILARES = [
  { icon: 'home', titulo: 'Casa, apto e investimento', sub: 'orientação para cada objetivo', foto: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=900&auto=format&fit=crop' },
  { icon: 'target', titulo: 'Curadoria personalizada', sub: 'só o que faz sentido pra você', foto: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=900&auto=format&fit=crop' },
  { icon: 'shield', titulo: 'Documentação conferida', sub: 'compra com segurança', foto: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=900&auto=format&fit=crop' },
  { icon: 'pin', titulo: 'Uberlândia e região', sub: 'o mercado que eu conheço', foto: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?q=80&w=900&auto=format&fit=crop' },
]

// Segmentos com que o Vinícius atua (substitui listagem real até receber imóveis)
export const SEGMENTOS = [
  {
    id: 1,
    icon: 'building',
    titulo: 'Apartamentos',
    desc: 'Do compacto ao alto padrão, encontro a planta e a localização certas pra você.',
    img: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1200&auto=format&fit=crop',
  },
  {
    id: 2,
    icon: 'home',
    titulo: 'Casas em condomínio',
    desc: 'Segurança, lazer e espaço pra família, nos melhores condomínios da região.',
    img: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=1200&auto=format&fit=crop',
  },
  {
    id: 3,
    icon: 'sparkle',
    titulo: 'Lançamentos',
    desc: 'Acesso a empreendimentos novos, com as condições de entrada de cada construtora.',
    img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1200&auto=format&fit=crop',
  },
  {
    id: 4,
    icon: 'trend',
    titulo: 'Imóvel para investir',
    desc: 'Análise pensada em renda de aluguel e potencial de valorização no longo prazo.',
    img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=1200&auto=format&fit=crop',
  },
  {
    id: 5,
    icon: 'key',
    titulo: 'Primeiro imóvel',
    desc: 'Te oriento no financiamento, no uso do FGTS e em cada etapa, sem você se perder.',
    img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=1200&auto=format&fit=crop',
  },
  {
    id: 6,
    icon: 'store',
    titulo: 'Imóvel comercial',
    desc: 'Salas, lojas e pontos comerciais para o seu negócio se instalar e crescer.',
    img: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1200&auto=format&fit=crop',
  },
]

// Campos do formulário de busca (baseado em filtros padrão de imobiliárias / Imoview)
export const FILTRO = {
  tipos: ['Apartamento', 'Casa em condomínio', 'Casa', 'Cobertura', 'Terreno / Lote', 'Sala ou loja comercial'],
  finalidades: ['Para morar', 'Para investir'],
  precos: [
    'Até R$ 300 mil',
    'R$ 300 mil a R$ 500 mil',
    'R$ 500 mil a R$ 800 mil',
    'R$ 800 mil a R$ 1,2 milhão',
    'R$ 1,2 a R$ 2 milhões',
    'Acima de R$ 2 milhões',
    'Ainda não sei',
  ],
  caracteristicas: ['Varanda / Sacada', 'Piscina', 'Churrasqueira', 'Mobiliado', 'Condomínio fechado', 'Academia', 'Portaria 24h', 'Pet friendly'],
}

// pré-seleção do formulário conforme o card clicado (id do segmento)
export const SEG_PRESET = {
  1: { tipo: 'Apartamento' },
  2: { tipo: 'Casa em condomínio' },
  3: { tipo: 'Apartamento', lancamento: true },
  4: { finalidade: 'Para investir' },
  5: { fgts: true },
  6: { tipo: 'Sala ou loja comercial' },
}

export const PASSOS = [
  {
    n: '01',
    titulo: 'Conversa & objetivo',
    texto: 'Entendo seu momento, seu orçamento e o que você realmente busca — morar, trocar ou investir.',
  },
  {
    n: '02',
    titulo: 'Curadoria de imóveis',
    texto: 'Seleciono apenas os imóveis que fazem sentido pra você. Sem perda de tempo com o que não serve.',
  },
  {
    n: '03',
    titulo: 'Visitas guiadas',
    texto: 'Acompanho cada visita apontando pontos fortes, riscos e potencial de cada opção.',
  },
  {
    n: '04',
    titulo: 'Negociação segura',
    texto: 'Negocio preço e condições e confiro toda a parte documental antes de qualquer assinatura.',
  },
]

// Compromissos reais (substitui depoimentos fictícios)
export const COMPROMISSO = [
  {
    icon: 'eye',
    titulo: 'Transparência total',
    texto: 'Você entende cada passo, cada custo e cada risco antes de decidir. Nada nas entrelinhas.',
  },
  {
    icon: 'shield',
    titulo: 'Segurança na documentação',
    texto: 'Confiro a situação documental e jurídica do imóvel antes de qualquer assinatura.',
  },
  {
    icon: 'whats',
    titulo: 'Atendimento direto comigo',
    texto: 'Do primeiro contato à entrega das chaves, quem cuida de você sou eu — sem call center.',
  },
]

// Foto humana ilustrativa para a seção de compromisso (família feliz / sonho realizado)
// Casal esperando um bebê, na luz dourada da cozinha do novo lar — emoção + recomeço + segurança.
export const COMPROMISSO_IMG =
  'https://images.unsplash.com/photo-1776741147201-cbaa6155646c?q=80&w=1400&auto=format&fit=crop'

// Dores reais do comprador -> como o Vinícius resolve
export const DORES = [
  {
    medo: 'Tenho medo de comprar errado e me arrepender depois.',
    solucao: 'Faço a curadoria certa pro seu perfil e aponto os pontos fortes e os riscos de cada imóvel antes de você decidir.',
  },
  {
    medo: 'E se eu pagar mais caro do que o imóvel realmente vale?',
    solucao: 'Avalio o preço pelo mercado real da região e negocio as melhores condições a seu favor.',
  },
  {
    medo: 'Documentação e contrato me assustam. E se for furada?',
    solucao: 'Confiro toda a situação documental e jurídica do imóvel antes de qualquer assinatura.',
  },
  {
    medo: 'Financiamento, FGTS, ITBI... não entendo nada disso.',
    solucao: 'Eu te explico e te conduzo em cada etapa, em linguagem simples, sem você se perder.',
  },
]

// Bairros de Uberlândia (autoridade local / SEO) — descrições gerais e honestas
export const BAIRROS = [
  { nome: 'Jardim Karaíba', desc: 'O endereço mais nobre da cidade: alto padrão, condomínios e apartamentos de luxo.' },
  { nome: 'Morada da Colina', desc: 'Bairro nobre, arborizado e clássico, dos mais valorizados de Uberlândia.' },
  { nome: 'Cidade Jardim', desc: 'Residencial sofisticado, ideal para famílias de alto padrão.' },
  { nome: 'Gávea', desc: 'Casas em condomínios fechados de alto padrão, lazer e segurança.' },
  { nome: 'Granja Marileusa', desc: 'Bairro planejado e tecnológico, alto padrão, em frente à Algar.' },
  { nome: 'Vigilato Pereira', desc: 'Nobre e central, perto do Praia Clube e das melhores avenidas.' },
  { nome: 'Santa Maria', desc: 'Zona Sul em alta, com empreendimentos de alto padrão.' },
  { nome: 'Jardim Sul', desc: 'Uma das regiões mais valorizadas e procuradas da Zona Sul.' },
  { nome: 'Jardim Finotti', desc: 'Muito valorizado na Zona Sul, com lançamentos de alto padrão.' },
  { nome: 'Parque Una', desc: 'Zona Sul nobre, próximo a parques e ao Praia Clube.' },
  { nome: 'Patrimônio', desc: 'Tradicional e histórico, um dos endereços clássicos da cidade.' },
  { nome: 'Lídice', desc: 'Charmoso e arborizado, pertinho do centro.' },
  { nome: 'Santa Mônica', desc: 'Central e completo, ótimo para morar e para investir.' },
  { nome: 'Tabajaras', desc: 'Tradicional, perto do centro e com boa liquidez.' },
  { nome: 'Nova Uberlândia', desc: 'Residencial valorizado e bem localizado na Zona Sul.' },
  { nome: 'Tubalina', desc: 'Em crescimento, com boas oportunidades.' },
]

// Slug amigável p/ URLs (sem acento, minúsculo, com hífens)
export const slugify = (s) =>
  String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

// Bairros com página própria (SEO): editoriais + os que têm imóveis na carteira.
const _descBairro = (n) =>
  `Imóveis à venda em ${n}, Uberlândia. Veja as opções da Rotina Imobiliária com o meu atendimento pessoal e uma curadoria sob medida na região.`
const _editorial = Object.fromEntries(BAIRROS.map((b) => [b.nome.toLowerCase(), b.desc]))
export const BAIRROS_SEO = [...new Set([...BAIRROS.map((b) => b.nome), ...BAIRROS_IMOVEL])]
  .map((nome) => ({ nome, slug: slugify(nome), desc: _editorial[nome.toLowerCase()] || _descBairro(nome) }))
  .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
export const getBairroSeo = (slug) => BAIRROS_SEO.find((b) => b.slug === slug)
export const imoveisDoBairro = (nome) => IMOVEIS.filter((i) => (i.bairro || '').toLowerCase() === String(nome).toLowerCase())

// TODOS os bairros de Uberlândia (lista completa p/ seleção no CRM) — une a base
// oficial de m² (77 bairros) + principais + os que têm imóvel na carteira.
export const BAIRROS_TODOS = [...new Set([
  ...bairrosM2.map((b) => b.bairro),
  ...BAIRROS.map((b) => b.nome),
  ...BAIRROS_IMOVEL,
])].filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR'))

// Perguntas frequentes (conteúdo de autoridade + schema FAQ)
export const FAQ = [
  { q: 'Posso usar o FGTS para comprar meu imóvel?', a: 'Sim, desde que você tenha pelo menos 3 anos de trabalho com recolhimento de FGTS (somados, não precisam ser seguidos), o imóvel seja urbano e residencial para sua moradia, e você não tenha outro imóvel residencial nem financiamento ativo no SFH na cidade onde mora ou trabalha. Dá para usar o saldo na entrada, para amortizar ou até comprar à vista. Quer que eu confirme se você se enquadra? É rápido no atendimento.' },
  { q: 'Com que frequência posso usar o FGTS para comprar imóvel?', a: 'Depois de usar o FGTS numa compra, você precisa esperar um intervalo de 3 anos, contados do registro do contrato em cartório, para usá-lo de novo numa nova aquisição. Já para amortizar ou quitar um financiamento que você já tem, a regra é diferente e costuma permitir uso a cada 2 anos. Posso te orientar conforme o seu caso.' },
  { q: 'Como funciona o financiamento de imóvel na prática?', a: 'O banco analisa sua renda e seu perfil de crédito, avalia o imóvel e libera um valor que você paga em parcelas mensais por até 35 anos. Hoje os bancos costumam financiar até 80% do valor do imóvel, então você entra com cerca de 20% de entrada (que pode incluir o FGTS). As parcelas têm juros mais correção (geralmente a TR), e o imóvel fica em garantia (alienação fiduciária) até a quitação. Posso simular com você sem compromisso.' },
  { q: 'Qual a diferença entre SAC e Price?', a: 'No SAC, as parcelas começam mais altas e vão diminuindo ao longo do tempo, e no fim você paga menos juros no total. No Price, as parcelas são fixas (ou quase), começando menores, mas o custo total tende a ser maior. A maioria dos financiamentos imobiliários no Brasil usa o SAC. A escolha depende do seu orçamento hoje e do seu planejamento, e eu te ajudo a comparar.' },
  { q: 'Qual é a entrada mínima para financiar?', a: 'Em 2026 os bancos voltaram a financiar até 80% do valor do imóvel, então a entrada costuma ficar em torno de 20%. No Minha Casa Minha Vida o percentual financiado pode ser maior (entrada menor), e o FGTS pode compor essa entrada. O valor exato varia por banco e pelo seu perfil, então vale simular. Me chama que eu levanto os cenários com você.' },
  { q: 'O que é o ITBI e quanto custa em Uberlândia?', a: 'O ITBI é o imposto municipal pago para transferir o imóvel para o seu nome, e sem ele o cartório não registra a compra. Em Uberlândia, a alíquota para compra e venda comum é de 2% sobre o valor do imóvel; nas operações de financiamento pelo SFH para menor renda, há uma alíquota reduzida (em torno de 0,5%) sobre a parte financiada. Como pode haver enquadramentos específicos, o ideal é confirmar o valor exato na Secretaria Municipal da Fazenda. Eu te oriento nesse cálculo na hora da proposta.' },
  { q: 'Qual a diferença entre escritura e registro?', a: 'A escritura é o documento feito em cartório de notas que formaliza o acordo de compra e venda; o registro é quando essa escritura é levada ao Cartório de Registro de Imóveis e o bem passa oficialmente para o seu nome na matrícula. No Brasil vale a máxima: só é dono quem registra. Em compras financiadas, o próprio contrato do banco substitui a escritura e já vai para registro. Eu acompanho esse passo a passo com você.' },
  { q: 'Quais documentos eu preciso para comprar um imóvel?', a: 'Em geral: RG e CPF, comprovante de estado civil (e do cônjuge, se casado), comprovante de residência e comprovantes de renda dos últimos meses. Para financiamento, o banco também pede declaração de Imposto de Renda, extrato do FGTS e carteira de trabalho ou documentos da empresa, se você for autônomo. Cada banco tem sua lista, e eu te envio a relação certinha para você não perder tempo.' },
  { q: 'O que conta no score e na aprovação do crédito?', a: 'O banco olha seu histórico de pagamentos (score), se há nome negativado, a estabilidade e o valor da sua renda, e se a parcela cabe no seu orçamento (em geral ela não pode passar de cerca de 30% da renda). Score alto e contas em dia ajudam muito, mas a renda comprovada é decisiva. Se houver algum ponto de atenção, dá para organizar antes de pedir o crédito, e eu te ajudo a se preparar.' },
  { q: 'Como funcionam as faixas de renda do Minha Casa Minha Vida?', a: 'As faixas são definidas pela renda familiar mensal. Atualmente a Faixa 1 atende renda até cerca de R$ 3.200, a Faixa 2 até R$ 5.000, a Faixa 3 até R$ 9.600 e há ainda uma faixa para renda familiar entre R$ 12 mil e R$ 20 mil (Classe Média). Os valores são reajustados periodicamente, então vale confirmar a faixa atualizada no atendimento. Me passa a sua renda familiar que eu te digo em qual faixa você entra.' },
  { q: 'Tenho direito a subsídio do Minha Casa Minha Vida?', a: 'O subsídio (aquele desconto que o governo dá no valor do imóvel) é voltado principalmente para as Faixas 1 e 2, ou seja, rendas familiares mais baixas. Famílias de menor renda podem ter boa parte do imóvel coberta, e na Faixa 2 o apoio pode chegar a alguns milhares de reais, variando conforme renda, região e valor do imóvel. Os valores mudam com frequência, então confirmamos o seu caso na simulação. Posso fazer isso com você.' },
  { q: 'Qual o valor máximo de imóvel no Minha Casa Minha Vida?', a: 'O teto varia por faixa. Hoje os imóveis da Faixa 3 vão até cerca de R$ 400 mil e os da faixa de Classe Média até cerca de R$ 600 mil, com tetos menores nas faixas iniciais. Esses limites são atualizados de tempos em tempos pelo programa. Me diga a faixa de preço que você busca em Uberlândia que eu já filtro o que se encaixa.' },
  { q: 'É melhor comprar na planta ou um imóvel pronto?', a: 'Na planta você costuma pagar mais barato, parcela a entrada direto com a construtora durante a obra e pode valorizar até a entrega, mas espera para morar e assume o risco do prazo. No pronto, você vê exatamente o que está levando e muda mais rápido, porém o preço tende a ser maior. Depende do seu momento e da sua pressa para mudar. Eu te mostro opções dos dois tipos e a gente compara.' },
  { q: 'Quanto eu gasto além do preço do imóvel?', a: 'Além do valor do imóvel, reserve em torno de 4% a 6% para os custos de cartório e impostos: o ITBI (cerca de 2% em Uberlândia para compra comum) e as taxas de escritura e registro no Cartório de Registro de Imóveis. Em compras financiadas há ainda algumas tarifas do banco, como a de avaliação. Esses custos não entram no financiamento, então é bom já deixar essa reserva separada. Eu te ajudo a montar essa conta antes de fechar.' },
  { q: 'Posso usar o FGTS para amortizar ou quitar o financiamento?', a: 'Sim. Você pode usar o FGTS para abater parte do saldo devedor (amortizar), reduzir o valor das parcelas, pagar até parte das prestações em atraso ou até quitar o financiamento, respeitando as regras do banco e o intervalo previsto (em geral a cada 2 anos para amortização). É uma das melhores formas de economizar juros ao longo do contrato. Me chama que eu te explico como aproveitar isso no seu caso.' },
  { q: 'Comprar imóvel em obras é seguro?', a: 'Pode ser, desde que você verifique a idoneidade da construtora, o registro do empreendimento (incorporação) no cartório e o histórico de entregas dela. A lei protege o comprador, e a documentação registrada dá segurança ao negócio. O cuidado principal é não comprar de quem não tem o empreendimento devidamente registrado. Como consultor, eu checo essa documentação por você antes de qualquer decisão.' },
  { q: 'O que é o habite-se e por que ele importa?', a: 'O habite-se é o documento que a prefeitura emite atestando que a construção foi concluída de acordo com o projeto aprovado e está apta para ser habitada. Sem ele, o imóvel novo não pode ser regularizado nem ter a matrícula individualizada no cartório, o que trava o financiamento e o registro. Por isso, em imóvel novo, ele é essencial. Eu confiro se o imóvel já tem o habite-se antes de você avançar.' },
  { q: 'Financiar imóvel usado é diferente de financiar imóvel novo?', a: 'O funcionamento é parecido, mas no usado o banco costuma ser mais rigoroso na avaliação e na análise da documentação do imóvel e do vendedor, e o prazo de liberação pode ser um pouco maior. No novo ou na planta, muitas vezes a própria construtora já tem o financiamento encaminhado com o banco. Em ambos dá para usar FGTS. Eu te oriento sobre o que esperar em cada caso.' },
  { q: 'O que é portabilidade de financiamento?', a: 'É transferir seu financiamento de um banco para outro que ofereça juros menores, sem precisar quitar e refazer tudo. Pode reduzir bastante o valor das parcelas e o custo total, principalmente se você contratou quando os juros estavam altos. Vale comparar as taxas e os custos da troca antes de decidir. Se quiser, eu te ajudo a avaliar se a portabilidade compensa no seu contrato.' },
  { q: 'Consórcio ou financiamento: o que vale mais a pena?', a: 'O financiamento te dá o imóvel agora, mas com juros; o consórcio não tem juros (só taxa de administração) e costuma sair mais barato no total, porém você depende de ser contemplado por sorteio ou lance, sem data garantida. Consórcio combina mais com quem não tem pressa e quer planejar; financiamento, com quem precisa morar logo. Me conta seu objetivo que eu te ajudo a escolher o melhor caminho.' },
  { q: 'Preciso mesmo de uma imobiliária ou consultor para comprar?', a: 'Não é obrigatório, mas faz muita diferença na segurança e na economia de tempo. Um consultor analisa a documentação, evita que você compre um imóvel com pendências, negocia preço e condições e organiza todo o processo até o registro. É a diferença entre comprar sozinho no escuro e comprar bem acompanhado. É exatamente esse trabalho que eu, Vinícius, faço por você.' },
  { q: 'Quanto custa o trabalho do consultor para quem compra?', a: 'Para você que compra, em geral não há custo: a comissão costuma ser paga pelo vendedor ou já está embutida na operação, então o meu acompanhamento sai sem despesa extra para o comprador na maioria dos casos. Você ganha orientação, segurança na documentação e negociação sem pagar a mais por isso. Qualquer condição diferente é sempre combinada de forma transparente antes. Pode me chamar sem compromisso.' },
  { q: 'O que são sinal e reserva ao fechar negócio?', a: 'O sinal (ou arras) é um valor que você paga para reservar o imóvel e demonstrar que vai cumprir o negócio; ele costuma virar parte do pagamento. Se você desistir, pode perder esse valor; se o vendedor desistir, em geral ele devolve em dobro. Por isso, só dê o sinal com um documento claro do que foi combinado. Eu cuido para que esse acordo seja feito com segurança para você.' },
  { q: 'O que acontece se eu desistir da compra (distrato)?', a: 'O distrato é o cancelamento do contrato. Na compra na planta, a lei prevê retenção de parte dos valores pela construtora (uma porcentagem do que você pagou, conforme o contrato e a legislação), então você raramente recebe tudo de volta. Em compras entre particulares, vale o que foi acordado, incluindo o sinal. Antes de assinar qualquer coisa, é bom entender as regras de saída, e eu reviso isso com você.' },
  { q: 'Como funciona a permuta de imóveis?', a: 'Permuta é a troca de um imóvel por outro, com ou sem complemento em dinheiro (a chamada torna). É comum quando você dá seu imóvel atual como parte do pagamento de outro, inclusive em negócios com construtoras. Há incidência de ITBI e é preciso avaliar bem os dois imóveis e a documentação de ambos. Eu te ajudo a estruturar a permuta de forma justa e segura.' },
  { q: 'Vale a pena investir em imóvel em Uberlândia?', a: 'Uberlândia é um dos polos econômicos mais fortes de Minas, com população crescente, universidades e forte demanda por aluguel, o que tende a sustentar a valorização e a renda de locação. Como em todo investimento, o resultado depende do bairro, do tipo de imóvel e do preço de entrada. Bem escolhido, o imóvel costuma ser um patrimônio sólido na cidade. Posso te mostrar oportunidades alinhadas ao seu objetivo de investir.' },
  { q: 'Quais são os melhores bairros de Uberlândia para comprar?', a: 'Depende do seu objetivo: para alto padrão e valorização, bairros como Jardim Karaíba, Cidade Jardim e Morada da Colina são muito procurados; para boa infraestrutura e equilíbrio entre preço e localização, regiões como Santa Mônica, Tubalina e Copacabana são bem buscadas, inclusive para aluguel. Cada um atende um perfil diferente de moradia ou investimento. Me conta o que você procura que eu indico os bairros que mais combinam com você.' },
  { q: 'Preciso conferir a documentação do vendedor também?', a: 'Com certeza. Além da matrícula atualizada do imóvel, é importante verificar certidões do vendedor (pessoais e, se for empresa, da pessoa jurídica) para evitar comprar um imóvel que possa ser questionado por dívidas ou processos. Esse cuidado protege você de perder o imóvel no futuro. Como consultor, é justamente uma das checagens que eu faço para você antes de fechar.' },
  { q: 'Sou autônomo ou MEI, consigo financiar imóvel?', a: 'Sim, dá para financiar sendo autônomo ou MEI. A diferença é como você comprova a renda: extratos bancários, declaração de Imposto de Renda, DECORE feita por contador e o histórico de movimentação ajudam a demonstrar o quanto você ganha. Quanto mais organizada a comprovação, melhor a aprovação e as condições. Eu te oriento sobre como preparar essa documentação para o banco.' },
  { q: 'Posso quitar o financiamento antes do prazo?', a: 'Pode, sim, e é um direito seu. Ao quitar ou amortizar antecipadamente, o banco é obrigado a dar desconto proporcional nos juros futuros, então você nunca paga juros que ainda não venceram. Dá para usar dinheiro próprio ou o FGTS para isso. É uma ótima forma de economizar, e eu te explico a melhor estratégia para a sua situação.' },
  { q: 'Como sei se a parcela do financiamento vai caber no meu bolso?', a: 'Uma boa referência é que a parcela não comprometa mais do que cerca de 30% da sua renda familiar mensal, que é também o limite que a maioria dos bancos usa para aprovar. Vale considerar ainda o condomínio, o IPTU e a reserva para os custos de cartório. O melhor é fazer uma simulação real com os números atuais. Me chama que eu monto essa simulação com você, sem compromisso.' },
]

export const DIFERENCIAIS = [
  { titulo: 'Curadoria, não catálogo', texto: 'Você não recebe uma lista infinita. Recebe as opções certas pro seu perfil.' },
  { titulo: 'Olhar de investimento', texto: 'Avalio cada imóvel também pelo potencial de valorização e liquidez na região.' },
  { titulo: 'Documentação conferida', texto: 'A parte jurídica e cartorial é verificada antes de qualquer assinatura.' },
  { titulo: 'Atendimento pessoal', texto: 'Você fala direto comigo, do primeiro contato à entrega das chaves.' },
]
