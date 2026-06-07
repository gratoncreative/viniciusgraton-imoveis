import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CONFIG, linkWhatsApp, WA } from '../data'
import { favoritos } from '../engajamento'
import { getConta } from '../conta'
import { IconWhats, IconMenu, IconClose, IconHeart } from './icons'

const IconUser = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...p}>
    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
  </svg>
)

// Páginas do menu principal
const LINKS = [
  { to: '/imoveis', label: 'Imóveis' },
  { to: '/construtoras', label: 'Construtoras' },
  { to: '/condominios', label: 'Condomínios' },
  { to: '/ferramentas', label: 'Ferramentas' },
  { to: '/blog', label: 'Blog' },
  { to: '/regioes', label: 'Uberlândia' },
]
// links extras (só no menu mobile, p/ manter a barra desktop limpa)
const LINKS_MOBILE = [
  { to: '/anunciar', label: 'Anunciar meu imóvel' },
  { to: '/avaliacao', label: 'Quanto vale meu imóvel' },
  { to: '/sobre', label: 'Sobre o Vinícius' },
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
  const [conta, setConta] = useState(null)
  const { pathname } = useLocation()

  useEffect(() => {
    const ler = () => setConta(getConta())
    ler()
    window.addEventListener('vg-conta', ler)
    window.addEventListener('storage', ler)
    return () => { window.removeEventListener('vg-conta', ler); window.removeEventListener('storage', ler) }
  }, [pathname])

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
              <NavLink key={l.to} to={l.to} className={({ isActive }) => [isActive ? 'is-active' : '', l.destaque ? 'nav-destaque' : ''].filter(Boolean).join(' ') || undefined}>
                {l.label}
              </NavLink>
            ))}
          </div>
          <div className="nav-cta">
            <Link to="/favoritos" className="nav-fav" aria-label={`Meus favoritos${favs ? ` (${favs})` : ''}`}>
              <IconHeart filled={favs > 0} width={20} height={20} />
              {favs > 0 && <span className="nav-fav-badge">{favs}</span>}
            </Link>
            <Link to="/conta" className="nav-conta" aria-label={conta ? 'Minha área' : 'Entrar'}>
              <IconUser width={19} height={19} />
              <span>{conta ? (conta.nome || '').trim().split(' ')[0] || 'Minha área' : 'Entrar'}</span>
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
            {LINKS_MOBILE.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)}>{l.label}</Link>
            ))}
            <Link to="/conta" onClick={() => setOpen(false)}>{conta ? 'Minha área' : 'Entrar / criar conta'}</Link>
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
