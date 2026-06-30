import { useEffect, useState, lazy, Suspense } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSEO } from '../useSEO'
import { CONFIG, IMOVEIS, linkWhatsApp } from '../data'

// Home REBRAND (direção 1 "Clean & tech": ice + tinta + índigo, Inter).
// Autocontida: traz o próprio cabeçalho e rodapé (o App esconde o chrome global na "/").
// As outras páginas seguem intactas até as próximas ondas do rebrand.

const BlogHome = lazy(() => import('../components/BlogHome'))

const fmtPreco = (v) =>
  v >= 1e6 ? `R$ ${(v / 1e6).toFixed(v % 1e6 === 0 ? 0 : 1).replace('.', ',')} mi`
    : v > 0 ? `R$ ${Math.round(v).toLocaleString('pt-BR')}`
      : 'Sob consulta'

const WA_FALAR = 'Olá Vinícius! Vim pelo site e quero falar com você sobre imóveis.'
const WA_VENDER = 'Olá Vinícius! Quero avaliar e anunciar o meu imóvel.'

const FEATS = [
  { d: 'M9 9a3 3 0 1 0 0-0.01M3.5 19a5.5 5.5 0 0 1 11 0M17 8.5a2.5 2.5 0 0 1 0 5M19 19a4 4 0 0 0-3-3.8', t: 'Curadoria pessoal', s: 'Eu seleciono o que faz sentido pra você, sem te encher de opção solta.' },
  { d: 'M15 7a4 4 0 1 0-3.5 3.97L8 14.5V17h2.5l.5-.5.5.5H14v-2l1.5-1.5A4 4 0 0 0 15 7z', t: 'Do café à chave', s: 'Acompanho cada etapa: visita, proposta, financiamento e registro.' },
  { d: 'M14.7 6.3a4 4 0 0 0-5.4 5.4l-6 6V20h2.3l6-6a4 4 0 0 0 5.4-5.4l-2.3 2.3-1.4-.6-.6-1.4 2-2z', t: 'Ferramentas grátis', s: 'Simuladores, estudo do m² e suíte de PDF, sem pagar nada.' },
]

function CardImovelNovo({ im, hero }) {
  return (
    <Link to={`/imovel/${im.codigo}`} className={hero ? 'hr-hero-card' : 'hr-card'}>
      <div className="hr-card-img" style={im.img ? { backgroundImage: `url(${im.img})` } : undefined}>
        {(im.tour360 || im.tour3d) && <span className="hr-card-360">360°</span>}
        {hero && <span className="hr-card-badge">Destaque</span>}
      </div>
      <div className="hr-card-body">
        <div className="hr-card-preco">{fmtPreco(im.preco)}</div>
        <div className="hr-card-loc">{im.tipo}{im.bairro ? ` · ${im.bairro}` : ''}</div>
        <div className="hr-card-specs">
          {im.quartos > 0 && <span>{im.quartos} quartos</span>}
          {im.vagas > 0 && <span>{im.vagas} vagas</span>}
          {im.area > 0 && <span>{Math.round(im.area)} m²</span>}
        </div>
      </div>
    </Link>
  )
}

