import Reveal from './Reveal'
import { linkWhatsApp, WA } from '../data'
import { IconShield, IconWhats } from './icons'
import '../styles/quemsou.css'

export default function Sobre() {
  return (
    <section id="sobre" className="sobre-banner">
      <img
        className="sobre-cenario"
        src="/sobre-banner-8x.jpg"
        alt="Vinícius Graton, consultor de imóveis em Uberlândia, em seu escritório"
      />
      <span className="sobre-tint" aria-hidden="true" />

      <div className="container sobre-banner-wrap">
        <div className="sobre-banner-text">
          <Reveal>
            <span className="eyebrow">Quem te atende</span>
            <h2 className="section-title">Mais que vender imóvel, <em>te ajudo a decidir</em></h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p>
              Sou o Vinícius Graton, consultor de imóveis em Uberlândia. Comprar um imóvel é uma das
              decisões mais importantes da vida, e ninguém deveria fazer isso sozinho, no escuro ou
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
              <a className="btn btn-gold" href={linkWhatsApp(WA.contato)} target="_blank" rel="noopener noreferrer">
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
