import { useEffect } from 'react'
import Reveal from './Reveal'
import { FAQ, linkWhatsApp } from '../data'
import { IconWhats } from './icons'

export default function Faq() {
  // FAQPage JSON-LD dinâmico (sempre em sincronia com as perguntas reais) — rich result no Google
  useEffect(() => {
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = 'faq-jsonld'
    el.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    })
    document.head.appendChild(el)
    return () => { document.getElementById('faq-jsonld')?.remove() }
  }, [])

  return (
    <section id="faq" className="section--light">
      <div className="container faq-wrap">
        <Reveal>
          <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 48px' }}>
            <span className="eyebrow" style={{ justifyContent: 'center' }}>Tire suas dúvidas</span>
            <h2 className="section-title">Perguntas <em>frequentes</em></h2>
            <p className="section-sub" style={{ marginTop: 14 }}>
              As 30 dúvidas que mais aparecem na hora de comprar — respondidas de forma direta. Ficou outra? É só me chamar.
            </p>
          </div>
        </Reveal>

        <div className="faq-list">
          {FAQ.map((f, i) => (
            <Reveal key={i} delay={Math.min(i, 6) * 0.04}>
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
              rel="noopener noreferrer"
            >
              <IconWhats /> Perguntar no WhatsApp
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
