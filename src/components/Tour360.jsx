import { useEffect, useState } from 'react'
import '../styles/tour360.css'

// Visor de Tour 360° — abre o tour hospedado (link/embed colado no campo tour360)
// num overlay imersivo em tela cheia, dentro de um iframe. Aceita tanto a URL direta
// quanto o código <iframe ...> colado no campo (extrai o src).
// Regra de marca: o fundo mais escuro permitido é #212b3d (nunca preto).

// Extrai a URL embutível: se vier um <iframe src="...">, pega o src; senão usa o texto como URL.
function extrairSrc(v) {
  const s = String(v || '').trim()
  const m = s.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i)
  return (m ? m[1] : s).trim()
}

export default function Tour360({ url, titulo, onClose }) {
  const [carregando, setCarregando] = useState(true)
  const src = extrairSrc(url)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // failsafe: se o onLoad não disparar (URL estranha), tira o spinner mesmo assim
    const t = setTimeout(() => setCarregando(false), 6000)
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; clearTimeout(t) }
  }, [onClose])

  const tela = () => {
    const el = document.getElementById('t360-root')
    if (!document.fullscreenElement) el?.requestFullscreen?.()
    else document.exitFullscreen?.()
  }

  return (
    <div id="t360-root" style={S.root} role="dialog" aria-label={`Tour 360° - ${titulo || 'imóvel'}`}>
      <style>{'@keyframes t360spin{to{transform:rotate(360deg)}}'}</style>

      {src ? (
        <iframe
          src={src}
          title={`Tour 360° - ${titulo || 'imóvel'}`}
          style={S.frame}
          onLoad={() => setCarregando(false)}
          allow="accelerometer; gyroscope; magnetometer; xr-spatial-tracking; fullscreen; vr"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <div style={S.centro}><span style={S.msg}>Tour 360° indisponível.</span></div>
      )}

      <div style={S.topo}>
        <span style={S.titulo}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /><path d="M2 12h20" /></svg>
          Tour 360°{titulo ? ` · ${titulo}` : ''}
        </span>
        <div style={S.acoes}>
          <button onClick={tela} style={S.iconBtn} aria-label="Tela cheia" title="Tela cheia">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M16 21h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
          </button>
          {onClose && (
            <button onClick={onClose} style={S.iconBtn} aria-label="Fechar" title="Fechar">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      </div>

      {carregando && (
        <div style={S.centro}>
          <div style={S.spin} />
          <span style={S.msg}>Carregando o tour 360°…</span>
        </div>
      )}
    </div>
  )
}

const NAVY = '#212b3d'
const S = {
  root: { position: 'fixed', inset: 0, zIndex: 9999, background: NAVY, overflow: 'hidden' },
  frame: { position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', display: 'block' },
  topo: { position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', zIndex: 2, pointerEvents: 'none' },
  titulo: { display: 'inline-flex', alignItems: 'center', gap: 8, color: '#fff', fontSize: 14, fontWeight: 600, textShadow: '0 1px 8px rgba(33,43,61,.7)', background: 'rgba(33,43,61,.4)', backdropFilter: 'blur(4px)', padding: '7px 12px', borderRadius: 10 },
  acoes: { display: 'flex', gap: 8, pointerEvents: 'auto' },
  iconBtn: { width: 38, height: 38, borderRadius: 10, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,.16)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' },
  centro: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, zIndex: 1, pointerEvents: 'none' },
  spin: { width: 46, height: 46, borderRadius: '50%', border: '3px solid rgba(255,255,255,.22)', borderTopColor: '#C9A24B', animation: 't360spin .8s linear infinite' },
  msg: { color: '#fff', fontSize: 15 },
}
