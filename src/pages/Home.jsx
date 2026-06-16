import { lazy, Suspense, useEffect } from 'react'
import Hero from '../components/Hero'
import { useSEO } from '../useSEO'

const Novidades = lazy(() => import('../components/Novidades'))
const Destaque = lazy(() => import('../components/Destaque'))
const FerramentasHome = lazy(() => import('../components/FerramentasHome'))
const CorretorBanner = lazy(() => import('../components/CorretorBanner'))
const VenderCta = lazy(() => import('../components/VenderCta'))
const BlogHome = lazy(() => import('../components/BlogHome'))

export default function Home() {
  useSEO({
    title: 'Consultor de Imóveis em Uberlândia',
    description:
      'Imóveis à venda em Uberlândia com Vinícius Graton: casas, apartamentos, alto padrão e investimento. Compre seu imóvel sem medo de errar, com curadoria e segurança em cada etapa.',
    path: '/',
  })

  // Sistema CLARO (Manual v2.0) só na home — desliga o tema escuro global aqui,
  // para que o escopo .tema-claro mande (as regras html[data-theme="dark"] saem).
  useEffect(() => {
    const html = document.documentElement
    const anterior = html.getAttribute('data-theme')
    html.setAttribute('data-theme', 'claro')
    const meta = document.querySelector('meta[name="theme-color"]')
    const corAnterior = meta?.getAttribute('content')
    if (meta) meta.setAttribute('content', '#FFFFFF')
    return () => {
      html.setAttribute('data-theme', anterior || 'dark')
      if (meta && corAnterior) meta.setAttribute('content', corAnterior)
    }
  }, [])

  useEffect(() => {
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = 'home-schema'
    el.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'RealEstateAgent',
      name: 'Vinícius Graton Imóveis',
      description: 'Consultoria imobiliária personalizada em Uberlândia/MG. Casas, apartamentos e imóveis de alto padrão à venda com curadoria e atendimento direto do primeiro contato à entrega das chaves.',
      url: 'https://viniciusgraton.com.br',
      telephone: '+55-34-99157-0494',
      email: 'contato@viniciusgraton.com.br',
      sameAs: ['https://www.instagram.com/viniciusgraton.imoveis/'],
      address: { '@type': 'PostalAddress', addressLocality: 'Uberlândia', addressRegion: 'MG', addressCountry: 'BR' },
      areaServed: { '@type': 'City', name: 'Uberlândia', addressRegion: 'MG', addressCountry: 'BR' },
      hasOfferCatalog: { '@type': 'OfferCatalog', name: 'Imóveis à venda em Uberlândia', url: 'https://viniciusgraton.com.br/imoveis' },
      employee: {
        '@type': 'Person',
        name: 'Vinícius Graton',
        jobTitle: 'Consultor de Imóveis',
        worksFor: { '@type': 'Organization', name: 'Rotina Imobiliária', url: 'https://www.rotina.com.br', identifier: 'CRECI PJ 132' },
      },
    })
    document.head.appendChild(el)
    return () => { document.getElementById('home-schema')?.remove() }
  }, [])

  return (
    <main className="tema-claro">
      <Hero />
      <Suspense fallback={null}>
        <Novidades />
        <Destaque limite={8} />
        <FerramentasHome />
        <CorretorBanner />
        <VenderCta />
        <BlogHome />
      </Suspense>
    </main>
  )
}
