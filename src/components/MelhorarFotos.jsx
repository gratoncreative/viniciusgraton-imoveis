import { useEffect, useRef, useState, useCallback } from 'react'

// Ferramenta (área restrita): corrige inclinação + realça fotos em lote, 100% no
// navegador. Estima o ângulo automaticamente, deixa ajustar com grade de nível,
// realça nitidez/cor/contraste/brilho/balanço de branco e exporta (opcional 2x).

const PREVIEW_MAX = 900   // resolução do preview (rápido)
const EXPORT_MAX = 2560   // teto da resolução base na exportação

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const PADRAO = { angle: 0, brilho: 1.05, contraste: 1.09, satur: 1.12, nitidez: 0.6, wb: true, escala: 1 }

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
function processar(img, s, maxLado) {
  const esc = Math.min(1, maxLado / Math.max(img.width, img.height))
  const W = Math.max(1, Math.round(img.width * esc)), H = Math.max(1, Math.round(img.height * esc))
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const ctx = c.getContext('2d')
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'
  ctx.filter = `brightness(${s.brilho}) contrast(${s.contraste}) saturate(${s.satur})`
  const a = (s.angle || 0) * Math.PI / 180
  const z = Math.cos(Math.abs(a)) + Math.sin(Math.abs(a)) * Math.max(W / H, H / W)
  ctx.translate(W / 2, H / 2); ctx.rotate(a); ctx.scale(z, z)
  ctx.drawImage(img, -W / 2, -H / 2, W, H)
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = 'none'
  const dados = ctx.getImageData(0, 0, W, H)
  if (s.wb) balancoBranco(dados)
  if (s.nitidez > 0) nitidezUnsharp(dados, s.nitidez)
  ctx.putImageData(dados, 0, 0)
  return c
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
const MIME = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
const EXT = { jpeg: 'jpg', png: 'png', webp: 'webp' }
const canvasParaBlob = (canvas, fmt) => new Promise((res) => canvas.toBlob((b) => res(b), MIME[fmt] || 'image/jpeg', fmt === 'png' ? undefined : 0.92))
const baseNome = (n) => n.replace(/\.[^.]+$/, '')
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

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
  const [formato, setFormato] = useState('jpeg')
  const previewRef = useRef(null)
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
      cv.width = c.width; cv.height = c.height
      ctx.drawImage(c, 0, 0)
    }
  }, [foto, verOriginal])

  useEffect(() => {
    const t = setTimeout(redesenhar, 60)
    return () => clearTimeout(t)
  }, [redesenhar, foto?.s, atual])

  const autoAngulo = () => { if (foto) setS({ angle: (() => { try { return estimarAngulo(foto.img) } catch { return 0 } })() }) }
  const restaurar = () => setS({ ...PADRAO, angle: foto ? foto.s.angle : 0 })
  const aplicarTodas = () => { if (foto) setFotos((fs) => fs.map((ft) => ({ ...ft, s: { ...ft.s, brilho: foto.s.brilho, contraste: foto.s.contraste, satur: foto.s.satur, nitidez: foto.s.nitidez, wb: foto.s.wb, escala: foto.s.escala } }))) }
  const remover = (i) => { setFotos((fs) => fs.filter((_, k) => k !== i)); setAtual((a) => (a >= fotos.length - 1 ? fotos.length - 2 : a)) }

  const baixarCanvas = async (canvas, nome) => {
    const blob = await canvasParaBlob(canvas, formato)
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${nome}.${EXT[formato]}`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  }
  const baixarUma = async () => {
    if (!foto) return
    setBaixando('uma')
    await baixarCanvas(exportarCanvas(foto.img, foto.s), `${baseNome(foto.name)}-melhorada`)
    setBaixando('')
  }
  // baixa TODAS individualmente (em lote, sem compactar) — uma a uma, no formato escolhido
  const baixarTodas = async () => {
    if (!fotos.length) return
    setBaixando('todas')
    for (let i = 0; i < fotos.length; i++) {
      const ft = fotos[i]
      await baixarCanvas(exportarCanvas(ft.img, ft.s), `${String(i + 1).padStart(2, '0')}-${baseNome(ft.name)}-melhorada`)
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

      {fotos.length > 0 && (
        <>
          <div className="mf-tiras">
            {fotos.map((ft, i) => (
              <button key={i} className={`mf-tira ${i === atual ? 'on' : ''}`} onClick={() => setAtual(i)} title={ft.name}>
                <img src={ft.img.src} alt={ft.name} />
                <span className="mf-tira-x" onClick={(e) => { e.stopPropagation(); remover(i) }}>×</span>
              </button>
            ))}
          </div>

          {foto && (
            <div className="mf-edit">
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
              </div>

              <div className="mf-controles">
                <div className="mf-grupo">
                  <div className="mf-grupo-tit">Inclinação</div>
                  <Slider label="Ângulo" val={foto.s.angle} min={-15} max={15} step={0.1} on={(v) => setS({ angle: v })} fmt={(v) => `${v.toFixed(1)}°`} />
                  <button className="admin-btn admin-btn--mini" onClick={autoAngulo}>🎯 Auto-endireitar</button>
                </div>

                <div className="mf-grupo">
                  <div className="mf-grupo-tit">Realce</div>
                  <Slider label="Brilho" val={foto.s.brilho} min={0.8} max={1.3} step={0.01} on={(v) => setS({ brilho: v })} fmt={(v) => `${Math.round(v * 100)}%`} />
                  <Slider label="Contraste" val={foto.s.contraste} min={0.8} max={1.4} step={0.01} on={(v) => setS({ contraste: v })} fmt={(v) => `${Math.round(v * 100)}%`} />
                  <Slider label="Cor (saturação)" val={foto.s.satur} min={0.8} max={1.5} step={0.01} on={(v) => setS({ satur: v })} fmt={(v) => `${Math.round(v * 100)}%`} />
                  <Slider label="Nitidez" val={foto.s.nitidez} min={0} max={1.4} step={0.05} on={(v) => setS({ nitidez: v })} fmt={(v) => v.toFixed(2)} />
                  <label className="mf-check"><input type="checkbox" checked={foto.s.wb} onChange={(e) => setS({ wb: e.target.checked })} /> Balanço de branco automático</label>
                </div>

                <div className="mf-grupo">
                  <div className="mf-grupo-tit">Exportação</div>
                  <label className="mf-sel"><span>Formato</span>
                    <select value={formato} onChange={(e) => setFormato(e.target.value)}>
                      <option value="jpeg">JPG — menor, ideal pra anúncio</option>
                      <option value="png">PNG — sem perda, arquivo maior</option>
                      <option value="webp">WebP — moderno e leve</option>
                    </select>
                  </label>
                  <label className="mf-sel"><span>Ampliar</span>
                    <select value={foto.s.escala} onChange={(e) => setS({ escala: parseFloat(e.target.value) })}>
                      <option value={1}>Original (nítida)</option>
                      <option value={1.5}>1,5× maior</option>
                      <option value={2}>2× maior (UHD)</option>
                    </select>
                  </label>
                  <p className="mf-nota">Ampliação reamostra em alta qualidade + nitidez — fica maior e mais nítida (não é super-resolução por IA). O formato e a ampliação valem pra todos os downloads.</p>
                </div>

                <div className="mf-botoes">
                  <button className="admin-btn" onClick={restaurar}>↺ Padrão</button>
                  <button className="admin-btn" onClick={aplicarTodas}>Aplicar realce a todas</button>
                  <button className="btn btn-gold" onClick={baixarUma} disabled={baixando}>{baixando === 'uma' ? 'Gerando…' : '⬇ Baixar esta'}</button>
                  <button className="btn btn-gold" onClick={baixarTodas} disabled={baixando}>{baixando === 'todas' ? 'Baixando…' : `⬇ Baixar todas (${fotos.length})`}</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
