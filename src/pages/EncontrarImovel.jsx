import ChatBusca from '../components/ChatBusca'
import { useSEO } from '../useSEO'

export default function EncontrarImovel() {
  useSEO({
    title: 'Encontre seu imóvel em 1 minuto · Vinícius Graton',
    description: 'Responda algumas perguntas rápidas e receba uma seleção de imóveis em Uberlândia feita sob medida pra você, com curadoria do Vinícius Graton.',
    path: '/encontrar-imovel',
  })
  return (
    <main className="pagina">
      <header className="encontrar-hero">
        <div className="container">
          <span className="eyebrow">Busca guiada · leva 1 minuto</span>
          <h1 className="section-title">Vamos encontrar o imóvel <em>certo pra você</em></h1>
          <p className="section-sub" style={{ maxWidth: 620, margin: '12px auto 0' }}>
            Em vez de te encher de anúncio aleatório, prefiro entender o que você procura. Responde rapidinho aqui que eu monto sua seleção e ela fica salva num link só seu.
          </p>
        </div>
      </header>
      <section className="section--light">
        <div className="container">
          <ChatBusca />
        </div>
      </section>
    </main>
  )
}
