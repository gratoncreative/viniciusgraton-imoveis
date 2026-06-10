import { Link } from 'react-router-dom'
import Reveal from './Reveal'
import CardImovel from './CardImovel'
import { IMOVEIS } from '../data'
import { IconArrow } from './icons'

export default function Destaque({ limite = 6 }) {
  if (!IMOVEIS.length) return null
  const lista = IMOVEIS.slice(0, limite)

  return (
    <section id="destaque" className="section--light">
      <div className="container">
        <div className="sec-head">
          <Reveal>
            <div>
              <span className="eyebrow">Atualizado diariamente</span>
              <h2 className="section-title">Imóveis em <em>destaque</em></h2>
              <p className="section-sub" style={{ marginTop: 14, maxWidth: 560 }}>
                Uma seleção dos imóveis mais recentes da minha carteira em Uberlândia.
                Novas oportunidades entram aqui todos os dias.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <Link className="btn btn-ghost" to="/imoveis">
              Ver todos os imóveis <IconArrow />
            </Link>
          </Reveal>
        </div>

        <div className="im-grid" style={{ perspective: '1400px' }}>
          {lista.map((im, i) => (
            <Reveal key={im.codigo} delay={(i % 3) * 0.08}>
              <CardImovel im={im} />
            </Reveal>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 44 }}>
          <Link className="btn btn-gold" to="/imoveis">
            Ver catálogo completo <IconArrow />
          </Link>
        </div>
      </div>
    </section>
  )
}
