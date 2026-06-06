import Construtoras from '../components/Construtoras'
import { useSEO } from '../useSEO'

export default function ConstrutorasPage() {
  useSEO({
    title: 'Construtoras de Uberlândia e seus lançamentos',
    description:
      'As principais construtoras e incorporadoras de Uberlândia e seus empreendimentos atuais — Perplan, R. Freitas, Bild, MRV, ZP, ATP e mais. Veja os lançamentos e fale com o Vinícius para visitar.',
    path: '/construtoras',
  })
  return (
    <main className="pagina">
      <h1 className="sr-only">Construtoras de Uberlândia e seus lançamentos</h1>
      <Construtoras />
    </main>
  )
}
