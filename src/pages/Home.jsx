import { lazy, Suspense } from 'react'
import Hero from '../components/Hero'
import Destaque from '../components/Destaque'
import VenderCta from '../components/VenderCta'
import Novidades from '../components/Novidades'
import { useSEO } from '../useSEO'

const BlogHome = lazy(() => import('../components/BlogHome'))

// Página inicial = VITRINE. Lidera com os imóveis disponíveis; o conteúdo de
// apoio (como eu te ajudo, sobre, regiões) virou página própria no menu.
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
      <Novidades />
      <Destaque limite={9} />
      <VenderCta />
      <Suspense fallback={null}><BlogHome /></Suspense>
    </main>
  )
}
