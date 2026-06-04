import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Scene3D from './Scene3D'
import { CONFIG, linkWhatsApp, WA } from '../data'
import { IconWhats, IconArrow } from './icons'

const fade = (d) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, delay: d, ease: [0.22, 1, 0.36, 1] },
})

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
      {/* camadas da cena: foto realista -> tonalização -> poeira 3D -> cartões flutuantes */}
      <div className="hero-bg" style={{ backgroundImage: `url(${CONFIG.heroImg})` }} />
      <div className="hero-bg-tint" />
      <Scene3D />

<div className="container hero-grid">
        <div className="hero-left">
          <motion.div className="hero-badge" {...fade(0.1)}>
            <span className="dot" /> Consultoria imobiliária em Uberlândia e região
          </motion.div>

          <motion.h1 {...fade(0.2)}>
            Compre seu imóvel <br /> sem <em>medo de errar</em>
          </motion.h1>

          <motion.p className="lead" {...fade(0.35)}>
            Eu te guio da primeira conversa à entrega das chaves. Casa, apartamento ou investimento,
            com segurança e clareza em cada decisão.
          </motion.p>

          <motion.div className="hero-actions" {...fade(0.5)}>
            <a className="btn btn-gold" href={linkWhatsApp(WA.hero)} target="_blank" rel="noopener">
              <IconWhats /> Quero ajuda pra comprar
            </a>
            <a className="btn btn-ghost" href="#imoveis">
              Como eu te ajudo <IconArrow />
            </a>
          </motion.div>

          <motion.div className="hero-trust" {...fade(0.65)}>
            <div className="item"><b className="text-gold">Atendimento</b><span>direto comigo</span></div>
            <div className="item"><b className="text-gold">Compra segura</b><span>sem pressa</span></div>
            <div className="item"><b className="text-gold">Uberlândia</b><span>e região</span></div>
          </motion.div>
        </div>

        <div className="hero-right" aria-hidden="true" />
      </div>

      <div className="scroll-hint">
        <div className="mouse" />
        Role para explorar
      </div>
    </header>
  )
}
