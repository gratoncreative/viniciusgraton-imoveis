import { reaisPorExtenso, formatBRL } from '../extenso'
import '../styles/calc.css'

// Campo de dinheiro: digita e já formata R$500.000,00 + mostra o valor por extenso.
// `valor` é em reais (pode ter centavos); internamente trabalha em centavos.
export default function CampoMoeda({ label, valor, onChange, placeholder = 'R$0,00', extenso = true }) {
  const cents = Math.round((Number(valor) || 0) * 100)
  const display = cents ? formatBRL(cents / 100) : ''
  const handle = (e) => {
    const d = e.target.value.replace(/\D/g, '')
    const c = d ? parseInt(d.slice(0, 15), 10) : 0
    onChange(c / 100)
  }
  return (
    <label className="calc-campo">
      {label && <span>{label}</span>}
      <div className="calc-input">
        <input
          type="text"
          inputMode="numeric"
          value={display}
          onChange={handle}
          placeholder={placeholder}
          aria-label={label || 'Valor em reais'}
        />
      </div>
      {extenso && cents > 0 && <small className="campo-extenso">{reaisPorExtenso(cents / 100)}</small>}
    </label>
  )
}
