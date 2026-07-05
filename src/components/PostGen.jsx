import { useState, useRef, useEffect, useCallback } from 'react'
import { formatPreco, oportunidade } from '../data'
import '../styles/postgen.css'
import '../styles/detalhe.css'
import '../styles/catalogo.css'
import '../styles/admin.css'
import '../styles/lead.css'

const fotoProxy = (url) => `/api/foto?u=${encodeURIComponent(url)}`
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
function carregarImagem(src) {
  return new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = src })
}
function coverDraw(ctx, img, x, y, w, h) {
  const ir = img.width / img.height, r = w / h
  let sw, sh, sx, sy
  if (ir > r) { sh = img.height; sw = sh * r; sx = (img.width - sw) / 2; sy = 0 }
  else { sw = img.width; sh = sw / r; sx = 0; sy = (img.height - sh) / 2 }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}
const plural = (n, s, p) => (n > 1 ? p : s)
function specsLinha(im) {
  const it = []
  if (im.quartos > 0) it.push(`${im.quartos} ${plural(im.quartos, 'quarto', 'quartos')}`)
  if (im.suites > 0) it.push(`${im.suites} ${plural(im.suites, 'suíte', 'suítes')}`)
  if (im.banheiros > 0) it.push(`${im.banheiros} ${plural(im.banheiros, 'banheiro', 'banheiros')}`)
  if (im.vagas > 0) it.push(`${im.vagas} ${plural(im.vagas, 'vaga', 'vagas')}`)
  if (im.area > 0) it.push(`${im.area} m²`)
  return it.join('   ·   ')
}
const precoTxt = (im) => (im.preco > 0 ? formatPreco(im.preco) : 'Sob consulta')

// ——— Cor ——————————————————————————————————————————————————
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2
  if (max === min) { h = s = 0 }
  else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      default: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  return [h * 360, s * 100, l * 100]
}
function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100
  let r, g, b
  if (s === 0) { r = g = b = l }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q
    const hue2rgb = (p2, q2, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p2 + (q2 - p2) * 6 * t; if (t < 1 / 2) return q2; if (t < 2 / 3) return p2 + (q2 - p2) * (2 / 3 - t) * 6; return p2 }
    r = hue2rgb(p, q, h + 1 / 3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1 / 3)
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}
function lum(r, g, b) {
  const c = [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const txtCima = (r, g, b) => lum(r, g, b) > 0.179 ? '#1b1206' : '#fff'
const rc = (r, g, b, a) => `rgba(${r},${g},${b},${a})`

// ——— Paleta padrão (fallback antes da foto ser carregada) —
const PAL_OURO = {
  id: 'ouro',
  dark: [8, 10, 16], acc: [224, 181, 86], accTxt: '#1b1206',
  badge: [179, 38, 30], badgeTxt: '#fff', subAcc: '#ecc869',
}
// Representação visual do PAL_OURO como "combo" para o seletor
const COMBO_OURO = {
  id: 'ouro', label: 'Padrão da marca',
  colors: [{ r: 8, g: 10, b: 16, pct: 42 }, { r: 224, g: 181, b: 86, pct: 35 }, { r: 242, g: 236, b: 218, pct: 23 }],
}

// ——— Extração de cores dominantes da foto ————————————————
function extrairCores(imgEl) {
  const C = document.createElement('canvas'); C.width = C.height = 64
  const X = C.getContext('2d'); X.drawImage(imgEl, 0, 0, 64, 64)
  const d = X.getImageData(0, 0, 64, 64).data
  const buckets = {}; let total = 0
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] & 0xd0, g = d[i + 1] & 0xd0, b = d[i + 2] & 0xd0
    const [, , l] = rgbToHsl(r, g, b)
    if (l < 6 || l > 94) continue
    const k = `${r},${g},${b}`; buckets[k] = (buckets[k] || 0) + 1; total++
  }
  if (!total) return []
  const all = Object.entries(buckets)
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => {
      const [r, g, b] = k.split(',').map(Number)
      const [h, s, l] = rgbToHsl(r, g, b)
      return { r, g, b, h, s, l, pct: n / total * 100 }
    })
  // Deduplicar: pular cores perceptualmente muito próximas das já selecionadas
  const kept = []
  for (const c of all) {
    if (kept.length >= 8) break
    const tooClose = kept.some(k2 => {
      const dh = Math.min(Math.abs(c.h - k2.h), 360 - Math.abs(c.h - k2.h))
      return dh < 22 && Math.abs(c.l - k2.l) < 18
    })
    if (!tooClose) kept.push(c)
  }
  return kept
}

