import { useEffect, useRef } from 'react'
import Scene3D from './Scene3D'
import HeroSkyline from './HeroSkyline'
import HeroBusca from './HeroBusca'

// Capa unificada: bio do Vinícius (esquerda) + card de busca (direita),
// sobre a foto do imóvel da capa, com escurecimento e parallax.
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
    <header className="hero" id="topo" ref={heroRef}>
      <div className="hero-bg" />
      <div className="hero-bg-tint" />
      <HeroSkyline />
      <Scene3D />

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

        <figure className="hero-foto">
          <img src="/casa-conceito.jpg" alt="Imóvel de alto padrão em Uberlândia" fetchPriority="high" />
          <figcaption>Curadoria de imóveis em Uberlândia · do alto padrão ao primeiro imóvel</figcaption>
        </figure>
      </div>

      <div className="scroll-hint">
        <div className="mouse" />
        Role para explorar
      </div>
    </header>
  )
}
