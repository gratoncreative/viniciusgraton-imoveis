import { useEffect, useRef, useState } from 'react'

// Remoção de marca d'água 100% no navegador (privado, na área restrita).
// IA: MI-GAN (ONNX) via onnxruntime-web. O modelo é servido por /api/modelo-marca.
// Entrada do modelo: image [1,3,H,W] uint8 (RGB) + mask [1,1,H,W] uint8 (255=manter, 0=remover).

const WASM_CDN = '/ort/' // servido pelo nosso domínio (functions/ort) — same-origin, CSP 'self'
const MAX_LADO = 2048 // limita o lado maior p/ memória/velocidade (a IA recorta na máscara mesmo assim)

export default function RemoverMarca() {
  const [ort, setOrt] = useState(null)
  const [sessao, setSessao] = useState(null)
  const [estado, setEstado] = useState('carregando') // carregando | pronto | erro
  const [fotos, setFotos] = useState([])
  const [atual, setAtual] = useState(-1)
  const [brush, setBrush] = useState(34)
  const [proc, setProc] = useState(false)
  const [msg, setMsg] = useState('')

  const imgC = useRef(null)
  const paintC = useRef(null)
  const escala = useRef(1)
  const pintando = useRef(false)
  const fotosRef = useRef(fotos)
  fotosRef.current = fotos

  // Carrega o motor de IA + o modelo (1x; o modelo fica em cache no navegador)
  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const ortMod = await import('onnxruntime-web')
        ortMod.env.wasm.wasmPaths = WASM_CDN
        ortMod.env.wasm.numThreads = 1 // single-thread: sem worker/SharedArrayBuffer (não exige COOP/COEP)
        const s = await ortMod.InferenceSession.create('/api/modelo-marca', { executionProviders: ['wasm'] })
        if (!vivo) return
        setOrt(ortMod); setSessao(s); setEstado('pronto')
      } catch (e) {
        if (vivo) { setEstado('erro'); setMsg('Não consegui carregar a IA: ' + (e.message || e)) }
      }
    })()
    return () => { vivo = false }
  }, [])

  const subir = (e) => {
    const arr = [...(e.target.files || [])]
    e.target.value = ''
    arr.forEach((f) => {
      if (!/^image\//.test(f.type)) return
      const fr = new FileReader()
      fr.onload = () => {
        const img = new Image()
        img.onload = () => {
          setFotos((fs) => {
            const nv = [...fs, { name: f.name, img, strokes: [], done: false, clean: null }]
            if (atual < 0) setTimeout(() => abrir(nv.length - 1), 0)
            return nv
          })
        }
        img.src = fr.result
      }
      fr.readAsDataURL(f)
    })
  }

  const abrir = (i) => {
    const ft = fotosRef.current[i]; if (!ft) return
    setAtual(i); setMsg('')
    const maxW = Math.min(900, (paintC.current?.parentElement?.clientWidth || 800) - 8)
    escala.current = Math.min(1, maxW / ft.img.naturalWidth)
    const w = Math.round(ft.img.naturalWidth * escala.current)
    const h = Math.round(ft.img.naturalHeight * escala.current)
    for (const c of [imgC.current, paintC.current]) { c.width = w; c.height = h }
    imgC.current.getContext('2d').drawImage(ft.img, 0, 0, w, h)
    desenharOverlay(ft)
  }

  const desenharOverlay = (ft) => {
    const ctx = paintC.current.getContext('2d')
    ctx.clearRect(0, 0, paintC.current.width, paintC.current.height)
    ctx.fillStyle = 'rgba(216,80,60,0.45)'
    ft.strokes.forEach((s) => { ctx.beginPath(); ctx.arc(s.x * escala.current, s.y * escala.current, s.r * escala.current, 0, 7); ctx.fill() })
  }

  const pintar = (e) => {
    if (!pintando.current || atual < 0) return
    const ft = fotosRef.current[atual]; if (!ft || ft.done) return
    const r = paintC.current.getBoundingClientRect()
    const x = e.clientX - r.left, y = e.clientY - r.top, br = brush
    ft.strokes.push({ x: x / escala.current, y: y / escala.current, r: br / escala.current })
    const ctx = paintC.current.getContext('2d')
    ctx.fillStyle = 'rgba(216,80,60,0.45)'; ctx.beginPath(); ctx.arc(x, y, br, 0, 7); ctx.fill()
  }

  const limpar = () => { if (atual < 0) return; fotosRef.current[atual].strokes = []; desenharOverlay(fotosRef.current[atual]) }

  // monta os tensores e roda a IA
  const remover = async () => {
    if (atual < 0 || !sessao || !ort) return
    const ft = fotosRef.current[atual]
    if (!ft.strokes.length) { setMsg('Pinte sobre a marca primeiro.'); return }
    setProc(true); setMsg('Removendo a marca com IA…')
    try {
      let W = ft.img.naturalWidth, H = ft.img.naturalHeight
      const f = Math.min(1, MAX_LADO / Math.max(W, H))
      W = Math.round(W * f); H = Math.round(H * f)
      // imagem
      const ic = document.createElement('canvas'); ic.width = W; ic.height = H
      ic.getContext('2d').drawImage(ft.img, 0, 0, W, H)
      const px = ic.getContext('2d').getImageData(0, 0, W, H).data
      // máscara: 255 = manter, 0 = remover (onde foi pintado)
      const mc = document.createElement('canvas'); mc.width = W; mc.height = H
      const mx = mc.getContext('2d'); mx.fillStyle = '#000'; mx.fillRect(0, 0, W, H)
      mx.fillStyle = '#fff'; ft.strokes.forEach((s) => { mx.beginPath(); mx.arc(s.x * f, s.y * f, s.r * f, 0, 7); mx.fill() })
      const mpx = mx.getImageData(0, 0, W, H).data
      const N = W * H
      const imgArr = new Uint8Array(3 * N)
      const maskArr = new Uint8Array(N)
      for (let i = 0; i < N; i++) {
        imgArr[i] = px[i * 4]; imgArr[N + i] = px[i * 4 + 1]; imgArr[2 * N + i] = px[i * 4 + 2]
        maskArr[i] = mpx[i * 4] > 127 ? 0 : 255 // pintado(branco)->0(remover); resto->255(manter)
      }
      const saida = await sessao.run({
        image: new ort.Tensor('uint8', imgArr, [1, 3, H, W]),
        mask: new ort.Tensor('uint8', maskArr, [1, 1, H, W]),
      })
      const out = (saida.result || saida[Object.keys(saida)[0]]).data
      const oc = document.createElement('canvas'); oc.width = W; oc.height = H
      const od = oc.getContext('2d').createImageData(W, H)
      for (let i = 0; i < N; i++) {
        od.data[i * 4] = out[i]; od.data[i * 4 + 1] = out[N + i]; od.data[i * 4 + 2] = out[2 * N + i]; od.data[i * 4 + 3] = 255
      }
      oc.getContext('2d').putImageData(od, 0, 0)
      const url = oc.toDataURL('image/jpeg', 0.92)
      setFotos((fs) => fs.map((x, k) => k === atual ? { ...x, done: true, clean: url } : x))
      // mostra o resultado no canvas
      const im = new Image(); im.onload = () => imgC.current.getContext('2d').drawImage(im, 0, 0, imgC.current.width, imgC.current.height); im.src = url
      paintC.current.getContext('2d').clearRect(0, 0, paintC.current.width, paintC.current.height)
      setMsg('✓ Marca removida. Use "Baixar" (ou "Baixar todas") para salvar.')
    } catch (e) {
      setMsg('Falhou nessa foto: ' + (e.message || e))
    }
    setProc(false)
  }

  const baixar = (ft) => {
    if (!ft.clean) return
    const a = document.createElement('a'); a.href = ft.clean
    a.download = (ft.name.replace(/\.[^.]+$/, '') || 'foto') + '-limpa.jpg'
    document.body.appendChild(a); a.click(); a.remove()
  }
  const baixarTodas = () => {
    const prontas = fotos.filter((f) => f.done)
    prontas.forEach((f, i) => setTimeout(() => baixar(f), i * 400))
  }

  const okCount = fotos.filter((f) => f.done).length

  return (
    <section className="marca-tool">
      <div className="det-trust" style={{ marginBottom: 16 }}>
        <p style={{ margin: 0 }}><b>Remoção de marca d'água — só você vê isto.</b> Tudo acontece no seu navegador (as fotos não saem do seu computador). Suba as fotos, pinte por cima da marca e clique em remover. Funciona com a marca em qualquer posição.</p>
      </div>

      {estado === 'carregando' && <p className="section-sub">Carregando a IA (1ª vez baixa ~27 MB, depois fica em cache)…</p>}
      {estado === 'erro' && <p className="anunciar-erro">{msg}</p>}

      {estado === 'pronto' && (
        <div className="marca-grid">
          <aside className="marca-lista">
            <label className="admin-btn admin-btn--upload" style={{ width: '100%', textAlign: 'center' }}>
              + Subir fotos
              <input type="file" accept="image/*" multiple hidden onChange={subir} />
            </label>
            <div className="marca-thumbs">
              {fotos.map((ft, i) => (
                <div key={i} className={`marca-thumb ${i === atual ? 'on' : ''}`} onClick={() => abrir(i)}>
                  <img src={ft.clean || ft.img.src} alt={ft.name} />
                  <span className={`marca-st ${ft.done ? 'ok' : ''}`}>{ft.done ? '✓' : '•'}</span>
                </div>
              ))}
            </div>
            {okCount > 1 && <button className="admin-btn" style={{ width: '100%', marginTop: 10 }} onClick={baixarTodas}>Baixar todas ({okCount})</button>}
          </aside>

          <div className="marca-editor">
            <div className="marca-barra">
              <label>Pincel <input type="range" min="8" max="90" value={brush} onChange={(e) => setBrush(+e.target.value)} /></label>
              <button className="admin-btn" onClick={limpar} disabled={atual < 0}>Limpar seleção</button>
              <span style={{ flex: 1 }} />
              {atual >= 0 && fotos[atual]?.done && <button className="admin-btn" onClick={() => baixar(fotos[atual])}>Baixar esta</button>}
              <button className="btn btn-gold" onClick={remover} disabled={proc || atual < 0 || (fotos[atual] && fotos[atual].done)}>{proc ? 'Removendo…' : 'Remover marca'}</button>
            </div>
            <div className="marca-palco">
              {atual < 0 ? (
                <p className="section-sub" style={{ maxWidth: 460, textAlign: 'center' }}>Clique em <b>+ Subir fotos</b>, escolha quantas quiser, depois clique numa foto e pinte por cima da marca.</p>
              ) : (
                <div className="marca-lienzo">
                  <canvas ref={imgC} />
                  <canvas
                    ref={paintC}
                    onPointerDown={(e) => { pintando.current = true; e.currentTarget.setPointerCapture(e.pointerId); pintar(e) }}
                    onPointerMove={pintar}
                    onPointerUp={() => { pintando.current = false }}
                    onPointerLeave={() => { pintando.current = false }}
                  />
                </div>
              )}
            </div>
            {msg && <p className="calc-nota" style={{ marginTop: 10 }}>{msg}</p>}
          </div>
        </div>
      )}
    </section>
  )
}
