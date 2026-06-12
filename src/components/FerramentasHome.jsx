import { Link } from 'react-router-dom'
import Reveal from './Reveal'

const PREV = [
  {
    ico: '🏦',
    nome: 'Simulador de financiamento',
    desc: 'Calcule parcelas SAC ou Price, total de juros e prazo ideal.',
  },
  {
    ico: '📋',
    nome: 'Uso do FGTS',
    desc: 'Veja como e quando usar o FGTS na compra ou amortização.',
  },
  {
    ico: '💵',
    nome: 'Renda necessária',
    desc: 'Descubra qual renda comprova para financiar o imóvel desejado.',
  },
  {
    ico: '📈',
    nome: 'ROI do imóvel',
    desc: 'Calcule o retorno anual de um imóvel para locação ou revenda.',
  },
]

export default function FerramentasHome() {
  return (
    <section className="ferr-home-sec">
      <div className="container">
        <Reveal>
          <div className="ferr-home-hdr">
            <div>
              <span className="eyebrow">Ferramentas gratuitas</span>
              <h2 className="section-title ferr-home-h2">Calcule antes de decidir</h2>
            </div>
            <Link to="/ferramentas" className="btn btn-ghost ferr-home-ver">Ver todas as ferramentas →</Link>
          </div>
          <div className="ferr-home-grid">
            {PREV.map((f) => (
              <Link key={f.nome} to="/ferramentas" className="ferr-home-card">
                <span className="ferr-home-ico">{f.ico}</span>
                <b className="ferr-home-nome">{f.nome}</b>
                <span className="ferr-home-desc">{f.desc}</span>
              </Link>
            ))}
          </div>
          <div className="ferr-home-cta-mob">
            <Link to="/ferramentas" className="btn btn-ghost">Ver todas as ferramentas →</Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
