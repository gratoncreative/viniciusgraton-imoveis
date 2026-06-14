import { useEffect, useRef, useState, useCallback } from 'react'

// Ferramenta (área restrita): corrige inclinação + realça fotos em lote, 100% no
// navegador. Estima o ângulo automaticamente, deixa ajustar com grade de nível,
// realça nitidez/cor/contraste/brilho/balanço de branco e exporta (opcional 2x).

const PREVIEW_MAX = 900   // resolução do preview (rápido)
const EXPORT_MAX = 2560   // teto da resolução base na exportação

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const PADRAO = { angle: 0, brilho: 1.05, contraste: 1.09, satur: 1.12, nitidez: 0.6, suave: 0, realces: 0, sombras: 0, vibrar: 0, wb: true, temp: 0, vinheta: 0, escala: 1 }

// analisa a foto (histograma) e devolve os ajustes ideais — "auto-melhorar"
function autoConfig(img) {
  try {
    const w = 160, h = Math.max(1, Math.round((img.height / img.width) * 160))
    const c = document.createElement('canvas'); c.width = w; c.height = h
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, w, h)
    const d = ctx.getImageData(0, 0, w, h).data
    let sum = 0, sum2 = 0, n = 0
    for (let i = 0; i < d.length; i += 8) {
      const L = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
      sum += L; sum2 += L * L; n++
    }
    const mean = sum / n, std = Math.sqrt(Math.max(0, sum2 / n - mean * mean))
    const brilho = clamp(132 / (mean || 1), 0.9, 1.24)
    const contraste = clamp(1.05 + Math.max(0, 52 - std) / 130, 1.0, 1.24)
    let angle = 0; try { angle = estimarAngulo(img) } catch { angle = 0 }
    return { angle, brilho, contraste, satur: 1.16, nitidez: 0.7, suave: 0.3, realces: 0.18, sombras: 0.18, vibrar: 0.15, temp: 0, vinheta: 0, wb: true }
  } catch { return { ...PADRAO } }
}
const carregarImagem = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src })

// Filtros prontos (presets de realce) — clicar aplica e mostra na hora
const FILTROS = [
  { nome: 'Original', s: { brilho: 1.05, contraste: 1.09, satur: 1.12, nitidez: 0.6, temp: 0, vinheta: 0, wb: true } },
  { nome: 'Vívido', s: { brilho: 1.06, contraste: 1.16, satur: 1.32, nitidez: 0.75, temp: 0.04, vinheta: 0, wb: true } },
  { nome: 'Nítido HDR', s: { brilho: 1.04, contraste: 1.22, satur: 1.16, nitidez: 1.1, temp: 0, vinheta: 0.1, wb: true } },
  { nome: 'Clássico', s: { brilho: 1.03, contraste: 1.12, satur: 1.04, nitidez: 0.5, temp: 0.05, vinheta: 0, wb: true } },
  { nome: 'Quente', s: { brilho: 1.05, contraste: 1.08, satur: 1.14, nitidez: 0.5, temp: 0.2, vinheta: 0, wb: false } },
  { nome: 'Frio', s: { brilho: 1.05, contraste: 1.1, satur: 1.08, nitidez: 0.5, temp: -0.18, vinheta: 0, wb: false } },
  { nome: 'Suave', s: { brilho: 1.08, contraste: 0.98, satur: 1.06, nitidez: 0.25, temp: 0.03, vinheta: 0, wb: true } },
  { nome: 'Dramático', s: { brilho: 1.0, contraste: 1.26, satur: 1.1, nitidez: 0.8, temp: -0.02, vinheta: 0.32, wb: true } },
  { nome: 'P&B', s: { brilho: 1.05, contraste: 1.14, satur: 0, nitidez: 0.7, temp: 0, vinheta: 0.12, wb: true } },
]

// ——— estima o ângulo de inclinação (graus) a partir das bordas horizontais/verticais ———
function estimarAngulo(img) {
  const w = 240, h = Math.max(1, Math.round((img.height / img.width) * 240))
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, w, h)
  const d = ctx.getImageData(0, 0, w, h).data
  const g = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]
  const bins = new Float32Array(61) // -15.0 .. +15.0 em passos de 0.5 => 61 posições
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const gx = (g[i - 1 - w] + 2 * g[i - 1] + g[i - 1 + w]) - (g[i + 1 - w] + 2 * g[i + 1] + g[i + 1 + w])
      const gy = (g[i - w - 1] + 2 * g[i - w] + g[i - w + 1]) - (g[i + w - 1] + 2 * g[i + w] + g[i + w + 1])
      const mag = Math.hypot(gx, gy)
      if (mag < 24) continue
      let ang = Math.atan2(gy, gx) * 180 / Math.PI       // direção do gradiente
      let dev = ((ang % 90) + 90) % 90                    // 0..90
      if (dev > 45) dev -= 90                             // -45..45 (desvio do eixo)
      if (dev >= -15 && dev <= 15) {
        const idx = Math.round((dev + 15) * 2)
        bins[idx] += mag
      }
    }
  }
  let melhor = 30, peso = 0
  for (let k = 0; k < 61; k++) if (bins[k] > peso) { peso = bins[k]; melhor = k }
  const dev = (melhor / 2) - 15
  // corrigir = girar no sentido oposto ao desvio
  return peso > 0 ? clamp(-dev, -15, 15) : 0
}

