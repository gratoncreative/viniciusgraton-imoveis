import { formatPreco } from './data'
import { importRetry } from './lazyRetry'

// Laudo técnico do valor do m² (PDF) — gerado após o pagamento. Documento
// completo: imóvel, metodologia NBR 14653, amostra de comparáveis, tratamento
// estatístico, campo de arbítrio, conclusão, limitações e fontes.
const PW = 595.28, PH = 841.89, M = 46
const fmtM2 = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR') + '/m²'
const fmtN = (v) => Math.round(v).toLocaleString('pt-BR')

export async function gerarPdfLaudoM2(im, est, opcao = 'baixar') {
  const { jsPDF } = await importRetry(() => import('jspdf'))
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true })
  let y = 0

  const header = () => {
    doc.setFillColor(22, 26, 34); doc.rect(0, 0, PW, 56, 'F')
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.text('VINÍCIUS GRATON', M, 26)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(236, 200, 105); doc.text('Consultor de Imóveis · Rotina Imobiliária · Uberlândia/MG', M, 40)
    doc.setTextColor(210, 210, 210); doc.setFontSize(8); doc.text('Estudo do valor do m² · método ABNT NBR 14653', PW - M, 34, { align: 'right' })
  }
  const footer = (pg) => {
    doc.setDrawColor(225); doc.setLineWidth(0.5); doc.line(M, PH - 38, PW - M, PH - 38)
    doc.setFontSize(7); doc.setTextColor(120, 128, 138)
    doc.text('Documento informativo de referência. Não substitui laudo de avaliação com vistoria por profissional credenciado (CNAI/CRECI). Valores baseados em anúncios ajustados.', M, PH - 24, { maxWidth: PW - 2 * M - 60 })
    doc.text('pág. ' + pg, PW - M, PH - 24, { align: 'right' })
  }
  let pg = 1
  const nova = () => { doc.addPage(); pg++; header(); footer(pg); y = 74 }
  const espaco = (h) => { if (y + h > PH - 50) nova() }

  const titulo = (t) => {
    espaco(40)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(22, 26, 34); doc.text(t, M, y); y += 7
    doc.setDrawColor(224, 181, 86); doc.setLineWidth(1.6); doc.line(M, y, M + 44, y)
    doc.setDrawColor(232); doc.setLineWidth(0.5); doc.line(M + 52, y, PW - M, y); y += 16
  }
  const par = (t, sz = 10) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(sz); doc.setTextColor(58, 64, 76)
    doc.splitTextToSize(t, PW - 2 * M).forEach((ln) => { espaco(16); doc.text(ln, M, y); y += 14.5 })
    y += 6
  }
  const bullets = (arr) => {
    doc.setFontSize(10); doc.setTextColor(58, 64, 76)
    for (const it of (arr || [])) {
      const linhas = doc.splitTextToSize(String(it), PW - 2 * M - 16)
      espaco(linhas.length * 14.5 + 2)
      doc.setFont('helvetica', 'bold'); doc.setTextColor(201, 150, 47); doc.text('•', M, y)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(58, 64, 76)
      linhas.forEach((ln, k) => doc.text(ln, M + 15, y + k * 14.5))
      y += linhas.length * 14.5 + 3
    }
    y += 6
  }

  header(); footer(pg); y = 80
  // Título do laudo
  doc.setTextColor(22, 26, 34); doc.setFont('helvetica', 'bold'); doc.setFontSize(19)
  doc.text('Laudo técnico — valor do m²', M, y); y += 20
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(110, 118, 130)
  doc.text(`${im.tipo} no ${im.bairro} · ${im.cidade || 'Uberlândia'}/${im.uf || 'MG'} · Cód. ${im.codigo}`, M, y); y += 22

  // Caixa de resultado
  doc.setFillColor(247, 243, 233); doc.roundedRect(M, y, PW - 2 * M, 76, 8, 8, 'F')
  doc.setTextColor(110, 118, 130); doc.setFontSize(9); doc.setFont('helvetica', 'normal')
  doc.text('VALOR DE MERCADO (m²)', M + 18, y + 22)
  doc.text('ESTIMATIVA DE VENDA (m²)', M + 200, y + 22)
  doc.text('ESTE ANÚNCIO (m²)', M + 392, y + 22)
  doc.setTextColor(22, 26, 34); doc.setFont('helvetica', 'bold'); doc.setFontSize(15)
  doc.text(fmtM2(est.referencia), M + 18, y + 46)
  doc.text(fmtM2(est.valorVenda), M + 200, y + 46)
  doc.text(fmtM2(est.precoM2), M + 392, y + 46)
  const verdTxt = est.veredito === 'abaixo' ? `Abaixo do mercado (${Math.abs(est.diffPct)}% mais barato)` : est.veredito === 'acima' ? `Acima da média (+${est.diffPct}%)` : 'Dentro do valor de mercado'
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(est.veredito === 'abaixo' ? 29 : est.veredito === 'acima' ? 190 : 150, est.veredito === 'abaixo' ? 122 : 110, est.veredito === 'abaixo' ? 69 : 47)
  doc.text(verdTxt + ` · campo de arbítrio ${fmtM2(est.campoMin)} a ${fmtM2(est.campoMax)}`, M + 18, y + 66)
  y += 96

  // 1. Imóvel
  titulo('1. Imóvel avaliando')
  const ficha = [
    ['Tipo', im.tipo], ['Bairro', im.bairro], ['Área', `${fmtN(im.area)} m²`],
    im.quartos > 0 && ['Quartos', String(im.quartos)], im.suites > 0 && ['Suítes', String(im.suites)],
    im.vagas > 0 && ['Vagas', String(im.vagas)], im.condominio > 0 && ['Condomínio', formatPreco(im.condominio)],
    ['Preço anunciado', formatPreco(im.preco)], ['Código', String(im.codigo)],
  ].filter(Boolean)
  doc.setFontSize(10); const cw = (PW - 2 * M) / 2
  ficha.forEach((f, i) => {
    const col = i % 2, row = Math.floor(i / 2), x = M + col * cw, yy = y + row * 18
    doc.setFont('helvetica', 'normal'); doc.setTextColor(110, 118, 130); doc.text(f[0], x, yy)
    doc.setFont('helvetica', 'bold'); doc.setTextColor(22, 26, 34); doc.text(String(f[1]), x + 110, yy)
  })
  y += Math.ceil(ficha.length / 2) * 18 + 14

  // 2. Metodologia
  titulo('2. Metodologia')
  par('Este estudo segue o método comparativo direto de dados de mercado, conforme a ABNT NBR 14653 (avaliação de bens). Coletou-se uma amostra de imóveis comparáveis (mesmo tipo e região), cada elemento foi homogeneizado por fatores de correção e a amostra passou por saneamento estatístico antes do cálculo do valor central e do campo de arbítrio.')

  // 3. Fatores aplicados
  titulo('3. Fatores de homogeneização aplicados')
  bullets(est.fatoresAplicados)
  if (est.parametros) par(`Parâmetros: fator oferta ${Math.round((1 - est.parametros.fatorOferta) * 100)}% · valor de vaga de referência ${formatPreco(est.parametros.vagaValor)} · expoente de área ${est.parametros.expArea}.`, 9)

  // 4. Amostra de comparáveis
  titulo(`4. Amostra de comparáveis (${(est.comparaveis || []).length})`)
  if ((est.comparaveis || []).length) {
    const cols = [['Cód.', 60], ['Bairro', 150], ['Área', 60], ['Vagas', 50], ['Anúncio', 100], ['R$/m² homog.', 0]]
    const drawHead = () => {
      doc.setFillColor(243, 240, 232); doc.rect(M, y, PW - 2 * M, 20, 'F')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(90, 96, 108)
      let x = M + 6; cols.forEach((c) => { doc.text(c[0], x, y + 13); x += c[1] || (PW - 2 * M - 420) })
      y += 20
    }
    drawHead()
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
    est.comparaveis.forEach((c, i) => {
      if (y + 16 > PH - 50) { nova(); drawHead(); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5) }
      if (i % 2 === 0) { doc.setFillColor(250, 249, 245); doc.rect(M, y, PW - 2 * M, 16, 'F') }
      doc.setTextColor(58, 64, 76)
      let x = M + 6
      const cells = [c.codigo, String(c.bairro || '').slice(0, 24), `${fmtN(c.area)} m²`, String(c.vagas || 0), formatPreco(c.preco), fmtM2(c.m2)]
      cells.forEach((cel, k) => { doc.text(String(cel), x, y + 11); x += cols[k][1] || (PW - 2 * M - 420) })
      y += 16
    })
    y += 12
  } else { par('Amostra insuficiente na carteira; usou-se o índice público do bairro como referência.') }

  // 5. Tratamento estatístico
  titulo('5. Tratamento estatístico')
  bullets([
    `Elementos na amostra após saneamento: ${est.n}${est.nDesc ? ` (${est.nDesc} descartado(s) por estarem fora de ±30% da mediana)` : ''}`,
    `Valor central (mediana homogeneizada): ${fmtM2(est.referencia)}`,
    `Dispersão (desvio padrão relativo): ±${est.dpPct || 0}%`,
    `Faixa observada na amostra: ${fmtM2(est.min)} a ${fmtM2(est.max)}`,
    `Campo de arbítrio adotado: ${fmtM2(est.campoMin)} a ${fmtM2(est.campoMax)}`,
  ])

  // 6. Conclusão
  titulo('6. Conclusão')
  par(`O valor de mercado estimado para o imóvel é de ${fmtM2(est.referencia)}, com campo de arbítrio entre ${fmtM2(est.campoMin)} e ${fmtM2(est.campoMax)}. O preço anunciado (${fmtM2(est.precoM2)}) está ${verdTxt.toLowerCase()}. A estimativa de valor de venda, já aplicado o fator oferta, é de ${fmtM2(est.valorVenda)} por m².`)

  // 7. Limitações
  titulo('7. Limitações e ressalvas')
  bullets(est.limitacoes)

  // 8. Fontes
  titulo('8. Fontes')
  bullets(est.fontes)

  // assinatura
  espaco(60); y += 8
  doc.setDrawColor(210); doc.line(M, y, M + 200, y); y += 14
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(22, 26, 34); doc.text('Vinícius Graton', M, y); y += 14
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(110, 118, 130)
  doc.text('Consultor de Imóveis · Rotina Imobiliária · Uberlândia/MG · WhatsApp (34) 99157-0494', M, y)

  if (opcao === 'blob') return doc.output('blob')
  doc.save(`laudo-m2-${im.codigo}.pdf`)
}

export async function gerarPdfLaudoM2Blob(im, est) {
  return gerarPdfLaudoM2(im, est, 'blob')
}
