import { useRef } from 'react'
import Reveal from './Reveal'
import { IMOVEIS, formatPreco, formatArea, linkWhatsApp, waImovel, WA } from '../data'
import { IconArrow, IconWhats, ICONS } from './icons'

function Spec({ icon, valor, label }) {
  const Icon = ICONS[icon]
  return (
    <span className="im-spec" title={label}>
      {Icon && <Icon width={16} height={16} />} {valor}
    </span>
  )
}

function CardImovel({ im }) {
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
      el.style.setProperty('--ry', `${(mx - 0.5) * 7}deg`)
      el.style.setProperty('--rx', `${(0.5 - my) * 5}deg`)
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

  const specs = [
    im.quartos > 0 && { icon: 'home', valor: im.quartos, label: `${im.quartos} quartos` },
    im.suites > 0 && { icon: 'sparkle', valor: im.suites, label: `${im.suites} suítes` },
    im.vagas > 0 && { icon: 'key', valor: im.vagas, label: `${im.vagas} vagas` },
    im.area > 0 && { icon: 'building', valor: formatArea(im.area), label: 'área' },
  ].filter(Boolean)

  return (
    <article
      ref={ref}
      className="card-imovel im-card"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div className="card-media im-media" data-depth>
        <img src={im.img} alt={`${im.tipo} no ${im.bairro}, Uberlândia`} loading="lazy" />
        <span className="im-tag">{im.tipo}</span>
        <span className="im-preco">{formatPreco(im.preco)}</span>
      </div>
      <div className="card-body im-body">
        <h3 className="im-bairro">{im.bairro}</h3>
        <p className="im-local">{im.cidade} — {im.uf} · Cód. {im.codigo}</p>
        <div className="im-specs">
          {specs.map((s, i) => <Spec key={i} {...s} />)}
        </div>
        <a
          className="im-cta"
          href={linkWhatsApp(waImovel(im))}
          target="_blank"
          rel="noopener"
        >
          <IconWhats width={18} height={18} /> Tenho interesse
        </a>
      </div>
      <span className="card-glare" aria-hidden="true" />
    </article>
  )
}

export default function Destaque() {
  if (!IMOVEIS.length) return null

  return (
    <section id="destaque">
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
            <a
              className="btn btn-ghost"
              href={linkWhatsApp(WA.destaque)}
              target="_blank"
              rel="noopener"
            >
              Quero ver mais opções <IconArrow />
            </a>
          </Reveal>
        </div>

        <div className="im-grid" style={{ perspective: '1400px' }}>
          {IMOVEIS.map((im, i) => (
            <Reveal key={im.codigo} delay={(i % 3) * 0.08}>
              <CardImovel im={im} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