// ——— pipeline de processamento (rotaciona+corta, filtros, balanço de branco, nitidez) ———
function balancoBranco(imageData) {
  const data = imageData.data
  let r = 0, gg = 0, b = 0, n = 0
  for (let i = 0; i < data.length; i += 64) { r += data[i]; gg += data[i + 1]; b += data[i + 2]; n++ }
  r /= n; gg /= n; b /= n
  const cinza = (r + gg + b) / 3
  const kr = clamp(cinza / (r || 1), 0.8, 1.2), kgv = clamp(cinza / (gg || 1), 0.8, 1.2), kb = clamp(cinza / (b || 1), 0.8, 1.2)
  for (let i = 0; i < data.length; i += 4) { data[i] *= kr; data[i + 1] *= kgv; data[i + 2] *= kb }
}
function nitidezUnsharp(imageData, amount) {
  const { data, width: w, height: h } = imageData
  const src = new Uint8ClampedArray(data)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4
      for (let c = 0; c < 3; c++) {
        const o = i + c
        const lap = 4 * src[o] - src[o - 4] - src[o + 4] - src[o - w * 4] - src[o + w * 4]
        data[o] = src[o] + amount * lap
      }
    }
  }
}
function aplicarTemp(imageData, t) { // t: -0.3 (frio) .. +0.3 (quente)
  const d = imageData.data, kr = 1 + t * 0.6, kb = 1 - t * 0.6
  for (let i = 0; i < d.length; i += 4) { d[i] *= kr; d[i + 2] *= kb }
}
// realces (recupera claros), sombras (levanta escuros) e vibração (satura só o que está apagado)
function aplicarTom(imageData, s) {
  const rea = s.realces || 0, som = s.sombras || 0, vib = s.vibrar || 0
  if (!rea && !som && !vib) return
  const d = imageData.data
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2]
    if (som || rea) {
      const L = 0.299 * r + 0.587 * g + 0.114 * b
      if (som) { const w = (1 - L / 255) * (1 - L / 255); const a = som * 75 * w; r += a; g += a; b += a }
      if (rea) { const w = (L / 255) * (L / 255); const a = rea * 75 * w; r -= a; g -= a; b -= a }
    }
    if (vib) {
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
      const sat = mx ? (mx - mn) / mx : 0
      const boost = vib * (1 - sat), gray = (r + g + b) / 3
      r = gray + (r - gray) * (1 + boost); g = gray + (g - gray) * (1 + boost); b = gray + (b - gray) * (1 + boost)
    }
    d[i] = r; d[i + 1] = g; d[i + 2] = b
  }
}
function aplicarVinheta(ctx, W, H, v) { // v: 0..0.6
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.72)
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${v})`)
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
}
function processar(img, s, maxLado) {
  const esc = Math.min(1, maxLado / Math.max(img.width, img.height))
  const W = Math.max(1, Math.round(img.width * esc)), H = Math.max(1, Math.round(img.height * esc))
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const ctx = c.getContext('2d')
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'
  const blurPx = (s.suave || 0) * Math.max(1, W / 1000) * 2.2 // suavização (reduz ruído de câmera ruim)
  ctx.filter = `brightness(${s.brilho}) contrast(${s.contraste}) saturate(${s.satur})${blurPx > 0.05 ? ` blur(${blurPx.toFixed(2)}px)` : ''}`
  const a = (s.angle || 0) * Math.PI / 180
  const z = Math.cos(Math.abs(a)) + Math.sin(Math.abs(a)) * Math.max(W / H, H / W)
  ctx.translate(W / 2, H / 2); ctx.rotate(a); ctx.scale(z, z)
  ctx.drawImage(img, -W / 2, -H / 2, W, H)
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = 'none'
  const dados = ctx.getImageData(0, 0, W, H)
  if (s.wb) balancoBranco(dados)
  if (s.temp) aplicarTemp(dados, s.temp)
  aplicarTom(dados, s)
  if (s.nitidez > 0) nitidezUnsharp(dados, s.nitidez)
  ctx.putImageData(dados, 0, 0)
  if (s.vinheta > 0) aplicarVinheta(ctx, W, H, s.vinheta)
  return c
}
// desenha a marca d'água (texto, logo ou ambos) na posição escolhida
function aplicarMarca(canvas, wm, logoImg) {
  if (!wm || !wm.on) return canvas
  const modo = wm.modo || 'texto'
  const hasTxt = (modo === 'texto' || modo === 'ambos') && wm.texto
  const hasLogo = (modo === 'logo' || modo === 'ambos') && logoImg
  if (!hasTxt && !hasLogo) return canvas

  const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height
  const fs = Math.max(13, Math.round(Math.min(W, H) * (wm.tam / 100)))
  const pad = Math.round(fs * 0.8)
  const p = wm.pos || 'inf-dir'
  const x = p.includes('dir') ? W - pad : p.includes('esq') ? pad : W / 2
  const alignH = p.includes('dir') ? 'right' : p.includes('esq') ? 'left' : 'center'
  const isSup = p.includes('sup'), isCentro = p === 'centro'

  ctx.save()
  ctx.globalAlpha = clamp(wm.opac, 0.05, 1)
  ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = fs * 0.3

  let offsetY = isSup ? pad : isCentro ? H / 2 : H - pad

  if (hasLogo) {
    const lh = Math.round(fs * 2.2)
    const lw = Math.round(lh * (logoImg.naturalWidth || logoImg.width) / (logoImg.naturalHeight || logoImg.height))
    const lx = alignH === 'right' ? x - lw : alignH === 'left' ? x : x - lw / 2
    const ly = isSup ? offsetY : isCentro ? offsetY - lh / 2 : offsetY - lh
    ctx.drawImage(logoImg, lx, ly, lw, lh)
    if (isSup) offsetY += lh + Math.round(fs * 0.35)
    else if (!isCentro) offsetY -= lh + Math.round(fs * 0.35)
  }

  if (hasTxt) {
    ctx.font = `600 ${fs}px Georgia, "Times New Roman", serif`
    ctx.fillStyle = '#fff'
    ctx.textAlign = alignH
    if (isSup) { ctx.textBaseline = 'top'; ctx.fillText(wm.texto, x, offsetY) }
    else if (isCentro) { ctx.textBaseline = 'middle'; ctx.fillText(wm.texto, x, offsetY) }
    else { ctx.textBaseline = 'alphabetic'; ctx.fillText(wm.texto, x, offsetY) }
  }

  ctx.restore()
  return canvas
}
function exportarCanvas(img, s) {
  const base = processar(img, s, EXPORT_MAX)
  if ((s.escala || 1) <= 1) return base
  const out = document.createElement('canvas')
  out.width = Math.round(base.width * s.escala); out.height = Math.round(base.height * s.escala)
  const ctx = out.getContext('2d'); ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(base, 0, 0, out.width, out.height)
  return out
}

// desenha a imagem/canvas cobrindo todo o retângulo (object-fit: cover)
function coverDraw(ctx, img, x, y, w, h) {
  const iw = img.width || img.naturalWidth, ih = img.height || img.naturalHeight
  const ir = iw / ih, r = w / h
  let sw, sh, sx, sy
  if (ir > r) { sh = ih; sw = sh * r; sx = (iw - sw) / 2; sy = 0 }
  else { sw = iw; sh = sw / r; sx = 0; sy = (ih - sh) / 2 }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

// ——— vídeo (slideshow 9:16): cada foto centralizada sobre fundo desfocado dela mesma ———
function montarSlide(quadro, W, H) {
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high'
  ctx.fillStyle = '#0a0e16'; ctx.fillRect(0, 0, W, H)
  ctx.save(); ctx.filter = 'blur(28px) brightness(0.5)'
  coverDraw(ctx, quadro, -50, -50, W + 100, H + 100) // fundo desfocado preenchendo
  ctx.restore()
  const s = Math.min(W / quadro.width, H / quadro.height)
  const w = quadro.width * s, h = quadro.height * s
  ctx.drawImage(quadro, (W - w) / 2, (H - h) / 2, w, h)
  return c
}
// marca d'água do vídeo: CENTRAL, CONSTANTE e TRANSLÚCIDA (deixa ver a transição ao fundo)
function marcaDagua(ctx, W, H, texto) {
  const fs = Math.round(Math.min(W, H) * 0.072)
  ctx.save()
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = Math.round(W * 0.012)
  ctx.globalAlpha = 0.22
  ctx.fillStyle = '#ffffff'
  ctx.font = `600 ${fs}px Georgia, "Times New Roman", serif`
  ctx.fillText((texto || 'Vinícius Graton').toUpperCase(), W / 2, H / 2)
  ctx.globalAlpha = 0.18
  ctx.font = `400 ${Math.round(fs * 0.4)}px Georgia, serif`
  ctx.fillText('Consultor de Imóveis · Uberlândia', W / 2, H / 2 + fs * 0.78)
  ctx.restore()
}
const MIME = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
const EXT = { jpeg: 'jpg', png: 'png', webp: 'webp' }
const canvasParaBlob = (canvas, fmt) => new Promise((res) => canvas.toBlob((b) => res(b), MIME[fmt] || 'image/jpeg', fmt === 'png' ? undefined : 0.92))
const baseNome = (n) => n.replace(/\.[^.]+$/, '')
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
const msgVideo = (p) => p < 25 ? 'Preparando as cenas…' : p < 50 ? 'Aplicando transições suaves…' : p < 78 ? 'Caprichando no acabamento…' : 'Quase pronto, segura aí…'

// fora do componente (não remontar a cada render — senão o arraste do slider trava)
function Slider({ label, val, min, max, step, on, fmt }) {
  return (
    <label className="mf-slider">
      <span>{label} <b>{fmt ? fmt(val) : val}</b></span>
      <input type="range" min={min} max={max} step={step} value={val} onChange={(e) => on(parseFloat(e.target.value))} />
    </label>
  )
}

export default function MelhorarFotos() {
  const [fotos, setFotos] = useState([])
  const [atual, setAtual] = useState(-1)
  const [grade, setGrade] = useState(true)
  const [verOriginal, setVerOriginal] = useState(false)
  const [baixando, setBaixando] = useState('')
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [formato, setFormato] = useState('jpeg')
  const [durSeg, setDurSeg] = useState(3)
  const [videoFmt, setVideoFmt] = useState('vertical')
  const [video, setVideo] = useState(null) // {fase:'gravando'|'pronto'|'erro', pct, msg}
  const [wm, setWm] = useState({ on: false, texto: 'Vinícius Graton', pos: 'inf-dir', tam: 4, opac: 0.85, modo: 'texto', logoUrl: '' })
  const [trilha, setTrilha] = useState(null)
  const [ia, setIa] = useState(null) // {fase, msg}
  const [aba, setAba] = useState('ajustes')
  const previewRef = useRef(null)
  const wmLogoRef = useRef(null)
  const fotosRef = useRef(fotos); fotosRef.current = fotos

  const subir = (e) => {
    const arr = [...(e.target.files || [])]; e.target.value = ''
    arr.forEach((file) => {
      if (!/^image\//.test(file.type)) return
      const fr = new FileReader()
      fr.onload = () => {
        const img = new Image()
        img.onload = () => {
          const ang = (() => { try { return estimarAngulo(img) } catch { return 0 } })()
          setFotos((fs) => {
            const nv = [...fs, { name: file.name, img, s: { ...PADRAO, angle: ang } }]
            return nv
          })
          setAtual((a) => (a < 0 ? 0 : a))
        }
        img.src = fr.result
      }
      fr.readAsDataURL(file)
    })
  }

  const foto = atual >= 0 ? fotos[atual] : null
  const setS = (patch) => setFotos((fs) => fs.map((ft, i) => i === atual ? { ...ft, s: { ...ft.s, ...patch } } : ft))

  // redesenha o preview quando muda a foto/ajustes
  const redesenhar = useCallback(() => {
    const cv = previewRef.current
    if (!cv || !foto) return
    const ctx = cv.getContext('2d')
    if (verOriginal) {
      const esc = Math.min(1, PREVIEW_MAX / Math.max(foto.img.width, foto.img.height))
      const W = Math.round(foto.img.width * esc), H = Math.round(foto.img.height * esc)
      cv.width = W; cv.height = H; ctx.drawImage(foto.img, 0, 0, W, H)
    } else {
      const c = processar(foto.img, foto.s, PREVIEW_MAX)
      if (wm.on) aplicarMarca(c, wm, wmLogoRef.current)
      cv.width = c.width; cv.height = c.height
      ctx.drawImage(c, 0, 0)
    }
  }, [foto, verOriginal, wm])

  useEffect(() => {
    const t = setTimeout(redesenhar, 60)
    return () => clearTimeout(t)
  }, [redesenhar, foto?.s, atual])

  const autoAngulo = () => { if (foto) setS({ angle: (() => { try { return estimarAngulo(foto.img) } catch { return 0 } })() }) }
  const autoAnguloTodas = () => setFotos((fs) => fs.map((ft) => ({ ...ft, s: { ...ft.s, angle: (() => { try { return estimarAngulo(ft.img) } catch { return 0 } })() } })))
  const autoMelhorar = () => { if (foto) setS(autoConfig(foto.img)) }
  const autoMelhorarTodas = () => setFotos((fs) => fs.map((ft) => ({ ...ft, s: { ...ft.s, ...autoConfig(ft.img) } })))

  // ——— Super-resolução com IA (open source, no navegador) ———
  const melhorarIA = async () => {
    if (!foto || ia) return
    setIa({ fase: 'carregando', msg: 'Carregando a IA… (a 1ª vez baixa o modelo, ~alguns MB)' })
    try {
      const tf = await import('@huggingface/transformers')
      const { pipeline, env } = tf
      env.allowLocalModels = false
      env.useBrowserCache = true
      let up
      try { up = await pipeline('image-to-image', 'Xenova/swin2SR-classical-sr-x2-64', { device: 'webgpu' }) }
      catch { up = await pipeline('image-to-image', 'Xenova/swin2SR-classical-sr-x2-64') }
      setIa({ fase: 'processando', msg: 'Recuperando a foto com IA… pode levar alguns segundos.' })
      // reduz a entrada (o modelo é pesado) — o x2 da IA recompõe o detalhe
      const sc = Math.min(1, 768 / Math.max(foto.img.width, foto.img.height))
      const pre = document.createElement('canvas')
      pre.width = Math.round(foto.img.width * sc); pre.height = Math.round(foto.img.height * sc)
      pre.getContext('2d').drawImage(foto.img, 0, 0, pre.width, pre.height)
      const blob = await canvasParaBlob(pre, 'png')
      const url = URL.createObjectURL(blob)
      const out = await up(url)
      URL.revokeObjectURL(url)
      const canvas = out.toCanvas ? out.toCanvas() : (() => { const cc = document.createElement('canvas'); cc.width = out.width; cc.height = out.height; cc.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(out.data.length === out.width * out.height * 4 ? out.data : out.rgba().data), out.width, out.height), 0, 0); return cc })()
      const novo = await carregarImagem(canvas.toDataURL('image/jpeg', 0.95))
      setFotos((fs) => fs.map((ft, i) => i === atual ? { ...ft, img: novo, s: { ...ft.s, escala: 1 } } : ft))
      setIa({ fase: 'pronto', msg: '✓ Foto recuperada com IA! Agora ela está maior e mais nítida.' })
      setTimeout(() => setIa(null), 3000)
    } catch (e) {
      setIa({ fase: 'erro', msg: 'A IA não rodou neste navegador (' + (e.message || e) + '). Use a ampliação 2× normal — também melhora bastante.' })
    }
  }

  // gera um vídeo (slideshow) das fotos: transição suave + marca d'água Vinícius Graton
  const gerarVideo = async () => {
    if (!fotos.length || video) return
    if (!window.MediaRecorder) { setVideo({ fase: 'erro', msg: 'Seu navegador não permite gerar vídeo aqui. Use o Chrome.' }); return }
    setVideo({ fase: 'gravando', pct: 0 })
    try {
      const DIMS = { vertical: [1080, 1920], quadrado: [1080, 1080], horizontal: [1920, 1080] }
      const [W, H] = DIMS[videoFmt] || DIMS.vertical
      const FPS = 30
      const slideMs = durSeg * 1000, fadeMs = Math.min(1200, slideMs * 0.5)
      const n = fotos.length
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H
      const ctx = cv.getContext('2d')
      const slides = new Array(n).fill(null)
      const getSlide = (i) => {
        if (i < 0 || i >= n) return null
        if (!slides[i]) slides[i] = montarSlide(processar(fotos[i].img, fotos[i].s, 1280), W, H)
        return slides[i]
      }
      // prefer webm when audio is present (broader audio codec support)
      const mime = trilha
        ? (['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm')
        : (['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm')
      const stream = cv.captureStream(FPS)
      let finalStream = stream
      let audioCtx = null, audioSrc = null
      if (trilha) {
        try {
          const arrBuf = await trilha.arrayBuffer()
          audioCtx = new AudioContext()
          const audioBuf = await audioCtx.decodeAudioData(arrBuf)
          const dest = audioCtx.createMediaStreamDestination()
          audioSrc = audioCtx.createBufferSource()
          audioSrc.buffer = audioBuf
          audioSrc.loop = true
          audioSrc.connect(dest)
          audioSrc.start(0)
          const audioTrack = dest.stream.getAudioTracks()[0]
          if (audioTrack) finalStream = new MediaStream([...stream.getTracks(), audioTrack])
        } catch { /* fallback: vídeo sem áudio */ }
      }
      const rec = new MediaRecorder(finalStream, { mimeType: mime, videoBitsPerSecond: 8000000 })
      const chunks = []
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data) }
      const parou = new Promise((res) => { rec.onstop = res })
      getSlide(0); getSlide(1)
      rec.start(100)
      const total = n * slideMs
      const t0 = performance.now()
      let idxAtual = -1
      await new Promise((resolve) => {
        const frame = (now) => {
          const t = now - t0
          if (t >= total) { resolve(); return }
          const idx = Math.min(n - 1, Math.floor(t / slideMs))
          if (idx !== idxAtual) { idxAtual = idx; getSlide(idx); getSlide(idx + 1); if (idx - 1 >= 0) slides[idx - 1] = null }
          const localT = t - idx * slideMs
          ctx.fillStyle = '#0a0e16'; ctx.fillRect(0, 0, W, H)
          const a0 = getSlide(idx); if (a0) ctx.drawImage(a0, 0, 0)
          if (idx < n - 1 && localT > slideMs - fadeMs) {
            const t01 = (localT - (slideMs - fadeMs)) / fadeMs
            const a = t01 * t01 * (3 - 2 * t01) // easing suave (smoothstep) — dissolve esmaecendo
            const a1 = getSlide(idx + 1)
            if (a1) { ctx.globalAlpha = a; ctx.drawImage(a1, 0, 0); ctx.globalAlpha = 1 }
          }
          // mesma marca d'água das fotos (texto/posição/tamanho/opacidade), constante no vídeo
          if (wm.on) aplicarMarca(cv, wm, wmLogoRef.current)
          setVideo({ fase: 'gravando', pct: Math.round((t / total) * 100) })
          requestAnimationFrame(frame)
        }
        requestAnimationFrame(frame)
      })
      rec.stop(); await parou
      if (audioSrc) { try { audioSrc.stop() } catch {} }
      if (audioCtx) { try { audioCtx.close() } catch {} }
      const blob = new Blob(chunks, { type: mime })
      const ext = mime.includes('mp4') ? 'mp4' : 'webm'
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `apresentacao-imoveis.${ext}`
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(a.href), 6000)
      setVideo({ fase: 'pronto', pct: 100 })
      setTimeout(() => setVideo(null), 2600)
    } catch (e) {
      setVideo({ fase: 'erro', msg: e.message || String(e) })
    }
  }
  const restaurar = () => setS({ ...PADRAO, angle: foto ? foto.s.angle : 0 })
  const aplicarTodas = () => { if (foto) { const r = foto.s; setFotos((fs) => fs.map((ft) => ({ ...ft, s: { ...ft.s, brilho: r.brilho, contraste: r.contraste, satur: r.satur, nitidez: r.nitidez, suave: r.suave, realces: r.realces, sombras: r.sombras, vibrar: r.vibrar, temp: r.temp, vinheta: r.vinheta, wb: r.wb, escala: r.escala } }))) } }
  const remover = (i) => { setFotos((fs) => fs.filter((_, k) => k !== i)); setAtual((a) => (a >= fotos.length - 1 ? fotos.length - 2 : a)) }

  const baixarCanvas = async (canvas, nome) => {
    if (wm.on) aplicarMarca(canvas, wm, wmLogoRef.current)
    const blob = await canvasParaBlob(canvas, formato)
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${nome}.${EXT[formato]}`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  }
  const baixarUma = async () => {
    if (!foto) return
    setBaixando('uma')
    const base = nomeArquivo.trim()
    const nome = base ? `${base}-01` : `${baseNome(foto.name)}-melhorada`
    await baixarCanvas(exportarCanvas(foto.img, foto.s), nome)
    setBaixando('')
  }
  // baixa TODAS individualmente (em lote, sem compactar) — uma a uma, no formato escolhido
  const baixarTodas = async () => {
    if (!fotos.length) return
    setBaixando('todas')
    const base = nomeArquivo.trim()
    for (let i = 0; i < fotos.length; i++) {
      const ft = fotos[i]
      const num = String(i + 1).padStart(2, '0')
      const nome = base ? `${base}-${num}` : `${num}-${baseNome(ft.name)}-melhorada`
      await baixarCanvas(exportarCanvas(ft.img, ft.s), nome)
      await esperar(300) // intervalo curto pro navegador aceitar todos os downloads
    }
    setBaixando('')
  }

  return (
    <div className="mf">
      <div className="mf-intro">
        <h3>✨ Corrigir e embelezar fotos</h3>
        <p className="section-sub" style={{ margin: '6px 0 0' }}>
          Suba as fotos (em lote). Eu corrijo a inclinação automaticamente, realço nitidez, cor e luz, e você baixa tudo pronto. Funciona no seu navegador — nada sai do computador até você baixar.
        </p>
      </div>

      <label className="mf-upload">
        <input type="file" accept="image/*" multiple onChange={subir} hidden />
        <span>📤 Selecionar fotos</span>
      </label>

      {foto && (
        <div className="mf-editor">
          <div className="mf-edit">
            {/* COLUNA ESQUERDA: preview + filmstrip */}
            <div className="mf-preview">
              <div className="mf-canvas-wrap">
                <canvas ref={previewRef} className="mf-canvas" />
                {grade && !verOriginal && (
                  <div className="mf-grade" aria-hidden="true"><span /><span /><span /><span /></div>
                )}
              </div>
              <div className="mf-preview-acoes">
                <button className="admin-btn" onMouseDown={() => setVerOriginal(true)} onMouseUp={() => setVerOriginal(false)} onMouseLeave={() => setVerOriginal(false)} onTouchStart={() => setVerOriginal(true)} onTouchEnd={() => setVerOriginal(false)}>
                  👁 Segurar p/ ver original
                </button>
                <label className="mf-check"><input type="checkbox" checked={grade} onChange={(e) => setGrade(e.target.checked)} /> Grade de nível</label>
              </div>
              <div className="mf-tiras">
                {fotos.map((ft, i) => (
                  <button key={i} className={`mf-tira ${i === atual ? 'on' : ''}`} onClick={() => setAtual(i)} title={ft.name}>
                    <img src={ft.img.src} alt={ft.name} />
                    <span className="mf-tira-x" onClick={(e) => { e.stopPropagation(); remover(i) }}>×</span>
                  </button>
                ))}
              </div>
            </div>

            {/* COLUNA DIREITA: painel em abas */}
            <div className="mf-painel">
              <div className="mf-abas">
                {[['ajustes', '🪄 Ajustes'], ['ia', '🤖 IA'], ['marca', "💧 Marca"], ['export', '📤 Exportar'], ['video', '🎬 Vídeo']].map(([id, nome]) => (
                  <button key={id} className={`mf-aba ${aba === id ? 'on' : ''}`} onClick={() => setAba(id)}>{nome}</button>
                ))}
              </div>

              <div className="mf-aba-conteudo">
                {aba === 'ajustes' && (
                  <>
                    <div className="mf-grupo mf-grupo--ia">
                      <div className="mf-grupo-tit">🪄 Melhoria automática</div>
                      <p className="mf-nota" style={{ marginTop: 0 }}>Analiso a foto e aplico luz, contraste, cor, nitidez, suavização e endireitamento ideais pra ela.</p>
                      <button className="btn btn-gold" onClick={autoMelhorarTodas}>🪄 Auto-melhorar tudo</button>
                    </div>
                    <div className="mf-grupo">
                      <div className="mf-grupo-tit">Filtros (clique pra ver na hora)</div>
                      <div className="mf-filtros">
                        {FILTROS.map((f) => <button key={f.nome} type="button" className="mf-filtro" onClick={() => setS(f.s)}>{f.nome}</button>)}
                      </div>
                    </div>
                    <div className="mf-grupo">
                      <div className="mf-grupo-tit">Inclinação</div>
                      <Slider label="Ângulo" val={foto.s.angle} min={-15} max={15} step={0.1} on={(v) => setS({ angle: v })} fmt={(v) => `${v.toFixed(1)}°`} />
                      <div className="mf-botoes">
                        <button className="admin-btn admin-btn--mini" onClick={autoAngulo}>🎯 Auto-endireitar</button>
                        <button className="admin-btn admin-btn--mini" onClick={autoAnguloTodas}>🎯 Endireitar TODAS</button>
                      </div>
                    </div>
                    <div className="mf-grupo">
                      <div className="mf-grupo-tit">Ajuste fino</div>
                      <Slider label="Brilho" val={foto.s.brilho} min={0.8} max={1.3} step={0.01} on={(v) => setS({ brilho: v })} fmt={(v) => `${Math.round(v * 100)}%`} />
                      <Slider label="Contraste" val={foto.s.contraste} min={0.8} max={1.4} step={0.01} on={(v) => setS({ contraste: v })} fmt={(v) => `${Math.round(v * 100)}%`} />
                      <Slider label="Cor (saturação)" val={foto.s.satur} min={0.8} max={1.5} step={0.01} on={(v) => setS({ satur: v })} fmt={(v) => `${Math.round(v * 100)}%`} />
                      <Slider label="Nitidez" val={foto.s.nitidez} min={0} max={1.4} step={0.05} on={(v) => setS({ nitidez: v })} fmt={(v) => v.toFixed(2)} />
                      <Slider label="Suavizar (reduz ruído)" val={foto.s.suave} min={0} max={1} step={0.05} on={(v) => setS({ suave: v })} fmt={(v) => v === 0 ? 'não' : Math.round(v * 100) + '%'} />
                      <Slider label="Realces (recupera claros)" val={foto.s.realces} min={0} max={0.6} step={0.05} on={(v) => setS({ realces: v })} fmt={(v) => v === 0 ? 'não' : Math.round(v * 100) + '%'} />
                      <Slider label="Sombras (levanta escuros)" val={foto.s.sombras} min={0} max={0.6} step={0.05} on={(v) => setS({ sombras: v })} fmt={(v) => v === 0 ? 'não' : Math.round(v * 100) + '%'} />
                      <Slider label="Vibração" val={foto.s.vibrar} min={0} max={0.6} step={0.05} on={(v) => setS({ vibrar: v })} fmt={(v) => v === 0 ? 'não' : Math.round(v * 100) + '%'} />
                      <Slider label="Temperatura" val={foto.s.temp} min={-0.3} max={0.3} step={0.02} on={(v) => setS({ temp: v })} fmt={(v) => v === 0 ? 'neutro' : v > 0 ? 'quente' : 'fria'} />
                      <Slider label="Vinheta" val={foto.s.vinheta} min={0} max={0.6} step={0.05} on={(v) => setS({ vinheta: v })} fmt={(v) => v === 0 ? 'não' : Math.round(v * 100) + '%'} />
                      <label className="mf-check"><input type="checkbox" checked={foto.s.wb} onChange={(e) => setS({ wb: e.target.checked })} /> Balanço de branco automático</label>
                      <div className="mf-botoes" style={{ marginTop: 8 }}>
                        <button className="admin-btn admin-btn--mini" onClick={restaurar}>↺ Padrão</button>
                        <button className="admin-btn admin-btn--mini" onClick={aplicarTodas}>✓ Aplicar a TODAS</button>
                      </div>
                    </div>
                  </>
                )}

                {aba === 'ia' && (
                  <div className="mf-grupo mf-grupo--ia">
                    <div className="mf-grupo-tit">🤖 Super-resolução com IA <span className="mf-beta">Beta</span></div>
                    <p className="mf-nota" style={{ marginTop: 0 }}>Pra fotos de baixa resolução. Uma IA open-source recompõe o detalhe (não é só ampliar). Roda no seu navegador — a 1ª vez baixa o modelo.</p>
                    <button className="btn btn-gold" onClick={melhorarIA} disabled={!!ia}>
                      {ia ? (ia.fase === 'carregando' ? 'Carregando IA…' : ia.fase === 'processando' ? 'Recuperando foto…' : ia.fase === 'pronto' ? '✓ Pronto!' : 'Tentar de novo') : '✨ Melhorar esta foto com IA'}
                    </button>
                    {ia?.msg && <p className={`mf-nota ${ia.fase === 'erro' ? 'mf-erro' : ''}`}>{ia.msg}</p>}
                  </div>
                )}

                {aba === 'marca' && (
                  <div className="mf-grupo">
                    <div className="mf-grupo-tit">💧 Marca d'água</div>
                    <label className="mf-check"><input type="checkbox" checked={wm.on} onChange={(e) => setWm({ ...wm, on: e.target.checked })} /> Inserir marca d'água nas fotos</label>
                    {wm.on && (
                      <>
                        <div className="mf-campo">
                          <span>Modo</span>
                          <div className="mf-modo-sel">
                            {[['texto','Só texto'],['logo','Só logomarca'],['ambos','Texto + logo']].map(([val,label]) => (
                              <button key={val} type="button" className={`mf-modo-btn${wm.modo === val ? ' on' : ''}`} onClick={() => setWm({ ...wm, modo: val })}>{label}</button>
                            ))}
                          </div>
                        </div>
                        {(wm.modo === 'texto' || wm.modo === 'ambos') && (
                          <label className="mf-campo"><span>Texto</span>
                            <input type="text" value={wm.texto} onChange={(e) => setWm({ ...wm, texto: e.target.value })} placeholder="Ex.: Vinícius Graton" />
                          </label>
                        )}
                        {(wm.modo === 'logo' || wm.modo === 'ambos') && (
                          <div>
                            <label className="mf-check" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Logomarca (PNG com fundo transparente)</span>
                              <input type="file" accept="image/png,image/svg+xml,image/webp" onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                const url = URL.createObjectURL(file)
                                const img = new Image()
                                img.onload = () => { wmLogoRef.current = img; setWm(w => ({ ...w, logoUrl: url })) }
                                img.src = url
                              }} />
                            </label>
                            {wm.logoUrl && <img src={wm.logoUrl} alt="logo" style={{ height: 40, marginTop: 6, borderRadius: 4, background: 'rgba(255,255,255,0.08)', padding: '4px 8px' }} />}
                          </div>
                        )}
                        <label className="mf-sel"><span>Posição</span>
                          <select value={wm.pos} onChange={(e) => setWm({ ...wm, pos: e.target.value })}>
                            <option value="inf-dir">Inferior direita</option>
                            <option value="inf-esq">Inferior esquerda</option>
                            <option value="inf-centro">Inferior centro</option>
                            <option value="sup-dir">Superior direita</option>
                            <option value="sup-esq">Superior esquerda</option>
                            <option value="centro">Centro</option>
                          </select>
                        </label>
                        <Slider label="Tamanho" val={wm.tam} min={2} max={9} step={0.5} on={(v) => setWm({ ...wm, tam: v })} fmt={(v) => v.toFixed(1)} />
                        <Slider label="Opacidade" val={wm.opac} min={0.2} max={1} step={0.05} on={(v) => setWm({ ...wm, opac: v })} fmt={(v) => Math.round(v * 100) + '%'} />
                        <p className="mf-nota">Aparece nas fotos baixadas e no vídeo. Vale pra todas.</p>
                      </>
                    )}
                  </div>
                )}

                {aba === 'export' && (
                  <div className="mf-grupo">
                    <div className="mf-grupo-tit">📤 Exportação</div>
                    <div className="mf-campo">
                      <span>Formato</span>
                      <div className="mf-modo-sel">
                        {[['jpeg','JPG'],['png','PNG'],['webp','WebP']].map(([val,label]) => (
                          <button key={val} type="button" className={`mf-modo-btn${formato === val ? ' on' : ''}`} onClick={() => setFormato(val)}>{label}</button>
                        ))}
                      </div>
                    </div>
                    <div className="mf-campo">
                      <span>Ampliar</span>
                      <div className="mf-modo-sel">
                        {[[1,'Original'],[1.5,'1,5×'],[2,'2× UHD']].map(([val,label]) => (
                          <button key={val} type="button" className={`mf-modo-btn${foto.s.escala === val ? ' on' : ''}`} onClick={() => setS({ escala: val })}>{label}</button>
                        ))}
                      </div>
                    </div>
                    <p className="mf-nota">Ampliação reamostra em alta qualidade + nitidez. Pra recuperar foto ruim de verdade, use a aba IA. O formato e a ampliação valem pra todos os downloads.</p>
                  </div>
                )}

                {aba === 'video' && (
                  <div className="mf-grupo">
                    <div className="mf-grupo-tit">🎬 Vídeo de apresentação</div>
                    <div className="mf-campo">
                      <span>Formato do vídeo</span>
                      <div className="mf-modo-sel">
                        {[['vertical','9:16 Vertical'],['quadrado','1:1 Quadrado'],['horizontal','16:9 Horizontal']].map(([val,label]) => (
                          <button key={val} type="button" className={`mf-modo-btn${videoFmt === val ? ' on' : ''}`} onClick={() => !video && setVideoFmt(val)} disabled={!!video}>{label}</button>
                        ))}
                      </div>
                    </div>
                    <div className="mf-campo">
                      <span>Tempo por foto</span>
                      <div className="mf-modo-sel">
                        {[[2,'2 seg'],[3,'3 seg'],[4,'4 seg']].map(([val,label]) => (
                          <button key={val} type="button" className={`mf-modo-btn${durSeg === val ? ' on' : ''}`} onClick={() => !video && setDurSeg(val)} disabled={!!video}>{label}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>🎵 Trilha sonora <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional — use uma trilha livre de direitos)</span></div>
                      <input type="file" accept="audio/*" disabled={!!video} onChange={(e) => { const f = e.target.files?.[0]; setTrilha(f || null) }} style={{ fontSize: '0.85rem' }} />
                      {trilha && <p className="mf-nota" style={{ marginTop: 4 }}>✓ {trilha.name} — será mixada no vídeo (saída em WebM para compatibilidade com áudio).</p>}
                      {trilha && <button type="button" className="admin-btn admin-btn--mini" style={{ marginTop: 4 }} onClick={() => setTrilha(null)}>✕ Remover trilha</button>}
                    </div>
                    <button className="btn btn-gold" onClick={gerarVideo} disabled={!!video}>
                      {video ? (video.fase === 'gravando' ? `Montando seu vídeo… ${video.pct}%` : video.fase === 'pronto' ? '✓ Vídeo pronto!' : 'Tentar de novo') : '🎬 Baixar como vídeo'}
                    </button>
                    {video?.fase === 'gravando' && (
                      <div className="mf-prog-wrap">
                        <div className="mf-prog-top"><span className="mf-prog-emoji">🎬</span> {msgVideo(video.pct)} <b>{video.pct}%</b></div>
                        <div className="mf-prog">
                          <div className="mf-prog-bar" style={{ width: Math.max(4, video.pct || 0) + '%' }} />
                          <span className="mf-prog-rider" style={{ left: Math.max(4, video.pct || 0) + '%' }}>🏠</span>
                        </div>
                      </div>
                    )}
                    <p className="mf-nota">Slideshow com transição bem suave (dissolve esmaecendo). Usa a <b>mesma marca d'água</b> ({wm.on ? `modo ${wm.modo}` : 'ative na aba 💧 Marca'}) e o realce de cada foto. Gera em tempo real (~{Math.round(fotos.length * durSeg)}s). {trilha ? 'Com trilha sonora — sai em WebM.' : 'Sai em MP4 (ou WebM, conforme o navegador).'}</p>
                    {video?.fase === 'erro' && <p className="lead-erro">{video.msg}</p>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* BARRA DE AÇÕES FIXA */}
          <div className="mf-acoes-bar">
            <span className="mf-acoes-info">{fotos.length} foto(s)</span>
            <input
              className="mf-nome-arq"
              type="text"
              value={nomeArquivo}
              onChange={(e) => setNomeArquivo(e.target.value)}
              placeholder="Nome dos arquivos (ex: sala-202)"
            />
            <button className="admin-btn" onClick={baixarUma} disabled={baixando}>{baixando === 'uma' ? 'Gerando…' : '⬇ Baixar esta'}</button>
            <button className="btn btn-gold" onClick={baixarTodas} disabled={baixando}>{baixando === 'todas' ? 'Baixando…' : `⬇ Baixar todas (${fotos.length})`}</button>
          </div>
        </div>
      )}
    </div>
  )
}
