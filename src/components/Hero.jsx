import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import Scene3D from './Scene3D'
import HeroSkyline from './HeroSkyline'
import HeroBusca from './HeroBusca'
import { CONFIG, linkWhatsApp, WA } from '../data'
import { IconWhats, IconArrow } from './icons'

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
      <img className="hero-foto" src="/vinicius-graton-cutout.png" alt="Vinícius Graton, consultor de imóveis em Uberlândia" loading="eager" />
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

        <div className="hero-bio hero-in">
          <span className="eyebrow">Quem te atende</span>
          <h2 className="hero-nome">Vinícius Graton</h2>
          <p className="apres-lead">
            Sou <b>consultor de imóveis em Uberlândia</b>, da <b>Rotina Imobiliária</b>. Te ajudo a comprar, vender ou investir com segurança — da primeira conversa à entrega das chaves.
          </p>
          <ul className="apres-checks apres-checks--link">
            <li><Link to="/diferenciais#curadoria"><span>✓</span> Curadoria criteriosa</Link></li>
            <li><Link to="/diferenciais#transparencia"><span>✓</span> Pontos fortes e riscos, na transparência</Link></li>
            <li><Link to="/diferenciais#documentacao"><span>✓</span> Documentação conferida</Link></li>
            <li><Link to="/diferenciais#negociacao"><span>✓</span> Negociação a seu favor</Link></li>
          </ul>
          <div className="hero-bio-acoes">
            <a className="btn btn-gold" href={linkWhatsApp(WA.hero)} target="_blank" rel="noopener"><IconWhats /> Falar comigo agora</a>
            <Link className="btn btn-ghost" to="/sobre">Conhecer minha história <IconArrow /></Link>
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
