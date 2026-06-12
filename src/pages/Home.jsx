import { lazy, Suspense } from 'react'
import Hero from '../components/Hero'
import ParaVoce from '../components/ParaVoce'
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

  return (
    <main>
      <Hero />
      <ParaVoce />
      <Suspense fallback={null}>
        <Novidades />
        <Destaque limite={9} />
        <FerramentasHome />
        <CorretorBanner />
        <VenderCta />
        <BlogHome />
      </Suspense>
    </main>
  )
}
