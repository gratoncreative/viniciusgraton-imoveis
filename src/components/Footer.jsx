import { Link } from 'react-router-dom'
import { CONFIG, linkWhatsApp, WA } from '../data'
import { IconInsta, IconWhats } from './icons'
import Newsletter from './Newsletter'
import Tour360Pitch from './Tour360Pitch'

const NAVEGACAO = [
  { to: '/imoveis', label: 'Comprar imóvel' },
  { to: '/alugar', label: 'Alugar' },
  { to: '/lancamentos', label: 'Lançamentos' },
  { to: '/condominios', label: 'Condomínios' },
  { to: '/blog', label: 'Blog' },
  { to: '/sobre', label: 'Sobre mim' },
]
const SERVICOS = [
  { to: '/avaliacao', label: 'Avaliação grátis' },
  { to: '/tour-360', label: 'Tour Virtual 360°' },
  { to: '/anunciar', label: 'Anunciar meu imóvel' },
  { to: '/simulador-financiamento', label: 'Simulador de financiamento' },
  { to: '/ferramentas', label: 'Ferramentas' },
]

export default function Footer() {
  const year = 2026

  return (
    <footer className="footer">
      <div className="container">
        <Newsletter />
        <Tour360Pitch variante="faixa" />

        <div className="footer-top">
          <div className="footer-brand">
            <Link to="/" className="brand">
              <span className="brand-mark" aria-hidden="true">
                <svg viewBox="0 0 48 48" width="46" height="46" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <clipPath id="vg-tile-f"><rect width="48" height="48" rx="13" /></clipPath>
                    <linearGradient id="vg-ink-f" x1="0" y1="0" x2="0" y2="1">
                      <stop stopColor="#26365A" />
                      <stop offset="1" stopColor="#212b3d" />
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
            <p>Consultoria imobiliária em {CONFIG.cidade}. Ajudo você a comprar, vender ou investir com clareza e segurança em cada etapa.</p>
            <div className="footer-social">
              <a href={CONFIG.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><IconInsta width={18} height={18} /></a>
              <a href={linkWhatsApp(WA.contato)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><IconWhats width={18} height={18} /></a>
            </div>
          </div>

          <nav className="footer-col" aria-label="Navegação">
            <h5>Navegação</h5>
            {NAVEGACAO.filter((s) => CONFIG.alugarAtivo || s.to !== '/alugar').map((s) => <Link key={s.to} to={s.to}>{s.label}</Link>)}
          </nav>

          <nav className="footer-col" aria-label="Serviços">
            <h5>Serviços</h5>
            {SERVICOS.map((s) => <Link key={s.to} to={s.to}>{s.label}</Link>)}
          </nav>

          <div className="footer-col footer-col--contato">
            <h5>Contato</h5>
            <a href={linkWhatsApp(WA.contato)} target="_blank" rel="noopener noreferrer"><IconWhats width={15} height={15} /> WhatsApp</a>
            <a href="tel:+5534991570494">(34) 99157-0494</a>
            <a href={`mailto:${CONFIG.email}`}>{CONFIG.email}</a>
            <a href={CONFIG.instagram} target="_blank" rel="noopener noreferrer">@viniciusgraton.imoveis</a>
            <span className="footer-end">Av. Afonso Pena, 1535 — Aparecida<br />Uberlândia/MG · Rotina Imobiliária</span>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {year} {CONFIG.marca}. Todos os direitos reservados.</span>
          <nav className="footer-bottom-links" aria-label="Institucional">
            <Link to="/privacidade">Política de privacidade</Link>
            <Link to="/corretor">Sou corretor · área Rotina</Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}
