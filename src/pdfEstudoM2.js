// Estudo do valor do m² (PDF) — gerado após pagamento (R$ 4,90) para download + e-mail.
// Resumo objetivo de 1 página com os números-chave do estudo já calculado (buildEstudo).
const PW = 595.28, PH = 841.89, M = 46
const brl = (v) => 'R$ ' + Math.round(Number(v) || 0).toLocaleString('pt-BR')
const m2 = (v) => 'R$ ' + Math.round(Number(v) || 0).toLocaleString('pt-BR') + '/m²'
const pct1 = (v) => (Number(v) || 0).toFixed(1).replace('.', ',') + '%'

async function montar(estudo) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true })
  const a = estudo.avaliando || {}
  const st = estudo.stats || {}
  const codigo = estudo.numero || a.codigo || ''
  const vereditoTxt = estudo.veredito === 'abaixo'
    ? `${Math.abs(estudo.diffPct)}% ABAIXO da mediana do bairro`
    : estudo.veredito === 'acima'
      ? `${estudo.diffPct}% ACIMA da mediana do bairro`
      : 'DENTRO da faixa de mercado'
  const vCor = estudo.veredito === 'abaixo' ? [63, 122, 94] : estudo.veredito === 'acima' ? [176, 74, 55] : [28, 42, 68]

  // cabeçalho
  doc.setFillColor(22, 26, 34); doc.rect(0, 0, PW, 56, 'F')
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.text('VINÍCIUS GRATON', M, 26)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(236, 200, 105); doc.text('Consultor da Rotina Imobiliária · Uberlândia/MG', M, 40)
  doc.setTextColor(210, 210, 210); doc.setFontSize(8); doc.text('Estudo do valor do m²', PW - M, 34, { align: 'right' })

  let y = 86
  doc.setTextColor(22, 26, 34); doc.setFont('helvetica', 'bold'); doc.setFontSize(19)
  doc.text('Estudo do valor do m²', M, y); y += 20
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(110, 118, 130)
  doc.text(`${a.tipo || 'Imóvel'} no ${a.bairro || ''} · ${a.cidade || 'Uberlândia/MG'} · Cód. ${codigo}`, M, y); y += 26

  // caixa do veredito
  doc.setFillColor(247, 245, 240); doc.setDrawColor(228, 223, 212); doc.roundedRect(M, y, PW - 2 * M, 64, 8, 8, 'FD')
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(110, 118, 130)
  doc.text('VEREDITO', M + 16, y + 20)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(vCor[0], vCor[1], vCor[2])
  doc.text(vereditoTxt, M + 16, y + 42)
  y += 84

  // grid de números-chave
  const linha = (rot, val, destaque) => {
    doc.setDrawColor(235); doc.setLineWidth(0.5); doc.line(M, y + 6, PW - M, y + 6)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(90, 97, 110); doc.text(rot, M, y)
    doc.setFont('helvetica', destaque ? 'bold' : 'normal'); doc.setFontSize(destaque ? 11.5 : 10); doc.setTextColor(28, 42, 68)
    doc.text(String(val), PW - M, y, { align: 'right' }); y += 22
  }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(22, 26, 34); doc.text('Resumo da avaliação', M, y); y += 8
  doc.setDrawColor(224, 181, 86); doc.setLineWidth(1.6); doc.line(M, y, M + 44, y); y += 22

  if (estudo.precoM2 > 0) linha('Preço pedido por m² (anúncio)', m2(estudo.precoM2))
  linha('Mediana de mercado no bairro (m²)', m2(estudo.adotadoM2), true)
  if (a.area > 0) linha('Área considerada', `${Math.round(a.area)} m²`)
  linha('Valor estimado de venda', brl(estudo.valorTotal), true)
  linha('Faixa de arbítrio (±8%)', `${brl(estudo.valMin)} a ${brl(estudo.valMax)}`)
  linha('Imóveis comparáveis usados', String(estudo.n || (estudo.testemunhas || []).length))
  if (st.dp) linha('Desvio padrão da amostra', m2(st.dp))
  if (st.cv != null) linha('Coeficiente de variação', pct1((st.cv || 0) * 100))
  if (estudo.grau) linha('Grau de fundamentação', String(estudo.grau))
  y += 14

  // metodologia
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(22, 26, 34); doc.text('Como foi calculado', M, y); y += 8
  doc.setDrawColor(224, 181, 86); doc.setLineWidth(1.6); doc.line(M, y, M + 44, y); y += 18
  const met = `Comparativo direto de mercado: levantamos imóveis do mesmo tipo no bairro, removemos valores extremos (±30% da mediana), homogeneizamos por área e vaga de garagem e adotamos a MEDIANA do m² como referência. O valor estimado de venda é a mediana do m² multiplicada pela área do imóvel.`
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(58, 64, 76)
  doc.splitTextToSize(met, PW - 2 * M).forEach((ln) => { doc.text(ln, M, y); y += 14.5 })

  // rodapé
  doc.setDrawColor(225); doc.setLineWidth(0.5); doc.line(M, PH - 56, PW - M, PH - 56)
  doc.setFontSize(7); doc.setTextColor(120, 128, 138)
  doc.text('Documento informativo de referência, baseado em anúncios ajustados. Não substitui avaliação com vistoria por profissional credenciado (CNAI/CRECI).', M, PH - 42, { maxWidth: PW - 2 * M })
  doc.setFontSize(8); doc.setTextColor(90, 97, 110)
  doc.text('Vinícius Graton · Consultor de Imóveis · Rotina Imobiliária · (34) 99157-0494', M, PH - 24)
  return doc
}

export async function gerarPdfEstudoM2(estudo) {
  const doc = await montar(estudo)
  doc.save(`estudo-m2-${estudo.numero || 'imovel'}.pdf`)
}

export async function gerarPdfEstudoM2Blob(estudo) {
  const doc = await montar(estudo)
  return doc.output('blob')
}
