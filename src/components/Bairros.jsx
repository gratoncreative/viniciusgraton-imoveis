import Reveal from './Reveal'
import { BAIRROS, linkWhatsApp } from '../data'
import { IconPin, IconArrow } from './icons'

export default function Bairros() {
  return (
    <section id="bairros">
      <div className="container">
        <div className="sec-head">
          <Reveal>
            <div>
              <span className="eyebrow">Conheço cada região</span>
              <h2 className="section-title">Onde eu atuo em <em>Uberlândia</em></h2>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <a
              className="btn btn-ghost"
              href={linkWhatsApp('Olá Vinícius! Quero saber sobre imóveis no meu bairro de interesse em Uberlândia.')}
              target="_blank"
              rel="noopener"
            >
              Não achou seu bairro? Fale comigo <IconArrow />
            </a>
          </Reveal>
        </div>

        <div className="bairros-grid">
          {BAIRROS.map((b, i) => (
            <Reveal key={i} delay={(i % 4) * 0.06}>
              <div className="bairro-card">
                <span className="bairro-ico"><IconPin /></span>
                <div>
                  <h4>{b.nome}</h4>
                  <p>{b.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
