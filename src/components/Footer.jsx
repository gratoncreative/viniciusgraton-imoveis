import { Link } from 'react-router-dom'
import { CONFIG, linkWhatsApp, WA } from '../data'
import { IconInsta, IconWhats } from './icons'
import Newsletter from './Newsletter'

const LINKS = [
  { to: '/imoveis', label: 'Imóveis' },
  { to: '/lancamentos', label: 'Lançamentos' },
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
              <span className="brand-mark" aria-hidden="true">
                <svg viewBox="0 0 48 48" width="46" height="46" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <clipPath id="vg-tile-f"><rect width="48" height="48" rx="13" /></clipPath>
                    <linearGradient id="vg-ink-f" x1="0" y1="0" x2="0" y2="1">
                      <stop stopColor="#26365A" />
                      <stop offset="1" stopColor="#0A0E16" />
                    </linearGradient>
                  </defs>
                  <g clipPath="url(#vg-tile-f)">
                    <rect width="48" height="48" fill="url(#vg-ink-f)" />
                    <path fill="#F4F2EE" fillRule="evenodd" d="M24 8.5 L41.5 23 L35.5 23 L35.5 38.5 L12.5 38.5 L12.5 23 L6.5 23 Z M19.7 38.5 L19.7 27.8 L24 31.2 L28.3 27.8 L28.3 38.5 Z" />
                    <path fill="#EB0128" d="M24 17.6 L27.2 20.8 L24 24 L20.8 20.8 Z" />
                  </g>
                  <rect x="0.6" y="0.6" width="46.8" height="46.8" rx="12.4" fill="none" stroke="#F4F2EE" strokeOpacity="0.10" />
                </svg>
              </span>
              <span className="brand-text">
                <span className="brand-name">Vinícius <em>Graton</em></span>
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
              <a href={linkWhatsApp(WA.contato)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
              <a href="tel:+5534991570494">(34) 99157-0494</a>
              <a href={`mailto:${CONFIG.email}`}>{CONFIG.email}</a>
              <a href={CONFIG.instagram} target="_blank" rel="noopener noreferrer">@viniciusgraton.imoveis</a>
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
            <a href={CONFIG.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><IconInsta width={20} height={20} /></a>
            <a href={linkWhatsApp(WA.contato)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><IconWhats width={20} height={20} /></a>
          </span>
        </div>
      </div>
    </footer>
  )
}
