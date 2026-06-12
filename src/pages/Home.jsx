import { lazy, Suspense } from 'react'
import Hero from '../components/Hero'
import ParaVoce from '../components/ParaVoce'
import Destaque from '../components/Destaque'
import Novidades from '../components/Novidades'
import FerramentasHome from '../components/FerramentasHome'
import CorretorBanner from '../components/CorretorBanner'
import VenderCta from '../components/VenderCta'
import { useSEO } from '../useSEO'

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
      <Novidades />
      <Destaque limite={9} />
      <FerramentasHome />
      <CorretorBanner />
      <VenderCta />
      <Suspense fallback={null}><BlogHome /></Suspense>
    </main>
  )
}
