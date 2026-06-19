// PDF de 1 página — Referência de valor pela ÁREA (ferramenta ACM).
// NÃO é laudo nem avaliação da edificação: é só a referência pelo m² do bairro.
// Gerado no navegador com jsPDF (já é dependência do projeto).
const PW = 595.28, PH = 841.89, M = 46
const NAVY = [28, 42, 68], INK = [42, 47, 56], SOFT = [92, 100, 112], RED = [235, 1, 40]
const CREME = [251, 247, 240], LINE = [228, 223, 212]
const brl = (v) => 'R$ ' + Math.round(Number(v) || 0).toLocaleString('pt-BR')
const T = (s) => String(s == null ? '' : s).replace(/[—–]/g, '-')

export async function gerarPdfACM(d) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true })
  let y = 0

  // Cabeçalho navy
  doc.setFillColor(...NAVY); doc.rect(0, 0, PW, 92, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold').setFontSize(17).text('Vinícius Graton', M, 40)
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(206, 168, 91)
  doc.text('IMÓVEIS · UBERLÂNDIA', M, 56)
  doc.setTextColor(255, 255, 255).setFont('helvetica', 'bold').setFontSize(11)
  doc.text('Referência de valor pela área', PW - M, 44, { align: 'right' })
  doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(206, 210, 220)
  doc.text(T('Estimativa preliminar · não é laudo de avaliação'), PW - M, 60, { align: 'right' })
  y = 124

  // Título do imóvel de referência
  doc.setTextColor(...NAVY).setFont('helvetica', 'bold').setFontSize(15)
  doc.text(T(`${d.tipo || 'Imóvel'} · ${d.bairro}`), M, y); y += 18
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...SOFT)
  const sub = [d.quartos ? `${d.quartos}${d.quartos === '4' ? '+' : ''} quartos` : null, `${d.area} m²`].filter(Boolean).join(' · ')
  doc.text(T(sub), M, y); y += 26

  // Caixa da faixa de referência
  doc.setFillColor(...CREME); doc.roundedRect(M, y, PW - 2 * M, 96, 10, 10, 'F')
  doc.setTextColor(...SOFT).setFont('helvetica', 'normal').setFontSize(9.5)
  doc.text('Faixa de referência pela área (m² do bairro)', M + 18, y + 26)
  doc.setTextColor(...RED).setFont('helvetica', 'bold').setFontSize(22)
  doc.text(`${brl(d.min)}  a  ${brl(d.max)}`, M + 18, y + 56)
  doc.setTextColor(...INK).setFont('helvetica', 'normal').setFontSize(9.5)
  doc.text(T(`m² médio em ${d.bairro}: ${brl(d.m2)}/m²   ·   Fonte: ${d.fonte}${d.ref ? ' (' + d.ref + ')' : ''}   ·   Precisão: ${d.conf}`), M + 18, y + 80)
  y += 122

  // Aviso da edificação
  doc.setDrawColor(...RED).setLineWidth(2.4); doc.line(M, y, M, y + 78)
  doc.setTextColor(...NAVY).setFont('helvetica', 'bold').setFontSize(10.5)
  doc.text('Esta referência é só da área, pelo m² do bairro.', M + 14, y + 14)
  doc.setTextColor(...INK).setFont('helvetica', 'normal').setFontSize(9.5)
  const aviso = doc.splitTextToSize(T('Ela não avalia a edificação — acabamento, conservação, reforma, andar, vista e posição mudam muito o valor real. A avaliação da edificação é presencial: eu, Vinícius, vou até o imóvel e fecho o preço justo.'), PW - 2 * M - 14)
  doc.text(aviso, M + 14, y + 32); y += 96

  // Contato
  doc.setFillColor(...NAVY); doc.roundedRect(M, y, PW - 2 * M, 56, 10, 10, 'F')
  doc.setTextColor(255, 255, 255).setFont('helvetica', 'bold').setFontSize(11)
  doc.text('Quer a avaliação completa, com vistoria?', M + 18, y + 24)
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(206, 210, 220)
  doc.text(T('WhatsApp (34) 99157-0494  ·  viniciusgraton.com.br'), M + 18, y + 42)
  y += 78

  // Rodapé
  doc.setDrawColor(...LINE).setLineWidth(0.6); doc.line(M, PH - 54, PW - M, PH - 54)
  doc.setTextColor(...SOFT).setFont('helvetica', 'normal').setFontSize(8)
  doc.text(T(`Gerado em ${d.dataTxt} · Cálculo: m² médio do bairro × área (fontes: catálogo Rotina / IPD / ZAP). Documento de referência, não laudo formal.`), M, PH - 38, { maxWidth: PW - 2 * M })

  doc.save(`referencia-${T(d.bairro).replace(/\s+/g, '-').toLowerCase()}-${d.area}m2.pdf`)
}
