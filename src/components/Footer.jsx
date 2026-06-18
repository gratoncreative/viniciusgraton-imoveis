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
                    <linearGradient id="vg-navy-f" x1="7" y1="3" x2="41" y2="46" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#26365A" />
                      <stop offset="1" stopColor="#0A0E16" />
                    </linearGradient>
                  </defs>
                  <rect width="48" height="48" rx="13" fill="url(#vg-navy-f)" />
                  <rect x="0.6" y="0.6" width="46.8" height="46.8" rx="12.4" fill="none" stroke="rgba(255,255,255,0.12)" />
                  <path d="M14 18.5 L24 12 L34 18.5" stroke="#EB0128" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
                  <text x="24" y="36" textAnchor="middle" fontFamily="'Playfair Display', Georgia, serif" fontSize="18.5" fontWeight="700" fill="#F4F2EE" letterSpacing="0.4">VG</text>
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
