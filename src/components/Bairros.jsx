import { Link } from 'react-router-dom'
import Reveal from './Reveal'
import { BAIRROS, linkWhatsApp, slugify } from '../data'
import { getBairroFoto } from '../bairros-editorial'
import { IconPin, IconArrow } from './icons'

export default function Bairros() {
  return (
    <section id="bairros" className="section--light">
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
          {BAIRROS.map((b, i) => {
            const slug = slugify(b.nome)
            return (
              <Reveal key={i} delay={(i % 4) * 0.06}>
                <Link className="bairro-card" to={`/imoveis/uberlandia/${slug}`}>
                  <div className="bairro-card-foto">
                    <img src={getBairroFoto(slug)} alt={`${b.nome}, Uberlândia`} loading="lazy" referrerPolicy="no-referrer" />
                    <h4><span className="bairro-ico"><IconPin /></span> {b.nome}</h4>
                  </div>
                  <p>{b.desc}</p>
                </Link>
              </Reveal>
            )
          })}
        </div>
        <p className="bairros-cred">Fotos reais de Uberlândia · Wikimedia Commons (CC BY-SA). Onde não há foto do próprio bairro, mostramos a região/zona correspondente.</p>
      </div>
    </section>
  )
}