// ——— Gera 3 combinações de 3 cores a partir das dominantes —
function gerarCombos(cores) {
  if (cores.length < 3) return null
  const norm = (arr) => {
    const t = arr.reduce((s, c) => s + c.pct, 0)
    const n = arr.map(c => ({ ...c, pct: Math.round(c.pct / t * 100) }))
    n[0].pct += 100 - n.reduce((s, c) => s + c.pct, 0)
    return n
  }
  // A — 3 mais frequentes (representativas)
  const A = norm(cores.slice(0, 3))
  // B — mais frequente + mais saturada + mais escura (papéis contrastantes)
  const bySat = [...cores].sort((a, b) => b.s - a.s)
  const byDark = [...cores].sort((a, b) => a.l - b.l)
  const Braw = []; const Bseen = new Set()
  for (const c of [cores[0], bySat[0], byDark[0]]) {
    const k = `${c.r},${c.g},${c.b}`; if (!Bseen.has(k)) { Bseen.add(k); Braw.push(c) }
  }
  for (const c of cores) { if (Braw.length >= 3) break; const k = `${c.r},${c.g},${c.b}`; if (!Bseen.has(k)) { Bseen.add(k); Braw.push(c) } }
  const B = norm(Braw.slice(0, 3))
  // C — maximiza distância de matiz (maior diversidade cromática)
  let bestC = cores.slice(0, 3), bestDist = 0
  const n = cores.length
  for (let i = 0; i < n - 2; i++) for (let j = i + 1; j < n - 1; j++) for (let k = j + 1; k < n; k++) {
    const [a, b2, c2] = [cores[i], cores[j], cores[k]]
    const dAB = Math.min(Math.abs(a.h - b2.h), 360 - Math.abs(a.h - b2.h))
    const dBC = Math.min(Math.abs(b2.h - c2.h), 360 - Math.abs(b2.h - c2.h))
    const dAC = Math.min(Math.abs(a.h - c2.h), 360 - Math.abs(a.h - c2.h))
    const dist = Math.min(dAB, dBC, dAC)
    if (dist > bestDist) { bestDist = dist; bestC = [a, b2, c2] }
  }
  return [
    { id: 'A', label: 'Dominante', colors: A },
    { id: 'B', label: 'Contraste', colors: B },
    { id: 'C', label: 'Diversidade', colors: norm(bestC) },
  ]
}

// ——— Converte combo → paleta para os templates ———————————
function comboPaleta(combo) {
  if (combo.id === 'ouro') return PAL_OURO
  const cs = combo.colors
  const sorted = [...cs].sort((a, b) => a.l - b.l)
  const dark = sorted[0]
  const darkRgb = hslToRgb(dark.h, Math.min(dark.s, 85), Math.min(dark.l, 14))
  const accentSrc = cs.reduce((best, c) => c.s > best.s ? c : best, cs[0])
  const accRgb = hslToRgb(accentSrc.h, Math.max(accentSrc.s, 55), Math.min(Math.max(accentSrc.l, 44), 74))
  const subAccRgb = hslToRgb(accentSrc.h, Math.max(accentSrc.s, 50), Math.min(accentSrc.l * 1.1 + 8, 88))
  const badgeRgb = hslToRgb(dark.h, Math.min(dark.s + 15, 100), Math.min(dark.l + 18, 38))
  return {
    id: `combo-${combo.id}`,
    dark: darkRgb, acc: accRgb, accTxt: txtCima(...accRgb),
    badge: badgeRgb, badgeTxt: '#fff',
    subAcc: `rgb(${subAccRgb.join(',')})`,
  }
}

// ——— Helpers de desenho ——————————————————————————————————
function pillPal(ctx, x, y, txt, pal, fs = 26, h = 50) {
  ctx.font = `700 ${fs}px Arial`
  const padX = h * 0.44, w = ctx.measureText(txt).width + padX * 2
  rr(ctx, x, y, w, h, h / 2); ctx.fillStyle = rc(...pal.acc, 0.96); ctx.fill()
  ctx.fillStyle = pal.accTxt; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'
  ctx.fillText(txt, x + padX, y + h / 2 + 1); ctx.textBaseline = 'alphabetic'
}
function eyebrowPal(ctx, W, txt, safe, pal) {
  if (!txt) return
  const t = txt.toUpperCase(), fs = 28, h = 52
  ctx.font = `800 ${fs}px Arial`
  const padX = 24, w = ctx.measureText(t).width + padX * 2, x = W - safe.side - w, y = safe.top
  rr(ctx, x, y, w, h, 12); ctx.fillStyle = rc(...pal.badge, 1); ctx.fill()
  ctx.fillStyle = pal.badgeTxt; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'
  ctx.fillText(t, x + padX, y + h / 2 + 1); ctx.textBaseline = 'alphabetic'
}
function fitText(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text
  let t = text
  while (t.length > 3 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1)
  return t + '…'
}
function sombra(ctx, fn, blur, cor) {
  ctx.shadowColor = cor || 'rgba(0,0,0,0.65)'; ctx.shadowBlur = blur || 18
  fn()
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'
}
function linhaOuro(ctx, W, y, pal, esp) {
  const g = ctx.createLinearGradient(0, 0, W, 0)
  g.addColorStop(0, rc(...pal.acc, 0.2)); g.addColorStop(0.1, rc(...pal.acc, 1))
  g.addColorStop(0.9, rc(...pal.acc, 1)); g.addColorStop(1, rc(...pal.acc, 0.2))
  ctx.fillStyle = g; ctx.fillRect(0, y, W, esp || 7)
}

// ——— Zonas seguras ———————————————————————————————————————
const SAFE = {
  feed: { top: 54, bottom: 60, side: 56 },
  feed45: { top: 150, bottom: 160, side: 60 },
  story: { top: 264, bottom: 300, side: 64 },
}
const dimsDe = (fmt) => fmt === 'story' ? [1080, 1920] : fmt === 'feed45' ? [1080, 1350] : [1080, 1080]
const safeDe = (fmt) => SAFE[fmt] || SAFE.feed

