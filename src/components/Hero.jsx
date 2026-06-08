import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import Scene3D from './Scene3D'
import HeroBusca from './HeroBusca'
import { CONFIG, linkWhatsApp, WA } from '../data'
import { IconWhats } from './icons'

export default function Hero() {
  const heroRef = useRef(null)

  // parallax 3D: atualiza --px / --py conforme o mouse, usados pelas camadas
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
    const onLeave = () => {
      el.style.setProperty('--px', '0')
      el.style.setProperty('--py', '0')
    }
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <header className="hero" id="topo" ref={heroRef}>
      {/* camadas: foto realista -> tonalização (scrim à esquerda) -> poeira 3D */}
      <div className="hero-bg" style={{ backgroundImage: `url(${CONFIG.heroImg})` }} />
      <div className="hero-bg-tint" />
      <Scene3D />

      <div className="container hero-grid">
        {/* entrada por animação CSS (confiável mesmo com a cena 3D pesada) */}
        <div className="hero-left hero-in">
          <div className="hero-badge">
            <span className="dot" /> Consultoria imobiliária em Uberlândia e região
          </div>

          <div className="hero-rotina">
            <span className="hero-rotina-label">Consultor credenciado</span>
            <span className="hero-rotina-logo">
              <img src="/rotina-logo.png" alt="Rotina Imobiliária" />
            </span>
          </div>

          <h1>
            Compre seu imóvel <br /> sem <em>medo de errar</em>
          </h1>

          <p className="lead">
            Sou o <b>Vinícius Graton</b>, consultor imobiliário em Uberlândia. Faço uma <b>curadoria
            criteriosa</b> dos imóveis pra te entregar só qualidade e excelência — e te acompanho da
            primeira conversa à entrega das chaves.
          </p>

          <HeroBusca />

          <div className="hero-actions">
            <Link className="btn btn-gold" to="/encontrar-imovel">Comprar sem medo de errar</Link>
            <a className="btn btn-ghost" href={linkWhatsApp(WA.hero)} target="_blank" rel="noopener">
              <IconWhats /> Quero ajuda pra comprar
            </a>
          </div>
        </div>
      </div>

      <div className="scroll-hint">
        <div className="mouse" />
        Role para explorar
      </div>
    </header>
  )
}
