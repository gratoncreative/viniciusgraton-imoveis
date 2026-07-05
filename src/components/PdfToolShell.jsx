import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSEO } from '../useSEO'
import { pdfLive } from '../pdfTools'
import '../styles/pdf-tools.css'

const SITE = 'https://viniciusgraton.com.br'

// Cross-link entre as ferramentas (navegação + SEO de interligação) — derivado do
// catálogo único (pdfTools.js), então inclui automaticamente toda ferramenta "live".
export const PDF_TOOLS = pdfLive().map((t) => ({ slug: t.slug, label: t.nome, desc: t.desc }))

// helper de ícone (path único)
function ico(d, size = 14, sw = 2) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
}
const iShield = (s = 14) => <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
const iTag = (s = 13) => <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>

/**
 * Casca compartilhada das ferramentas de PDF. Renderiza o cromo (nav, cabeçalho,
 * nota de privacidade, como funciona, benefícios, cross-link, FAQ), aplica o SEO
 * (useSEO) e injeta o JSON-LD (WebApplication + BreadcrumbList + FAQPage).
 * A UI específica de cada ferramenta entra como {children}.
 */
export default function PdfToolShell({ seo, tag, icon, titulo, sub, chips, children, howSteps, benefits, faqItems, schema, currentSlug }) {
  useSEO(seo)

  // Sistema CLARO (igual ao resto do site) — garante a página branca.
  useEffect(() => {
    const html = document.documentElement
    const anterior = html.getAttribute('data-theme')
    html.setAttribute('data-theme', 'claro')
    return () => { html.setAttribute('data-theme', anterior || 'claro') }
  }, [])

  useEffect(() => {
    const url = SITE + seo.path
    const graph = [
      {
        '@type': 'WebApplication',
        '@id': `${url}#app`,
        name: schema.name,
        url,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Web',
        inLanguage: 'pt-BR',
        browserRequirements: 'Requires JavaScript. Works on Chrome, Firefox, Safari, Edge.',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
        featureList: schema.featureList || [],
        description: schema.description || seo.description,
        provider: { '@type': 'Person', name: 'Vinícius Graton', url: SITE },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Início', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: 'Ferramentas', item: `${SITE}/ferramentas` },
          { '@type': 'ListItem', position: 3, name: schema.name, item: url },
        ],
      },
    ]
    if (faqItems?.length) {
      graph.push({ '@type': 'FAQPage', mainEntity: faqItems.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) })
    }
    const data = { '@context': 'https://schema.org', '@graph': graph }
    const id = `schema-${currentSlug}`
    let el = document.head.querySelector(`#${id}`)
    if (!el) { el = document.createElement('script'); el.type = 'application/ld+json'; el.id = id; document.head.appendChild(el) }
    el.textContent = JSON.stringify(data)
    return () => { document.head.querySelector(`#${id}`)?.remove() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seo.path, currentSlug])

  const outras = PDF_TOOLS.filter((t) => t.slug !== currentSlug)
  const allChips = chips || ['100% Gratuito', 'Sem upload', 'Sem cadastro', "Sem marca d'água"]

  return (
    <main className="pagina pdfjpg-pg">
      {/* nav topo */}
      <div className="pdfjpg-nav">
        <div className="container pdfjpg-nav-inner">
          <Link to="/ferramentas" className="pdfjpg-back">
            {ico('M19 12H5M12 19l-7-7 7-7', 15, 2.2)}
            Ferramentas
          </Link>
          <span className="pdfjpg-nav-tag">{tag}</span>
        </div>
      </div>

      <div className="container pdfjpg-wrap">
        {/* cabeçalho */}
        <div className="pdfjpg-header">
          <div className="pdfjpg-header-icon">{icon}</div>
          <div>
            <h1 className="pdfjpg-titulo">{titulo}</h1>
            <p className="pdfjpg-sub">{sub}</p>
            <div className="pdfjpg-trust-chips">
              {allChips.map((c, i) => (
                <span key={i} className={`pdfjpg-trust-chip${i === 0 ? ' pdfjpg-trust-chip--free' : ''}`}>
                  {i === 0 ? iTag(13) : null} {c}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* UI da ferramenta */}
        {children}

        {/* nota de privacidade */}
        <div className="pdfjpg-privacy">
          {iShield(14)}
          Seus arquivos nunca saem do seu dispositivo. Todo o processamento é feito localmente no seu navegador. Não temos servidor para receber uploads, é matematicamente impossível vazar.
        </div>

        {/* como funciona */}
        {howSteps?.length > 0 && (
          <section className="pdfjpg-how">
            <h2 className="pdfjpg-section-title">Como funciona</h2>
            <div className="pdfjpg-how-steps">
              {howSteps.map((s, i) => (
                <div key={i} className="pdfjpg-how-step">
                  <span className="pdfjpg-how-num">{i + 1}</span>
                  <h3>{s.t}</h3>
                  <p>{s.d}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* benefícios */}
        {benefits?.length > 0 && (
          <section className="pdfjpg-benefits">
            <h2 className="pdfjpg-section-title">Por que usar esta ferramenta</h2>
            <div className="pdfjpg-benefits-grid">
              {benefits.map((b, i) => (
                <div key={i} className="pdfjpg-benefit">
                  <span className="pdfjpg-benefit-ico">{ico(b.ico, 20, 1.8)}</span>
                  <h3>{b.t}</h3>
                  <p>{b.d}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* cross-link: outras ferramentas de PDF */}
        <section className="pdftools-related">
          <h2 className="pdfjpg-section-title">Todas as ferramentas de PDF, grátis</h2>
          <div className="pdftools-related-grid">
            {outras.map((t) => (
              <Link key={t.slug} to={`/ferramentas/${t.slug}`} className="pdftools-related-card">
                <strong>{t.label}</strong>
                <span>{t.desc}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* FAQ */}
        {faqItems?.length > 0 && (
          <section className="pdfjpg-faq">
            <h2 className="pdfjpg-section-title">Perguntas frequentes</h2>
            <div className="pdfjpg-faq-list">
              {faqItems.map((item, i) => (
                <details key={i} className="pdfjpg-faq-item">
                  <summary className="pdfjpg-faq-q">{item.q}</summary>
                  <p className="pdfjpg-faq-a">{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
