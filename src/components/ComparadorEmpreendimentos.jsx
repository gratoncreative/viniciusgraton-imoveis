import { useState } from 'react'
import { Link } from 'react-router-dom'
import { onImgError } from '../img'
import { IconArrow, IconPin, IconBuilding, IconClose } from './icons'
import '../styles/condominio.css'
import '../styles/construtoras.css'
import '../styles/calc.css'
import '../styles/comparar.css'

const STATUS = ['Todos', 'Lançamento', 'Em obras', 'Pronto']
const matchStatus = (p, f) => f === 'Todos' || (p.status || '').toLowerCase().includes(f.toLowerCase())

const LINHAS = [
  ['Status', (p) => p.status || '-'],
  ['Bairro', (p) => p.bairro || '-'],
  ['Entrega', (p) => p.entrega || '-'],
  ['Preço', (p) => p.preco || 'Sob consulta'],
  ['Tipologias', (p) => (p.tipologias || []).join(' · ') || '-'],
  ['Lazer e estrutura', (p) => `${(p.amenidades || []).length} itens`],
  ['Vídeo', (p) => (p.video ? 'Sim' : '-')],
]

export default function ComparadorEmpreendimentos({ c }) {
  const [filtro, setFiltro] = useState('Todos')
  const [cmp, setCmp] = useState([])
  const [aberto, setAberto] = useState(false)

  const todos = c.projetos || []
  const projetos = todos.filter((p) => matchStatus(p, filtro))
  const temFiltros = todos.length > 2
  const toggle = (slug) => setCmp((prev) => prev.includes(slug) ? prev.filter((s) => s !== slug) : (prev.length >= 3 ? prev : [...prev, slug]))
  const selecionados = cmp.map((s) => todos.find((p) => p.slug === s)).filter(Boolean)
  const statusDisp = STATUS.filter((s) => s === 'Todos' || todos.some((p) => matchStatus(p, s)))

  if (!todos.length) {
    return <p className="section-sub">Em breve, lançamentos da {c.nome} por aqui. Me chame no WhatsApp que eu te mostro as opções.</p>
  }

  return (
    <>
      {temFiltros && statusDisp.length > 2 && (
        <div className="condo-chips" style={{ marginBottom: 22 }}>
          {statusDisp.map((s) => (
            <button key={s} className={`condo-chip ${filtro === s ? 'on' : ''}`} onClick={() => setFiltro(s)}>{s}</button>
          ))}
        </div>
      )}

      <div className="construtora-projs">
        {projetos.map((p) => (
          <div className={`proj-card ${cmp.includes(p.slug) ? 'is-cmp' : ''}`} key={p.slug}>
            {todos.length > 1 && (
              <button type="button" className="proj-cmp" onClick={() => toggle(p.slug)} aria-pressed={cmp.includes(p.slug)}>
                {cmp.includes(p.slug) ? '✓ Comparando' : '+ Comparar'}
              </button>
            )}
            <Link className="proj-card-link" to={`/construtoras/${c.slug}/${p.slug}`}>
              <span className="proj-capa">
                {p.capa ? <img src={p.capa} alt={`${p.nome} - ${c.nome}, Uberlândia`} loading="lazy" referrerPolicy="no-referrer" onError={onImgError} />
                  : <span className="proj-capa-vazia"><IconBuilding width={34} height={34} /></span>}
                {p.status && <span className="proj-status proj-status--over">{p.status}</span>}
                {p.video && <span className="proj-capa-video">▶ vídeo</span>}
                {(p.galeria || []).length > 0 && <span className="proj-capa-fotos">{(p.galeria || []).length + 1} fotos</span>}
              </span>
              <span className="proj-body">
                <b className="proj-nome">{p.nome}</b>
                {p.bairro && <span className="proj-bairro"><IconPin width={15} height={15} /> {p.bairro}, Uberlândia</span>}
                {p.descricao && <span className="proj-desc">{p.descricao.length > 110 ? p.descricao.slice(0, 109) + '…' : p.descricao}</span>}
                <span className="proj-ver">Ver empreendimento <IconArrow width={14} height={14} /></span>
              </span>
            </Link>
          </div>
        ))}
      </div>

      {cmp.length > 0 && (
        <div className="cmp-bar">
          <span>{cmp.length}/3 para comparar</span>
          <div className="cmp-bar-acoes">
            <button className="cmp-bar-limpar" onClick={() => setCmp([])}>Limpar</button>
            <button className="btn btn-gold cmp-bar-btn" disabled={cmp.length < 2} onClick={() => setAberto(true)}>Comparar {cmp.length}</button>
          </div>
        </div>
      )}

      {aberto && selecionados.length >= 2 && (
        <div className="cmp-modal" onClick={() => setAberto(false)}>
          <div className="cmp-box" onClick={(e) => e.stopPropagation()}>
            <button className="cmp-close" onClick={() => setAberto(false)} aria-label="Fechar"><IconClose width={24} height={24} /></button>
            <h3 className="calc-painel-tit">Comparar empreendimentos</h3>
            <div className="cmp-scroll">
              <table className="cmp-table">
                <thead>
                  <tr><th></th>{selecionados.map((p) => <th key={p.slug}>{p.nome}</th>)}</tr>
                </thead>
                <tbody>
                  {LINHAS.map(([rot, fn]) => (
                    <tr key={rot}><td className="cmp-rot">{rot}</td>{selecionados.map((p) => <td key={p.slug}>{fn(p)}</td>)}</tr>
                  ))}
                  <tr><td className="cmp-rot"></td>{selecionados.map((p) => (
                    <td key={p.slug}><Link className="btn btn-gold cmp-ver" to={`/construtoras/${c.slug}/${p.slug}`}>Ver <IconArrow width={13} height={13} /></Link></td>
                  ))}</tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
