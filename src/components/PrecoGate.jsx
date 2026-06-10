import { formatPreco } from '../data'

// Preço PÚBLICO (sem gate). Mantém o "De X por Y" quando há preço anterior real.
export default function PrecoGate({ valor, anterior, className = '', tipo = 'card' }) {
  const temPromo = anterior && Number(anterior) > Number(valor)
  if (temPromo) {
    return (
      <span className={`${className} pg-promo pg-promo--${tipo}`}>
        <span className="pg-de">{formatPreco(anterior)}</span>
        <span className="pg-por">{formatPreco(valor)}</span>
      </span>
    )
  }
  return <span className={className}>{formatPreco(valor)}</span>
}
