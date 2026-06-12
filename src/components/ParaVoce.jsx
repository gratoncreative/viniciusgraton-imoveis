import { Link } from 'react-router-dom'
import Reveal from './Reveal'

const AUD = [
  {
    ico: '🏡',
    titulo: 'Quero comprar',
    sub: 'Casas, apartamentos e lotes com curadoria em Uberlândia.',
    href: '/imoveis',
    mod: '',
  },
  {
    ico: '💼',
    titulo: 'Quero investir',
    sub: 'Calcule retorno, compare opções e encontre imóveis rentáveis.',
    href: '/ferramentas',
    mod: '',
  },
  {
    ico: '💰',
    titulo: 'Quero vender',
    sub: 'Avaliação gratuita, divulgação profissional e venda rápida.',
    href: '/anunciar',
    mod: '',
  },
  {
    ico: '🔑',
    titulo: 'Sou corretor',
    sub: '12 ferramentas PRO para captar, divulgar e fechar mais negócios.',
    href: '/corretor',
    mod: 'pv-card--gold',
  },
]

export default function ParaVoce() {
  return (
    <section className="para-voce">
      <div className="container">
        <Reveal>
          <div className="pv-header">
            <span className="eyebrow">Como posso te ajudar</span>
            <h2 className="pv-titulo">Qual é o seu perfil?</h2>
          </div>
          <div className="pv-grid">
            {AUD.map((a) => (
              <Link key={a.titulo} to={a.href} className={`pv-card ${a.mod}`}>
                <span className="pv-ico">{a.ico}</span>
                <b className="pv-nome">{a.titulo}</b>
                <span className="pv-sub">{a.sub}</span>
                <span className="pv-seta" aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
