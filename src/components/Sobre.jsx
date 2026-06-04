import { useRef } from 'react'
import Reveal from './Reveal'
import { DIFERENCIAIS } from '../data'
import { IconShield } from './icons'

function FotoDepth() {
  const ref = useRef(null)
  const raf = useRef(0)

  // fundo fica estático; apenas o recorte (corpo) se move com o mouse -> profundidade real
  const onMove = (e) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const mx = (e.clientX - r.left) / r.width - 0.5
    const my = (e.clientY - r.top) / r.height - 0.5
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => {
      el.style.setProperty('--mx', mx.toFixed(3))
      el.style.setProperty('--my', my.toFixed(3))
      el.style.setProperty('--act', '1')
    })
  }
  const onLeave = () => {
    const el = ref.current
    if (!el) return
    cancelAnimationFrame(raf.current)
    el.style.setProperty('--mx', '0')
    el.style.setProperty('--my', '0')
    el.style.setProperty('--act', '0')
  }

  return (
    <div ref={ref} className="sobre-photo" onMouseMove={onMove} onMouseLeave={onLeave}>
      <img className="depth-bg" src="./vinicius-graton.jpg" alt="" aria-hidden="true" />
      <img className="depth-fg" src="./vinicius-graton-cutout.png" alt="Vinícius Graton, consultor de imóveis em Uberlândia" />
      <div className="sobre-badge">
        <span className="ico"><IconShield width={22} height={22} /></span>
        <div>
          <b>Compra segura, do início ao fim</b>
          <span>Documentação e negociação acompanhadas de perto</span>
        </div>
      </div>
    </div>
  )
}

export default function Sobre() {
  return (
    <section id="sobre" className="section--light">
      <div className="container sobre-grid">
        <Reveal>
          <FotoDepth />
        </Reveal>

        <div className="sobre">
          <Reveal>
            <span className="eyebrow">Quem te atende</span>
            <h2 className="section-title">Mais que vender imóvel, <em>te ajudo a decidir</em></h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p>
              Sou o Vinícius Graton, consultor de imóveis em Uberlândia. Comprar um imóvel é uma das
              decisões mais importantes da vida — e ninguém deveria fazer isso sozinho, no escuro ou
              com pressa. Meu trabalho é tirar o medo dessa decisão.
            </p>
            <p>
              Eu te escuto, entendo seu momento e só coloco na sua frente o que realmente faz sentido.
              Cuido da curadoria, das visitas, da negociação e de toda a parte burocrática, pra você
              comprar com clareza, no preço certo e com total segurança.
            </p>
          </Reveal>

          <div className="dif-grid">
            {DIFERENCIAIS.map((d, i) => (
              <Reveal key={i} delay={0.15 + i * 0.08}>
                <div className="dif">
                  <b><span className="check">✓</span> {d.titulo}</b>
                  <p>{d.texto}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
