import { Link } from 'react-router-dom'
import Reveal from './Reveal'

const PvIcon = ({ d }) => (
  <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

const AUD = [
  {
    ico: 'M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10',
    titulo: 'Quero comprar',
    sub: 'Curadoria em Uberlândia',
    href: '/imoveis',
    mod: '',
  },
  {
    ico: 'M3 17l6-6 4 4 8-8M21 7h-6v6',
    titulo: 'Quero investir',
    sub: 'Compare ROI e encontre oportunidades',
    href: '/ferramentas',
    mod: '',
  },
  {
    ico: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01',
    titulo: 'Quero vender',
    sub: 'Avaliação gratuita e venda rápida',
    href: '/anunciar',
    mod: '',
  },
  {
    ico: 'M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2',
    titulo: 'Sou corretor',
    sub: '12 ferramentas PRO para corretores',
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
                <span className="pv-ico"><PvIcon d={a.ico} /></span>
                <div className="pv-txt">
                  <b className="pv-nome">{a.titulo}</b>
                  <span className="pv-sub">{a.sub}</span>
                </div>
                <span className="pv-seta" aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
