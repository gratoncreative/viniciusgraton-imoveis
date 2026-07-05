import { Link } from 'react-router-dom'
import Reveal from './Reveal'
import '../styles/home-legada.css'

const FEATS = [
  'Abordagem por código',
  'Legenda para portais',
  'Script de objeções',
  'Estúdio de fotos com IA',
  'Análise de mercado (ACM)',
  'Roteiro de vídeo profissional',
]

export default function CorretorBanner() {
  return (
    <section className="corrbn-sec">
      <div className="container">
        <Reveal>
          <div className="corrbn">
            <div className="corrbn-txt">
              <span className="eyebrow corrbn-eyebrow">Área exclusiva para corretores</span>
              <h2 className="section-title corrbn-h2">Ferramentas para <em>corretores</em></h2>
              <p className="section-sub corrbn-sub">
                Tudo que você precisa para captar mais imóveis, divulgar com qualidade e fechar negócios mais rápido - num lugar só.
              </p>
              <ul className="corrbn-lista">
                {FEATS.map((f) => <li key={f}>{f}</li>)}
              </ul>
              <div className="corrbn-acoes">
                <Link to="/corretor" className="btn btn-gold">Cadastre-se grátis →</Link>
                <span className="corrbn-nota">Grátis. Sem cartão. Acesso imediato.</span>
              </div>
            </div>

            <div className="corrbn-flair" aria-hidden="true">
              <div className="corrbn-badge-wrap">
                <div className="corrbn-num">12</div>
                <span className="corrbn-num-label">ferramentas</span>
              </div>
              <div className="corrbn-price">
                <span>a partir de</span>
                <b>R$ 2/dia</b>
              </div>
              <div className="corrbn-free">
                <span className="corrbn-free-tag">✓ 24h grátis</span>
                <span className="corrbn-free-tag">✓ Sem cartão</span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
