import { useEffect, useRef, useState } from 'react'
import * as pc from 'playcanvas'

// Visualizador de Tour 3D (3D Gaussian Splatting) — carregado SOB DEMANDA.
// Recebe `url` (arquivo .ply / .compressed.ply / .sog gerado no SuperSplat) e mostra
// a cena navegável em tela cheia. Engine PlayCanvas (MIT), self-hosted, sem marca de
// terceiros. Câmera orbital própria (arrastar = girar, roda/pinça = zoom).
//
// Regra de marca: o fundo mais escuro permitido é #212b3d (nunca preto).

export default function Tour3D({ url, titulo, onClose, marca }) {
  const canvasRef = useRef(null)
  const appRef = useRef(null)
  const [estado, setEstado] = useState('carregando') // 'carregando' | 'ok' | 'erro'

  // Fecha no ESC
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !url) return
    let app
    let disposed = false

    try {
      app = new pc.Application(canvas, {
        mouse: new pc.Mouse(canvas),
        touch: new pc.TouchDevice(canvas),
        graphicsDeviceOptions: { antialias: true, alpha: false },
      })
    } catch (err) {
      setEstado('erro')
      return
    }
    appRef.current = app

    app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW)
    app.setCanvasResolution(pc.RESOLUTION_AUTO)
    // Limita o pixel ratio: no celular evita renderizar em resolução alta demais (perf).
    if (app.graphicsDevice) app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 2)

    // Câmera — fundo navy da marca (#212b3d), nunca preto.
    const camera = new pc.Entity('camera')
    camera.addComponent('camera', {
      clearColor: new pc.Color(0.129, 0.169, 0.239), // #212b3d
      fov: 60,
    })
    app.root.addChild(camera)

    // Órbita: coordenadas esféricas em torno de um alvo.
    const target = new pc.Vec3(0, 0, 0)
    let azim = 0, elev = 12, dist = 4
    const minDist = 0.4, maxDist = 40
    const aplicarCamera = () => {
      const e = elev * pc.math.DEG_TO_RAD
      const a = azim * pc.math.DEG_TO_RAD
      const x = target.x + dist * Math.cos(e) * Math.sin(a)
      const y = target.y + dist * Math.sin(e)
      const z = target.z + dist * Math.cos(e) * Math.cos(a)
      camera.setPosition(x, y, z)
      camera.lookAt(target)
    }
    aplicarCamera()

    // Carrega o Gaussian Splat
    const asset = new pc.Asset('tour3d', 'gsplat', { url })
    asset.on('error', () => { if (!disposed) setEstado('erro') })
    asset.ready(() => {
      if (disposed) return
      try {
        const ent = new pc.Entity('splat')
        ent.addComponent('gsplat', { asset })
        app.root.addChild(ent)
        // Enquadra a câmera pela caixa do modelo, quando disponível.
        const aabb = ent.gsplat?.instance?.meshInstance?.aabb
        if (aabb) {
          target.copy(aabb.center)
          const r = aabb.halfExtents.length()
          if (r > 0) { dist = pc.math.clamp(r * 2.2, minDist, maxDist) }
        }
        aplicarCamera()
        setEstado('ok')
      } catch (err) {
        setEstado('erro')
      }
    })
    app.assets.add(asset)
    app.assets.load(asset)

    // ——— Controles de órbita (mouse + toque) ———
    let arrastando = false, lastX = 0, lastY = 0
    let pinchDist = 0
    const onDown = (e) => { arrastando = true; lastX = e.clientX; lastY = e.clientY }
    const onUp = () => { arrastando = false }
    const onMove = (e) => {
      if (!arrastando) return
      const dx = e.clientX - lastX, dy = e.clientY - lastY
      lastX = e.clientX; lastY = e.clientY
      azim -= dx * 0.3
      elev = pc.math.clamp(elev + dy * 0.3, -85, 85)
      aplicarCamera()
    }
    const onWheel = (e) => {
      e.preventDefault()
      dist = pc.math.clamp(dist * (1 + Math.sign(e.deltaY) * 0.1), minDist, maxDist)
      aplicarCamera()
    }
    const tDist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
    const onTouchStart = (e) => {
      if (e.touches.length === 1) { arrastando = true; lastX = e.touches[0].clientX; lastY = e.touches[0].clientY }
      else if (e.touches.length === 2) { arrastando = false; pinchDist = tDist(e.touches) }
    }
    const onTouchMove = (e) => {
      if (e.touches.length === 1 && arrastando) {
        const dx = e.touches[0].clientX - lastX, dy = e.touches[0].clientY - lastY
        lastX = e.touches[0].clientX; lastY = e.touches[0].clientY
        azim -= dx * 0.3
        elev = pc.math.clamp(elev + dy * 0.3, -85, 85)
        aplicarCamera()
      } else if (e.touches.length === 2) {
        const d = tDist(e.touches)
        if (pinchDist) { dist = pc.math.clamp(dist * (pinchDist / d), minDist, maxDist); aplicarCamera() }
        pinchDist = d
      }
      e.preventDefault()
    }
    const onTouchEnd = () => { arrastando = false; pinchDist = 0 }

    canvas.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointermove', onMove)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd)

    app.start()

    return () => {
      disposed = true
      canvas.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
      try { app.destroy() } catch (e) { /* libera GPU */ }
      appRef.current = null
    }
  }, [url])

  const tela = () => {
    const el = document.getElementById('t3d-root')
    if (!document.fullscreenElement) el?.requestFullscreen?.()
    else document.exitFullscreen?.()
  }

  return (
    <div id="t3d-root" style={S.root} role="dialog" aria-label={`Tour 3D — ${titulo || 'imóvel'}`}>
      <style>{'@keyframes t3dspin{to{transform:rotate(360deg)}}'}</style>
      <canvas ref={canvasRef} style={S.canvas} />

      <div style={S.topo}>
        <span style={S.titulo}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12"/></svg>
          Tour 3D{titulo ? ` · ${titulo}` : ''}
        </span>
        <div style={S.acoes}>
          <button onClick={tela} style={S.iconBtn} aria-label="Tela cheia" title="Tela cheia">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M16 21h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
          </button>
          {onClose && (
            <button onClick={onClose} style={S.iconBtn} aria-label="Fechar" title="Fechar">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>
      </div>

      {estado === 'carregando' && (
        <div style={S.centro}>
          <div style={S.spin} />
          <span style={S.msg}>Carregando o tour 3D…</span>
        </div>
      )}

      {estado === 'erro' && (
        <div style={S.centro}>
          <span style={S.msg}>Não foi possível abrir o tour 3D neste dispositivo.</span>
          <button onClick={onClose} style={S.btnFechar}>Voltar às fotos</button>
        </div>
      )}

      {estado === 'ok' && (
        <div style={S.dica}>Arraste para girar · role/pinça para dar zoom</div>
      )}

      {marca && (
        <a href="/ferramentas/criar-tour" style={S.marca} title="Crie o seu Tour 3D">
          <span style={S.marcaTop}>Tour 3D</span>
          <span style={S.marcaSub}>criado em viniciusgraton.com.br</span>
        </a>
      )}
    </div>
  )
}

const NAVY = '#212b3d'
const S = {
  root: { position: 'fixed', inset: 0, zIndex: 9999, background: NAVY, overflow: 'hidden' },
  canvas: { position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', touchAction: 'none' },
  topo: { position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', zIndex: 2, pointerEvents: 'none' },
  titulo: { display: 'inline-flex', alignItems: 'center', gap: 8, color: '#fff', fontSize: 14, fontWeight: 600, textShadow: '0 1px 6px rgba(33,43,61,.6)' },
  acoes: { display: 'flex', gap: 8, pointerEvents: 'auto' },
  iconBtn: { width: 38, height: 38, borderRadius: 10, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,.14)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  centro: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, zIndex: 1, pointerEvents: 'none' },
  spin: { width: 46, height: 46, borderRadius: '50%', border: '3px solid rgba(255,255,255,.22)', borderTopColor: '#C9A24B', animation: 't3dspin .8s linear infinite' },
  msg: { color: '#fff', fontSize: 15 },
  btnFechar: { pointerEvents: 'auto', background: '#EB0128', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 18px', fontSize: 14, cursor: 'pointer' },
  dica: { position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,.14)', color: '#fff', fontSize: 12.5, padding: '7px 14px', borderRadius: 20, zIndex: 2 },
  marca: { position: 'absolute', bottom: 14, right: 14, zIndex: 3, display: 'flex', flexDirection: 'column', lineHeight: 1.15, textDecoration: 'none', background: 'rgba(33,43,61,.55)', backdropFilter: 'blur(4px)', padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,.18)' },
  marcaTop: { color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '.02em' },
  marcaSub: { color: '#C9A24B', fontSize: 10.5, fontWeight: 600 },
}
