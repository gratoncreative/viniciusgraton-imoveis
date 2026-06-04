import { useRef, useState } from 'react'
import Reveal from './Reveal'
import { SEGMENTOS } from '../data'
import { IconArrow, ICONS } from './icons'
import FiltroModal from './FiltroModal'

function CardSegmento({ s, onAbrir }) {
  const ref = useRef(null)
  const raf = useRef(0)

  const onMove = (e) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const mx = (e.clientX - r.left) / r.width
    const my = (e.clientY - r.top) / r.height
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => {
      el.style.setProperty('--ry', `${(mx - 0.5) * 9}deg`)
      el.style.setProperty('--rx', `${(0.5 - my) * 7}deg`)
      el.style.setProperty('--mx', `${(mx * 100).toFixed(1)}%`)
      el.style.setProperty('--my', `${(my * 100).toFixed(1)}%`)
      el.style.setProperty('--act', '1')
    })
  }
  const onLeave = () => {
    const el = ref.current
    if (!el) return
    cancelAnimationFrame(raf.current)
    el.style.setProperty('--ry', '0deg')
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--act', '0')
  }

  const Icon = ICONS[s.icon]
  return (
    <article
      ref={ref}
      className="card-imovel card-clickable"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={() => onAbrir(s)}
    >
      <div className="card-media" data-depth>
        <img src={s.img} alt={s.titulo} loading="lazy" />
        {Icon && <span className="card-seg-ico"><Icon /></span>}
        <span className="card-seg-title">{s.titulo}</span>
      </div>
      <div className="card-body">
        <p className="card-seg-desc">{s.desc}</p>
        <button
          type="button"
          className="card-seg-link"
          onClick={(e) => { e.stopPropagation(); onAbrir(s) }}
        >
          Buscar com filtros <IconArrow />
        </button>
      </div>
      <span className="card-glare" aria-hidden="true" />
    </article>
  )
}

export default function Imoveis() {
  const [modalSeg, setModalSeg] = useState(null)

  return (
    <section id="imoveis">
      <div className="container">
        <div className="sec-head">
          <Reveal>
            <div>
              <span className="eyebrow">Como eu te ajudo</span>
              <h2 className="section-title">O imóvel certo pra <em>cada objetivo</em></h2>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <button className="btn btn-ghost" onClick={() => setModalSeg({ id: 0, titulo: '' })}>
              Buscar pelo que procuro <IconArrow />
            </button>
          </Reveal>
        </div>

        <div className="imoveis-grid" style={{ perspective: '1200px' }}>
          {SEGMENTOS.map((s, i) => (
            <Reveal key={s.id} delay={(i % 3) * 0.1}>
              <CardSegmento s={s} onAbrir={setModalSeg} />
            </Reveal>
          ))}
        </div>
      </div>

      <FiltroModal seg={modalSeg} onClose={() => setModalSeg(null)} />
    </section>
  )
}
