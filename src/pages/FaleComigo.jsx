import Contato from '../components/Contato'
import { useSEO } from '../useSEO'

export default function FaleComigo() {
  useSEO({
    title: 'Contato - fale com o Vinícius',
    description:
      'Fale com Vinícius Graton, consultor de imóveis em Uberlândia. Me conta o que você procura no WhatsApp e eu direciono as melhores opções, sem compromisso.',
    path: '/contato',
  })
  return (
    <main className="pagina">
      <h1 className="sr-only">Contato - fale com Vinícius Graton, imóveis em Uberlândia</h1>
      <Contato />
    </main>
  )
}
