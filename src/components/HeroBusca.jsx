import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TIPOS_IMOVEL, BAIRROS_IMOVEL, FAIXAS_PRECO } from '../data'
import { IconArrow } from './icons'

// Caixa de busca em destaque na capa: cliente seleciona e já vê os resultados no catálogo.
export default function HeroBusca() {
  const navigate = useNavigate()
  const [f, setF] = useState({ tipo: '', bairro: '', faixa: '-1', quartos: '0' })
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  const buscar = (e) => {
    e.preventDefault()
    const p = new URLSearchParams()
    if (f.tipo) p.set('tipo', f.tipo)
    if (f.bairro) p.set('bairro', f.bairro)
    if (f.faixa !== '-1') p.set('faixa', f.faixa)
    if (f.quartos !== '0') p.set('quartos', f.quartos)
    const qs = p.toString()
    navigate(qs ? `/imoveis?${qs}` : '/imoveis')
  }

  return (
    <form className="hero-busca hero-in" onSubmit={buscar} aria-label="Buscar imóveis">
      <span className="hero-busca-tit">Encontre seu imóvel</span>
      <div className="hero-busca-campos">
        <label className="hero-busca-campo">
          <span>Tipo</span>
          <select value={f.tipo} onChange={set('tipo')}>
            <option value="">Todos</option>
            {TIPOS_IMOVEL.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="hero-busca-campo">
          <span>Bairro</span>
          <select value={f.bairro} onChange={set('bairro')}>
            <option value="">Todos</option>
            {BAIRROS_IMOVEL.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
        <label className="hero-busca-campo">
          <span>Valor</span>
          <select value={f.faixa} onChange={set('faixa')}>
            <option value="-1">Qualquer</option>
            {FAIXAS_PRECO.map((p, i) => <option key={i} value={i}>{p.label}</option>)}
          </select>
        </label>
        <label className="hero-busca-campo">
          <span>Quartos</span>
          <select value={f.quartos} onChange={set('quartos')}>
            <option value="0">Qualquer</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
          </select>
        </label>
      </div>
      <button type="submit" className="btn btn-gold hero-busca-btn">
        Ver imóveis <IconArrow />
      </button>
    </form>
  )
}