export const TEMPLATES = [
  { id: 'faixa', nome: 'Faixa moderna' },
  { id: 'classico', nome: 'Clássico' },
  { id: 'minimal', nome: 'Minimalista' },
  { id: 'editorial', nome: 'Revista' },
  { id: 'gradiente', nome: 'Gradiente' },
  { id: 'impacto', nome: 'Impacto' },
]

// FAIXA MODERNA — faixa escura no rodapé, preço dominante
function tplFaixa(ctx, W, H, im, eyebrow, safe, pal) {
  const frac = H > 1300 ? 0.42 : 0.47
  const bandY = Math.round(H * (1 - frac))
  const fadeH = Math.round(H * 0.14)
  const gFade = ctx.createLinearGradient(0, bandY - fadeH, 0, bandY + 24)
  gFade.addColorStop(0, rc(...pal.dark, 0)); gFade.addColorStop(1, rc(...pal.dark, 0.98))
  ctx.fillStyle = gFade; ctx.fillRect(0, bandY - fadeH, W, fadeH + 24)
  ctx.fillStyle = rc(...pal.dark, 0.98); ctx.fillRect(0, bandY + 24, W, H - bandY - 24)
  linhaOuro(ctx, W, bandY, pal)
  pillPal(ctx, safe.side, safe.top, (im.tipo || 'Imóvel').toUpperCase(), pal)
  eyebrowPal(ctx, W, eyebrow, safe, pal)
  const pad = safe.side, maxW = W - pad * 2
  let y = bandY + 52; ctx.textAlign = 'left'
  ctx.fillStyle = rc(...pal.acc, 0.82); ctx.font = '700 24px Arial'
  ctx.fillText('ROTINA IMOBILIÁRIA  ·  CONSULTOR DE IMÓVEIS', pad, y); y += 84
  ctx.fillStyle = '#fff'; ctx.font = '900 124px Arial'
  sombra(ctx, () => ctx.fillText(fitText(ctx, precoTxt(im), maxW), pad, y), 22)
  y += 62
  ctx.fillStyle = 'rgba(255,255,255,0.84)'; ctx.font = '400 36px Arial'
  ctx.fillText(fitText(ctx, `${im.tipo}  ·  ${im.bairro}  ·  ${im.cidade}/${im.uf || 'MG'}`, maxW), pad, y); y += 50
  ctx.fillStyle = pal.subAcc; ctx.font = '600 30px Arial'
  ctx.fillText(fitText(ctx, specsLinha(im), maxW), pad, y)
}

// CLÁSSICO — gradiente profundo de baixo, preço grande
function tplClassico(ctx, W, H, im, eyebrow, safe, pal) {
  const gH = Math.round(H * 0.66), gY = H - gH
  const g = ctx.createLinearGradient(0, gY, 0, H)
  g.addColorStop(0, rc(...pal.dark, 0)); g.addColorStop(0.28, rc(...pal.dark, 0.72))
  g.addColorStop(0.62, rc(...pal.dark, 0.95)); g.addColorStop(1, rc(...pal.dark, 1))
  ctx.fillStyle = g; ctx.fillRect(0, gY, W, gH)
  const vg = ctx.createRadialGradient(W / 2, H * 0.26, 0, W / 2, H * 0.26, W * 0.8)
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.28)')
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H)
  pillPal(ctx, safe.side, safe.top, (im.tipo || 'Imóvel').toUpperCase(), pal)
  eyebrowPal(ctx, W, eyebrow, safe, pal)
  const pad = safe.side, bY = H - safe.bottom, maxW = W - pad * 2
  let y = bY; ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(255,255,255,0.38)'; ctx.font = '400 24px Arial'
  ctx.fillText(`rotina.com.br  ·  (34) 99157-0494  ·  Cód. ${im.codigo}`, pad, y); y -= 52
  ctx.fillStyle = pal.subAcc; ctx.font = '600 30px Arial'
  ctx.fillText(fitText(ctx, specsLinha(im), maxW), pad, y); y -= 54
  ctx.fillStyle = 'rgba(255,255,255,0.84)'; ctx.font = '400 38px Arial'
  ctx.fillText(fitText(ctx, `${im.tipo}  ·  ${im.bairro}`, maxW), pad, y); y -= 128
  ctx.fillStyle = '#fff'; ctx.font = '900 124px Arial'
  sombra(ctx, () => ctx.fillText(fitText(ctx, precoTxt(im), maxW), pad, y), 20)
  y -= 52
  ctx.fillStyle = rc(...pal.acc, 0.88); ctx.font = '700 26px Arial'
  ctx.fillText('ROTINA IMOBILIÁRIA  ·  CONSULTOR DE IMÓVEIS', pad, y)
}

