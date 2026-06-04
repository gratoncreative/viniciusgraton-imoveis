import Reveal from './Reveal'
import { DORES } from '../data'

export default function Dores() {
  return (
    <section id="dores" className="section--glow">
      <div className="container">
        <Reveal>
          <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 56px' }}>
            <span className="eyebrow" style={{ justifyContent: 'center' }}>Eu entendo a sua dor</span>
            <h2 className="section-title">Comprar um imóvel não precisa ser <em>assustador</em></h2>
            <p className="section-sub" style={{ margin: '16px auto 0' }}>
              Esses medos são normais. Meu trabalho é tirar cada um deles do seu caminho.
            </p>
          </div>
        </Reveal>

        <div className="dores-grid">
          {DORES.map((d, i) => (
            <Reveal key={i} delay={(i % 2) * 0.1}>
              <div className="dor-card">
                <p className="dor-medo">“{d.medo}”</p>
                <p className="dor-sol"><span className="dor-check">✓</span> {d.solucao}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
