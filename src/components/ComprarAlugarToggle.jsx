import { Link, useLocation } from 'react-router-dom'

// Alterna entre o catálogo de VENDA (/imoveis) e o de ALUGUEL (/alugar).
// Aparece no topo das duas listagens.
export default function ComprarAlugarToggle() {
  const { pathname } = useLocation()
  const alugar = pathname.startsWith('/alugar')
  return (
    <div className="ca-toggle" role="tablist" aria-label="Comprar ou alugar">
      <Link to="/imoveis" className={`ca-toggle-btn${!alugar ? ' on' : ''}`} role="tab" aria-selected={!alugar}>Comprar</Link>
      <Link to="/alugar" className={`ca-toggle-btn${alugar ? ' on' : ''}`} role="tab" aria-selected={alugar}>Alugar</Link>
    </div>
  )
}
