import { formatPreco, vantagensImovel } from './data'
import { importRetry } from './lazyRetry'

// Material do imóvel em PDF — gerado no navegador (jsPDF). Layout na linguagem clara
// do site: petróleo (#1C2A44), dourado (#9A7B3C/#C6A15B) e marfim (#F4EFE6).
// Motor de fluxo: o conteúdo nunca cruza o rodapé e nunca deixa página quase vazia.

const PW = 595.28, PH = 841.89, M = 42
const NAVY = [28, 42, 68]
const INK = [42, 47, 56]
const SOFT = [92, 100, 112]
const GOLD = [154, 123, 60]
const GOLD2 = [198, 161, 91]
const CREME = [244, 239, 230]
const LINE = [228, 223, 212]
const HEADER_H = 50
const FOOTER_TOP = PH - 40        // nada de conteúdo abaixo disso
const CONTENT_TOP = HEADER_H + 24 // início do conteúdo em páginas internas

const proxied = (u) => (u && /^https?:/.test(u) ? `/api/foto?u=${encodeURIComponent(u)}` : u)
// carrega a imagem com timeout — uma foto lenta/quebrada nunca trava a geração
const carregarImg = (url, ms = 7000) => new Promise((res) => {
  const i = new Image(); i.crossOrigin = 'anonymous'
  let pronto = false
  const fim = (v) => { if (!pronto) { pronto = true; res(v) } }
  i.onload = () => fim(i); i.onerror = () => fim(null)
  setTimeout(() => fim(null), ms)
  i.src = url
})
// dataURL ou null (canvas "tainted"/erro nunca aborta o PDF)
function jpegFit(img, tw, th) {
  try {
    const c = document.createElement('canvas'); c.width = tw; c.height = th
    const ctx = c.getContext('2d')
    const ir = img.naturalWidth / img.naturalHeight, r = tw / th
    let sw, sh, sx, sy
    if (ir > r) { sh = img.naturalHeight; sw = sh * r; sx = (img.naturalWidth - sw) / 2; sy = 0 }
    else { sw = img.naturalWidth; sh = sw / r; sx = 0; sy = (img.naturalHeight - sh) / 2 }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, tw, th)
    return c.toDataURL('image/jpeg', 0.86)
  } catch { return null }
}

