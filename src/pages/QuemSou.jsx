import Sobre from '../components/Sobre'
import Compromisso from '../components/Compromisso'
import { useSEO } from '../useSEO'

export default function QuemSou() {
  useSEO({
    title: 'Sobre mim — consultor de imóveis em Uberlândia',
    description:
      'Vinícius Graton, consultor de imóveis em Uberlândia. Curadoria personalizada, olhar de investimento, documentação conferida e atendimento direto comigo — do primeiro contato à chave na sua mão.',
    path: '/sobre',
  })
  return (
    <main className="pagina">
      <h1 className="sr-only">Sobre Vinícius Graton, consultor de imóveis em Uberlândia</h1>
      <Sobre />
      <Compromisso />
    </main>
  )
}
