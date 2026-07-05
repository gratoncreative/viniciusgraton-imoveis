import { useState, useEffect } from 'react'
import { CONFIG, linkWhatsApp, WA } from '../data'
import { IconWhats, IconMail, IconPhone, IconClose } from './icons'

function fmtPhone(w) {
  const n = w.replace(/\D/g, '')
  const local = n.startsWith('55') ? n.slice(2) : n
  if (local.length < 10) return w
  const ddd = local.slice(0, 2)
  const rest = local.slice(2)
  return `(${ddd}) ${rest.slice(0, rest.length - 4)}-${rest.slice(-4)}`
}

export default function BarraContato() {
  const [show, setShow] = useState(true)
  const [closed, setClosed] = useState(false)

  // mostra a barra quando o topo/hero sai de vista (robusto ao scroll suave do Lenis)
  useEffect(() => {
    const hero = document.getElementById('topo')
    if (!hero) { setShow(true); return } // páginas internas: sempre visível
    const obs = new IntersectionObserver(([e]) => setShow(!e.isIntersecting), { threshold: 0 })
    obs.observe(hero)
    return () => obs.disconnect()
  }, [])

  if (closed) return null

  return (
    <div className={`barra-contato ${show ? 'on' : ''}`}>
      <div className="container barra-inner">
        <span className="barra-label">Vendas - fale comigo</span>
        <div className="barra-acoes">
          <a href={linkWhatsApp(WA.flutuante)} target="_blank" rel="noopener noreferrer" className="barra-item barra-whats">
            <IconWhats width={18} height={18} /> WhatsApp
          </a>
          <a href={`tel:+${CONFIG.whatsapp}`} className="barra-item">
            <IconPhone width={17} height={17} /> {fmtPhone(CONFIG.whatsapp)}
          </a>
          <a href={`mailto:${CONFIG.email}`} className="barra-item barra-email">
            <IconMail width={17} height={17} /> {CONFIG.email}
          </a>
        </div>
        <button className="barra-fechar" onClick={() => setClosed(true)} aria-label="Fechar barra de contato">
          <IconClose width={18} height={18} />
        </button>
      </div>
    </div>
  )
}
