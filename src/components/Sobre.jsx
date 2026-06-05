import { useRef } from 'react'
import Reveal from './Reveal'
import { linkWhatsApp, WA } from '../data'
import { IconShield, IconWhats } from './icons'

export default function Sobre() {
  const ref = useRef(null)
  const raf = useRef(0)

  // cenário estático; apenas o recorte (corpo) se move com o mouse
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
    <section id="sobre" className="sobre-banner" ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}>
      <img className="sobre-cenario" src="/escritorio.jpg" alt="" aria-hidden="true" />
      <span className="sobre-tint" aria-hidden="true" />
      <span className="sobre-glow" aria-hidden="true" />
      <img className="sobre-recorte" src="/vinicius-graton-cutout.png" alt="Vinícius Graton, consultor de imóveis em Uberlândia" />

      <div className="container sobre-banner-wrap">
        <div className="sobre-banner-text">
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
              Eu te escuto, cuido da curadoria, das visitas, da negociação e de toda a burocracia,
              pra você comprar com clareza, no preço certo e com total segurança.
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <ul className="sobre-checks">
              <li><span className="check">✓</span> Curadoria, não catálogo</li>
              <li><span className="check">✓</span> Olhar de investimento</li>
              <li><span className="check">✓</span> Documentação conferida</li>
              <li><span className="check">✓</span> Atendimento direto comigo</li>
            </ul>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="sobre-banner-acoes">
              <a className="btn btn-gold" href={linkWhatsApp(WA.contato)} target="_blank" rel="noopener">
                <IconWhats /> Falar comigo agora
              </a>
              <span className="sobre-selo">
                <IconShield width={18} height={18} /> Compra segura, do início ao fim
              </span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
