import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CONFIG, linkWhatsApp, WA } from '../data'
import { IconWhats, IconMenu, IconClose } from './icons'

const LINKS = [
  { href: '#imoveis', label: 'Imóveis' },
  { href: '#sobre', label: 'Sobre' },
  { href: '#processo', label: 'Como funciona' },
  { href: '#compromisso', label: 'Compromisso' },
  { href: '#contato', label: 'Contato' },
]

function Brand() {
  return (
    <a href="#topo" className="brand" aria-label={CONFIG.marca}>
      <img className="brand-mark" src="./favicon.svg" alt="" />
      <span className="brand-text">
        <span className="brand-name">{CONFIG.nome}</span>
        <span className="brand-sub">Imóveis · Uberlândia</span>
      </span>
    </a>
  )
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const ids = LINKS.map((l) => l.href.slice(1))
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id)
        })
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    )
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [])

  return (
    <>
      <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="container nav-inner">
          <Brand />
          <div className="nav-links">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className={active === l.href.slice(1) ? 'active' : ''}>{l.label}</a>
            ))}
          </div>
          <div className="nav-cta">
            <a className="btn btn-gold" href={linkWhatsApp(WA.navbar)} target="_blank" rel="noopener">
              <IconWhats /> Falar agora
            </a>
            <button className="nav-toggle" onClick={() => setOpen(true)} aria-label="Abrir menu">
              <IconMenu width={26} height={26} />
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            className="mobile-menu"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <button className="nav-toggle" style={{ position: 'absolute', top: 24, right: 24 }} onClick={() => setOpen(false)} aria-label="Fechar menu">
              <IconClose width={30} height={30} />
            </button>
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</a>
            ))}
            <a className="btn btn-gold" href={linkWhatsApp(WA.navbar)} target="_blank" rel="noopener" onClick={() => setOpen(false)}>
              <IconWhats /> Falar no WhatsApp
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
