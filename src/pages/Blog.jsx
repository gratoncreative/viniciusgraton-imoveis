import { useState, useEffect, useRef } from 'react'
import Reveal from '../components/Reveal'
import CardPost from '../components/CardPost'
import { POSTS } from '../blog'
import { lerBlogViews } from '../engajamento'
import { useSEO } from '../useSEO'

const CATEGORIAS = ['Todos', ...Array.from(new Set(POSTS.map((p) => p.categoria)))]

export default function Blog() {
  useSEO({
    title: 'Blog — guias de compra, financiamento e bairros de Uberlândia',
    description: 'Conteúdo prático sobre comprar imóvel em Uberlândia: FGTS, financiamento, ITBI, bairros e mercado. Por Vinícius Graton, consultor de imóveis.',
    path: '/blog',
  })

  useEffect(() => {
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = 'blog-index-jsonld'
    el.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          '@id': 'https://viniciusgraton.com.br/blog',
          url: 'https://viniciusgraton.com.br/blog',
          name: 'Blog — Guias de Compra de Imóveis em Uberlândia',
          description: 'Conteúdo prático sobre comprar imóvel em Uberlândia: FGTS, financiamento, ITBI, bairros e mercado.',
          inLanguage: 'pt-BR',
          publisher: { '@type': 'RealEstateAgent', name: 'Vinícius Graton Imóveis', url: 'https://viniciusgraton.com.br' },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Início', item: 'https://viniciusgraton.com.br/' },
            { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://viniciusgraton.com.br/blog' },
          ],
        },
      ],
    })
    document.head.appendChild(el)
    return () => { document.getElementById('blog-index-jsonld')?.remove() }
  }, [])

  const [cat, setCat] = useState('Todos')
  const [views, setViews] = useState({})
  const [mostrar, setMostrar] = useState(12)
  const sentinela = useRef(null)
  useEffect(() => { lerBlogViews().then(setViews) }, [])
  const ordenados = [...POSTS].sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')))
  const lista = cat === 'Todos' ? ordenados : ordenados.filter((p) => p.categoria === cat)
  const visiveis = lista.slice(0, mostrar)
  const temMais = mostrar < lista.length
  useEffect(() => { setMostrar(12) }, [cat])
  useEffect(() => {
    if (!temMais) return
    const el = sentinela.current; if (!el) return
    const obs = new IntersectionObserver((e) => { if (e[0].isIntersecting) setMostrar((m) => m + 12) }, { rootMargin: '800px 0px' })
    obs.observe(el); return () => obs.disconnect()
  }, [temMais, cat])

  return (
    <main className="pagina section--light det blog-pg">
      <div className="container">
        <Reveal>
          <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 8px' }}>
            <span className="eyebrow" style={{ justifyContent: 'center' }}>Blog</span>
            <h1 className="section-title">Aprenda a comprar <em>sem errar</em></h1>
            <p className="section-sub" style={{ marginTop: 14 }}>
              Guias diretos sobre financiamento, FGTS, custos, bairros e mercado de Uberlândia — pra você decidir com segurança.
            </p>
          </div>
        </Reveal>

        <div className="condo-chips" style={{ justifyContent: 'center', margin: '26px 0 30px' }}>
          {CATEGORIAS.map((c) => (
            <button key={c} className={`condo-chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>

        <div className="post-grid">
          {visiveis.map((p) => <CardPost key={p.slug} p={p} views={views[p.slug] || 0} />)}
        </div>
        {temMais && <div ref={sentinela} className="cat-infinito" aria-hidden="true"><span className="rota-spinner" /> Carregando mais artigos…</div>}
      </div>
    </main>
  )
}
