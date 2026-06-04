import Reveal from './Reveal'
import { PASSOS } from '../data'

export default function ComoFunciona() {
  return (
    <section id="processo" className="section--light">
      <div className="container">
        <Reveal>
          <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 56px' }}>
            <span className="eyebrow" style={{ justifyContent: 'center' }}>O caminho até as chaves</span>
            <h2 className="section-title">Como funciona, <em>na prática</em></h2>
            <p className="section-sub" style={{ margin: '16px auto 0' }}>
              Um processo claro e sem surpresas. Você sempre sabe em que etapa está e qual o próximo passo.
            </p>
          </div>
        </Reveal>

        <div className="passos">
          {PASSOS.map((p, i) => (
            <Reveal key={p.n} delay={i * 0.1}>
              <div className="passo">
                <span className="glow" />
                <span className="n">{p.n}</span>
                <h4>{p.titulo}</h4>
                <p>{p.texto}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
