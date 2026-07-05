import { Link } from 'react-router-dom'
import Reveal from './Reveal'
import { IconArrow } from './icons'
import '../styles/simulador.css'
import '../styles/home-legada.css'

// Atalho DISCRETO para o simulador na home — apenas um link para a ferramenta completa
// (/simulador-financiamento), sem o widget interativo ocupando a página.
export default function QuickSimHome() {
  return (
    <section id="simular" className="section--light quicksim-atalho">
      <div className="container">
        <Reveal>
          <Link to="/simulador-financiamento" className="qsa-card" aria-label="Abrir o simulador de financiamento">
            <div className="qsa-txt">
              <span className="eyebrow">Ferramenta nº 1 · grátis</span>
              <h2 className="qsa-tit">Simule seu <em>financiamento</em></h2>
              <p className="qsa-sub">Veja a parcela, o CET e a renda necessária, já com os seguros e as taxas que os bancos cobram de verdade.</p>
            </div>
            <span className="qsa-cta">Abrir simulador <IconArrow width={15} height={15} /></span>
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
