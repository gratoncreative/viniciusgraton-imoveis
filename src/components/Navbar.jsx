import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CONFIG, linkWhatsApp, WA } from '../data'
import { favoritos } from '../engajamento'
import { getConta } from '../conta'
import { IconWhats, IconMenu, IconClose, IconHeart } from './icons'
import TemaToggle from './TemaToggle'

const IconUser = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...p}>
    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
  </svg>
)

// Menu principal (desktop) — enxuto e com ícones, referência Chaves na Mão
const LINKS = [
  { to: '/imoveis', label: 'Imóveis', d: 'M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10' },
  { to: '/construtoras', label: 'Construtoras', d: 'M4.5 21h6M7.5 21V5M5 5h14.5M8 5L19.5 9.5M16 5v5a1 1 0 0 1-2 0' },
  { to: '/condominios', label: 'Condomínios', d: 'M3 21h18M5 21V6h6v15M13 21V10h6v11M7 9h2M7 13h2M7 17h2M15 14h2M15 17h2' },
  { to: '/ferramentas', label: 'Ferramentas', d: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.3 2.3-2-2 2.3-2.3z' },
  { to: '/anunciar', label: 'Anunciar', d: 'M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1zM15 8a5 5 0 0 1 0 8' },
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
  building: 'M3 21h18M5 21V6h6v15M13 21V10h6v11M7 9h2M7 13h2M7 17h2M15 14h2M15 17h2',
  crane: 'M4.5 21h6M7.5 21V5M5 5h14.5M8 5L19.5 9.5M16 5v5a1 1 0 0 1-2 0',
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
  { to: '/construtoras', label: 'Construtoras', sub: 'Empreendimentos', icon: 'crane' },
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
  const [conta, setConta] = useState(() => getConta())
  const { pathname } = useLocation()
  const ehAdmin = !!conta?.ehProprietario

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
              <NavLink key={l.to} to={l.to} className={({ isActive }) => isActive ? 'is-active' : undefined}>
                <svg className="nav-ico" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={l.d} /></svg>
                <span>{l.label}</span>
              </NavLink>
            ))}
          </div>
          <div className="nav-cta">
            {!pathname.startsWith('/ferramentas') && <TemaToggle className="tema-toggle--nav" />}
            <Link to="/favoritos" className="nav-fav" aria-label={`Meus favoritos${favs ? ` (${favs})` : ''}`}>
              <IconHeart filled={favs > 0} width={20} height={20} />
              {favs > 0 && <span className="nav-fav-badge">{favs}</span>}
            </Link>
            <Link to="/conta" className="nav-conta" aria-label={conta ? 'Minha área' : 'Entrar'}>
              <IconUser width={19} height={19} />
              <span>{conta ? (conta.nome || '').trim().split(' ')[0] || 'Minha área' : 'Entrar'}</span>
            </Link>
            {ehAdmin && (
              <Link to="/admin" className="nav-conta nav-admin" aria-label="Painel Admin">
                <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                <span>Admin</span>
              </Link>
            )}
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
              <div className="mm-top-acoes">
                {!pathname.startsWith('/ferramentas') && <TemaToggle />}
                <button className="mm-close" onClick={() => setOpen(false)} aria-label="Fechar menu"><IconClose width={24} height={24} /></button>
              </div>
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
              {ehAdmin && <Link className="mm-btn" to="/admin" onClick={() => setOpen(false)}>Painel Admin</Link>}
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
