// Helpers do redesign (Home) — liga o design da Claude Design aos dados REAIS.
// Preço sem centavos (padrão do design: "R$ 1.290.000").
import { IMOVEIS, oportunidade } from '../../data'
import bairrosM2 from '../../bairros-m2.json'

const _norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

// Referência de R$/m² do bairro (dado real do nosso bairros-m2). 0 = sem referência.
export const m2DoBairro = (bairro) => {
  const r = (bairrosM2 || []).find((x) => _norm(x.bairro) === _norm(bairro))
  return (r && r.m2) || 0
}

// Ícones de linha (1.5px, dourados) da barra de specs — traçados do design.
export const SPEC_ICONS = {
  area: 'M3 3h18v18H3z M3 9h6 M9 3v6',
  quartos: 'M2 4v16 M2 8h18a2 2 0 0 1 2 2v10 M2 17h20 M6 8v9',
  banheiros: 'M12 2.7c3.3 3.7 6 6.9 6 10a6 6 0 0 1-12 0c0-3.1 2.7-6.3 6-10z',
  vagas: 'M5 11l1.5-4a2 2 0 0 1 1.9-1.3h7.2a2 2 0 0 1 1.9 1.3L19 11 M3 16v-3a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3 M5 16a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0z M16 16a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0z',
  casa: 'M3 11l9-7 9 7 M5 9.5V21h14V9.5 M9 21v-6h6v6',
  predio: 'M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16 M20 21V11a2 2 0 0 0-2-2h-2 M4 21h16 M8 7h2 M8 11h2 M8 15h2',
  terreno: 'M3 20h18 M5 20l4-9 3 5 2-3 5 7 M16 6a2 2 0 1 0 4 0 2 2 0 0 0-4 0z',
  m2: 'M3 21L21 3 M9 3H3v6 M15 21h6v-6',
}

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

// Foto SEMPRE pelo nosso domínio (/foto/...), nunca com o endereço do CDN de origem.
// Isso esconde de onde vêm as imagens no código-fonte e ganha cache de 30 dias na borda.
// Fotos que já são locais (/imoveis/...) passam direto.
export const fotoUrl = (im, idx = 1) => {
  if (!im || !im.codigo) return im?.img || ''
  const atual = idx === 1 ? im.img : (im.fotos || [])[idx - 1]
  if (atual && atual.startsWith('/')) return atual
  return `/foto/${im.codigo}/${idx}.jpg`
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
  img: fotoUrl(im, 1),
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

// Depoimentos do design (Claude Design). O Vinícius optou por publicá-los.
// Assim que houver depoimentos REAIS em DEPOIMENTOS (data.js), eles têm prioridade.
export const DEPOIMENTOS_VG = [
  { nome: 'Mariana e Felipe', contexto: 'Primeiro apartamento, Santa Mônica', texto: 'A gente tinha medo de dar um passo maior que a perna. O Vinícius simulou tudo, mostrou o que cabia no orçamento e negociou uma entrada que a gente conseguia pagar. Hoje a parcela é menor que o aluguel que pagávamos.' },
  { nome: 'Dr. Ricardo Almeida', contexto: 'Casa no Gávea Hill', texto: 'Eu não tinha tempo para visitar dezenas de casas. Ele entendeu exatamente o que eu procurava e me levou em três. A segunda foi a escolhida. Negociação impecável e discreta, do início ao fim.' },
  { nome: 'Sônia Prado', contexto: 'Vendeu e comprou na Morada da Colina', texto: 'Vendi meu apartamento e comprei minha cobertura na mesma operação, sem estresse. Ele cuidou dos dois lados com a Rotina Imobiliária e eu só precisei assinar. Confiança total.' },
]

// Passos "Como funciona" (copy do design).
export const PASSOS_VG = [
  { num: '01', titulo: 'Conversa inicial', texto: 'Você conta o momento da sua família, o orçamento e o que não pode faltar. Sem pressa e sem compromisso.' },
  { num: '02', titulo: 'Curadoria pessoal', texto: 'O Vinícius seleciona só os imóveis que fazem sentido para você, com acesso à carteira completa da Rotina Imobiliária.' },
  { num: '03', titulo: 'Visitas acompanhadas', texto: 'Cada visita é agendada e acompanhada, com um olhar técnico sobre estrutura, documentação e valorização.' },
  { num: '04', titulo: 'Negociação e chaves', texto: 'Proposta, financiamento, escritura e registro: o Vinícius conduz cada etapa até as chaves na sua mão.' },
]
