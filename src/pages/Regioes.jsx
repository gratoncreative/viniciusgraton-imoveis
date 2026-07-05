import Bairros from '../components/Bairros'
import { useSEO } from '../useSEO'

export default function Regioes() {
  useSEO({
    title: 'Imóveis por região em Uberlândia',
    description:
      'Atuo nos principais bairros de Uberlândia - Jardim Karaíba, Gávea, Morada da Colina, Granja Marileusa, Santa Mônica, Tabajaras, Cidade Jardim e mais. Encontre imóveis na região certa pra você.',
    path: '/regioes',
  })
  return (
    <main className="pagina">
      <h1 className="sr-only">Imóveis por bairro e região em Uberlândia</h1>
      <Bairros />
    </main>
  )
}