export async function gerarPdfImovel(im, fotos, beneficios) {
  const { jsPDF } = await importRetry(() => import('jspdf'))
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true })
  fotos = (fotos || []).filter(Boolean)
  const url = 'viniciusgraton.com.br'
  const whats = '(34) 99157-0494'
  const tituloTxt = im.titulo || `${im.tipo || 'Imóvel'} no ${im.bairro || ''}`

  const set = (size, style = 'normal', color = INK) => { doc.setFontSize(size); doc.setFont('helvetica', style); doc.setTextColor(...color) }
  const fill = (...rgb) => doc.setFillColor(...rgb)
  const draw = (...rgb) => doc.setDrawColor(...rgb)
  const opacity = (o) => { try { if (doc.GState) doc.setGState(new doc.GState({ opacity: o })) } catch {} }

  const header = () => {
    fill(...NAVY); doc.rect(0, 0, PW, HEADER_H, 'F')
    fill(...GOLD2); doc.rect(0, HEADER_H - 2.5, PW, 2.5, 'F')
    set(13, 'bold', [255, 255, 255]); doc.text('VINÍCIUS GRATON', M, 22)
    set(7.5, 'normal', GOLD2); doc.text('CONSULTOR DE IMÓVEIS · UBERLÂNDIA / MG', M, 35)
    set(8, 'normal', [205, 212, 222]); doc.text(url, PW - M, 21, { align: 'right' })
    set(8, 'normal', [150, 158, 170]); doc.text(whats, PW - M, 34, { align: 'right' })
  }
  const footer = () => {
    draw(...LINE); doc.setLineWidth(0.5); doc.line(M, FOOTER_TOP + 6, PW - M, FOOTER_TOP + 6)
    set(6.8, 'normal', [140, 148, 160])
    doc.text('Material informativo. Valores, medidas e disponibilidade sujeitos a confirmação. Imóvel da carteira da Rotina Imobiliária · CRECI PJ 132.', M, FOOTER_TOP + 18, { maxWidth: PW - 2 * M - 80 })
    set(7.2, 'bold', SOFT); doc.text(whats, PW - M, FOOTER_TOP + 18, { align: 'right' })
  }

  let y = 0
  const nova = () => { doc.addPage(); header(); footer(); y = CONTENT_TOP }
  const ensure = (h) => { if (y + h > FOOTER_TOP) nova() }

  const secao = (t) => {
    ensure(40)
    set(11, 'bold', NAVY); doc.text(t.toUpperCase(), M, y); y += 7
    draw(...GOLD); doc.setLineWidth(1.6); doc.line(M, y, M + 30, y)
    draw(...LINE); doc.setLineWidth(0.5); doc.line(M + 38, y, PW - M, y); y += 18
  }
  const paragrafo = (txt) => {
    set(10, 'normal', INK)
    for (const ln of doc.splitTextToSize(txt, PW - 2 * M)) { ensure(15); doc.text(ln, M, y); y += 15 }
    y += 6
  }
  const bullets = (itens, cols = 1) => {
    if (cols === 2) {
      const colW = (PW - 2 * M - 16) / 2
      for (let i = 0; i < itens.length; i += 2) {
        ensure(17)
        for (let c = 0; c < 2 && i + c < itens.length; c++) {
          const x = M + c * (colW + 16)
          fill(...GOLD); doc.circle(x + 3, y - 3.5, 1.9, 'F')
          set(9.5, 'normal', INK); doc.text(String(itens[i + c]), x + 11, y, { maxWidth: colW - 14 })
        }
        y += 17
      }
      y += 6; return
    }
    set(10, 'normal', INK)
    for (const it of itens) {
      const linhas = doc.splitTextToSize(String(it), PW - 2 * M - 16)
      ensure(linhas.length * 15 + 2)
      fill(...GOLD); doc.circle(M + 4, y - 3.5, 2.1, 'F')
      linhas.forEach((ln, k) => doc.text(ln, M + 14, y + k * 15)); y += linhas.length * 15 + 4
    }
    y += 6
  }

  // ── PÁGINA 1 — capa + preço + ficha ───────────────────────────────────────
  header(); footer()
  const capImg = fotos[0] ? await carregarImg(proxied(fotos[0])) : null
  const capData = capImg ? jpegFit(capImg, 1100, 620) : null
  const capaH = 300
  if (capData) {
    doc.addImage(capData, 'JPEG', 0, HEADER_H, PW, capaH)
    opacity(0.62); fill(...NAVY); doc.rect(0, HEADER_H + capaH - 92, PW, 92, 'F'); opacity(1)
    if (im.tipo) {
      fill(...GOLD2); const w = doc.getTextWidth((im.tipo || '').toUpperCase()) + 22
      doc.roundedRect(M, HEADER_H + 16, w, 19, 3, 3, 'F')
      set(8, 'bold', NAVY); doc.text((im.tipo || '').toUpperCase(), M + 11, HEADER_H + 29)
    }
    if (im.codigo) { set(8, 'normal', [225, 230, 238]); doc.text(`Cód. ${im.codigo}`, PW - M, HEADER_H + 29, { align: 'right' }) }
    set(21, 'bold', [255, 255, 255]); doc.text(tituloTxt, M, HEADER_H + capaH - 36, { maxWidth: PW - 2 * M })
    set(9.5, 'normal', [215, 221, 230]); doc.text(`${im.cidade || 'Uberlândia'} - ${im.uf || 'MG'}`, M, HEADER_H + capaH - 18)
    y = HEADER_H + capaH + 22
  } else {
    y = CONTENT_TOP + 6
    set(22, 'bold', NAVY); doc.text(tituloTxt, M, y); y += 20
    set(10, 'normal', SOFT); doc.text(`${im.cidade || 'Uberlândia'} - ${im.uf || 'MG'} · Cód. ${im.codigo}`, M, y); y += 24
  }

  // Preço
  const precoH = 56
  fill(...CREME); doc.roundedRect(M, y, PW - 2 * M, precoH, 8, 8, 'F')
  draw(...GOLD2); doc.setLineWidth(0.6); doc.roundedRect(M, y, PW - 2 * M, precoH, 8, 8, 'S')
  if (im.precoAnterior && im.precoAnterior > im.preco) { set(9, 'normal', SOFT); doc.text('De ' + formatPreco(im.precoAnterior), M + 18, y + 16) }
  set(23, 'bold', NAVY); doc.text(formatPreco(im.preco), M + 18, y + (im.precoAnterior > im.preco ? 40 : 35))
  const extras = []
  if (im.condominio > 0) extras.push(`Condomínio ${formatPreco(im.condominio)}/mês`)
  if (im.iptu > 0) extras.push(`IPTU ${formatPreco(im.iptu)}/ano`)
  extras.forEach((ln, k) => { set(8.5, 'normal', SOFT); doc.text(ln, PW - M - 18, y + 22 + k * 14, { align: 'right' }) })
  y += precoH + 24

  // Ficha técnica — cards equilibrados
  const specs = [
    im.area > 0 && ['ÁREA', `${Math.round(im.area)} m²`],
    im.areaLote > 0 && ['ÁREA DO LOTE', `${Math.round(im.areaLote)} m²`],
    im.quartos > 0 && ['QUARTOS', String(im.quartos)],
    im.suites > 0 && ['SUÍTES', String(im.suites)],
    im.banheiros > 0 && ['BANHEIROS', String(im.banheiros)],
    im.vagas > 0 && ['VAGAS', String(im.vagas)],
    (im.andar !== undefined && im.andar !== '' && im.andar !== null) && ['ANDAR', im.andar === 0 || im.andar === '0' ? 'Térreo' : String(im.andar)],
    typeof im.elevador === 'boolean' && ['ELEVADOR', im.elevador ? 'Sim' : 'Não'],
  ].filter(Boolean)
  if (specs.length) {
    secao('Ficha técnica')
    const cols = specs.length <= 4 ? specs.length : (specs.length <= 6 ? 3 : 4)
    const gap = 10, cardW = (PW - 2 * M - gap * (cols - 1)) / cols, cardH = 46
    specs.forEach((s, i) => {
      const col = i % cols, row = Math.floor(i / cols)
      const x = M + col * (cardW + gap), yy = y + row * (cardH + gap)
      fill(250, 248, 243); draw(...LINE); doc.setLineWidth(0.5)
      doc.roundedRect(x, yy, cardW, cardH, 6, 6, 'FD')
      set(7, 'bold', GOLD); doc.text(s[0], x + cardW / 2, yy + 17, { align: 'center' })
      set(13, 'bold', NAVY); doc.text(s[1], x + cardW / 2, yy + 35, { align: 'center' })
    })
    y += Math.ceil(specs.length / cols) * (cardH + gap) + 8
  }

  // ── FLUXO — texto + galeria contínuos (preenche bem o espaço) ─────────────
  const vantagens = vantagensImovel(im)
  if (vantagens.length) { secao('Por que vale a sua visita'); bullets(vantagens) }
  if (im.descricao && im.descricao.trim()) { secao('Descrição do imóvel'); paragrafo(im.descricao.trim()) }
  const amen = Array.isArray(im.amenidades) ? im.amenidades.filter(Boolean) : []
  if (amen.length) { secao('Características e comodidades'); bullets(amen, 2) }
  const bens = (beneficios || []).filter(Boolean)
  if (bens.length) { secao('Localização e proximidades'); bullets(bens) }

  // Galeria: pré-carrega (só as que vierem), 2 colunas fluindo, sem cruzar o rodapé
  const gap = 12, cw = (PW - 2 * M - gap) / 2, ch = cw * 0.66
  const galImgs = []
  for (const u of fotos.slice(1)) {
    const img = await carregarImg(proxied(u))
    const d = img && jpegFit(img, Math.round(cw * 2), Math.round(ch * 2))
    if (d) galImgs.push(d)
  }
  if (galImgs.length) {
    secao('Galeria de fotos')
    let col = 0
    for (const d of galImgs) {
      if (col === 0) ensure(ch + gap)
      doc.addImage(d, 'JPEG', M + col * (cw + gap), y, cw, ch)
      col++
      if (col >= 2) { col = 0; y += ch + gap }
    }
    if (col > 0) y += ch + gap
    y += 6
  }

  // ── CTA final — no fim do fluxo, alinhado ao topo (sem flutuar em vazio) ───
  const ctaH = 132
  ensure(ctaH)
  fill(...NAVY); doc.roundedRect(M, y, PW - 2 * M, ctaH, 10, 10, 'F')
  fill(...GOLD2); doc.roundedRect(M, y, PW - 2 * M, 4, 2, 2, 'F')
  set(17, 'bold', [255, 255, 255]); doc.text('Gostou? Vamos marcar uma visita.', PW / 2, y + 36, { align: 'center' })
  set(9.5, 'normal', [205, 212, 222]); doc.text('Atendimento direto, do primeiro contato à entrega das chaves -', PW / 2, y + 54, { align: 'center' })
  doc.text('te ajudo na visita, na negociação e na documentação.', PW / 2, y + 67, { align: 'center' })
  fill(...GOLD2); doc.roundedRect(PW / 2 - 92, y + 80, 184, 34, 6, 6, 'F')
  set(11, 'bold', NAVY); doc.text(`WhatsApp ${whats}`, PW / 2, y + 102, { align: 'center' })
  set(8.5, 'normal', [150, 158, 170]); doc.text(url, PW / 2, y + 126, { align: 'center' })

  doc.save(`material-${im.codigo}-vinicius-graton.pdf`)
}
