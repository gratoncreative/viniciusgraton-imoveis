import { Link } from 'react-router-dom'
import { CONFIG, linkWhatsApp, WA } from '../data'
import { IconInsta, IconWhats } from './icons'
import Newsletter from './Newsletter'

const LINKS = [
  { to: '/imoveis', label: 'Imóveis' },
  { to: '/construtoras', label: 'Construtoras' },
  { to: '/condominios', label: 'Condomínios' },
  { to: '/ferramentas', label: 'Ferramentas' },
  { to: '/blog', label: 'Blog' },
  { to: '/sobre', label: 'Sobre mim' },
]

export default function Footer() {
  const year = 2026

  return (
    <footer className="footer">
      <div className="container">
        <Newsletter />
        <div className="footer-top">
          <div className="footer-brand">
            <Link to="/" className="brand">
              <img className="brand-mark" src="/favicon.svg" alt="" />
              <span className="brand-text">
                <span className="brand-name">{CONFIG.nome}</span>
                <span className="brand-sub">Imóveis · Uberlândia</span>
              </span>
            </Link>
            <p>
              Consultoria imobiliária em {CONFIG.cidade}. Ajudo você a comprar casa, apartamento ou
              investir com clareza e segurança em cada etapa.
            </p>
          </div>

          <div className="footer-cols">
            <div className="footer-col">
              <h5>Navegação</h5>
              {LINKS.map((s) => (
                <Link key={s.to} to={s.to}>{s.label}</Link>
              ))}
            </div>
            <div className="footer-col">
              <h5>Contato</h5>
              <a href={linkWhatsApp(WA.contato)} target="_blank" rel="noopener">WhatsApp</a>
              <a href="tel:+5534991570494">(34) 99157-0494</a>
              <a href={`mailto:${CONFIG.email}`}>{CONFIG.email}</a>
              <a href={CONFIG.instagram} target="_blank" rel="noopener">@viniciusgraton.imoveis</a>
              <span className="footer-end">Av. Afonso Pena, 1535 — Aparecida<br />Uberlândia/MG · Rotina Imobiliária</span>
            </div>
            <div className="footer-col">
              <h5>Institucional</h5>
              <Link to="/privacidade">Política de privacidade</Link>
              <Link to="/corretor">Sou corretor — área Rotina</Link>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {year} {CONFIG.marca}. Todos os direitos reservados.</span>
          <span style={{ display: 'flex', gap: 16 }}>
            <a href={CONFIG.instagram} target="_blank" rel="noopener" aria-label="Instagram"><IconInsta width={20} height={20} /></a>
            <a href={linkWhatsApp(WA.contato)} target="_blank" rel="noopener" aria-label="WhatsApp"><IconWhats width={20} height={20} /></a>
          </span>
        </div>
      </div>
    </footer>
  )
}
