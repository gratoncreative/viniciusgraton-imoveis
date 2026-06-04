import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CONFIG, linkWhatsApp, WA } from '../data'
import { IconWhats, IconMenu, IconClose } from './icons'

// Links de seção da home + rota do catálogo
const SECOES = [
  { id: 'sobre', label: 'Sobre' },
  { id: 'processo', label: 'Como funciona' },
  { id: 'compromisso', label: 'Compromisso' },
  { id: 'contato', label: 'Contato' },
]

function Brand() {
  return (
    <Link to="/" className="brand" aria-label={CONFIG.marca}>
      <img className="brand-mark" src="/favicon.svg" alt="" />
      <span className="brand-text">
        <span className="brand-name">{CONFIG.nome}</span>
        <span className="brand-sub">Imóveis · Uberlândia</span>
      </span>
    </Link>
  )
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // navega até uma seção: na home rola; em outra página vai pra home e rola
  const irSecao = (id) => (e) => {
    e.preventDefault()
    setOpen(false)
    if (pathname === '/') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    } else {
      navigate('/', { state: { scrollTo: id } })
    }
  }

  return (
    <>
      <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="container nav-inner">
          <Brand />
          <div className="nav-links">
            <Link to="/imoveis">Imóveis</Link>
            {SECOES.map((l) => (
              <a key={l.id} href={`/#${l.id}`} onClick={irSecao(l.id)}>{l.label}</a>
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
            <Link to="/imoveis" onClick={() => setOpen(false)}>Imóveis</Link>
            {SECOES.map((l) => (
              <a key={l.id} href={`/#${l.id}`} onClick={irSecao(l.id)}>{l.label}</a>
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
