import { useEffect, useRef, useState } from 'react'

// Remoção de marca d'água 100% no navegador (privado, na área restrita).
// IA: MI-GAN (ONNX) via onnxruntime-web. O modelo é servido por /api/modelo-marca.
// Entrada do modelo: image [1,3,H,W] uint8 (RGB) + mask [1,1,H,W] uint8 (255=manter, 0=remover).

// servido pelo nosso domínio (functions/ort) — same-origin (CSP 'self'); absoluto evita ambiguidade de base
const MAX_LADO = 2048 // limita o lado maior p/ memória/velocidade (a IA recorta na máscara mesmo assim)
const MIME = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
const EXT = { jpeg: 'jpg', png: 'png', webp: 'webp' }
const carregarImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src })
async function srcParaBlob(src, fmt) {
  const img = await carregarImg(src)
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight
  c.getContext('2d').drawImage(img, 0, 0)
  return new Promise((res) => c.toBlob((b) => res(b), MIME[fmt] || 'image/jpeg', fmt === 'png' ? undefined : 0.92))
}

// Máscara AUTOMÁTICA da marca da Rotina: o carimbo (logo + texto) fica sempre no canto
// inferior direito das fotos do Imoview. Gera pinceladas em grade cobrindo essa região —
// depois o operador revisa e pode complementar à mão onde sobrar rastro.
function strokesAutoRotina(img) {
  const W = img.naturalWidth, H = img.naturalHeight
  const x0 = W * 0.56, y0 = H * 0.70
  const r = Math.max(12, W * 0.032)
  const passo = r * 1.15
  const strokes = []
  for (let y = y0 + r * 0.5; y <= H - r * 0.2; y += passo)
    for (let x = x0 + r * 0.5; x <= W - r * 0.2; x += passo)
      strokes.push({ x, y, r })
  return strokes
}

// Motor da IA isolado (usado pelo botão manual e pelo LOTE): recebe a imagem + pinceladas
// e devolve o dataURL da foto limpa. Mesma matemática do fluxo original.
async function inferirIA(ortMod, sessao, imgEl, strokes) {
  let W = imgEl.naturalWidth, H = imgEl.naturalHeight
  const f = Math.min(1, MAX_LADO / Math.max(W, H))
  W = Math.round(W * f); H = Math.round(H * f)
  const ic = document.createElement('canvas'); ic.width = W; ic.height = H
  ic.getContext('2d').drawImage(imgEl, 0, 0, W, H)
  const px = ic.getContext('2d').getImageData(0, 0, W, H).data
  const mc = document.createElement('canvas'); mc.width = W; mc.height = H
  const mx = mc.getContext('2d'); mx.fillStyle = '#000'; mx.fillRect(0, 0, W, H)
  mx.fillStyle = '#fff'; strokes.forEach((s) => { mx.beginPath(); mx.arc(s.x * f, s.y * f, s.r * f, 0, 7); mx.fill() })
  const mpx = mx.getImageData(0, 0, W, H).data
  const N = W * H
  const imgArr = new Uint8Array(3 * N)
  const maskArr = new Uint8Array(N)
  for (let i = 0; i < N; i++) {
    imgArr[i] = px[i * 4]; imgArr[N + i] = px[i * 4 + 1]; imgArr[2 * N + i] = px[i * 4 + 2]
    maskArr[i] = mpx[i * 4] > 127 ? 0 : 255
  }
  const saida = await sessao.run({
    image: new ortMod.Tensor('uint8', imgArr, [1, 3, H, W]),
    mask: new ortMod.Tensor('uint8', maskArr, [1, 1, H, W]),
  })
  const out = (saida.result || saida[Object.keys(saida)[0]]).data
  const oc = document.createElement('canvas'); oc.width = W; oc.height = H
  const od = oc.getContext('2d').createImageData(W, H)
  for (let i = 0; i < N; i++) {
    od.data[i * 4] = out[i]; od.data[i * 4 + 1] = out[N + i]; od.data[i * 4 + 2] = out[2 * N + i]; od.data[i * 4 + 3] = 255
  }
  oc.getContext('2d').putImageData(od, 0, 0)
  return oc.toDataURL('image/jpeg', 0.92)
}

