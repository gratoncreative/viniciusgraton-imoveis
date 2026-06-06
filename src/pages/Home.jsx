import Hero from '../components/Hero'
import Destaque from '../components/Destaque'
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
      <Destaque limite={9} />
      <Contato />
    </main>
  )
}
