import Reveal from './Reveal'
import { PILARES } from '../data'
import { ICONS } from './icons'

export default function Stats() {
  return (
    <div className="stats">
      <div className="container stats-grid">
        {PILARES.map((p, i) => {
          const Icon = ICONS[p.icon]
          return (
            <Reveal key={i} delay={i * 0.08}>
              <div className="stat stat--pilar">
                <span className="pilar-ico">{Icon && <Icon />}</span>
                <b className="text-gold">{p.titulo}</b>
                <span className="pilar-sub">{p.sub}</span>
              </div>
            </Reveal>
          )
        })}
      </div>
    </div>
  )
}
