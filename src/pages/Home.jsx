import Hero from '../components/Hero'
import Apresentacao from '../components/Apresentacao'
import Destaque from '../components/Destaque'
import BlogHome from '../components/BlogHome'
import VenderCta from '../components/VenderCta'
import Contato from '../components/Contato'
import { useSEO } from '../useSEO'

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
      <Apresentacao />
      <Destaque limite={9} />
      <VenderCta />
      <BlogHome />
      <Contato />
    </main>
  )
}
