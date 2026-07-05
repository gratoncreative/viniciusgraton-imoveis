import { Link } from 'react-router-dom'
import Reveal from './Reveal'
import '../styles/catalogo.css'

// Atalhos de busca por categoria/estilo de vida — entram direto no catálogo já filtrado.
// Ícones de linha, em círculo champanhe sutil, com hover elegante (sistema claro v2.0).
const CATS = [
  {
    label: 'Para investir',
    to: '/imoveis?tipo=Apartamento',
    d: 'M3 13a9 4 0 0 0 18 0M3 13V7M21 13V7M3 7a9 4 0 0 1 18 0M3 7a9 4 0 0 0 18 0M12 13v4M9 16l3 3 3-3',
  },
  {
    label: 'Com piscina',
    to: '/imoveis?carac=Piscina',
    d: 'M3 18c1.5 0 1.5-1.2 3-1.2s1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2M3 21c1.5 0 1.5-1.2 3-1.2s1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2M8 14V5a2 2 0 0 1 4 0M8 9h4',
  },
  {
    label: 'Mobiliado',
    to: '/imoveis?carac=Mobiliado',
    d: 'M4 18v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6M4 14h16M7 18v2M17 18v2M6 10V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2',
  },
  {
    label: 'Com varanda',
    to: '/imoveis?carac=Varanda',
    d: 'M4 21V11h16v10M4 15h16M8 21v-6M12 21v-6M16 21v-6M7 11V6h10v5M12 3v3',
  },
  {
    label: 'Churrasqueira',
    to: '/imoveis?carac=Churrasqueira',
    d: 'M12 3c1.5 2.4 3 3.3 3 6a3 3 0 0 1-6 0c0-1.5.7-2.2 1.5-3M5 11h14l-1.4 6.5a3 3 0 0 1-2.9 2.3H9.3a3 3 0 0 1-2.9-2.3L5 11z',
  },
  {
    label: 'Em condomínio',
    to: '/imoveis?tipo=Casa em condomínio',
    d: 'M3 21h18M6 21V8l5-3 5 3v13M9 21v-4h4v4M9 11h.01M13 11h.01',
  },
]

const CatIcon = ({ d }) => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

export default function CategoriasRapidas() {
  return (
    <section className="cats-rapidas">
      <div className="container">
        <Reveal>
          <div className="cats-rapidas-head">
            <span className="eyebrow">Busque pelo que importa</span>
            <h2 className="section-title">Encontre por <em>categoria</em></h2>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="cats-rapidas-grid">
            {CATS.map((c) => (
              <Link key={c.label} className="cat-atalho" to={c.to}>
                <span className="cat-atalho-ico"><CatIcon d={c.d} /></span>
                <span className="cat-atalho-label">{c.label}</span>
              </Link>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
