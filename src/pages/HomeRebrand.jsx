import { useEffect, useState, lazy, Suspense } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSEO } from '../useSEO'
import { CONFIG, IMOVEIS, linkWhatsApp } from '../data'

// Home REBRAND v2 — fotográfica e rica (referência: loft / quintoandar), na direção
// "Clean & tech" (índigo + Inter). Autocontida: traz o próprio chrome (o App esconde o
// chrome global na "/"). Escopo CSS isolado .hr-*.

const BlogHome = lazy(() => import('../components/BlogHome'))

const HERO_IMG = 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=1920&auto=format&fit=crop'

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

function CardImovelNovo({ im }) {
  return (
    <Link to={`/imovel/${im.codigo}`} className="hr-card">
      <div className="hr-card-img" style={im.img ? { backgroundImage: `url(${im.img})` } : undefined}>
        {(im.tour360 || im.tour3d) && <span className="hr-card-360">360°</span>}
        <span className="hr-card-grad" aria-hidden="true" />
        <span className="hr-card-preco-ov">{fmtPreco(im.preco)}</span>
      </div>
      <div className="hr-card-body">
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

  useEffect(() => {
    const html = document.documentElement
    const anterior = html.getAttribute('data-theme')
    html.setAttribute('data-theme', 'claro')
    return () => { html.setAttribute('data-theme', anterior || 'claro') }
  }, [])

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
    .slice(0, 6)

  const buscar = (e) => {
    e.preventDefault()
    navigate('/imoveis' + (q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''))
  }

  return (
    <div className="hr">
      {/* ── Topo: hero fotográfico imersivo ── */}
      <header className="hr-top" style={{ backgroundImage: `url(${HERO_IMG})` }}>
        <span className="hr-top-ov" aria-hidden="true" />
        <nav className="hr-nav2" aria-label="Principal">
          <Link to="/" className="hr-logo2">Vinícius Graton</Link>
          <div className="hr-links2">
            <Link to="/imoveis">Comprar</Link>
            <Link to="/lancamentos">Lançamentos</Link>
            <Link to="/ferramentas">Ferramentas</Link>
            <Link to="/blog">Blog</Link>
            <a className="hr-btn hr-btn-light" href={linkWhatsApp(WA_FALAR)} target="_blank" rel="noopener noreferrer">Falar comigo</a>
          </div>
        </nav>
        <div className="hr-hero2">
          <span className="hr-eyebrow2">Imóveis em Uberlândia</span>
          <h1 className="hr-h1b">Encontre o endereço da<br />próxima fase da sua vida</h1>
          <p className="hr-sub2">Curadoria pessoal de casas, apartamentos e terrenos, do primeiro café à entrega das chaves.</p>
          <form className="hr-search2" onSubmit={buscar} role="search">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#9aa1b2" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Bairro, tipo ou código…" aria-label="Buscar imóvel" />
            <button type="submit" className="hr-btn hr-btn-primary">Buscar</button>
          </form>
          <div className="hr-hero-trust">
            <span><b>{IMOVEIS.length.toLocaleString('pt-BR')}+</b> imóveis</span>
            <i aria-hidden="true" />
            <span><b>71</b> bairros</span>
            <i aria-hidden="true" />
            <span>Atendimento <b>pessoal</b></span>
          </div>
        </div>
      </header>

      {/* ── Imóveis em destaque ── */}
      <section className="hr-sec">
        <div className="hr-sec-head">
          <div>
            <span className="hr-eyebrow">Atualizado todo dia</span>
            <h2>Imóveis em destaque</h2>
          </div>
          <Link to="/imoveis" className="hr-link">Ver todos →</Link>
        </div>
        <div className="hr-grid">
          {destaques.map((im) => <CardImovelNovo key={im.codigo} im={im} />)}
        </div>
        <div className="hr-grid-cta">
          <Link to="/imoveis" className="hr-btn hr-btn-primary">Ver catálogo completo</Link>
        </div>
      </section>

      {/* ── Quem te atende (humaniza) ── */}
      <section className="hr-sobre">
        <div className="hr-sobre-foto" style={{ backgroundImage: 'url(/vinicius-graton.jpg)' }} aria-hidden="true" />
        <div className="hr-sobre-txt">
          <span className="hr-eyebrow">Quem te atende</span>
          <h2>Atendimento de verdade, do começo ao fim</h2>
          <p>Sou o Vinícius. Não te jogo numa lista infinita de imóveis: eu entendo o seu momento, seleciono o que faz sentido e acompanho cada etapa, da visita ao financiamento e à entrega da chave.</p>
          <a className="hr-btn hr-btn-primary" href={linkWhatsApp(WA_FALAR)} target="_blank" rel="noopener noreferrer">Falar comigo agora</a>
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

      {/* ── Blog ── */}
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
