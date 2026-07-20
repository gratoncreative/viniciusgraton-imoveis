import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { linkWhatsApp } from '../../data'

// ————— Brandmark (selo VG dourado sobre marinho) —————
export function Brandmark({ seal = 46, word = true }) {
  return (
    <span className="vgx-brand">
      <span className="vgx-seal" style={{ width: seal, height: seal, borderRadius: Math.round(seal * 0.26) }}>
        <b style={{ fontSize: Math.round(seal * 0.44) }}>VG</b>
        <i />
      </span>
      {word && (
        <span className="vgx-brand-word">
          <b>VINÍCIUS GRATON</b>
          <span>Consultoria de imóveis</span>
        </span>
      )}
    </span>
  )
}

const WhatsGlyph = ({ size = 28 }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} fill="#fff" aria-hidden="true">
    <path d="M16.004 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.26.59 4.47 1.71 6.42L3.2 28.8l6.55-1.68a12.74 12.74 0 0 0 6.25 1.63h.01c7.06 0 12.8-5.74 12.8-12.8S23.07 3.2 16.004 3.2zm7.52 18.31c-.32.9-1.86 1.72-2.56 1.78-.65.06-1.47.09-2.37-.15-.55-.14-1.25-.33-2.15-.62-3.78-1.31-6.25-4.52-6.44-4.73-.19-.2-1.54-1.86-1.54-3.55 0-1.69.98-2.52 1.32-2.86.34-.34.75-.43 1-.43s.5 0 .72.01c.23.01.54-.09.85.65.32.75 1.08 2.6 1.17 2.79.09.19.16.42.03.67-.13.25-.19.4-.38.62-.19.22-.4.49-.57.66-.19.19-.39.4-.17.78.22.38.98 1.62 2.11 2.62 1.45 1.29 2.67 1.69 3.05 1.88.38.19.6.16.82-.1.22-.25.94-1.1 1.19-1.48.25-.38.5-.31.85-.19.34.13 2.17 1.02 2.54 1.21.38.19.63.28.72.44.09.16.09.9-.23 1.8z" />
  </svg>
)

const NAV_LINKS = [
  { label: 'Início', to: '/', key: 'home' },
  { label: 'Imóveis', to: '/imoveis', key: 'imoveis' },
  { label: 'Alto padrão', to: '/imoveis?precoMin=1000000', key: 'alto-padrao' },
  { label: 'Lançamentos', to: '/lancamentos', key: 'lancamentos' },
  { label: 'Mercado', to: '/mercado', key: 'mercado' },
  { label: 'Sobre', to: '/sobre', key: 'sobre' },
  { label: 'Blog', to: '/blog', key: 'blog' },
  { label: 'Contato', to: '/contato', key: 'contato' },
]

export function NavbarVG({ ativo: ativoProp }) {
  const [aberto, setAberto] = useState(false)
  const { pathname } = useLocation()
  const ativo = ativoProp || (pathname === '/' ? 'home' : pathname.replace('/', '').split('/')[0])

  return (
    <header className="vgx-nav">
      <div className="vgx-nav-inner">
        <Link to="/" aria-label="Vinícius Graton · início"><Brandmark seal={46} /></Link>
        <button
          className="vgx-burger"
          aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={aberto}
          onClick={() => setAberto((v) => !v)}
        >
          {aberto ? (
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
          )}
        </button>
        <nav className={`vgx-nav-links ${aberto ? 'is-open' : ''}`}>
          {NAV_LINKS.map((l) => (
            <Link
              key={l.key}
              to={l.to}
              className={l.key === ativo ? 'is-active' : ''}
              onClick={() => setAberto(false)}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <a className="vgx-nav-cta" href={linkWhatsApp('Olá Vinícius! Quero conversar sobre imóveis em Uberlândia.')} target="_blank" rel="noopener noreferrer">
          Falar com o Vinícius
        </a>
      </div>
    </header>
  )
}

export function FooterVG() {
  return (
    <footer className="vgx-footer">
      <div className="vgx-footer-inner">
        <div className="vgx-footer-cols">
          <div className="vgx-footer-col vgx-footer-col--brand">
            <Brandmark seal={46} />
            <p>Consultoria pessoal para comprar e vender imóveis em Uberlândia, do primeiro imóvel ao alto padrão, em parceria com a Rotina Imobiliária.</p>
          </div>
          <div className="vgx-footer-col">
            <h4>Navegue</h4>
            <Link to="/imoveis">Imóveis à venda</Link>
            <Link to="/lancamentos">Lançamentos</Link>
            <Link to="/sobre">Sobre o Vinícius</Link>
            <Link to="/blog">Blog</Link>
          </div>
          <div className="vgx-footer-col">
            <h4>Para você</h4>
            <Link to="/contato">Quero comprar</Link>
            <Link to="/anunciar">Quero vender meu imóvel</Link>
            <a href="https://aicapitei.com.br" target="_blank" rel="noopener">Anunciar grátis no aicapitei</a>
            <a href="#simulador">Simular financiamento</a>
            <Link to="/mercado">Preço do m² por bairro</Link>
          </div>
          <div className="vgx-footer-col">
            <h4>Fale com o Vinícius</h4>
            <a className="vgx-footer-tel" href="https://wa.me/5534991570494" target="_blank" rel="noopener noreferrer">(34) 99157-0494</a>
            <a href="mailto:contato@viniciusgraton.com.br">contato@viniciusgraton.com.br</a>
            <a href="https://www.instagram.com/viniciusgraton.imoveis/" target="_blank" rel="noopener noreferrer">@viniciusgraton.imoveis</a>
            <span className="vgx-footer-note">Uberlândia · MG<br />Atendimento com hora marcada</span>
          </div>
        </div>
        <div className="vgx-footer-bottom">
          <span>© 2026 Vinícius Graton · Todos os direitos reservados</span>
          <span className="vgx-footer-rotina">Em parceria com <b>Rotina Imobiliária</b></span>
        </div>
      </div>
    </footer>
  )
}

export function WhatsFloatVG() {
  return (
    <a
      className="vgx-wa"
      href={linkWhatsApp('Olá Vinícius! Vim pelo site e quero conversar sobre imóveis.')}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
    >
      <WhatsGlyph />
    </a>
  )
}
