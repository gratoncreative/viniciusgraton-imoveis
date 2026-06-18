import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import Reveal from './Reveal'
import CardImovel from './CardImovel'
import PromoLancamento from './PromoLancamento'
import { IMOVEIS } from '../data'
import { IconArrow } from './icons'

export default function Destaque({ limite = 6 }) {
  if (!IMOVEIS.length) return null
  // a publicidade entra MISTURADA na grade (regra: anúncio no formato de card da
  // página). Abrimos 1 vaga p/ ela e mantemos o total preenchendo as linhas.
  // mais NOVOS primeiro (imóveis recém-chegados, flag `novo`); mantém a ordem nos demais
  const lista = [...IMOVEIS].sort((a, b) => (b.novo ? 1 : 0) - (a.novo ? 1 : 0)).slice(0, Math.max(0, limite - 1))
  const PROMO_POS = Math.min(2, lista.length)

  return (
    <section id="destaque" className="section--light">
      <div className="container">
        <div className="sec-head">
          <Reveal>
            <div>
              <span className="eyebrow">Atualizado diariamente</span>
              <h2 className="section-title">Imóveis em <em>destaque</em></h2>
              <p className="section-sub" style={{ marginTop: 14, maxWidth: 560 }}>
                Uma seleção dos imóveis mais recentes da carteira da Rotina Imobiliária em Uberlândia,
                com o meu atendimento pessoal. Novas oportunidades entram aqui todos os dias.
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
            <Fragment key={im.codigo}>
              {i === PROMO_POS && (
                <Reveal delay={(PROMO_POS % 4) * 0.06}><PromoLancamento variante="card" /></Reveal>
              )}
              <Reveal delay={(i % 4) * 0.06}>
                <CardImovel im={im} />
              </Reveal>
            </Fragment>
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
