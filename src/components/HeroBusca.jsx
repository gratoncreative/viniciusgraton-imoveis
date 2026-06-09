import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TIPOS_IMOVEL, BAIRROS_IMOVEL, FAIXAS_PRECO } from '../data'
import { IconSearch } from './icons'

// Card de busca da capa (estilo portal): campos empilhados + botão grande.
export default function HeroBusca() {
  const navigate = useNavigate()
  const [f, setF] = useState({ tipo: '', bairro: '', faixa: '-1' })
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  const buscar = (e) => {
    e.preventDefault()
    const p = new URLSearchParams()
    if (f.tipo) p.set('tipo', f.tipo)
    if (f.bairro) p.set('bairro', f.bairro)
    if (f.faixa !== '-1') p.set('faixa', f.faixa)
    const qs = p.toString()
    navigate(qs ? `/imoveis?${qs}` : '/imoveis')
  }

  return (
    <form className="hero-busca" onSubmit={buscar} aria-label="Buscar imóveis">
      <div className="hb-campo">
        <span>O que você procura?</span>
        <select value={f.tipo} onChange={set('tipo')}>
          <option value="">Todos os tipos</option>
          {TIPOS_IMOVEL.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="hb-campo">
        <span>Bairro ou região</span>
        <select value={f.bairro} onChange={set('bairro')}>
          <option value="">Toda Uberlândia</option>
          {BAIRROS_IMOVEL.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
      <div className="hb-campo">
        <span>Faixa de valor</span>
        <select value={f.faixa} onChange={set('faixa')}>
          <option value="-1">Qualquer valor</option>
          {FAIXAS_PRECO.map((p, i) => <option key={i} value={i}>{p.label}</option>)}
        </select>
      </div>
      <button type="submit" className="btn btn-gold hb-btn">
        <IconSearch width={18} height={18} /> Buscar imóveis
      </button>
    </form>
  )
}
