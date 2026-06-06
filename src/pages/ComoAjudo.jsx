import Dores from '../components/Dores'
import ComoFunciona from '../components/ComoFunciona'
import Imoveis from '../components/Imoveis'
import Faq from '../components/Faq'
import { useSEO } from '../useSEO'

export default function ComoAjudo() {
  useSEO({
    title: 'Como eu te ajudo a comprar seu imóvel',
    description:
      'Do primeiro contato à entrega das chaves: curadoria, visitas, negociação e documentação conferida. Veja o passo a passo de uma compra segura em Uberlândia com Vinícius Graton.',
    path: '/como-funciona',
  })
  return (
    <main className="pagina">
      <h1 className="sr-only">Como comprar seu imóvel em Uberlândia com segurança</h1>
      <Dores />
      <ComoFunciona />
      <Imoveis />
      <Faq />
    </main>
  )
}
