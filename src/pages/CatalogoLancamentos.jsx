import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useSEO } from '../useSEO'
import { todosEmpreendimentosTodos, bairrosComEmpreendimentos, linkWhatsApp } from '../data'
import Reveal from '../components/Reveal'
import { IconArrow, IconWhats } from '../components/icons'
import { CardEmpLan } from './PortalLancamentosHome'

const WA_CAT = 'Olá Vinícius! Estou vendo o catálogo de lançamentos e quero ajuda para encontrar um empreendimento no meu perfil.'

const STATUS_OPTS = ['Lançamento', 'Em obras', 'Pronto']
const QUARTOS_OPTS = [
  { label: 'Studio / 1 quarto', min: 0, max: 1 },
  { label: '2 quartos', min: 2, max: 2 },
  { label: '3 quartos', min: 3, max: 3 },
  { label: '4 ou mais', min: 4, max: 99 },
]
const TIPO_OPTS = [
  { key: 'residencial', label: 'Residencial' },
  { key: 'comercial', label: 'Comercial' },
  { key: 'lote', label: 'Lote / Terreno' },
]

export default function CatalogoLancamentos() {
  useSEO({
    title: 'Catálogo de Lançamentos Imobiliários em Uberlândia — Vinícius Graton',
    description:
      'Catálogo completo de lançamentos, empreendimentos em obras e prontos em Uberlândia/MG. Filtre por bairro, status, quartos e tipo. Curadoria de um consultor da Rotina Imobiliária.',
    path: '/lancamentos/catalogo',
  })

  const todos = useMemo(() => todosEmpreendimentosTodos(), [])
  const bairros = useMemo(() => bairrosComEmpreendimentos().map((b) => b.bairro), [])

  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState([])
  const [bairroSel, setBairroSel] = useState([])
  const [quartosFiltro, setQuartosFiltro] = useState(null)
  const [tipoFiltro, setTipoFiltro] = useState([])

  const temFiltro = busca || status.length || bairroSel.length || quartosFiltro || tipoFiltro.length

  const limpar = () => {
    setBusca('')
    setStatus([])
    setBairroSel([])
    setQuartosFiltro(null)
    setTipoFiltro([])
  }

  const toggleArr = (arr, set, val) =>
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val])

  const resultado = useMemo(() => {
    let lista = todos
    if (busca.trim()) {
      const q = busca.toLowerCase()
      lista = lista.filter(
        (e) =>
          e.nome?.toLowerCase().includes(q) ||
          e.bairro?.toLowerCase().includes(q) ||
          e.construtoraNome?.toLowerCase().includes(q) ||
          (e.tipologias || []).some((t) => t.toLowerCase().includes(q))
      )
    }
    if (status.length) lista = lista.filter((e) => status.includes(e.status))
    if (bairroSel.length) lista = lista.filter((e) => bairroSel.includes(e.bairro))
    if (quartosFiltro) {
      lista = lista.filter((e) => {
        if (e.quartosMin === null && e.quartosMax === null) return false
        const emin = e.quartosMin ?? e.quartosMax ?? 0
        const emax = e.quartosMax ?? e.quartosMin ?? 99
        return emax >= quartosFiltro.min && emin <= quartosFiltro.max
      })
    }
    if (tipoFiltro.length) lista = lista.filter((e) => tipoFiltro.includes(e.tipo))
    return lista
  }, [todos, busca, status, bairroSel, quartosFiltro, tipoFiltro])

  return (
    <main className="pagina cat-pagina">
      {/* Header */}
      <section className="cat-header">
        <div className="container">
          <Reveal>
            <nav className="breadcrumb" aria-label="Localização">
              <Link to="/">Início</Link>
              <span>/</span>
              <Link to="/lancamentos">Lançamentos</Link>
              <span>/</span>
              <span>Catálogo</span>
            </nav>
            <span className="eyebrow" style={{ color: 'var(--gold-2)' }}>Catálogo completo</span>
            <h1 className="cat-titulo">
              {resultado.length} empreendimento{resultado.length !== 1 ? 's' : ''} em Uberlândia
              {temFiltro ? <button className="cat-limpar" onClick={limpar}>Limpar filtros ×</button> : null}
            </h1>
          </Reveal>

          {/* Busca */}
          <div className="cat-busca-wrap">
            <svg className="cat-busca-ico" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              className="cat-busca"
              type="search"
              placeholder="Buscar por nome, bairro ou construtora…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            {busca && (
              <button className="cat-busca-clear" onClick={() => setBusca('')} aria-label="Limpar busca">×</button>
            )}
          </div>
        </div>
      </section>

      <div className="container cat-layout">
        {/* Filtros sidebar */}
        <aside className="cat-filtros">
          <div className="cat-filtro-bloco">
            <h3 className="cat-filtro-titulo">Status</h3>
            <div className="cat-chips">
              {STATUS_OPTS.map((s) => (
                <button
                  key={s}
                  className={`cat-chip${status.includes(s) ? ' cat-chip--ativo' : ''}`}
                  onClick={() => toggleArr(status, setStatus, s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="cat-filtro-bloco">
            <h3 className="cat-filtro-titulo">Tipo</h3>
            <div className="cat-chips">
              {TIPO_OPTS.map((t) => (
                <button
                  key={t.key}
                  className={`cat-chip${tipoFiltro.includes(t.key) ? ' cat-chip--ativo' : ''}`}
                  onClick={() => toggleArr(tipoFiltro, setTipoFiltro, t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="cat-filtro-bloco">
            <h3 className="cat-filtro-titulo">Dormitórios</h3>
            <div className="cat-chips cat-chips--col">
              {QUARTOS_OPTS.map((q) => (
                <button
                  key={q.label}
                  className={`cat-chip${quartosFiltro?.label === q.label ? ' cat-chip--ativo' : ''}`}
                  onClick={() => setQuartosFiltro(quartosFiltro?.label === q.label ? null : q)}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          <div className="cat-filtro-bloco">
            <h3 className="cat-filtro-titulo">Bairro</h3>
            <div className="cat-chips cat-chips--col cat-chips--scroll">
              {bairros.map((b) => (
                <button
                  key={b}
                  className={`cat-chip${bairroSel.includes(b) ? ' cat-chip--ativo' : ''}`}
                  onClick={() => toggleArr(bairroSel, setBairroSel, b)}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {temFiltro && (
            <button className="btn btn-ghost cat-btn-limpar" onClick={limpar}>
              Limpar todos os filtros
            </button>
          )}
        </aside>

        {/* Grid */}
        <div className="cat-resultado">
          {resultado.length > 0 ? (
            <div className="lan-grid lan-grid--cat">
              {resultado.map((e) => (
                <CardEmpLan key={`${e.construtoraSlug}--${e.slug}`} e={e} />
              ))}
            </div>
          ) : (
            <div className="cat-vazio">
              <p>Nenhum empreendimento corresponde aos filtros selecionados.</p>
              <button className="btn btn-ghost" onClick={limpar}>Remover filtros</button>
            </div>
          )}

          {/* CTA ajuda */}
          <div className="cat-wa-cta">
            <p>Não encontrou o perfil ideal? Descrevo o que procura e faço a curadoria personalizada.</p>
            <a href={linkWhatsApp(WA_CAT)} className="btn btn-gold" target="_blank" rel="noopener">
              <IconWhats width={16} height={16} /> Falar com o consultor <IconArrow width={13} height={13} />
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