// MINIMALISTA — preço em pílula dourada sobre a foto
function tplMinimal(ctx, W, H, im, eyebrow, safe, pal) {
  const vg = ctx.createLinearGradient(0, H * 0.30, 0, H)
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(0.48, 'rgba(0,0,0,0.54)'); vg.addColorStop(1, 'rgba(0,0,0,0.86)')
  ctx.fillStyle = vg; ctx.fillRect(0, H * 0.30, W, H - H * 0.30)
  const sg = ctx.createLinearGradient(0, 0, W * 0.28, 0)
  sg.addColorStop(0, 'rgba(0,0,0,0.44)'); sg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = sg; ctx.fillRect(0, 0, W * 0.28, H)
  eyebrowPal(ctx, W, eyebrow, safe, pal)
  const pad = safe.side, bY = H - safe.bottom, maxW = W - pad * 2
  ctx.textAlign = 'left'
  ctx.fillStyle = '#fff'; ctx.font = '700 26px Arial'
  sombra(ctx, () => ctx.fillText('ROTINA IMOBILIÁRIA', pad, safe.top + 32), 10)
  let y = bY
  ctx.fillStyle = 'rgba(255,255,255,0.40)'; ctx.font = '400 24px Arial'
  ctx.fillText('rotina.com.br  ·  (34) 99157-0494', pad, y); y -= 52
  ctx.fillStyle = pal.subAcc; ctx.font = '600 30px Arial'
  ctx.fillText(fitText(ctx, specsLinha(im), maxW), pad, y); y -= 54
  ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.font = '400 36px Arial'
  sombra(ctx, () => ctx.fillText(fitText(ctx, `${im.tipo}  ·  ${im.bairro}`, maxW), pad, y), 12)
  y -= 134
  ctx.font = '900 110px Arial'
  const pw = Math.min(ctx.measureText(precoTxt(im)).width, maxW - 40)
  const ph = 132, pY = y - ph
  rr(ctx, pad - 18, pY, pw + 58, ph, 16)
  ctx.fillStyle = rc(...pal.acc, 0.96); ctx.fill()
  ctx.fillStyle = pal.accTxt; ctx.textBaseline = 'middle'
  ctx.fillText(fitText(ctx, precoTxt(im), maxW - 40), pad, pY + ph / 2 + 4)
  ctx.textBaseline = 'alphabetic'
}

// REVISTA — painel escuro à esquerda, foto à direita
function tplEditorial(ctx, W, H, im, eyebrow, safe, pal) {
  const panelW = Math.round(W * 0.46)
  const g = ctx.createLinearGradient(0, 0, panelW + 100, 0)
  g.addColorStop(0, rc(...pal.dark, 0.98)); g.addColorStop(0.82, rc(...pal.dark, 0.96)); g.addColorStop(1, rc(...pal.dark, 0))
  ctx.fillStyle = g; ctx.fillRect(0, 0, panelW + 100, H)
  const bg = ctx.createLinearGradient(0, H * 0.87, 0, H)
  bg.addColorStop(0, rc(...pal.dark, 0)); bg.addColorStop(1, rc(...pal.dark, 0.82))
  ctx.fillStyle = bg; ctx.fillRect(0, H * 0.87, W, H * 0.13)
  const lx = panelW - 3
  const vLG = ctx.createLinearGradient(0, 0, 0, H)
  vLG.addColorStop(0, rc(...pal.acc, 0.04)); vLG.addColorStop(0.1, rc(...pal.acc, 1))
  vLG.addColorStop(0.9, rc(...pal.acc, 1)); vLG.addColorStop(1, rc(...pal.acc, 0.04))
  ctx.fillStyle = vLG; ctx.fillRect(lx, 0, 6, H)
  eyebrowPal(ctx, W, eyebrow, safe, pal)
  const pad = safe.side, maxW = panelW - pad - 28
  ctx.textAlign = 'left'
  ctx.fillStyle = rc(...pal.acc, 0.90); ctx.font = '700 24px Arial'
  ctx.fillText('ROTINA IMOBILIÁRIA', pad, safe.top + 30)
  ctx.fillStyle = 'rgba(255,255,255,0.46)'; ctx.font = '400 20px Arial'
  ctx.fillText('CONSULTOR DE IMÓVEIS', pad, safe.top + 56)
  pillPal(ctx, pad, safe.top + 80, (im.tipo || 'Imóvel').toUpperCase(), pal, 24, 46)
  const midY = H * 0.40
  ctx.fillStyle = '#fff'; ctx.font = 'italic 600 56px Georgia, serif'
  ctx.fillText(fitText(ctx, im.tipo || 'Imóvel', maxW), pad, midY)
  ctx.fillStyle = 'rgba(255,255,255,0.70)'; ctx.font = '400 46px Georgia, serif'
  ctx.fillText(fitText(ctx, 'no ' + im.bairro, maxW), pad, midY + 64)
  ctx.fillStyle = pal.subAcc; ctx.font = '700 62px Georgia, serif'
  ctx.fillText(fitText(ctx, precoTxt(im), maxW), pad, midY + 64 + 80)
  ctx.fillStyle = 'rgba(255,255,255,0.70)'; ctx.font = '400 26px Georgia, serif'
  ctx.fillText(fitText(ctx, specsLinha(im), maxW), pad, midY + 64 + 80 + 50)
  const bY = H - safe.bottom
  ctx.fillStyle = 'rgba(255,255,255,0.36)'; ctx.font = '400 22px Arial'
  ctx.fillText(`${im.cidade}/${im.uf || 'MG'}  ·  Cód. ${im.codigo}`, pad, bY)
}