// `lote` só é ligado no /admin: puxar TODAS as fotos de um anúncio por código e limpar em
// massa é ferramenta interna do Vinícius — não vai pro /corretor nem pro /ferramentas.
export default function RemoverMarca({ lote = false }) {
  const [ort, setOrt] = useState(null)
  const [sessao, setSessao] = useState(null)
  const [estado, setEstado] = useState('carregando') // carregando | pronto | erro
  const [fotos, setFotos] = useState([])
  const [codLote, setCodLote] = useState('') // código do imóvel no modo lote (admin)
  const [atual, setAtual] = useState(-1)
  const [brush, setBrush] = useState(34)
  const [proc, setProc] = useState(false)
  const [msg, setMsg] = useState('')
  const [zoom, setZoom] = useState(1)
  const [formato, setFormato] = useState('jpeg')

  const imgC = useRef(null)
  const paintC = useRef(null)
  const escala = useRef(1)
  const pintando = useRef(false)
  const dim = useRef({ w: 0, h: 0 })
  const fotosRef = useRef(fotos)
  fotosRef.current = fotos

  // Carrega o motor de IA + o modelo (1x; o modelo fica em cache no navegador)
  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const ortMod = await import('onnxruntime-web')
        ortMod.env.wasm.wasmPaths = window.location.origin + '/ort/' // proxy same-origin (absoluto)
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

  // reaplica o zoom (tamanho exibido) sempre que muda
  useEffect(() => { aplicarZoom(zoom) }, [zoom, atual])

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

  // aplica o zoom só no TAMANHO EXIBIDO (CSS); a resolução interna do canvas não muda
  const aplicarZoom = (z) => {
    const { w, h } = dim.current
    if (!w) return
    for (const c of [imgC.current, paintC.current]) {
      if (!c) continue
      c.style.width = Math.round(w * z) + 'px'
      c.style.height = Math.round(h * z) + 'px'
    }
  }

  const abrir = (i) => {
    const ft = fotosRef.current[i]; if (!ft) return
    setAtual(i); setMsg(''); setZoom(1)
    // preenche a área de edição (usa quase toda a largura disponível)
    const palco = paintC.current?.closest('.marca-palco')
    const maxW = Math.max(360, (palco?.clientWidth || 900) - 36)
    escala.current = Math.min(1, maxW / ft.img.naturalWidth)
    const w = Math.round(ft.img.naturalWidth * escala.current)
    const h = Math.round(ft.img.naturalHeight * escala.current)
    dim.current = { w, h }
    for (const c of [imgC.current, paintC.current]) { c.width = w; c.height = h; c.style.width = w + 'px'; c.style.height = h + 'px' }
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
    const ft = fotosRef.current[atual]; if (!ft) return
    const r = paintC.current.getBoundingClientRect()
    // converte da tela para o pixel interno do canvas (funciona com qualquer zoom)
    const ratio = paintC.current.width / r.width
    const x = (e.clientX - r.left) * ratio
    const y = (e.clientY - r.top) * ratio
    const br = brush // raio em pixels do canvas (base)
    ft.strokes.push({ x: x / escala.current, y: y / escala.current, r: br / escala.current })
    const ctx = paintC.current.getContext('2d')
    ctx.fillStyle = 'rgba(216,80,60,0.45)'; ctx.beginPath(); ctx.arc(x, y, br, 0, 7); ctx.fill()
  }

  const limpar = () => { if (atual < 0) return; fotosRef.current[atual].strokes = []; desenharOverlay(fotosRef.current[atual]) }

  // monta os tensores e roda a IA (motor compartilhado em inferirIA)
  const remover = async () => {
    if (atual < 0 || !sessao || !ort) return
    const ft = fotosRef.current[atual]
    if (!ft.strokes.length) { setMsg('Pinte sobre a marca primeiro (ou use "Marca automática").'); return }
    setProc(true); setMsg('Removendo a marca com IA…')
    try {
      const url = await inferirIA(ort, sessao, ft.img, ft.strokes)
      // o resultado vira a NOVA imagem de trabalho → permite remover mais itens na mesma foto
      const novaImg = new Image()
      novaImg.onload = () => {
        setFotos((fs) => fs.map((x, k) => k === atual ? { ...x, done: true, clean: url, img: novaImg, strokes: [] } : x))
        setTimeout(() => { abrir(atual); setProc(false); setMsg('✓ Item removido. Pode pintar e remover outro item nesta mesma foto, ou ir pra próxima.') }, 0)
      }
      novaImg.onerror = () => { setProc(false); setMsg('Item removido, mas falhei ao recarregar a prévia.') }
      novaImg.src = url
      return
    } catch (e) {
      setMsg('Falhou nessa foto: ' + (e.message || e))
    }
    setProc(false)
  }

  // preenche a seleção da foto ABERTA com a máscara automática da marca da Rotina
  const marcaAuto = () => {
    if (atual < 0) return
    const ft = fotosRef.current[atual]
    ft.strokes = strokesAutoRotina(ft.img)
    desenharOverlay(ft)
    setMsg('Máscara automática aplicada no canto da marca. Ajuste com o pincel se quiser e clique em "Remover marca".')
  }

  // ——— LOTE POR IMÓVEL: puxa TODAS as fotos do código e limpa a marca uma a uma ———
  const carregarLote = async () => {
    const cod = codLote.replace(/\D/g, '')
    if (!cod) { setMsg('Digite o código do imóvel.'); return }
    setProc(true); setMsg(`Buscando as fotos do imóvel ${cod}…`)
    try {
      const r = await fetch(`/api/rotina-imovel?codigo=${cod}&soFotos=1`)
      const j = await r.json()
      const urls = (j && j.imovel && Array.isArray(j.imovel.fotos)) ? j.imovel.fotos : []
      if (!urls.length) { setProc(false); setMsg(j && j.erro ? j.erro : 'Esse imóvel não tem fotos.'); return }
      setMsg(`Carregando ${urls.length} foto(s)…`)
      const novas = []
      for (let i = 0; i < urls.length; i++) {
        try {
          // img-proxy = same-origin → o canvas não fica "contaminado" (CORS)
          const img = await carregarImg('/api/img-proxy?u=' + encodeURIComponent(urls[i]))
          novas.push({ name: `${cod}-${String(i + 1).padStart(2, '0')}.jpg`, img, strokes: [], done: false, clean: null })
        } catch { /* foto fora do ar — segue */ }
      }
      if (!novas.length) { setProc(false); setMsg('Não consegui baixar as fotos agora. Tente de novo.'); return }
      setFotos((fs) => { const nv = [...fs, ...novas]; setTimeout(() => abrir(nv.length - novas.length), 0); return nv })
      setMsg(`✓ ${novas.length} foto(s) do imóvel ${cod} carregadas. Clique em "Limpar TODAS" pra remover a marca de uma vez.`)
    } catch (e) {
      setMsg('Falhou ao buscar as fotos: ' + (e.message || e))
    }
    setProc(false)
  }

  // processa TODAS as fotos ainda não limpas, em série (uma por vez, sem travar o navegador)
  const limparTodas = async () => {
    if (!sessao || !ort) return
    const pend = fotosRef.current.map((f, i) => ({ f, i })).filter((x) => !x.f.done)
    if (!pend.length) { setMsg('Todas as fotos já estão limpas.'); return }
    setProc(true)
    let ok = 0
    for (let k = 0; k < pend.length; k++) {
      const { f, i } = pend[k]
      setMsg(`🪄 Limpando foto ${k + 1} de ${pend.length}…`)
      try {
        const strokes = f.strokes.length ? f.strokes : strokesAutoRotina(f.img)
        const url = await inferirIA(ort, sessao, f.img, strokes)
        const novaImg = await carregarImg(url)
        setFotos((fs) => fs.map((x, ix) => ix === i ? { ...x, done: true, clean: url, img: novaImg, strokes: [] } : x))
        ok++
      } catch { /* segue pras próximas */ }
      await new Promise((r) => setTimeout(r, 60)) // respiro pro navegador renderizar
    }
    setProc(false)
    setMsg(`✓ ${ok} de ${pend.length} foto(s) limpas. Revise uma a uma: onde sobrar rastro, pinte e rode "Remover marca" de novo. Depois é só DOWNLOAD.`)
    if (atual >= 0) setTimeout(() => abrir(atual), 0)
  }

  const baixar = async (ft) => {
    const blob = await srcParaBlob(ft.clean || ft.img.src, formato)
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = ((ft.name || 'foto').replace(/\.[^.]+$/, '')) + (ft.clean ? '-limpa' : '') + '.' + EXT[formato]
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  }
  // baixa TODAS as fotos que subiram, uma a uma (em lote, SEM compactar), no formato escolhido.
  // Editadas saem na versão limpa; as intactas saem como original.
  const baixarTodas = async () => {
    if (!fotos.length) return
    setProc(true); setMsg('Baixando todas as fotos…')
    try {
      for (let i = 0; i < fotos.length; i++) {
        const ft = fotos[i]
        const blob = await srcParaBlob(ft.clean || ft.img.src, formato)
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
        a.download = `${String(i + 1).padStart(2, '0')}-${(ft.name || 'foto').replace(/\.[^.]+$/, '')}${ft.clean ? '-limpa' : ''}.${EXT[formato]}`
        document.body.appendChild(a); a.click(); a.remove()
        await new Promise((r) => setTimeout(r, 300)) // intervalo curto pro navegador aceitar todos
        URL.revokeObjectURL(a.href)
      }
      setMsg(`✓ ${fotos.length} foto(s) baixadas.`)
    } catch (e) {
      setMsg('Falhou no download: ' + (e.message || e))
    }
    setProc(false)
  }

  const okCount = fotos.filter((f) => f.done).length

  return (
    <section className="marca-tool">
      <div className="det-trust" style={{ marginBottom: 16 }}>
        <p style={{ margin: 0 }}><b>Remoção de marca d'água. Só você vê isto.</b> Tudo acontece no seu navegador (as fotos não saem do seu computador). Suba as fotos, pinte por cima da marca e clique em remover. Funciona com a marca em qualquer posição.</p>
      </div>

      {estado === 'carregando' && <p className="section-sub">Carregando a IA (1ª vez baixa ~27 MB, depois fica em cache)…</p>}
      {estado === 'erro' && <p className="anunciar-erro">{msg}</p>}

      {estado === 'pronto' && lote && (
        <div className="painel-card" style={{ marginBottom: 14, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          <b style={{ whiteSpace: 'nowrap' }}>📦 Lote por imóvel</b>
          <input
            value={codLote}
            onChange={(e) => setCodLote(e.target.value)}
            placeholder="Código (ex: 25071)"
            inputMode="numeric"
            style={{ width: 150, padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border)', font: 'inherit' }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !proc) carregarLote() }}
          />
          <button className="admin-btn" onClick={carregarLote} disabled={proc}>Carregar fotos do imóvel</button>
          <button className="btn btn-gold" onClick={limparTodas} disabled={proc || !fotos.some((f) => !f.done)}>🪄 Limpar TODAS ({fotos.filter((f) => !f.done).length})</button>
          <span className="painel-meta" style={{ flexBasis: '100%' }}>Puxa todas as fotos do anúncio e remove a marca do canto automaticamente, uma a uma. Revise o resultado antes de usar.</span>
        </div>
      )}

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
            {fotos.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label className="mf-sel"><span>Formato</span>
                  <select value={formato} onChange={(e) => setFormato(e.target.value)}>
                    <option value="jpeg">JPG</option>
                    <option value="png">PNG</option>
                    <option value="webp">WebP</option>
                  </select>
                </label>
                <button className="btn btn-gold" style={{ width: '100%' }} onClick={baixarTodas} disabled={proc}>{proc ? 'Baixando…' : `DOWNLOAD (${fotos.length})`}</button>
              </div>
            )}
          </aside>

          <div className="marca-editor">
            <div className="marca-barra">
              <label>Pincel <input type="range" min="8" max="90" value={brush} onChange={(e) => setBrush(+e.target.value)} /></label>
              <div className="marca-zoom">
                <span>Zoom</span>
                <button className="admin-btn" title="Diminuir zoom" onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))} disabled={atual < 0 || zoom <= 1}>−</button>
                <b>{Math.round(zoom * 100)}%</b>
                <button className="admin-btn" title="Aumentar zoom" onClick={() => setZoom((z) => Math.min(5, +(z + 0.25).toFixed(2)))} disabled={atual < 0 || zoom >= 5}>+</button>
                {zoom !== 1 && <button className="admin-btn" title="Voltar ao tamanho normal" onClick={() => setZoom(1)}>Ajustar</button>}
              </div>
              <button className="admin-btn" onClick={limpar} disabled={atual < 0}>Limpar seleção</button>
              {lote && <button className="admin-btn" title="Preenche a seleção na região da marca da Rotina (canto inferior direito)" onClick={marcaAuto} disabled={atual < 0 || proc}>🪄 Marca automática</button>}
              <span style={{ flex: 1 }} />
              {atual >= 0 && fotos[atual]?.done && <button className="admin-btn" onClick={() => baixar(fotos[atual])}>Baixar esta</button>}
              <button className="btn btn-gold" onClick={remover} disabled={proc || atual < 0}>{proc ? 'Removendo…' : 'Remover marca'}</button>
            </div>
            <div className="marca-palco">
              {atual < 0 ? (
                <p className="section-sub" style={{ maxWidth: 460, textAlign: 'center' }}>Clique em <b>+ Subir fotos</b>, escolha quantas quiser, depois clique numa foto e pinte por cima da marca. Use o <b>Zoom</b> para aproximar e pintar com precisão.</p>
              ) : (
                <div
                  className="marca-lienzo"
                  onWheel={(e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom((z) => Math.min(5, Math.max(1, +(z - Math.sign(e.deltaY) * 0.25).toFixed(2)))) } }}
                >
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
