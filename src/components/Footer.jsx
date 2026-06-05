import { Link, useNavigate, useLocation } from 'react-router-dom'
import { CONFIG, linkWhatsApp, WA } from '../data'
import { IconInsta, IconWhats } from './icons'

const SECOES = [
  { id: 'sobre', label: 'Sobre' },
  { id: 'processo', label: 'Como funciona' },
  { id: 'compromisso', label: 'Compromisso' },
  { id: 'contato', label: 'Contato' },
]

export default function Footer() {
  const year = 2026
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const irSecao = (id) => (e) => {
    e.preventDefault()
    if (pathname === '/') document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    else navigate('/', { state: { scrollTo: id } })
  }

  return (
    <footer className="footer">
      <div className="container">
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
              <Link to="/imoveis">Imóveis</Link>
              {SECOES.map((s) => (
                <a key={s.id} href={`/#${s.id}`} onClick={irSecao(s.id)}>{s.label}</a>
              ))}
            </div>
            <div className="footer-col">
              <h5>Contato</h5>
              <a href={linkWhatsApp(WA.contato)} target="_blank" rel="noopener">WhatsApp</a>
              <a href={`mailto:${CONFIG.email}`}>{CONFIG.email}</a>
              <a href={CONFIG.instagram} target="_blank" rel="noopener">@viniciusgraton.imoveis</a>
            </div>
            <div className="footer-col">
              <h5>Institucional</h5>
              <Link to="/privacidade">Política de privacidade</Link>
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