// GRADIENTE — diagonal de cor, texto no rodapé
function tplGradiente(ctx, W, H, im, eyebrow, safe, pal) {
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, rc(...pal.dark, 0.10)); g.addColorStop(0.44, rc(...pal.dark, 0.54)); g.addColorStop(1, rc(...pal.acc, 0.90))
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  const bg = ctx.createLinearGradient(0, H * 0.58, 0, H)
  bg.addColorStop(0, rc(...pal.dark, 0)); bg.addColorStop(1, rc(...pal.dark, 0.94))
  ctx.fillStyle = bg; ctx.fillRect(0, H * 0.58, W, H * 0.42)
  pillPal(ctx, safe.side, safe.top, (im.tipo || 'Imóvel').toUpperCase(), pal)
  eyebrowPal(ctx, W, eyebrow, safe, pal)
  const pad = safe.side, bY = H - safe.bottom, maxW = W - pad * 2
  let y = bY; ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(255,255,255,0.40)'; ctx.font = '500 24px Arial'
  ctx.fillText('rotina.com.br  ·  (34) 99157-0494', pad, y); y -= 52
  ctx.fillStyle = pal.subAcc; ctx.font = '600 30px Arial'
  ctx.fillText(fitText(ctx, specsLinha(im), maxW), pad, y); y -= 56
  ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.font = '500 38px Arial'
  ctx.fillText(fitText(ctx, `${im.tipo}  ·  ${im.bairro}`, maxW), pad, y); y -= 124
  ctx.fillStyle = '#fff'; ctx.font = '900 124px Arial'
  sombra(ctx, () => ctx.fillText(fitText(ctx, precoTxt(im), maxW), pad, y), 24)
  y -= 54
  ctx.fillStyle = rc(...pal.acc, 0.88); ctx.font = '700 26px Arial'
  ctx.fillText('ROTINA IMOBILIÁRIA  ·  CONSULTOR DE IMÓVEIS', pad, y)
}

// IMPACTO — texto central dramático sobre a foto (inspirado em peças editoriais)
function tplImpacto(ctx, W, H, im, eyebrow, safe, pal) {
  // Gradiente escuro de cima e de baixo, centro fica mais visível
  const gt = ctx.createLinearGradient(0, 0, 0, H * 0.38)
  gt.addColorStop(0, rc(...pal.dark, 0.78)); gt.addColorStop(1, rc(...pal.dark, 0))
  ctx.fillStyle = gt; ctx.fillRect(0, 0, W, H * 0.38)
  const gb = ctx.createLinearGradient(0, H * 0.54, 0, H)
  gb.addColorStop(0, rc(...pal.dark, 0)); gb.addColorStop(1, rc(...pal.dark, 0.90))
  ctx.fillStyle = gb; ctx.fillRect(0, H * 0.54, W, H * 0.46)
  // Vinheta lateral
  const gs = ctx.createLinearGradient(0, 0, W * 0.22, 0)
  gs.addColorStop(0, 'rgba(0,0,0,0.42)'); gs.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gs; ctx.fillRect(0, 0, W * 0.22, H)

  pillPal(ctx, safe.side, safe.top, (im.tipo || 'Imóvel').toUpperCase(), pal)
  eyebrowPal(ctx, W, eyebrow, safe, pal)

  const pad = safe.side, bY = H - safe.bottom, maxW = W - pad * 2
  ctx.textAlign = 'left'

  // Marca topo
  ctx.fillStyle = rc(...pal.acc, 0.88); ctx.font = '700 24px Arial'
  sombra(ctx, () => ctx.fillText('ROTINA IMOBILIÁRIA', pad, safe.top + 30), 10)

  // Texto central — cidade pequena, bairro grande
  const cY = H * 0.47
  ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.font = '400 38px Arial'
  sombra(ctx, () => ctx.fillText(fitText(ctx, im.cidade ? `${im.cidade}/${im.uf || 'MG'}` : 'Uberlândia/MG', maxW), pad, cY - 56), 14)
  ctx.fillStyle = '#fff'; ctx.font = '900 110px Arial'
  sombra(ctx, () => ctx.fillText(fitText(ctx, im.bairro || im.tipo || 'Imóvel', maxW), pad, cY + 40), 28)
  // Linha dourada abaixo do bairro
  linhaOuro(ctx, Math.min(ctx.measureText(fitText(ctx, im.bairro || im.tipo || 'Imóvel', maxW)).width + pad + 12, W - pad), cY + 56, pal, 5)

  // Rodapé
  let y = bY
  ctx.fillStyle = 'rgba(255,255,255,0.38)'; ctx.font = '400 24px Arial'
  ctx.fillText('rotina.com.br  ·  (34) 99157-0494', pad, y); y -= 52
  ctx.fillStyle = pal.subAcc; ctx.font = '600 30px Arial'
  ctx.fillText(fitText(ctx, specsLinha(im), maxW), pad, y); y -= 56
  ctx.fillStyle = '#fff'; ctx.font = '800 72px Arial'
  sombra(ctx, () => ctx.fillText(fitText(ctx, precoTxt(im), maxW), pad, y), 18)
}

