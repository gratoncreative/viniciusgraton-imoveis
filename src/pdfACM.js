// PDF de referência de mercado pela metragem (ferramenta ACM) — método comparativo
// (NBR 14653) sobre a carteira da Rotina. NÃO é laudo nem avalia a edificação.
const PW = 595.28, PH = 841.89, M = 46
const NAVY = [28, 42, 68], INK = [42, 47, 56], SOFT = [92, 100, 112], RED = [235, 1, 40]
const CREME = [251, 247, 240], LINE = [228, 223, 212]
const brl = (v) => 'R$ ' + Math.round(Number(v) || 0).toLocaleString('pt-BR')
const T = (s) => String(s == null ? '' : s).replace(/[—–]/g, '-')
const GRAU = { III: 'consistente', II: 'moderada', I: 'preliminar' }

export async function gerarPdfACM(d) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true })
  const r = d.r || {}
  let y = 0

  // Cabeçalho
  doc.setFillColor(...NAVY); doc.rect(0, 0, PW, 92, 'F')
  doc.setTextColor(255, 255, 255).setFont('helvetica', 'bold').setFontSize(17).text('Vinícius Graton', M, 40)
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(206, 168, 91).text('IMÓVEIS · UBERLÂNDIA', M, 56)
  doc.setTextColor(255, 255, 255).setFont('helvetica', 'bold').setFontSize(11).text('Referência de mercado pela metragem', PW - M, 44, { align: 'right' })
  doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(206, 210, 220).text(T('Estimativa indicativa · não é laudo de avaliação'), PW - M, 60, { align: 'right' })
  y = 122

  // Subtítulo do imóvel
  doc.setTextColor(...NAVY).setFont('helvetica', 'bold').setFontSize(15).text(T(`${d.tipo || 'Imóvel'} · ${d.bairro}`), M, y); y += 18
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...SOFT)
  doc.text(T([d.quartos ? `${d.quartos} quartos` : null, `${d.area} m²`].filter(Boolean).join(' · ')), M, y); y += 24

  // Faixa
  doc.setFillColor(...CREME); doc.roundedRect(M, y, PW - 2 * M, 92, 10, 10, 'F')
  doc.setTextColor(...SOFT).setFont('helvetica', 'normal').setFontSize(9.5).text('Faixa de referência (campo de arbítrio ±15%)', M + 18, y + 24)
  doc.setTextColor(...RED).setFont('helvetica', 'bold').setFontSize(21).text(`${brl(d.totMin)}  a  ${brl(d.totMax)}`, M + 18, y + 52)
  doc.setTextColor(...INK).setFont('helvetica', 'normal').setFontSize(9.5)
  doc.text(T(`Valor central ${brl(d.totCentral)}  ·  R$/m² de referência ${brl(r.referencia)}/m²${r.vendaEst ? '  ·  fechamento estimado ~' + brl(Math.round(r.vendaEst * (d.area || 0))) : ''}`), M + 18, y + 76)
  y += 116

  // Selos técnicos (quando há motor estatístico)
  if (r.grauFund || r.n) {
    const linha = (rot, val) => { doc.setTextColor(...SOFT).setFont('helvetica', 'normal').setFontSize(9.5).text(T(rot), M, y); doc.setTextColor(...NAVY).setFont('helvetica', 'bold').text(T(val), PW - M, y, { align: 'right' }); y += 17 }
    linha('Grau de fundamentação', r.grauFund ? `Grau ${r.grauFund} (${GRAU[r.grauFund] || ''})` : 'amostra pequena')
    linha('Grau de precisão (IC 80%)', r.grauPrec ? `Grau ${r.grauPrec} · ±${r.ic80 ? r.ic80.amplPct : '-'}%` : (r.ic80 ? `±${r.ic80.amplPct}%` : '-'))
    linha('Comparáveis usados', `${r.n || 0}${r.nDesc ? ` (+${r.nDesc} descartado)` : ''}`)
    if (r.cv != null) linha('Dispersão (CV)', `${Math.round((r.cv || 0) * 100)}%`)
    y += 6
  }

  // Comparáveis (até 6)
  const comps = (r.comparaveis || []).filter((c) => !c.descartado).slice(0, 6)
  if (comps.length) {
    doc.setTextColor(...NAVY).setFont('helvetica', 'bold').setFontSize(10.5).text('Imóveis comparáveis (homogeneizados)', M, y); y += 16
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...INK)
    comps.forEach((c) => {
      doc.text(T(`• ${c.bairro} · ${c.area} m²${c.vagas ? ` · ${c.vagas} vaga(s)` : ''}`), M + 6, y)
      doc.text(T(`${brl(c.preco)} · ${brl(Math.round(c.m2))}/m² homog.`), PW - M, y, { align: 'right' })
      y += 14
    })
    y += 8
  }

  // Metodologia
  if (Array.isArray(r.fatores) && r.fatores.length) {
    doc.setTextColor(...NAVY).setFont('helvetica', 'bold').setFontSize(10.5).text('Como foi calculado', M, y); y += 15
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...INK)
    r.fatores.forEach((f) => { const ls = doc.splitTextToSize(T('• ' + f), PW - 2 * M - 6); doc.text(ls, M + 6, y); y += ls.length * 12 })
    y += 6
  }

  // Aviso
  doc.setDrawColor(...RED).setLineWidth(2.4); doc.line(M, y, M, y + 56)
  doc.setTextColor(...NAVY).setFont('helvetica', 'bold').setFontSize(10).text('Referência pela metragem — não avalia a edificação.', M + 14, y + 13)
  doc.setTextColor(...INK).setFont('helvetica', 'normal').setFontSize(9)
  const aviso = doc.splitTextToSize(T('Baseado em preços anunciados de imóveis semelhantes (costumam ficar acima do fechado). Conservação, acabamento, reforma, andar e vista mudam o valor real. A avaliação formal é presencial: eu, Vinícius, vou até o imóvel.'), PW - 2 * M - 14)
  doc.text(aviso, M + 14, y + 30); y += 70

  // Contato + rodapé
  doc.setFillColor(...NAVY); doc.roundedRect(M, y, PW - 2 * M, 50, 10, 10, 'F')
  doc.setTextColor(255, 255, 255).setFont('helvetica', 'bold').setFontSize(10.5).text('Avaliação presencial e atendimento', M + 16, y + 21)
  doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(206, 210, 220).text(T('WhatsApp (34) 99157-0494 · viniciusgraton.com.br'), M + 16, y + 38)

  doc.setDrawColor(...LINE).setLineWidth(0.6); doc.line(M, PH - 46, PW - M, PH - 46)
  doc.setTextColor(...SOFT).setFont('helvetica', 'normal').setFontSize(7.5)
  doc.text(T(`Gerado em ${d.dataTxt} · Método comparativo direto (NBR 14653) sobre a carteira da Rotina Imobiliária · referência indicativa, não laudo formal.`), M, PH - 32, { maxWidth: PW - 2 * M })

  doc.save(`referencia-${T(d.bairro).replace(/\s+/g, '-').toLowerCase()}-${d.area}m2.pdf`)
}
