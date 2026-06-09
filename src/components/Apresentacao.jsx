import { Link } from 'react-router-dom'
import Reveal from './Reveal'
import { linkWhatsApp, WA } from '../data'
import { IconWhats, IconArrow } from './icons'

// "Quem te atende" — banner do Vinícius ao fundo (escurecido) com o texto sobreposto.
export default function Apresentacao() {
  return (
    <section id="apresentacao" className="apres apres--banner" style={{ backgroundImage: 'url(/sobre-banner-8x.jpg)' }}>
      <div className="apres-scrim" aria-hidden="true" />
      <div className="container apres-banner-inner">
        <div className="apres-txt">
          <Reveal>
            <span className="eyebrow">Quem te atende</span>
            <h2 className="section-title">Olá, eu sou o <em>Vinícius Graton</em></h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="apres-lead">
              Sou <b>consultor de imóveis em Uberlândia</b>, da <b>Rotina Imobiliária</b>. Ajudo você a comprar
              casa, apartamento ou investir com clareza e segurança — da primeira conversa à entrega das chaves.
            </p>
            <p>
              Faço curadoria de verdade: seleciono só o que faz sentido pra você, aponto os pontos fortes e os
              riscos de cada imóvel, confiro toda a documentação e negocio a seu favor. Você nunca decide sozinho.
            </p>
          </Reveal>
          <Reveal delay={0.12}>
            <ul className="apres-checks">
              <li><span>✓</span> Curadoria criteriosa — só o que combina com você</li>
              <li><span>✓</span> Pontos fortes <i>e</i> riscos de cada imóvel, na transparência</li>
              <li><span>✓</span> Documentação conferida antes de você assinar</li>
              <li><span>✓</span> Negociação a seu favor e acompanhamento até a chave</li>
            </ul>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="apres-divisor" aria-hidden="true" />
            <div className="apres-acoes">
              <a className="btn btn-gold" href={linkWhatsApp(WA.hero)} target="_blank" rel="noopener">
                <IconWhats /> Falar comigo agora
              </a>
              <Link className="btn btn-ghost" to="/sobre">
                Conhecer minha história <IconArrow />
              </Link>
            </div>
            <div className="apres-rotina">
              <img src="/rotina-logo.png" alt="Rotina Imobiliária" />
              <span>Consultor credenciado · Rotina Imobiliária</span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