function desenhar(canvas, img, im, opts) {
  const { formato, template, eyebrow, palette } = opts
  const pal = palette || PAL_OURO
  const [W, H] = dimsDe(formato), safe = safeDe(formato)
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')
  coverDraw(ctx, img, 0, 0, W, H)
  const fn = { classico: tplClassico, faixa: tplFaixa, minimal: tplMinimal, editorial: tplEditorial, gradiente: tplGradiente, impacto: tplImpacto }[template] || tplFaixa
  fn(ctx, W, H, im, eyebrow, safe, pal)
}
function desenharGuias(canvas, formato) {
  const [W, H] = dimsDe(formato), safe = safeDe(formato)
  const ctx = canvas.getContext('2d')
  ctx.save(); ctx.strokeStyle = 'rgba(255,70,70,0.9)'; ctx.lineWidth = 3; ctx.setLineDash([16, 12])
  ctx.strokeRect(safe.side, safe.top, W - 2 * safe.side, (H - safe.bottom) - safe.top); ctx.setLineDash([])
  ctx.fillStyle = 'rgba(255,70,70,0.95)'; ctx.font = '600 26px Arial'; ctx.textAlign = 'center'
  if (formato === 'story') {
    ctx.fillText('▲ zona do @perfil - evite texto', W / 2, safe.top - 16)
    ctx.fillText('▼ barra de resposta / botões', W / 2, H - safe.bottom + 36)
  } else { ctx.fillText('margem segura', W / 2, safe.top - 12) }
  ctx.restore()
}

