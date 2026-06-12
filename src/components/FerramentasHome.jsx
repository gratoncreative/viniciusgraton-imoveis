import { Link } from 'react-router-dom'
import Reveal from './Reveal'

const FhIcon = ({ d }) => (
  <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

const PREV = [
  {
    ico: 'M3 22h18M22 9H2L12 3l10 6M9 22v-8h6v8',
    nome: 'Simulador de financiamento',
    desc: 'Calcule parcelas SAC ou Price, total de juros e prazo ideal.',
  },
  {
    ico: 'M9 5H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1M9 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1M9 12h6M9 16h4',
    nome: 'Uso do FGTS',
    desc: 'Veja como e quando usar o FGTS na compra ou amortização.',
  },
  {
    ico: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    nome: 'Renda necessária',
    desc: 'Descubra qual renda comprova para financiar o imóvel desejado.',
  },
  {
    ico: 'M3 17l6-6 4 4 8-8M21 7h-6v6',
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
                <span className="ferr-home-ico"><FhIcon d={f.ico} /></span>
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
