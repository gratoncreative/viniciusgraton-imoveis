import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CONFIG, linkWhatsApp, WA } from '../data'
import { favoritos } from '../engajamento'
import { IconWhats, IconMenu, IconClose, IconHeart } from './icons'

// Páginas do menu principal
const LINKS = [
  { to: '/imoveis', label: 'Imóveis' },
  { to: '/construtoras', label: 'Construtoras' },
  { to: '/como-funciona', label: 'Como eu te ajudo' },
  { to: '/ferramentas', label: 'Ferramentas' },
  { to: '/sobre', label: 'Sobre' },
  { to: '/regioes', label: 'Uberlândia' },
  { to: '/contato', label: 'Contato' },
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
  const [favs, setFavs] = useState(0)
  const { pathname } = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // contador de favoritos (atualiza ao curtir/descurtir)
  useEffect(() => {
    const ler = () => setFavs(favoritos().length)
    ler()
    window.addEventListener('vg-fav', ler)
    window.addEventListener('storage', ler)
    return () => {
      window.removeEventListener('vg-fav', ler)
      window.removeEventListener('storage', ler)
    }
  }, [pathname])

  // fora da home a navbar já entra sólida (legível sobre seções claras)
  const solido = scrolled || pathname !== '/'

  return (
    <>
      <nav className={`nav ${solido ? 'scrolled' : ''}`}>
        <div className="container nav-inner">
          <Brand />
          <div className="nav-links">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
                {l.label}
              </NavLink>
            ))}
          </div>
          <div className="nav-cta">
            <Link to="/favoritos" className="nav-fav" aria-label={`Meus favoritos${favs ? ` (${favs})` : ''}`}>
              <IconHeart filled={favs > 0} width={20} height={20} />
              {favs > 0 && <span className="nav-fav-badge">{favs}</span>}
            </Link>
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
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)}>{l.label}</Link>
            ))}
            <Link to="/favoritos" onClick={() => setOpen(false)}>Favoritos{favs > 0 ? ` (${favs})` : ''}</Link>
            <a className="btn btn-gold" href={linkWhatsApp(WA.navbar)} target="_blank" rel="noopener" onClick={() => setOpen(false)}>
              <IconWhats /> Falar no WhatsApp
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
