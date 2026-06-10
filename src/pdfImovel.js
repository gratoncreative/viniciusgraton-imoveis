import { formatPreco, vantagensImovel } from './data'

// Gera o material técnico do imóvel em PDF (100% no navegador). Capa, ficha,
// descrição, diferenciais e galeria — com a marca do Vinícius e rodapé legal.
const PW = 595.28, PH = 841.89, M = 42
const proxied = (u) => (u && /^https?:/.test(u) ? `/api/foto?u=${encodeURIComponent(u)}` : u)
const carregarImg = (url) => new Promise((res) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => res(null); i.src = url })
function jpegCover(img, tw, th) {
  const c = document.createElement('canvas'); c.width = tw; c.height = th
  const ctx = c.getContext('2d')
  const ir = img.naturalWidth / img.naturalHeight, r = tw / th
  let sw, sh, sx, sy
  if (ir > r) { sh = img.naturalHeight; sw = sh * r; sx = (img.naturalWidth - sw) / 2; sy = 0 }
  else { sw = img.naturalWidth; sh = sw / r; sx = 0; sy = (img.naturalHeight - sh) / 2 }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, tw, th)
  return c.toDataURL('image/jpeg', 0.84)
}

export async function gerarPdfImovel(im, fotos, beneficios) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true })
  fotos = (fotos || []).filter(Boolean)

  const header = () => {
    doc.setFillColor(22, 26, 34); doc.rect(0, 0, PW, 52, 'F')
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
    doc.text('VINÍCIUS GRATON', M, 25)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(236, 200, 105)
    doc.text('Consultor de Imóveis · Uberlândia/MG', M, 39)
    doc.setTextColor(210, 210, 210); doc.setFontSize(8.5)
    doc.text('viniciusgraton.com.br', PW - M, 32, { align: 'right' })
  }
  const footer = () => {
    doc.setDrawColor(225); doc.setLineWidth(0.5); doc.line(M, PH - 34, PW - M, PH - 34)
    doc.setFontSize(7.5); doc.setTextColor(120, 128, 138)
    doc.text('Material informativo. Valores, medidas e disponibilidade sujeitos a confirmação. Imóvel da carteira da Rotina Imobiliária.', M, PH - 22, { maxWidth: PW - 2 * M - 120 })
    doc.text('WhatsApp (34) 99157-0494', PW - M, PH - 22, { align: 'right' })
  }
  const nova = () => { doc.addPage(); header(); footer() }

  header(); footer()
  let y = 72

  doc.setTextColor(22, 26, 34); doc.setFont('helvetica', 'bold'); doc.setFontSize(20)
  doc.text(`${im.tipo || 'Imóvel'} no ${im.bairro || ''}`, M, y); y += 17
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(110, 118, 130)
  doc.text(`${im.cidade || 'Uberlândia'} — ${im.uf || 'MG'}   ·   Cód. ${im.codigo}`, M, y); y += 16

  const capa = fotos[0] ? await carregarImg(proxied(fotos[0])) : null
  if (capa) {
    const w = PW - 2 * M, h = 250
    doc.addImage(jpegCover(capa, Math.round(w * 1.6), Math.round(h * 1.6)), 'JPEG', M, y, w, h)
    y += h + 16
  }

  doc.setFillColor(247, 243, 233); doc.roundedRect(M, y, PW - 2 * M, 44, 6, 6, 'F')
  doc.setTextColor(28, 34, 48); doc.setFont('helvetica', 'bold'); doc.setFontSize(21)
  doc.text(formatPreco(im.preco), M + 14, y + 29)
  if (im.condominio > 0) { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(110, 118, 130); doc.text(`Condomínio ${formatPreco(im.condominio)}`, PW - M - 14, y + 27, { align: 'right' }) }
  y += 60

  const specs = [
    im.area > 0 && ['Área', `${Math.round(im.area)} m²`],
    im.quartos > 0 && ['Quartos', String(im.quartos)],
    im.suites > 0 && ['Suítes', String(im.suites)],
    im.banheiros > 0 && ['Banheiros', String(im.banheiros)],
    im.vagas > 0 && ['Vagas', String(im.vagas)],
    (im.andar !== undefined && im.andar !== '' && im.andar !== null) && ['Andar', String(im.andar)],
    typeof im.elevador === 'boolean' && ['Elevador', im.elevador ? 'Sim' : 'Não'],
    im.iptu > 0 && ['IPTU', formatPreco(im.iptu)],
  ].filter(Boolean)
  if (specs.length) {
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(22, 26, 34); doc.text('Ficha técnica', M, y); y += 6
    doc.setDrawColor(230); doc.line(M, y, PW - M, y); y += 16
    doc.setFontSize(10)
    const colW = (PW - 2 * M) / 2
    specs.forEach((s, i) => {
      const col = i % 2, row = Math.floor(i / 2)
      const x = M + col * colW, yy = y + row * 20
      doc.setFont('helvetica', 'normal'); doc.setTextColor(110, 118, 130); doc.text(s[0], x, yy)
      doc.setFont('helvetica', 'bold'); doc.setTextColor(22, 26, 34); doc.text(s[1], x + 86, yy)
    })
    y += Math.ceil(specs.length / 2) * 20 + 16
  }

  const tituloSecao = (titulo) => {
    if (y > PH - 130) { nova(); y = 72 }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(22, 26, 34); doc.text(titulo, M, y); y += 6
    doc.setDrawColor(224, 181, 86); doc.setLineWidth(1.4); doc.line(M, y, M + 42, y)
    doc.setDrawColor(230); doc.setLineWidth(0.5); doc.line(M + 50, y, PW - M, y); y += 16
  }
  const secao = (titulo, texto) => {
    if (!texto) return
    tituloSecao(titulo)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(58, 64, 76)
    doc.splitTextToSize(texto, PW - 2 * M).forEach((ln) => { if (y > PH - 48) { nova(); y = 72 } doc.text(ln, M, y); y += 15 })
    y += 12
  }
  const lista = (titulo, itens) => {
    const arr = (itens || []).filter(Boolean)
    if (!arr.length) return
    tituloSecao(titulo)
    doc.setFontSize(10.5); doc.setTextColor(58, 64, 76)
    for (const it of arr) {
      const linhas = doc.splitTextToSize(String(it), PW - 2 * M - 18)
      if (y + linhas.length * 15 > PH - 46) { nova(); y = 72 }
      doc.setFont('helvetica', 'bold'); doc.setTextColor(201, 150, 47); doc.text('•', M, y)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(58, 64, 76)
      linhas.forEach((ln, k) => { doc.text(ln, M + 16, y + k * 15) })
      y += linhas.length * 15 + 4
    }
    y += 10
  }

  lista('Por que vale a sua visita', vantagensImovel(im))
  secao('Descrição do imóvel', (im.descricao || '').trim())
  if (Array.isArray(im.amenidades) && im.amenidades.length) lista('Características e comodidades', im.amenidades)
  lista('Localização e proximidades', beneficios)

  const resto = fotos.slice(1, 13)
  if (resto.length) {
    nova(); y = 72
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(22, 26, 34); doc.text('Galeria de fotos', M, y); y += 16
    const gap = 10, cols = 2, cw = (PW - 2 * M - gap) / cols, ch = cw * 0.7
    let col = 0
    for (const u of resto) {
      const img = await carregarImg(proxied(u))
      if (!img) continue
      if (col === 0 && y + ch > PH - 48) { nova(); y = 72 }
      const x = M + col * (cw + gap)
      doc.addImage(jpegCover(img, Math.round(cw * 2), Math.round(ch * 2)), 'JPEG', x, y, cw, ch)
      col++
      if (col >= cols) { col = 0; y += ch + gap }
    }
  }

  doc.save(`imovel-${im.codigo}-vinicius-graton.pdf`)
}
