import { formatPreco } from '../data'
import '../styles/detalhe.css'

// Preço PÚBLICO (sem gate). Mantém o "De X por Y" quando há preço anterior real.
export default function PrecoGate({ valor, anterior, className = '', tipo = 'card', sufixo = '' }) {
  const sfx = sufixo ? <span className="pg-sufixo">{sufixo}</span> : null
  const temPromo = anterior && Number(anterior) > Number(valor)
  if (temPromo) {
    return (
      <span className={`${className} pg-promo pg-promo--${tipo}`}>
        <span className="pg-de">{formatPreco(anterior)}</span>
        <span className="pg-por">{formatPreco(valor)}{sfx}</span>
      </span>
    )
  }
  return <span className={className}>{formatPreco(valor)}{sfx}</span>
}
