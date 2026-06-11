import { formatPreco, vantagensImovel } from './data'

// Material técnico premium — gerado 100% no navegador com jsPDF.
// Design alinhado ao site: dark header, acento ouro, tipografia limpa.

const PW = 595.28, PH = 841.89, M = 36
const DARK = [22, 26, 34]
const GOLD = [201, 150, 47]
const GOLD2 = [236, 200, 105]
const CREME = [247, 243, 233]
const SOFT = [110, 118, 130]
const TEXT = [38, 44, 58]

const proxied = (u) => (u && /^https?:/.test(u) ? `/api/foto?u=${encodeURIComponent(u)}` : u)
const carregarImg = (url) => new Promise((res) => {
  const i = new Image(); i.crossOrigin = 'anonymous'
  i.onload = () => res(i); i.onerror = () => res(null); i.src = url
})

function jpegFit(img, tw, th) {
  const c = document.createElement('canvas'); c.width = tw; c.height = th
  const ctx = c.getContext('2d')
  const ir = img.naturalWidth / img.naturalHeight, r = tw / th
  let sw, sh, sx, sy
  if (ir > r) { sh = img.naturalHeight; sw = sh * r; sx = (img.naturalWidth - sw) / 2; sy = 0 }
  else { sw = img.naturalWidth; sh = sw / r; sx = 0; sy = (img.naturalHeight - sh) / 2 }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, tw, th)
  return c.toDataURL('image/jpeg', 0.88)
}

