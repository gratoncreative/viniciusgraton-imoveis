import { CONFIG, linkWhatsApp, WA } from '../data'
import { IconInsta, IconWhats } from './icons'

export default function Footer() {
  const year = 2026
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <a href="#topo" className="brand">
              <img className="brand-mark" src="./favicon.svg" alt="" />
              <span className="brand-text">
                <span className="brand-name">{CONFIG.nome}</span>
                <span className="brand-sub">Imóveis · Uberlândia</span>
              </span>
            </a>
            <p>
              Consultoria imobiliária em {CONFIG.cidade}. Ajudo você a comprar casa, apartamento ou
              investir com clareza e segurança em cada etapa.
            </p>
          </div>

          <div className="footer-cols">
            <div className="footer-col">
              <h5>Navegação</h5>
              <a href="#imoveis">Imóveis</a>
              <a href="#sobre">Sobre</a>
              <a href="#processo">Como funciona</a>
              <a href="#compromisso">Compromisso</a>
              <a href="#contato">Contato</a>
            </div>
            <div className="footer-col">
              <h5>Contato</h5>
              <a href={linkWhatsApp(WA.contato)} target="_blank" rel="noopener">WhatsApp</a>
              <a href={`mailto:${CONFIG.email}`}>{CONFIG.email}</a>
              <a href={CONFIG.instagram} target="_blank" rel="noopener">@viniciusgraton.imoveis</a>
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
