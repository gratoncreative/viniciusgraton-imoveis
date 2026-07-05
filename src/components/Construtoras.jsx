import { Link } from 'react-router-dom'
import Reveal from './Reveal'
import { CONSTRUTORAS } from '../empreendimentos'
import '../styles/construtoras.css'

// Parede de marcas das construtoras (cinza, mesmo tom, fundo claro).
// Clicar abre a página da construtora (com os empreendimentos) em nova aba.
export default function Construtoras() {
  if (!CONSTRUTORAS.length) return null
  return (
    <section id="construtoras" className="section--light construtoras-sec">
      <div className="container">
        <Reveal>
          <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 48px' }}>
            <span className="eyebrow" style={{ justifyContent: 'center' }}>Lançamentos em Uberlândia</span>
            <h2 className="section-title">As principais <em>construtoras</em></h2>
            <p className="section-sub" style={{ margin: '16px auto 0' }}>
              Acompanho os lançamentos das maiores construtoras da cidade. Clique em uma marca para ver
              os empreendimentos atuais - e me chame para visitar.
            </p>
          </div>
        </Reveal>

        <div className="construtoras-grid">
          {CONSTRUTORAS.map((c, i) => (
            <Reveal key={c.slug} delay={(i % 5) * 0.04}>
              <Link
                className="construtora-marca"
                to={`/construtoras/${c.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Ver empreendimentos da ${c.nome}`}
              >
                <span className="construtora-marca-nome">{c.nome}</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
