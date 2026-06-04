import Reveal from './Reveal'
import { PILARES } from '../data'
import { ICONS } from './icons'

export default function Stats() {
  return (
    <section className="stats-fotos">
      <div className="container stats-grid">
        {PILARES.map((p, i) => {
          const Icon = ICONS[p.icon]
          return (
            <Reveal key={i} delay={i * 0.08}>
              <div
                className="pilar-card"
                style={{ backgroundImage: `linear-gradient(180deg, rgba(7,10,17,0.15) 0%, rgba(7,10,17,0.88) 100%), url(${p.foto})` }}
              >
                <span className="pilar-card-ico">{Icon && <Icon />}</span>
                <div className="pilar-card-text">
                  <b>{p.titulo}</b>
                  <span>{p.sub}</span>
                </div>
              </div>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}
