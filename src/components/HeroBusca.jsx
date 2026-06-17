import { useState, useEffect } from 'react'
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
  // lista COMPLETA de bairros (todos os que têm imóvel na base da Rotina), via /bairros.json.
  // começa com os bairros dos imóveis curados e é substituída pela lista completa ao carregar.
  const [bairrosOpts, setBairrosOpts] = useState(BAIRROS_IMOVEL)
  useEffect(() => {
    let vivo = true
    fetch('/bairros.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!vivo || !d || !Array.isArray(d.bairros)) return
        const nomes = d.bairros.map((b) => (typeof b === 'string' ? b : b.nome)).filter(Boolean)
        const todos = [...new Set([...nomes, ...BAIRROS_IMOVEL])].sort((a, b) => a.localeCompare(b, 'pt-BR'))
        if (todos.length) setBairrosOpts(todos)
      })
      .catch(() => {})
    return () => { vivo = false }
  }, [])

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
          placeholder="Toda Uberlândia" multiple searchable multiNoun="bairros" value={bairros} onChange={setBairros}
          options={bairrosOpts.map((b) => ({ value: b, label: b }))}
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
