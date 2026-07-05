import { useEffect, useRef } from 'react'
import HeroBusca from './HeroBusca'
import '../styles/home-legada.css'

// Capa estilo portal: FOTO lifestyle no fundo de toda a seção + card de busca
// flutuando por cima, à esquerda. Parallax sutil na foto ao mover o mouse.
export default function Hero() {
  const heroRef = useRef(null)

  useEffect(() => {
    const el = heroRef.current
    if (!el) return
    let raf = 0
    const onMove = (e) => {
      const r = el.getBoundingClientRect()
      const px = (e.clientX - r.left) / r.width - 0.5
      const py = (e.clientY - r.top) / r.height - 0.5
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--px', px.toFixed(3))
        el.style.setProperty('--py', py.toFixed(3))
      })
    }
    const onLeave = () => { el.style.setProperty('--px', '0'); el.style.setProperty('--py', '0') }
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => { cancelAnimationFrame(raf); el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave) }
  }, [])

  return (
    <header className="hero hero--foto" id="topo" ref={heroRef}>
      <img className="hero-foto-bg" src="/casa-conceito.jpg" alt="Imóvel de alto padrão em Uberlândia" loading="eager" decoding="async" />
      <div className="hero-foto-scrim" aria-hidden="true" />

      <div className="container hero-grid2">
        <div className="hero-card hero-in">
          <span className="eyebrow">Imóveis em Uberlândia</span>
          <h1>Compre seu imóvel <em>sem medo de errar</em></h1>
          <p className="hero-card-sub">Curadoria criteriosa e acompanhamento da primeira conversa à entrega das chaves.</p>
          <HeroBusca />
          <div className="hero-card-rodape">
            <img src="/rotina-logo.png" alt="Rotina Imobiliária" />
            <span>Consultor credenciado · Rotina Imobiliária</span>
          </div>
        </div>
      </div>

      <p className="hero-foto-cap">
        <span className="hero-foto-cap-chip">Curadoria de imóveis em Uberlândia · <em>do alto padrão ao primeiro imóvel</em></span>
      </p>
    </header>
  )
}