export default function HomeRebrand() {
  useSEO({
    title: 'Consultor de Imóveis em Uberlândia',
    description: 'Imóveis à venda em Uberlândia com Vinícius Graton: casas, apartamentos, alto padrão e investimento. Curadoria pessoal e segurança em cada etapa, do primeiro café à entrega das chaves.',
    path: '/',
  })
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  // tema claro nesta página
  useEffect(() => {
    const html = document.documentElement
    const anterior = html.getAttribute('data-theme')
    html.setAttribute('data-theme', 'claro')
    return () => { html.setAttribute('data-theme', anterior || 'claro') }
  }, [])

  // schema RealEstateAgent (igual ao da home antiga)
  useEffect(() => {
    const el = document.createElement('script')
    el.type = 'application/ld+json'; el.id = 'home-schema'
    el.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'RealEstateAgent',
      name: 'Vinícius Graton Imóveis',
      description: 'Consultoria imobiliária personalizada em Uberlândia/MG, do primeiro contato à entrega das chaves.',
      url: 'https://viniciusgraton.com.br', telephone: '+55-34-99157-0494', email: 'contato@viniciusgraton.com.br',
      sameAs: ['https://www.instagram.com/viniciusgraton.imoveis/', ...(CONFIG.googleBusinessUrl ? [CONFIG.googleBusinessUrl] : [])],
      address: { '@type': 'PostalAddress', addressLocality: 'Uberlândia', addressRegion: 'MG', addressCountry: 'BR' },
      areaServed: { '@type': 'City', name: 'Uberlândia', addressRegion: 'MG', addressCountry: 'BR' },
      ...(CONFIG.googleRating > 0 && CONFIG.googleReviewCount > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: CONFIG.googleRating, reviewCount: CONFIG.googleReviewCount, bestRating: 5 } } : {}),
    })
    document.head.appendChild(el)
    return () => { document.getElementById('home-schema')?.remove() }
  }, [])

  const destaques = [...IMOVEIS]
    .sort((a, b) => (Date.parse(b.visto || '') || 0) - (Date.parse(a.visto || '') || 0))
    .slice(0, 7)
  const heroIm = destaques[0]
  const grid = destaques.slice(1, 7)

  const buscar = (e) => {
    e.preventDefault()
    navigate('/imoveis' + (q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''))
  }

  return (
    <div className="hr">
      {/* ── Cabeçalho ── */}
      <header className="hr-nav">
        <div className="hr-nav-in">
          <Link to="/" className="hr-logo">Vinícius Graton</Link>
          <nav className="hr-links" aria-label="Principal">
            <Link to="/imoveis">Comprar</Link>
            <Link to="/lancamentos">Lançamentos</Link>
            <Link to="/ferramentas">Ferramentas</Link>
            <Link to="/blog">Blog</Link>
            <a className="hr-btn hr-btn-primary" href={linkWhatsApp(WA_FALAR)} target="_blank" rel="noopener noreferrer">Falar comigo</a>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="hr-hero">
        <div className="hr-hero-in">
          <div className="hr-hero-txt">
            <span className="hr-eyebrow">Imóveis em Uberlândia</span>
            <h1 className="hr-h1">Encontre o endereço da próxima fase da sua vida</h1>
            <p className="hr-sub">Curadoria pessoal de casas, apartamentos e terrenos, do primeiro café à entrega das chaves.</p>
            <form className="hr-search" onSubmit={buscar} role="search">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Bairro, tipo ou código…" aria-label="Buscar imóvel" />
              <button type="submit" className="hr-btn hr-btn-primary">Buscar</button>
            </form>
          </div>
          {heroIm && <CardImovelNovo im={heroIm} hero />}
        </div>
      </section>

      {/* ── Números ── */}
      <section className="hr-stats" aria-label="Resumo">
        <div className="hr-stat"><b>{IMOVEIS.length.toLocaleString('pt-BR')}+</b><span>imóveis no ar</span></div>
        <div className="hr-stat"><b>71</b><span>bairros de Uberlândia</span></div>
        <div className="hr-stat"><b className="hr-ink">Pessoal</b><span>atendimento direto</span></div>
        <div className="hr-stat"><b className="hr-ink">Grátis</b><span>pra anunciar</span></div>
      </section>

      {/* ── Imóveis em destaque ── */}
      <section className="hr-sec">
        <div className="hr-sec-head">
          <h2>Imóveis em destaque</h2>
          <Link to="/imoveis" className="hr-link">Ver todos →</Link>
        </div>
        <div className="hr-grid">
          {grid.map((im) => <CardImovelNovo key={im.codigo} im={im} />)}
        </div>
      </section>

      {/* ── Por que comigo ── */}
      <section className="hr-sec hr-sec--alt">
        <h2 className="hr-sec-titulo">Por que comigo</h2>
        <div className="hr-feats">
          {FEATS.map((f) => (
            <div key={f.t} className="hr-feat">
              <span className="hr-feat-ico"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={f.d} /></svg></span>
              <strong>{f.t}</strong>
              <span>{f.s}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Faixa de CTA ── */}
      <section className="hr-ctaband">
        <div className="hr-ctaband-in">
          <div>
            <strong>Vai vender seu imóvel?</strong>
            <span>Avalie de graça e anuncie em todos os portais.</span>
          </div>
          <a className="hr-btn hr-btn-light" href={linkWhatsApp(WA_VENDER)} target="_blank" rel="noopener noreferrer">Avaliar meu imóvel</a>
        </div>
      </section>

      {/* ── Blog (reaproveitado) ── */}
      <div className="hr-blog">
        <Suspense fallback={null}><BlogHome /></Suspense>
      </div>

      {/* ── Rodapé ── */}
      <footer className="hr-footer">
        <div className="hr-footer-in">
          <div className="hr-footer-col">
            <div className="hr-footer-logo">Vinícius Graton</div>
            <p>Consultor de imóveis em Uberlândia. Do primeiro café à entrega das chaves.</p>
          </div>
          <nav className="hr-footer-col" aria-label="Navegação">
            <Link to="/imoveis">Comprar</Link>
            <Link to="/lancamentos">Lançamentos</Link>
            <Link to="/ferramentas">Ferramentas</Link>
            <Link to="/blog">Blog</Link>
          </nav>
          <div className="hr-footer-col">
            <a href={linkWhatsApp(WA_FALAR)} target="_blank" rel="noopener noreferrer">(34) 99157-0494</a>
            <a href="https://www.instagram.com/viniciusgraton.imoveis/" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href="mailto:contato@viniciusgraton.com.br">contato@viniciusgraton.com.br</a>
          </div>
        </div>
        <div className="hr-footer-base">© {new Date().getFullYear()} Vinícius Graton · Uberlândia, MG</div>
      </footer>
    </div>
  )
}