function montarLegenda(im) {
  const specs = []
  if (im.quartos > 0) specs.push(`🛏 ${im.quartos} ${plural(im.quartos, 'quarto', 'quartos')}`)
  if (im.suites > 0) specs.push(`✨ ${im.suites} ${plural(im.suites, 'suíte', 'suítes')}`)
  if (im.banheiros > 0) specs.push(`🚿 ${im.banheiros} ${plural(im.banheiros, 'banheiro', 'banheiros')}`)
  if (im.vagas > 0) specs.push(`🚗 ${im.vagas} ${plural(im.vagas, 'vaga', 'vagas')}`)
  if (im.area > 0) specs.push(`📐 ${im.area} m²`)
  const desc = (im.descricao || '').replace(/\s+/g, ' ').trim()
  const frases = (desc.match(/[^.!?]+[.!?]+/g) || [desc]).slice(0, 2).join(' ').trim()
  const bairroTag = '#' + String(im.bairro || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')
  const tipoTag = /apart/i.test(im.tipo) ? '#apartamentoavenda' : /casa/i.test(im.tipo) ? '#casaavenda' : /lote|terreno/i.test(im.tipo) ? '#terrenoavenda' : '#imovelavenda'
  return [
    `🏡 ${im.tipo} no ${im.bairro} - ${im.cidade}/${im.uf || 'MG'}`,
    `💰 ${precoTxt(im)}`, '',
    specs.join('  ·  '),
    frases ? '\n' + frases : '', '',
    'Agende sua visita com um consultor da Rotina Imobiliária. Atendimento completo da busca à entrega das chaves. 🤝',
    '📲 WhatsApp (34) 99157-0494',
    '🔗 rotina.com.br', '',
    `#imoveis #uberlandia #uberlandiamg ${tipoTag} ${bairroTag} #imoveisuberlandia #rotinaimobiliaria #consultordeimoveis #imoveldosonhos`,
  ].filter((l) => l !== undefined).join('\n')
}

const EYEBROWS = ['', 'OPORTUNIDADE', 'NOVO', 'EXCLUSIVO', 'LANÇAMENTO', 'BAIXOU O PREÇO', 'AGENDE JÁ']

// ——— Seletor de paleta (barras proporcionais) —————————————
function ComboCard({ combo, sel, onSel }) {
  const id = combo.id === 'ouro' ? 'ouro' : `combo-${combo.id}`
  return (
    <button type="button" className={`pg-combo ${sel === id ? 'on' : ''}`} onClick={() => onSel(id)}>
      <div className="pg-combo-bar">
        {combo.colors.map((c, i) => (
          <span key={i} style={{ flex: c.pct, background: `rgb(${c.r},${c.g},${c.b})` }} />
        ))}
      </div>
      <div className="pg-combo-pcts">
        {combo.colors.map((c, i) => (
          <span key={i} style={{ flex: c.pct }}>{c.pct}%</span>
        ))}
      </div>
      <div className="pg-combo-label">{combo.label}</div>
    </button>
  )
}

export default function PostGen() {
  const [cod, setCod] = useState('')
  const [im, setIm] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [fotoIdx, setFotoIdx] = useState(0)
  const [sel, setSel] = useState(new Set())
  const [formato, setFormato] = useState('feed')
  const [template, setTemplate] = useState('faixa')
  const [eyebrow, setEyebrow] = useState('')
  const [guias, setGuias] = useState(true)
  const [legenda, setLegenda] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [baixando, setBaixando] = useState('')
  const [combos, setCombos] = useState(null) // null = foto ainda não carregada
  const [paletaSel, setPaletaSel] = useState('ouro')
  const canvasRef = useRef(null)

  const fotos = im ? (im.fotos && im.fotos.length ? im.fotos : (im.foto ? [im.foto] : [])) : []

  const getPal = useCallback((combosArr, selId) => {
    if (selId === 'ouro' || !combosArr) return PAL_OURO
    const combo = combosArr.find(c => `combo-${c.id}` === selId)
    return combo ? comboPaleta(combo) : PAL_OURO
  }, [])

  const buscar = async (e) => {
    e && e.preventDefault()
    const c = cod.replace(/\D/g, ''); if (!c) return
    setCarregando(true); setErro(''); setIm(null); setCombos(null); setPaletaSel('ouro')
    try {
      const r = await fetch(`/api/rotina-imovel?codigo=${c}`)
      const j = await r.json()
      if (!j || !j.imovel) { setErro(j && j.erro ? j.erro : 'Imóvel não encontrado.'); return }
      const imv = j.imovel
      setIm(imv); setFotoIdx(0)
      const fs = imv.fotos && imv.fotos.length ? imv.fotos : (imv.foto ? [imv.foto] : [])
      setSel(new Set(fs.map((_, i) => i)))
      setLegenda(montarLegenda(imv))
      const op = oportunidade(imv)
      setEyebrow(op.abaixoMercado ? 'OPORTUNIDADE' : '')
    } catch { setErro('Não consegui buscar agora. Tente de novo.') } finally { setCarregando(false) }
  }

  // Extrai paletas instantaneamente ao abrir cada foto
  useEffect(() => {
    if (!im) { setCombos(null); setPaletaSel('ouro'); return }
    const url = fotos[fotoIdx] || fotos[0]; if (!url) return
    let cancelled = false
    carregarImagem(fotoProxy(url)).then(img => {
      if (cancelled) return
      const cores = extrairCores(img)
      const cs = gerarCombos(cores)
      setCombos(cs)
      setPaletaSel(cs ? 'combo-A' : 'ouro')
    }).catch(() => {})
    return () => { cancelled = true }
  }, [im ? im.codigo : null, fotoIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  const redesenhar = useCallback(async () => {
    if (!im || !canvasRef.current) return
    const url = fotos[fotoIdx] || fotos[0]; if (!url) return
    try {
      const img = await carregarImagem(fotoProxy(url))
      const pal = getPal(combos, paletaSel)
      desenhar(canvasRef.current, img, im, { formato, template, eyebrow, palette: pal })
      if (guias) desenharGuias(canvasRef.current, formato)
    } catch { setErro('Não consegui carregar essa foto. Tente outra.') }
  }, [im, fotoIdx, formato, template, eyebrow, guias, combos, paletaSel, getPal])
  useEffect(() => { redesenhar() }, [redesenhar])

  const toggleSel = (i) => setSel((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n })
  const todas = () => setSel(new Set(fotos.map((_, i) => i)))
  const nenhuma = () => setSel(new Set())

  const baixarCanvasEl = (canvas, nome) => new Promise((res) => {
    canvas.toBlob((b) => {
      if (!b) return res()
      const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nome + '.png'
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); res()
    }, 'image/png')
  })
  const gerarFoto = async (url) => {
    const img = await carregarImagem(fotoProxy(url))
    const c = document.createElement('canvas')
    desenhar(c, img, im, { formato, template, eyebrow, palette: getPal(combos, paletaSel) })
    return c
  }

  const baixarUma = async () => {
    setBaixando('uma')
    try { const c = await gerarFoto(fotos[fotoIdx]); await baixarCanvasEl(c, `post-${im.codigo}-${formato}`) } catch {}
    setBaixando('')
  }
  const baixarSelecionadas = async () => {
    const idxs = [...sel].sort((a, b) => a - b); if (!idxs.length) return
    setBaixando('lote')
    for (let k = 0; k < idxs.length; k++) {
      setBaixando(`lote ${k + 1}/${idxs.length}`)
      try { const c = await gerarFoto(fotos[idxs[k]]); await baixarCanvasEl(c, `post-${im.codigo}-${String(k + 1).padStart(2, '0')}-${formato}`); await esperar(350) } catch {}
    }
    setBaixando('')
  }

  const copiarLegenda = async () => { try { await navigator.clipboard.writeText(legenda); setCopiado(true); setTimeout(() => setCopiado(false), 2000) } catch {} }

  const [pubStatus, setPubStatus] = useState('')
  const publicarInstagram = async () => {
    if (!canvasRef.current || !im) return
    setPubStatus('enviando')
    try {
      const blob = await new Promise((res) => canvasRef.current.toBlob(res, 'image/png'))
      const reader = new FileReader()
      const base64 = await new Promise((res, rej) => { reader.onload = () => res(reader.result); reader.onerror = rej; reader.readAsDataURL(blob) })
      const token = localStorage.getItem('vg_admin_token') || ''
      const r = await fetch('/api/instagram-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, imageData: base64, caption: legenda }),
      })
      const j = await r.json()
      if (j.ok) { setPubStatus('ok'); setTimeout(() => setPubStatus(''), 4000) }
      else { setPubStatus(`erro: ${j.error}`); setTimeout(() => setPubStatus(''), 6000) }
    } catch (e) { setPubStatus(`erro: ${e.message}`); setTimeout(() => setPubStatus(''), 6000) }
  }

  // Monta a lista de combos exibida (3 da foto + 1 padrão)
  const combosVisiveis = combos
    ? [...combos, COMBO_OURO]
    : [COMBO_OURO]

  return (
    <div className="postgen">
      <div className="postgen-intro">
        <h3>📣 Estúdio de publicidade</h3>
        <p className="section-sub" style={{ margin: '6px 0 0' }}>
          Digite o código. Eu carrego todas as fotos, aplico o estilo de design escolhido em massa e você baixa as que quiser (uma ou todas) + a legenda pronta.
        </p>
      </div>

      <form className="postgen-busca" onSubmit={buscar}>
        <input type="text" inputMode="numeric" value={cod} onChange={(e) => setCod(e.target.value)} placeholder="Código do imóvel (ex.: 84330)" aria-label="Código do imóvel" />
        <button type="submit" className="admin-btn admin-btn--ok" disabled={carregando}>{carregando ? 'Buscando…' : 'Carregar'}</button>
      </form>
      {erro && <p className="lead-erro">{erro}</p>}

      {im && (
        <div className="postgen-edit">
          <div className="postgen-preview">
            <canvas ref={canvasRef} className={`postgen-canvas postgen-canvas--${formato}`} />
          </div>

          <div className="postgen-controles">
            <div className="pg-bloco">
              <span className="pg-lbl">Estilo de design</span>
              <div className="mf-filtros">
                {TEMPLATES.map((t) => <button key={t.id} type="button" className={`mf-filtro ${template === t.id ? 'on' : ''}`} onClick={() => setTemplate(t.id)}>{t.nome}</button>)}
              </div>
            </div>

            <div className="pg-bloco">
              <span className="pg-lbl">
                Paleta de cores
                {combos && <span className="pg-pal-sub"> - extraída da foto em destaque</span>}
              </span>
              <div className="pg-combos">
                {combosVisiveis.map(combo => (
                  <ComboCard key={combo.id} combo={combo} sel={paletaSel} onSel={setPaletaSel} />
                ))}
              </div>
            </div>

            <div className="pg-bloco pg-bloco-row">
              <div>
                <span className="pg-lbl">Formato</span>
                <div className="postgen-formato">
                  <button type="button" className={`fp-pill ${formato === 'feed' ? 'on' : ''}`} onClick={() => setFormato('feed')}>Feed 1:1</button>
                  <button type="button" className={`fp-pill ${formato === 'feed45' ? 'on' : ''}`} onClick={() => setFormato('feed45')}>Feed 4:5</button>
                  <button type="button" className={`fp-pill ${formato === 'story' ? 'on' : ''}`} onClick={() => setFormato('story')}>Story 9:16</button>
                </div>
                <label className="mf-check" style={{ marginTop: 8 }}><input type="checkbox" checked={guias} onChange={(e) => setGuias(e.target.checked)} /> Mostrar zonas seguras (não saem no arquivo)</label>
              </div>
              <div style={{ flex: 1 }}>
                <span className="pg-lbl">Selo (chamada)</span>
                <select className="pg-select" value={eyebrow} onChange={(e) => setEyebrow(e.target.value)}>
                  {EYEBROWS.map((s) => <option key={s} value={s}>{s || 'Sem selo'}</option>)}
                </select>
              </div>
            </div>

            {fotos.length > 0 && (
              <div className="pg-bloco">
                <span className="pg-lbl">Fotos ({sel.size} selecionadas) <button type="button" className="pg-mini" onClick={todas}>Todas</button> <button type="button" className="pg-mini" onClick={nenhuma}>Limpar</button></span>
                <div className="postgen-fotos">
                  {fotos.slice(0, 30).map((f, i) => (
                    <div key={i} className={`pg-foto ${i === fotoIdx ? 'on' : ''} ${sel.has(i) ? 'sel' : ''}`}>
                      <img src={f} alt={`foto ${i + 1}`} loading="lazy" onClick={() => setFotoIdx(i)} />
                      <button type="button" className="pg-foto-check" onClick={() => toggleSel(i)} title={sel.has(i) ? 'Tirar da seleção' : 'Selecionar'}>{sel.has(i) ? '✓' : '+'}</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pg-bloco-acoes">
              <button type="button" className="admin-btn" onClick={baixarUma} disabled={!!baixando}>{baixando === 'uma' ? 'Gerando…' : '⬇ Baixar esta'}</button>
              <button type="button" className="btn btn-gold" onClick={baixarSelecionadas} disabled={!!baixando || !sel.size}>{baixando.startsWith('lote') ? `Baixando ${baixando.replace('lote', '').trim()}…` : `⬇ Baixar selecionadas (${sel.size})`}</button>
              <button type="button" className={`admin-btn pg-insta-btn${pubStatus === 'ok' ? ' pg-insta-ok' : pubStatus.startsWith('erro') ? ' pg-insta-err' : ''}`} onClick={publicarInstagram} disabled={pubStatus === 'enviando'} title="Publicar imagem atual + legenda no Instagram Business">
                {pubStatus === 'enviando' ? '⏳ Publicando…' : pubStatus === 'ok' ? '✓ Publicado!' : pubStatus.startsWith('erro') ? '✗ ' + pubStatus.slice(6, 60) : '📸 Publicar no Instagram'}
              </button>
            </div>

            <label className="postgen-legenda-lbl">Legenda (editável)</label>
            <textarea className="postgen-legenda" rows="10" value={legenda} onChange={(e) => setLegenda(e.target.value)} />
            <button type="button" className="admin-btn" onClick={copiarLegenda}>{copiado ? '✓ Legenda copiada' : 'Copiar legenda'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
