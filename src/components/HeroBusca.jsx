import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TIPOS_IMOVEL, BAIRROS_IMOVEL, FAIXAS_PRECO } from '../data'
import { IconSearch } from './icons'
import FiltroSelect from './FiltroSelect'

// Card de busca da capa (estilo portal): campos empilhados + botão grande.
// Bairro com seleção MÚLTIPLA (FiltroSelect multiple + busca).
export default function HeroBusca() {
  const navigate = useNavigate()
  const [tipo, setTipo] = useState('')
  const [bairros, setBairros] = useState([])
  const [faixa, setFaixa] = useState(-1)

  const buscar = (e) => {
    e.preventDefault()
    const p = new URLSearchParams()
    if (tipo) p.set('tipo', tipo)
    if (bairros.length) p.set('bairros', bairros.join(','))
    if (String(faixa) !== '-1') p.set('faixa', faixa)
    const qs = p.toString()
    navigate(qs ? `/imoveis?${qs}` : '/imoveis')
  }

  return (
    <form className="hero-busca" onSubmit={buscar} aria-label="Buscar imóveis">
      <div className="hb-campo">
        <span>O que você procura?</span>
        <FiltroSelect
          placeholder="Todos os tipos" neutral="" value={tipo} onChange={setTipo}
          options={[{ value: '', label: 'Todos os tipos' }, ...TIPOS_IMOVEL.map((t) => ({ value: t, label: t }))]}
        />
      </div>
      <div className="hb-campo">
        <span>Bairro ou região</span>
        <FiltroSelect
          placeholder="Toda Uberlândia" multiple searchable value={bairros} onChange={setBairros}
          options={BAIRROS_IMOVEL.map((b) => ({ value: b, label: b }))}
        />
      </div>
      <div className="hb-campo">
        <span>Faixa de valor</span>
        <FiltroSelect
          placeholder="Qualquer valor" neutral={-1} value={faixa} onChange={setFaixa}
          options={[{ value: -1, label: 'Qualquer valor' }, ...FAIXAS_PRECO.map((p, i) => ({ value: i, label: p.label }))]}
        />
      </div>
      <button type="submit" className="btn btn-gold hb-btn">
        <IconSearch width={18} height={18} /> Buscar imóveis
      </button>
    </form>
  )
}
