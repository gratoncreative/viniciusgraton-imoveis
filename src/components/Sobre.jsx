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
      <span className="sobre-sky" aria-hidden="true" />
      <span className="sobre-glow" aria-hidden="true" />
      <svg className="sobre-skyline" viewBox="0 0 600 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <g fill="#0a0e16">
          <rect x="0" y="120" width="58" height="80" />
          <rect x="62" y="86" width="44" height="114" />
          <rect x="110" y="104" width="34" height="96" />
          <rect x="150" y="64" width="52" height="136" />
          <rect x="206" y="98" width="40" height="102" />
          <rect x="250" y="40" width="60" height="160" />
          <rect x="314" y="84" width="46" height="116" />
          <rect x="364" y="110" width="36" height="90" />
          <rect x="404" y="58" width="56" height="142" />
          <rect x="464" y="96" width="42" height="104" />
          <rect x="510" y="74" width="48" height="126" />
          <rect x="562" y="116" width="38" height="84" />
        </g>
        <g fill="rgba(244,217,138,0.55)">
          <rect x="166" y="80" width="6" height="8" /><rect x="180" y="80" width="6" height="8" /><rect x="166" y="98" width="6" height="8" />
          <rect x="266" y="58" width="7" height="9" /><rect x="284" y="58" width="7" height="9" /><rect x="266" y="80" width="7" height="9" /><rect x="284" y="80" width="7" height="9" /><rect x="266" y="102" width="7" height="9" />
          <rect x="420" y="74" width="6" height="9" /><rect x="436" y="74" width="6" height="9" /><rect x="420" y="96" width="6" height="9" />
          <rect x="74" y="100" width="6" height="8" /><rect x="88" y="100" width="6" height="8" />
          <rect x="522" y="90" width="6" height="8" /><rect x="538" y="90" width="6" height="8" />
        </g>
      </svg>
      <span className="sobre-floor" aria-hidden="true" />
      <img className="depth-fg" src="/vinicius-graton-cutout.png" alt="Vinícius Graton, consultor de imóveis em Uberlândia" />
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
