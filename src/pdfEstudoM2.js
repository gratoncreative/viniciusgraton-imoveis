// Estudo do valor do m² (PDF) — gerado após pagamento (R$ 4,90).
// Inclui o resumo, a faixa de valor E os gráficos da tela (radar + dispersão +
// distribuição), capturados como imagem e embutidos. Linguagem clara do site.
const PW = 595.28, PH = 841.89, M = 44
const NAVY = [28, 42, 68], INK = [42, 47, 56], SOFT = [92, 100, 112]
const GOLD = [154, 123, 60], GOLD2 = [198, 161, 91], CREME = [244, 239, 230], LINE = [228, 223, 212]
const HEADER_H = 50, FOOTER_TOP = PH - 40, CONTENT_TOP = HEADER_H + 22
const brl = (v) => 'R$ ' + Math.round(Number(v) || 0).toLocaleString('pt-BR')
const m2 = (v) => 'R$ ' + Math.round(Number(v) || 0).toLocaleString('pt-BR') + '/m²'
const pct1 = (v) => (Number(v) || 0).toFixed(1).replace('.', ',') + '%'

async function montar(estudo, charts = {}) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true })
  const a = estudo.avaliando || {}, st = estudo.stats || {}
  const codigo = estudo.numero || a.codigo || ''
  const set = (s, st2 = 'normal', c = INK) => { doc.setFontSize(s); doc.setFont('helvetica', st2); doc.setTextColor(...c) }
  const fill = (...r) => doc.setFillColor(...r), draw = (...r) => doc.setDrawColor(...r)

  const header = () => {
    fill(...NAVY); doc.rect(0, 0, PW, HEADER_H, 'F'); fill(...GOLD2); doc.rect(0, HEADER_H - 2.5, PW, 2.5, 'F')
    set(13, 'bold', [255, 255, 255]); doc.text('VINÍCIUS GRATON', M, 22)
    set(7.5, 'normal', GOLD2); doc.text('ESTUDO DO VALOR DO m² · ABNT NBR 14653', M, 35)
    set(8, 'normal', [205, 212, 222]); doc.text('viniciusgraton.com.br', PW - M, 21, { align: 'right' })
    set(8, 'normal', [150, 158, 170]); doc.text('(34) 99157-0494', PW - M, 34, { align: 'right' })
  }
  const footer = () => {
    draw(...LINE); doc.setLineWidth(0.5); doc.line(M, FOOTER_TOP + 6, PW - M, FOOTER_TOP + 6)
    set(6.8, 'normal', [140, 148, 160]); doc.text('Estudo preliminar por ofertas públicas (método comparativo NBR 14653). Não substitui avaliação formal com vistoria. Valores sujeitos a variação de mercado.', M, FOOTER_TOP + 18, { maxWidth: PW - 2 * M - 80 })
    set(7.2, 'bold', SOFT); doc.text('(34) 99157-0494', PW - M, FOOTER_TOP + 18, { align: 'right' })
  }
  let y = 0
  const nova = () => { doc.addPage(); header(); footer(); y = CONTENT_TOP }
  const ensure = (h) => { if (y + h > FOOTER_TOP) nova() }
  const secao = (t) => { ensure(40); set(11, 'bold', NAVY); doc.text(t.toUpperCase(), M, y); y += 7; draw(...GOLD); doc.setLineWidth(1.6); doc.line(M, y, M + 30, y); draw(...LINE); doc.setLineWidth(0.5); doc.line(M + 38, y, PW - M, y); y += 18 }
  const par = (txt) => { set(10, 'normal', INK); for (const ln of doc.splitTextToSize(txt, PW - 2 * M)) { ensure(15); doc.text(ln, M, y); y += 15 } y += 4 }
  const addChart = (titulo, ch) => {
    if (!ch || !ch.dataUrl) return
    let iw = Math.min(PW - 2 * M, 430), ih = iw * (ch.h / ch.w)
    const maxH = FOOTER_TOP - CONTENT_TOP - 50
    if (ih > maxH) { ih = maxH; iw = ih * (ch.w / ch.h) }
    ensure(34 + ih + 6) // título + gráfico juntos (sem cabeçalho órfão)
    secao(titulo)
    try { doc.addImage(ch.dataUrl, 'PNG', M + (PW - 2 * M - iw) / 2, y, iw, ih) } catch {}
    y += ih + 14
  }

  header(); footer(); y = CONTENT_TOP + 4

  // Título
  set(20, 'bold', NAVY); doc.text('Estudo do valor do m²', M, y); y += 22
  set(10.5, 'normal', SOFT); doc.text(`${a.tipo || 'Imóvel'} no ${a.bairro || ''} · ${a.cidade || 'Uberlândia/MG'} · Cód. ${codigo}`, M, y); y += 24

  // Veredito
  const vTxt = estudo.veredito === 'abaixo' ? `${Math.abs(estudo.diffPct)}% ABAIXO da mediana do bairro`
    : estudo.veredito === 'acima' ? `${estudo.diffPct}% ACIMA da mediana do bairro` : 'DENTRO da faixa de mercado'
  const vCor = estudo.veredito === 'abaixo' ? [63, 122, 94] : estudo.veredito === 'acima' ? [176, 74, 55] : NAVY
  fill(...CREME); draw(...LINE); doc.setLineWidth(0.6); doc.roundedRect(M, y, PW - 2 * M, 62, 8, 8, 'FD')
  set(9, 'normal', SOFT); doc.text('VEREDITO', M + 16, y + 20)
  set(14, 'bold', vCor); doc.text(vTxt, M + 16, y + 42); y += 82

  // Resumo
  secao('Resumo da avaliação')
  const linha = (rot, val, dest) => { draw(235, 235, 235); doc.setLineWidth(0.5); doc.line(M, y + 6, PW - M, y + 6); set(10, 'normal', [90, 97, 110]); doc.text(rot, M, y); set(dest ? 11.5 : 10, dest ? 'bold' : 'normal', NAVY); doc.text(String(val), PW - M, y, { align: 'right' }); y += 22 }
  if (estudo.precoM2 > 0) linha('Preço pedido por m² (anúncio)', m2(estudo.precoM2))
  linha('Mediana de mercado no bairro (m²)', m2(estudo.adotadoM2), true)
  if (a.area > 0) linha('Área considerada', `${Math.round(a.area)} m²`)
  linha('Valor estimado de venda', brl(estudo.valorTotal), true)
  linha('Faixa de arbítrio', `${brl(estudo.valMin)} a ${brl(estudo.valMax)}`)
  linha('Imóveis comparáveis usados', String(estudo.n || (estudo.testemunhas || []).length))
  if (st.dp) linha('Desvio padrão da amostra', m2(st.dp))
  if (st.cv != null) linha('Coeficiente de variação', pct1((st.cv || 0) * 100))
  if (estudo.grau) linha('Grau de fundamentação', String(estudo.grau))
  y += 12

  // Faixa de valor (barra redesenhada a partir dos dados)
  secao('Faixa de valor de mercado')
  const bx = M, bw = PW - 2 * M, by = y + 6, bh = 9
  fill(238, 233, 224); doc.roundedRect(bx, by, bw, bh, 4, 4, 'F')
  fill(...GOLD2); doc.roundedRect(bx + bw * 0.18, by, bw * 0.64, bh, 4, 4, 'F')
  fill(...NAVY); doc.circle(bx + bw * 0.5, by + bh / 2, 6, 'F')
  fill(...GOLD); doc.circle(bx + bw * 0.5, by + bh / 2, 3, 'F')
  y = by + bh + 18
  const anchor = (x, val, sub, alvo) => { set(alvo ? 12 : 10.5, 'bold', alvo ? NAVY : INK); doc.text(brl(val), x, y, { align: 'center' }); set(7.5, 'normal', SOFT); doc.text(sub, x, y + 12, { align: 'center' }) }
  anchor(bx + 24, estudo.valMin, 'mínimo')
  anchor(bx + bw / 2, estudo.valorTotal, 'valor de mercado', true)
  anchor(bx + bw - 24, estudo.valMax, 'máximo')
  y += 26

  // Gráficos capturados da tela
  addChart('Radar de proximidade dos comparáveis', charts.radar)
  addChart('Área × R$/m²', charts.scatter)
  addChart('Distribuição do R$/m² homogeneizado', charts.dist)

  // Como foi calculado
  secao('Como foi calculado')
  par('Comparativo direto de mercado: levantamos imóveis do mesmo tipo no bairro, removemos valores extremos (±30% da mediana), homogeneizamos por área e vaga de garagem e adotamos a MEDIANA do m² como referência. O valor estimado de venda é a mediana do m² multiplicada pela área do imóvel.')

  set(8, 'normal', SOFT); ensure(16); doc.text('Vinícius Graton · Consultor de Imóveis · Rotina Imobiliária · CRECI PJ 132 · (34) 99157-0494', M, y)
  return doc
}

export async function gerarPdfEstudoM2(estudo, charts) {
  const doc = await montar(estudo, charts)
  doc.save(`estudo-m2-${estudo.numero || 'imovel'}.pdf`)
}
export async function gerarPdfEstudoM2Blob(estudo, charts) {
  const doc = await montar(estudo, charts)
  return doc.output('blob')
}
