import { useEffect } from 'react'
import Reveal from './Reveal'
import { DEPOIMENTOS, CONFIG } from '../data'

// #6 — prova social na home. Só renderiza quando há depoimentos REAIS cadastrados
// em CONFIG/DEPOIMENTOS (nunca inventa). Quando há, injeta schema.org/Review.
export default function Depoimentos() {
  const itens = (DEPOIMENTOS || []).filter((d) => d && d.texto && d.nome)

  useEffect(() => {
    if (!itens.length) return
    const reviews = itens.map((d) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: d.nome },
      reviewBody: d.texto,
      ...(d.nota ? { reviewRating: { '@type': 'Rating', ratingValue: d.nota, bestRating: 5 } } : {}),
      itemReviewed: { '@type': 'RealEstateAgent', name: CONFIG.marca },
    }))
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = 'depoimentos-schema'
    el.textContent = JSON.stringify(reviews.length === 1 ? reviews[0] : reviews)
    document.getElementById('depoimentos-schema')?.remove()
    document.head.appendChild(el)
    return () => { document.getElementById('depoimentos-schema')?.remove() }
  }, [itens.length])

  const temGoogle = CONFIG.googleRating > 0 && CONFIG.googleReviewCount > 0
  if (!itens.length && !temGoogle) return null

  return (
    <section className="section depo-sec">
      <div className="container">
        <Reveal>
          <div className="depo-head">
            <span className="eyebrow">Quem já comprou comigo</span>
            <h2 className="section-title">Histórias de quem <em>decidiu com segurança</em></h2>
            {temGoogle && (
              <a className="depo-google" href={CONFIG.googleBusinessUrl || undefined} target="_blank" rel="noopener noreferrer">
                <span className="depo-google-nota">{String(CONFIG.googleRating).replace('.', ',')}</span>
                <span className="depo-google-estrelas" aria-hidden="true">{'★'.repeat(Math.round(CONFIG.googleRating))}<i>{'★'.repeat(5 - Math.round(CONFIG.googleRating))}</i></span>
                <span className="depo-google-txt">no Google · {CONFIG.googleReviewCount} avaliações</span>
              </a>
            )}
          </div>
        </Reveal>
        {itens.length > 0 && (
        <div className="depo-grid">
          {itens.map((d, i) => (
            <Reveal key={i} delay={i * 60}>
              <figure className="depo-card">
                {d.nota > 0 && (
                  <div className="depo-estrelas" aria-label={`${d.nota} de 5 estrelas`}>
                    {'★'.repeat(Math.round(d.nota))}<span>{'★'.repeat(5 - Math.round(d.nota))}</span>
                  </div>
                )}
                <blockquote>{d.texto}</blockquote>
                <figcaption>
                  <b>{d.nome}</b>
                  {d.contexto && <span>{d.contexto}</span>}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
        )}
      </div>
    </section>
  )
}
