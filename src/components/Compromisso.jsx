import Reveal from './Reveal'
import { COMPROMISSO, COMPROMISSO_IMG } from '../data'
import { ICONS } from './icons'

export default function Compromisso() {
  return (
    <section id="compromisso">
      <div className="container compromisso-grid">
        <Reveal>
          <div className="compromisso-photo">
            <img src={COMPROMISSO_IMG} alt="Casal feliz realizando o sonho do imóvel próprio" loading="lazy" />
            <div className="compromisso-photo-tag">O sonho do imóvel próprio, com segurança</div>
          </div>
        </Reveal>

        <div className="compromisso-content">
          <Reveal>
            <span className="eyebrow">Por que confiar</span>
            <h2 className="section-title">Meu <em>compromisso</em> com você</h2>
            <p className="section-sub">
              Comprar bem é comprar com clareza e segurança. É isso que eu garanto, do primeiro
              contato até a chave na sua mão.
            </p>
          </Reveal>

          <div className="compromisso-list">
            {COMPROMISSO.map((c, i) => {
              const Icon = ICONS[c.icon]
              return (
                <Reveal key={i} delay={0.1 + i * 0.08}>
                  <div className="comp-item">
                    <span className="comp-item-ico">{Icon && <Icon />}</span>
                    <div>
                      <h4>{c.titulo}</h4>
                      <p>{c.texto}</p>
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