export async function gerarPdfImovel(im, fotos, beneficios) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true })
  fotos = (fotos || []).filter(Boolean)
  const url = 'viniciusgraton.com.br'
  const whats = '(34) 99157-0494'

  // ── helpers de tipografia ────────────────────────────────────────────────
  const set = (size, style = 'normal', color = TEXT) => {
    doc.setFontSize(size)
    doc.setFont('helvetica', style)
    doc.setTextColor(...color)
  }
  const fill = (...rgb) => doc.setFillColor(...rgb)
  const draw = (...rgb) => doc.setDrawColor(...rgb)

  // ── header fixo ─────────────────────────────────────────────────────────
  const header = () => {
    fill(...DARK); doc.rect(0, 0, PW, 48, 'F')
    // faixa gold na base do header
    fill(...GOLD); doc.rect(0, 45, PW, 3, 'F')
    set(13, 'bold', [255, 255, 255]); doc.text('VINÍCIUS GRATON', M, 22)
    set(8, 'normal', [...GOLD2]); doc.text('Consultor de Imóveis · Uberlândia / MG', M, 36)
    set(8, 'normal', [180, 188, 200]); doc.text(url, PW - M, 22, { align: 'right' })
    set(8, 'normal', [140, 150, 165]); doc.text(whats, PW - M, 36, { align: 'right' })
  }

  // ── footer fixo ─────────────────────────────────────────────────────────
  const footer = () => {
    fill(...DARK); doc.rect(0, PH - 30, PW, 30, 'F')
    set(7, 'normal', [120, 128, 138])
    doc.text('Material informativo. Valores, medidas e disponibilidade sujeitos a confirmação. Imóvel da carteira da Rotina Imobiliária, CRECI PJ 132.', M, PH - 12, { maxWidth: PW - 2 * M - 90 })
    doc.text(whats, PW - M, PH - 12, { align: 'right' })
  }

  // ── nova página com header + footer já posicionados ─────────────────────
  const nova = () => { doc.addPage(); header(); footer() }

  // ── linha divisora com acento ouro ───────────────────────────────────────
  const divisor = (yy) => {
    draw(...GOLD); doc.setLineWidth(1.6); doc.line(M, yy, M + 32, yy)
    draw(220, 224, 230); doc.setLineWidth(0.4); doc.line(M + 40, yy, PW - M, yy)
  }

  // ── título de seção ──────────────────────────────────────────────────────
  const tituloSec = (titulo, yy) => {
    if (yy > PH - 130) return -1 // sinaliza que precisa nova página
    set(11, 'bold', [...DARK]); doc.text(titulo.toUpperCase(), M, yy)
    divisor(yy + 5)
    return yy + 22
  }

  // ── parágrafo com quebra automática + paginação ──────────────────────────
  const paragrafo = (txt, yy, maxW = PW - 2 * M, size = 10) => {
    set(size, 'normal', [...TEXT])
    const linhas = doc.splitTextToSize(txt, maxW)
    for (const ln of linhas) {
      if (yy > PH - 46) { nova(); yy = 60 }
      doc.text(ln, M, yy); yy += size * 1.55
    }
    return yy
  }

  // ── lista com bullets ouro ───────────────────────────────────────────────
  const listaItens = (itens, yy) => {
    for (const it of itens) {
      const texto = String(it)
      const linhas = doc.splitTextToSize(texto, PW - 2 * M - 18)
      if (yy + linhas.length * 15 > PH - 46) { nova(); yy = 60 }
      fill(...GOLD); doc.circle(M + 4, yy - 3.5, 2.2, 'F')
      set(10, 'normal', [...TEXT])
      linhas.forEach((ln, k) => { doc.text(ln, M + 14, yy + k * 15) })
      yy += linhas.length * 15 + 5
    }
    return yy + 6
  }

  // ════════════════════════════════════════════════════════════════════════
  //  CAPA
  // ════════════════════════════════════════════════════════════════════════
  header(); footer()

  // Foto de capa — full width, grande
  const capUrl = fotos[0] ? await carregarImg(proxied(fotos[0])) : null
  const capaH = capUrl ? 290 : 0
  if (capUrl) {
    doc.addImage(jpegFit(capUrl, 1060, 580), 'JPEG', 0, 48, PW, capaH)
    // overlay degradê na base da foto para o título aparecer sobre ela
    fill(...DARK)
    for (let i = 0; i < 60; i++) {
      doc.setFillColor(22, 26, 34, Math.round(i * 3))
      doc.rect(0, 48 + capaH - 60 + i, PW, 1, 'F')
    }
  }

  // Badge de tipo no canto superior esquerdo da foto
  if (capUrl && im.tipo) {
    fill(...GOLD); doc.roundedRect(M, 56, doc.getTextWidth((im.tipo || '').toUpperCase()) + 22, 20, 3, 3, 'F')
    set(8, 'bold', [...DARK]); doc.text((im.tipo || '').toUpperCase(), M + 11, 70)
  }

  // Código no canto superior direito da foto
  if (capUrl && im.codigo) {
    set(8, 'normal', [200, 210, 225]); doc.text(`Cód. ${im.codigo}`, PW - M, 70, { align: 'right' })
  }

  // Título sobre a foto (ou abaixo se não tiver foto)
  const tituloY = capUrl ? 48 + capaH - 24 : 70
  const tituloTxt = `${im.tipo || 'Imóvel'} no ${im.bairro || ''}`
  if (capUrl) {
    set(22, 'bold', [255, 255, 255]); doc.text(tituloTxt, M, tituloY)
    set(9, 'normal', [200, 208, 220]); doc.text(`${im.cidade || 'Uberlândia'} — ${im.uf || 'MG'}`, M, tituloY + 14)
  } else {
    set(22, 'bold', [...DARK]); doc.text(tituloTxt, M, tituloY)
    set(9, 'normal', [...SOFT]); doc.text(`${im.cidade || 'Uberlândia'} — ${im.uf || 'MG'} · Cód. ${im.codigo}`, M, tituloY + 14)
  }

  let y = 48 + capaH + (capUrl ? 18 : 40)

  // ── Bloco de preço ───────────────────────────────────────────────────────
  const precoBoxH = 54
  fill(...CREME); doc.roundedRect(M, y, PW - 2 * M, precoBoxH, 6, 6, 'F')
  draw(...GOLD); doc.setLineWidth(0.5); doc.roundedRect(M, y, PW - 2 * M, precoBoxH, 6, 6, 'S')
  set(24, 'bold', [...DARK]); doc.text(formatPreco(im.preco), M + 16, y + 35)
  if (im.precoAnterior && im.precoAnterior > im.preco) {
    set(10, 'normal', [...SOFT])
    doc.text('De ' + formatPreco(im.precoAnterior), M + 16, y + 13)
  }
  const direita = []
  if (im.condominio > 0) direita.push(`Condomínio ${formatPreco(im.condominio)}/mês`)
  if (im.iptu > 0) direita.push(`IPTU ${formatPreco(im.iptu)}/ano`)
  direita.forEach((ln, k) => { set(9, 'normal', [...SOFT]); doc.text(ln, PW - M - 16, y + 20 + k * 14, { align: 'right' }) })
  y += precoBoxH + 18

  // ── Ficha técnica (specs em grid 3 colunas) ──────────────────────────────
  const specs = [
    im.area > 0 && ['Área interna', `${Math.round(im.area)} m²`],
    im.areaLote > 0 && ['Área do lote', `${Math.round(im.areaLote)} m²`],
    im.quartos > 0 && ['Quartos', String(im.quartos)],
    im.suites > 0 && ['Suítes', String(im.suites)],
    im.banheiros > 0 && ['Banheiros', String(im.banheiros)],
    im.vagas > 0 && ['Vagas', String(im.vagas)],
    (im.andar !== undefined && im.andar !== '' && im.andar !== null) && ['Andar', String(im.andar)],
    typeof im.elevador === 'boolean' && ['Elevador', im.elevador ? 'Sim' : 'Não'],
    im.iptu > 0 && ['IPTU/ano', formatPreco(im.iptu)],
    im.condominio > 0 && ['Condomínio', formatPreco(im.condominio) + '/mês'],
  ].filter(Boolean)

  if (specs.length) {
    set(10, 'bold', [...DARK]); doc.text('FICHA TÉCNICA', M, y)
    divisor(y + 5); y += 22
    const cols = 3, colW = (PW - 2 * M) / cols
    specs.forEach((s, i) => {
      const col = i % cols, row = Math.floor(i / cols)
      const x = M + col * colW, yy = y + row * 26
      // mini card de spec
      fill(240, 244, 248); doc.roundedRect(x + 1, yy - 13, colW - 6, 22, 4, 4, 'F')
      set(7.5, 'normal', [...SOFT]); doc.text(s[0], x + 8, yy - 2)
      set(10, 'bold', [...DARK]); doc.text(s[1], x + 8, yy + 8)
    })
    y += Math.ceil(specs.length / cols) * 26 + 16
  }

  // ── Subfotos de destaque (2ª e 3ª foto em grid 2 colunas na mesma página) ──
  const subFotos = fotos.slice(1, 3)
  if (subFotos.length && y < PH - 130) {
    const gap = 8, cw = (PW - 2 * M - gap) / 2, ch = cw * 0.62
    if (y + ch > PH - 46) { nova(); y = 60 }
    for (let j = 0; j < subFotos.length; j++) {
      const img = await carregarImg(proxied(subFotos[j]))
      if (img) doc.addImage(jpegFit(img, Math.round(cw * 2), Math.round(ch * 2)), 'JPEG', M + j * (cw + gap), y, cw, ch)
    }
    y += ch + 16
  }

  // ════════════════════════════════════════════════════════════════════════
  //  PÁGINA 2 — Por que vale a visita + Descrição + Amenidades + Localização
  // ════════════════════════════════════════════════════════════════════════
  nova(); y = 60

  // Por que vale a visita
  const vantagens = vantagensImovel(im)
  if (vantagens.length) {
    y = tituloSec('Por que vale a sua visita', y)
    if (y < 0) { nova(); y = 60; y = tituloSec('Por que vale a sua visita', y) }
    y = listaItens(vantagens, y)
    y += 4
  }

  // Descrição
  if (im.descricao && im.descricao.trim()) {
    if (y > PH - 120) { nova(); y = 60 }
    y = tituloSec('Descrição do imóvel', y)
    if (y < 0) { nova(); y = 60; y = tituloSec('Descrição do imóvel', y) }
    y = paragrafo(im.descricao.trim(), y)
    y += 8
  }

  // Amenidades
  const amenidades = Array.isArray(im.amenidades) ? im.amenidades.filter(Boolean) : []
  if (amenidades.length) {
    if (y > PH - 120) { nova(); y = 60 }
    const yT = tituloSec('Características e comodidades', y)
    if (yT < 0) { nova(); y = 60; y = tituloSec('Características e comodidades', y) }
    else y = yT
    // Grid de amenidades em 2 colunas
    const colW2 = (PW - 2 * M - 10) / 2
    amenidades.forEach((am, idx) => {
      if (y > PH - 46) { nova(); y = 60 }
      const col = idx % 2, x = M + col * (colW2 + 10)
      fill(...GOLD); doc.circle(x + 5, y - 3.5, 2, 'F')
      set(9.5, 'normal', [...TEXT]); doc.text(String(am), x + 13, y, { maxWidth: colW2 - 18 })
      if (col === 1) y += 16
    })
    if (amenidades.length % 2 !== 0) y += 16
    y += 8
  }

  // Localização / proximidades
  const bens = (beneficios || []).filter(Boolean)
  if (bens.length) {
    if (y > PH - 120) { nova(); y = 60 }
    const yT2 = tituloSec('Localização e proximidades', y)
    if (yT2 < 0) { nova(); y = 60; y = tituloSec('Localização e proximidades', y) }
    else y = yT2
    y = listaItens(bens, y)
  }

  // ════════════════════════════════════════════════════════════════════════
  //  PÁGINAS DE GALERIA — todas as fotos restantes
  // ════════════════════════════════════════════════════════════════════════
  const galerias = fotos.slice(3) // já usamos foto 0 (capa), 1 e 2 (subfotos)
  if (galerias.length) {
    nova(); y = 60
    set(11, 'bold', [...DARK])
    doc.text('GALERIA DE FOTOS', M, y)
    divisor(y + 5); y += 22

    const cols2 = 2, gap2 = 10
    const cw2 = (PW - 2 * M - gap2 * (cols2 - 1)) / cols2
    const ch2 = cw2 * 0.68
    let col2 = 0

    for (const u of galerias) {
      const img = await carregarImg(proxied(u))
      if (!img) continue
      if (col2 === 0 && y + ch2 > PH - 46) { nova(); y = 60 }
      const x = M + col2 * (cw2 + gap2)
      doc.addImage(jpegFit(img, Math.round(cw2 * 2.2), Math.round(ch2 * 2.2)), 'JPEG', x, y, cw2, ch2)
      col2++
      if (col2 >= cols2) { col2 = 0; y += ch2 + gap2 }
    }
    // fecha linha incompleta
    if (col2 > 0) y += ch2 + 16
  }

  // ════════════════════════════════════════════════════════════════════════
  //  PÁGINA FINAL — CTA
  // ════════════════════════════════════════════════════════════════════════
  nova(); y = PH / 2 - 70

  fill(...DARK); doc.roundedRect(M, y, PW - 2 * M, 140, 8, 8, 'F')
  fill(...GOLD); doc.roundedRect(M, y, PW - 2 * M, 4, 2, 2, 'F')

  set(18, 'bold', [255, 255, 255])
  doc.text('Gostou? Vamos marcar uma visita.', PW / 2, y + 36, { align: 'center' })
  set(10, 'normal', [200, 208, 220])
  doc.text('Atendimento direto, do primeiro contato à entrega das chaves.', PW / 2, y + 54, { align: 'center' })
  doc.text('Te ajudo na visita, na negociação e em toda a documentação.', PW / 2, y + 68, { align: 'center' })

  // Botão de contato (visual)
  fill(...GOLD); doc.roundedRect(PW / 2 - 90, y + 82, 180, 36, 6, 6, 'F')
  set(11, 'bold', [...DARK]); doc.text(`WhatsApp ${whats}`, PW / 2, y + 106, { align: 'center' })

  set(9, 'normal', [150, 158, 170])
  doc.text(url, PW / 2, y + 132, { align: 'center' })

  doc.save(`material-${im.codigo}-vinicius-graton.pdf`)
}
