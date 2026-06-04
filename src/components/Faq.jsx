import Reveal from './Reveal'
import { FAQ, linkWhatsApp } from '../data'
import { IconWhats } from './icons'

export default function Faq() {
  return (
    <section id="faq" className="section--light">
      <div className="container faq-wrap">
        <Reveal>
          <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 48px' }}>
            <span className="eyebrow" style={{ justifyContent: 'center' }}>Tire suas dúvidas</span>
            <h2 className="section-title">Perguntas <em>frequentes</em></h2>
          </div>
        </Reveal>

        <div className="faq-list">
          {FAQ.map((f, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <details className="faq-item">
                <summary>
                  <span>{f.q}</span>
                  <span className="faq-plus" aria-hidden="true" />
                </summary>
                <p>{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="faq-cta">
            <span>Ficou com outra dúvida?</span>
            <a
              className="btn btn-gold"
              href={linkWhatsApp('Olá Vinícius! Tenho uma dúvida sobre comprar imóvel. Pode me ajudar?')}
              target="_blank"
              rel="noopener"
            >
              <IconWhats /> Perguntar no WhatsApp
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
