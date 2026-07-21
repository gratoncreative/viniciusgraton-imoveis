import { useState, useEffect, useRef, useMemo } from 'react'
import { useSEO } from '../useSEO'
import { linkWhatsApp } from '../data'
import { lerBlogViews } from '../engajamento'
import { NavbarVG, FooterVG, WhatsFloatVG } from '../components/vg/ChromeVG'
import { CardPostVG } from '../components/vg/CardPostVG'

const POR_PAGINA = 12

export default function BlogVG() {
  useSEO({
    title: 'Blog - guias de compra, financiamento e bairros de Uberlândia',
    description:
      'Conteúdo prático sobre comprar imóvel em Uberlândia: FGTS, financiamento, ITBI, bairros e mercado. Por Vinícius Graton, consultor de imóveis.',
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
          name: 'Blog - Guias de Compra de Imóveis em Uberlândia',
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

  const [posts, setPosts] = useState(null)
  const [cat, setCat] = useState('Todos')
  const [views, setViews] = useState({})
  const [mostrar, setMostrar] = useState(POR_PAGINA)
  const sentinela = useRef(null)

  useEffect(() => {
    let vivo = true
    fetch('/blog-preview.json')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { if (vivo) setPosts(Array.isArray(d) ? d : []) })
      .catch(() => { if (vivo) setPosts([]) })
    lerBlogViews().then((v) => { if (vivo) setViews(v || {}) })
    return () => { vivo = false }
  }, [])

  useEffect(() => { setMostrar(POR_PAGINA) }, [cat])

  const categorias = useMemo(
    () => (posts ? ['Todos', ...Array.from(new Set(posts.map((p) => p.categoria).filter(Boolean)))] : ['Todos']),
    [posts],
  )
  const ordenados = useMemo(
    () => (posts ? [...posts].sort((a, b) => String(b.data || '').localeCompare(String(a.data || ''))) : []),
    [posts],
  )
  const lista = cat === 'Todos' ? ordenados : ordenados.filter((p) => p.categoria === cat)
  const visiveis = lista.slice(0, mostrar)
  const temMais = mostrar < lista.length

  // carregamento progressivo: com 189 artigos, nunca renderiza tudo de uma vez
  useEffect(() => {
    if (!temMais) return
    const el = sentinela.current
    if (!el) return
    const obs = new IntersectionObserver(
      (e) => { if (e[0].isIntersecting) setMostrar((m) => m + POR_PAGINA) },
      { rootMargin: '800px 0px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [temMais, cat])

  const wa = linkWhatsApp('Olá Vinícius! Tenho uma dúvida sobre comprar imóvel em Uberlândia.')

  return (
    <div className="vgx">
      <NavbarVG ativo="blog" />

      <section className="vgx-blog-hero">
        <div className="vgx-goldgrid" />
        <div className="vgx-blog-hero-in">
          <span className="vgx-kicker vgx-kicker--gold">Blog</span>
          <h1>Para decidir com segurança</h1>
          <p>
            Guias práticos sobre bairros, financiamento e o passo a passo da compra em Uberlândia,
            escritos por quem negocia imóveis todos os dias.
          </p>
        </div>
      </section>

      <section className="vgx-blog-lista vgx-reveal">
        {posts === null ? (
          <div className="vgx-blog-carregando" aria-busy="true">Carregando os artigos...</div>
        ) : (
          <>
            {categorias.length > 1 && (
              <div className="vgx-bchips">
                {categorias.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`vgx-bchip ${cat === c ? 'is-on' : ''}`}
                    onClick={() => setCat(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            <div className="vgx-bgrid">
              {visiveis.map((p) => <CardPostVG key={p.slug} p={p} views={views[p.slug] || 0} />)}
            </div>

            {temMais && (
              <div className="vgx-blog-mais" ref={sentinela} aria-hidden="true">
                Carregando mais artigos...
              </div>
            )}
          </>
        )}

        <div className="vgx-blog-cta">
          <div className="vgx-blog-cta-col">
            <h2>Tem uma dúvida que não está aqui?</h2>
            <p>Mande sua pergunta direto para o Vinícius. As mais frequentes viram artigo no blog.</p>
          </div>
          <a href={wa} target="_blank" rel="noopener noreferrer" className="vgx-btn-red">
            Perguntar no WhatsApp
          </a>
        </div>
      </section>

      <FooterVG />
      <WhatsFloatVG />
    </div>
  )
}
