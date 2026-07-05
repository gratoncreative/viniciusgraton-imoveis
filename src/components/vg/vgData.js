// Helpers do redesign (Home) — liga o design da Claude Design aos dados REAIS.
// Preço sem centavos (padrão do design: "R$ 1.290.000").
import { IMOVEIS, oportunidade } from '../../data'

const plural = (n, s, p) => (n > 1 ? p : s)

export const precoCompacto = (v) => {
  const n = Number(v) || 0
  if (n <= 0) return 'Sob consulta'
  return 'R$ ' + Math.round(n).toLocaleString('pt-BR')
}

// Título curto e não-redundante (o bairro já aparece no kicker).
export const tituloCard = (im) => {
  const t = im.tipo || 'Imóvel'
  if (im.suites > 0) return `${t} com ${im.suites} ${plural(im.suites, 'suíte', 'suítes')}`
  if (im.quartos > 0) return `${t} com ${im.quartos} ${plural(im.quartos, 'quarto', 'quartos')}`
  return t
}

export const specsLinha = (im) => {
  const parts = [
    im.quartos > 0 && `${im.quartos} ${plural(im.quartos, 'quarto', 'quartos')}`,
    im.vagas > 0 && `${im.vagas} ${plural(im.vagas, 'vaga', 'vagas')}`,
    im.area > 0 && `${Math.round(im.area).toLocaleString('pt-BR')} m²`,
  ].filter(Boolean)
  return parts.join(' · ')
}

// Etiqueta honesta: prioriza fatos reais (queda de preço, novo, patamar de valor).
export const tagDe = (im) => {
  const op = oportunidade(im)
  if (op && op.temDesconto) return 'Oportunidade'
  if (im.novo) return 'Novidade'
  if (Number(im.preco) >= 1200000) return 'Alto padrão'
  if (Number(im.preco) > 0 && Number(im.preco) <= 350000) return 'Primeiro imóvel'
  return im.tipo || 'Destaque'
}

export const refDe = (im) => `Cód. ${im.codigo}`
export const bairroCaps = (im) => `${im.bairro} · Uberlândia`
export const hrefImovel = (im) => `/imovel/${im.codigo}`

// View-model de um card do design.
export const cardVM = (im) => ({
  im,
  href: hrefImovel(im),
  ref: refDe(im),
  bairro: im.bairro,
  bairroCaps: bairroCaps(im),
  titulo: tituloCard(im),
  specs: specsLinha(im),
  precoFmt: precoCompacto(im.preco),
  tag: tagDe(im),
  img: im.img,
})

// Seleciona os imóveis da Home a partir da base real.
// coleção = 3 mais valorizados (com foto); destaques = próximos, priorizando os marcados.
export function selecaoHome(lista = IMOVEIS) {
  const comFoto = lista.filter((i) => i && i.img && Number(i.preco) > 0 && !i.oculto)
  const porPreco = [...comFoto].sort((a, b) => Number(b.preco) - Number(a.preco))
  const colecao = porPreco.slice(0, 3).map(cardVM)
  const usados = new Set(porPreco.slice(0, 3).map((i) => String(i.codigo)))

  const marcados = comFoto.filter((i) => i.destaque && !usados.has(String(i.codigo)))
  const resto = porPreco.filter((i) => !usados.has(String(i.codigo)) && !i.destaque)
  const destaques = [...marcados, ...resto].slice(0, 6).map(cardVM)

  return {
    feature: colecao[0] || null,
    mini: colecao.slice(1),
    destaques,
  }
}

// Passos "Como funciona" (copy do design).
export const PASSOS_VG = [
  { num: '01', titulo: 'Conversa inicial', texto: 'Você conta o momento da sua família, o orçamento e o que não pode faltar. Sem pressa e sem compromisso.' },
  { num: '02', titulo: 'Curadoria pessoal', texto: 'O Vinícius seleciona só os imóveis que fazem sentido para você, com acesso à carteira completa da Rotina Imobiliária.' },
  { num: '03', titulo: 'Visitas acompanhadas', texto: 'Cada visita é agendada e acompanhada, com um olhar técnico sobre estrutura, documentação e valorização.' },
  { num: '04', titulo: 'Negociação e chaves', texto: 'Proposta, financiamento, escritura e registro: o Vinícius conduz cada etapa até as chaves na sua mão.' },
]
