import Tour360Pitch from '../components/Tour360Pitch'
import { useSEO } from '../useSEO'

export default function Tour360Page() {
  useSEO({
    title: 'Tour Virtual 360° para imóveis em Uberlândia | Vinícius Graton',
    description: 'Dê um Tour Virtual 360° ao seu imóvel e venda mais rápido: o comprador visita por dentro de qualquer lugar. Registro por R$50 — ou grátis com exclusividade de 45 dias. Uberlândia.',
    path: '/tour-360',
  })
  return (
    <main className="pagina section--light">
      <div className="container" style={{ maxWidth: 920 }}>
        <Tour360Pitch variante="pagina" />
      </div>
    </main>
  )
}
