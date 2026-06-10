import { useState, useEffect } from 'react'
import { formatPreco } from '../data'
import { estaLogado } from '../conta'

const Cadeado = (p) => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
)

// Mostra o preço só depois que o visitante faz o cadastro (gatilho de captação de lead).
// tipo: 'card' (sobre a foto) | 'linha' (listagem) | 'detalhe' (página do imóvel)
export default function PrecoGate({ valor, className = '', tipo = 'card' }) {
  const [ok, setOk] = useState(() => estaLogado())
  useEffect(() => {
    const ler = () => setOk(estaLogado())
    window.addEventListener('vg-conta', ler)
    window.addEventListener('storage', ler)
    return () => { window.removeEventListener('vg-conta', ler); window.removeEventListener('storage', ler) }
  }, [])

  if (ok) return <span className={className}>{formatPreco(valor)}</span>

  const abrir = (e) => { e.preventDefault(); e.stopPropagation(); window.dispatchEvent(new CustomEvent('vg-abrir-cadastro')) }
  const txt = String(formatPreco(valor))
  const m = txt.match(/^(\D*)(.+)$/)
  const moeda = (m && m[1].trim()) || 'R$'
  const dig = m ? m[2] : txt
  return (
    <button type="button" className={`preco-gate preco-gate--${tipo}`} onClick={abrir} aria-label="Cadastre-se para ver o preço do imóvel">
      <span className="pg-num" aria-hidden="true"><span className="pg-rs">{moeda}</span> <span className="pg-dig">{dig}</span></span>
      <span className="pg-cta"><Cadeado /> Clique para ver o preço</span>
    </button>
  )
}
