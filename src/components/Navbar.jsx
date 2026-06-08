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

// Cards do menu mobile (com ícone + subtítulo, mais envolvente que só texto)
const MM_ICN = {
  home: 'M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10',
  building: 'M5 21V4a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v17M14 21V9h4a1 1 0 0 1 1 1v11M3 21h18M8 7h2M8 11h2M8 15h2',
  store: 'M4 9h16l-1-5H5L4 9zM4 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M6 12v8h12v-8',
  tools: 'M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h8',
  doc: 'M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M9 13h6M9 17h4',
  pin: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
}
const MMIcon = ({ name }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={MM_ICN[name]} /></svg>
)
const MENU_CARDS = [
  { to: '/imoveis', label: 'Imóveis', sub: 'À venda em Uberlândia', icon: 'home' },
  { to: '/condominios', label: 'Condomínios', sub: 'Fechados e lançamentos', icon: 'building' },
  { to: '/construtoras', label: 'Construtoras', sub: 'Empreendimentos', icon: 'store' },
  { to: '/ferramentas', label: 'Ferramentas', sub: 'Simuladores grátis', icon: 'tools' },
  { to: '/blog', label: 'Blog', sub: 'Guias e dicas', icon: 'doc' },
  { to: '/regioes', label: 'Uberlândia', sub: 'Bairros e regiões', icon: 'pin' },
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

  // trava o scroll do fundo enquanto o menu mobile está aberto
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // fecha o menu ao trocar de página
  useEffect(() => { setOpen(false) }, [pathname])

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
            <div className="mm-top">
              <Brand />
              <button className="mm-close" onClick={() => setOpen(false)} aria-label="Fechar menu"><IconClose width={24} height={24} /></button>
            </div>
            <div className="mm-grid">
              {MENU_CARDS.map((l) => (
                <Link key={l.to} className="mm-card" to={l.to} onClick={() => setOpen(false)}>
                  <span className="mm-ico"><MMIcon name={l.icon} /></span>
                  <b>{l.label}</b><i>{l.sub}</i>
                </Link>
              ))}
            </div>
            <div className="mm-acoes">
              <Link className="mm-btn mm-btn--ouro" to="/anunciar" onClick={() => setOpen(false)}>Anunciar meu imóvel</Link>
              <Link className="mm-btn" to="/avaliacao" onClick={() => setOpen(false)}>Quanto vale meu imóvel</Link>
              <Link className="mm-btn" to="/conta" onClick={() => setOpen(false)}>{conta ? 'Minha área' : 'Entrar / criar conta'}</Link>
              <Link className="mm-btn" to="/favoritos" onClick={() => setOpen(false)}>Favoritos{favs > 0 ? ` (${favs})` : ''}</Link>
              <Link className="mm-btn" to="/sobre" onClick={() => setOpen(false)}>Sobre o Vinícius</Link>
              <Link className="mm-btn" to="/contato" onClick={() => setOpen(false)}>Contato</Link>
            </div>
            <a className="mm-wa" href={linkWhatsApp(WA.navbar)} target="_blank" rel="noopener" onClick={() => setOpen(false)}>
              <IconWhats width={20} height={20} /> Falar no WhatsApp
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
