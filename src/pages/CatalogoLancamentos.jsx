import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useSEO } from '../useSEO'
import { todosEmpreendimentosTodos, bairrosComEmpreendimentos, linkWhatsApp } from '../data'
import Reveal from '../components/Reveal'
import { IconArrow, IconWhats } from '../components/icons'
import { CardEmpLan } from './PortalLancamentosHome'

const WA_CAT = 'Olá Vinícius! Estou vendo o catálogo de lançamentos e quero ajuda para encontrar um empreendimento no meu perfil.'

const STATUS_OPTS = [
  { key: 'Lançamento', color: '#4fa3e0' },
  { key: 'Em obras', color: '#f59e0b' },
  { key: 'Pronto', color: '#56c27d' },
]
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

const soNum = (s) => String(s || '').replace(/\D/g, '')
const mascaraFone = (s) => {
  const d = soNum(s).slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export default function CatalogoLancamentos() {
  useSEO({
    title: 'Catálogo de Lançamentos Imobiliários em Uberlândia — Vinícius Graton',
    description:
      'Catálogo completo de lançamentos, empreendimentos em obras e prontos em Uberlândia/MG. Filtre por bairro, status, quartos e tipo. Curadoria de um consultor da Rotina Imobiliária.',
    path: '/lancamentos/catalogo',
  })

  const todos = useMemo(() => todosEmpreendimentosTodos(), [])
  const bairros = useMemo(() => bairrosComEmpreendimentos().map((b) => b.bairro).sort((a, b) => a.localeCompare(b, 'pt-BR')), [])

  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState([])
  const [bairroSel, setBairroSel] = useState([])
  const [bairroQ, setBairroQ] = useState('')
  const [quartosFiltro, setQuartosFiltro] = useState(null)
  const [tipoFiltro, setTipoFiltro] = useState([])
  const [novidNome, setNovidNome] = useState('')
  const [novidFone, setNovidFone] = useState('')
  const [novidPerfil, setNovidPerfil] = useState('')
  const [novidOk, setNovidOk] = useState(false)
  const [novidErro, setNovidErro] = useState('')

  const temFiltro = busca || status.length || bairroSel.length || quartosFiltro || tipoFiltro.length

  const limpar = () => {
    setBusca(''); setStatus([]); setBairroSel([]); setBairroQ(''); setQuartosFiltro(null); setTipoFiltro([])
  }

  const toggleArr = (arr, set, val) =>
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val])

  const bairrosFiltrados = useMemo(() => {
    if (!bairroQ.trim()) return bairros
    const q = bairroQ.toLowerCase()
    return bairros.filter((b) => b.toLowerCase().includes(q))
  }, [bairros, bairroQ])

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

  const enviarNovidades = (ev) => {
    ev.preventDefault()
    const nome = novidNome.trim()
    if (!nome || nome.length < 2) { setNovidErro('Informe seu nome'); return }
    if (novidFone && soNum(novidFone).length < 10) { setNovidErro('WhatsApp inválido'); return }
    const partes = [`Olá Vinícius! Me chamo ${nome}`]
    if (novidFone) partes.push(`meu WhatsApp é ${novidFone}`)
    if (novidPerfil) partes.push(`meu perfil: ${novidPerfil}`)
    partes.push('Quero receber novidades de lançamentos em Uberlândia.')
    window.open(linkWhatsApp(partes.join(', ')), '_blank')
    setNovidOk(true)
    setNovidErro('')
  }

  return (
    <main className="pagina cat-pagina">
      <section className="cat-header">
        <div className="container">
          <Reveal>
            <nav className="breadcrumb" aria-label="Localização">
              <Link to="/">Início</Link><span>/</span>
              <Link to="/lancamentos">Lançamentos</Link><span>/</span>
              <span>Catálogo</span>
            </nav>
            <span className="eyebrow" style={{ color: 'var(--gold-2)' }}>Catálogo completo</span>
            <h1 className="cat-titulo">
              {resultado.length} empreendimento{resultado.length !== 1 ? 's' : ''} em Uberlândia
              {temFiltro ? <button className="cat-limpar" onClick={limpar}>Limpar filtros ×</button> : null}
            </h1>
          </Reveal>
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
            {busca && <button className="cat-busca-clear" onClick={() => setBusca('')} aria-label="Limpar busca">×</button>}
          </div>
        </div>
      </section>

      <div className="container cat-layout">
        <aside className="cat-filtros">

          {/* STATUS */}
          <div className="cat-filtro-bloco">
            <div className="cat-filtro-bloco-head">
              <h3 className="cat-filtro-titulo">Status</h3>
              {status.length > 0 && (
                <button className="cat-filtro-clear" onClick={() => setStatus([])}>Limpar</button>
              )}
            </div>
            <div className="cat-chips">
              {STATUS_OPTS.map((s) => (
                <button
                  key={s.key}
                  className={`cat-chip${status.includes(s.key) ? ' cat-chip--ativo' : ''}`}
                  onClick={() => toggleArr(status, setStatus, s.key)}
                >
                  <span className="cat-status-dot" style={{ background: s.color }} />
                  {s.key}
                </button>
              ))}
            </div>
          </div>

          {/* TIPO */}
          <div className="cat-filtro-bloco">
            <div className="cat-filtro-bloco-head">
              <h3 className="cat-filtro-titulo">Tipo</h3>
              {tipoFiltro.length > 0 && (
                <button className="cat-filtro-clear" onClick={() => setTipoFiltro([])}>Limpar</button>
              )}
            </div>
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

          {/* DORMITÓRIOS */}
          <div className="cat-filtro-bloco">
            <div className="cat-filtro-bloco-head">
              <h3 className="cat-filtro-titulo">Dormitórios</h3>
              {quartosFiltro && (
                <button className="cat-filtro-clear" onClick={() => setQuartosFiltro(null)}>Limpar</button>
              )}
            </div>
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

          {/* BAIRRO — checkbox list com search */}
          <div className="cat-filtro-bloco">
            <div className="cat-filtro-bloco-head">
              <h3 className="cat-filtro-titulo">
                Bairro
                {bairroSel.length > 0 && (
                  <span className="cat-filtro-count">{bairroSel.length}</span>
                )}
              </h3>
              {bairroSel.length > 0 && (
                <button className="cat-filtro-clear" onClick={() => { setBairroSel([]); setBairroQ('') }}>
                  Limpar
                </button>
              )}
            </div>

            <div className="cat-bairro-busca-wrap">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="10" cy="10" r="7"/><path d="m20 20-3.5-3.5"/>
              </svg>
              <input
                className="cat-bairro-busca"
                type="search"
                placeholder="Buscar bairro…"
                value={bairroQ}
                onChange={(e) => setBairroQ(e.target.value)}
              />
              {bairroQ && (
                <button className="cat-bairro-busca-x" onClick={() => setBairroQ('')} aria-label="Limpar">×</button>
              )}
            </div>

            {bairroSel.length > 0 && (
              <div className="cat-bairro-selecionados">
                {bairroSel.map((b) => (
                  <span key={b} className="cat-bairro-tag">
                    {b}
                    <button
                      className="cat-bairro-tag-x"
                      onClick={() => setBairroSel(bairroSel.filter((x) => x !== b))}
                      aria-label={`Remover ${b}`}
                    >×</button>
                  </span>
                ))}
              </div>
            )}

            <div className="cat-bairro-lista">
              {bairrosFiltrados.length === 0 && (
                <p className="cat-bairro-vazio">Nenhum bairro encontrado</p>
              )}
              {bairrosFiltrados.map((b) => (
                <label
                  key={b}
                  className={`cat-bairro-item${bairroSel.includes(b) ? ' cat-bairro-item--on' : ''}`}
                >
                  <span className={`cat-bairro-cb${bairroSel.includes(b) ? ' cat-bairro-cb--on' : ''}`} aria-hidden="true">
                    {bairroSel.includes(b) && (
                      <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 6l3 3 5-5"/>
                      </svg>
                    )}
                  </span>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={bairroSel.includes(b)}
                    onChange={() => toggleArr(bairroSel, setBairroSel, b)}
                  />
                  <span className="cat-bairro-nome">{b}</span>
                </label>
              ))}
            </div>
          </div>

          {temFiltro && (
            <button className="btn btn-ghost cat-btn-limpar" onClick={limpar}>
              Limpar todos os filtros
            </button>
          )}

          {/* LEAD FORM */}
          <div className="cat-novidades">
            <div className="cat-novidades-head">
              <span className="cat-novidades-ico" aria-hidden="true">🔔</span>
              <div>
                <h3 className="cat-novidades-titulo">Receba novos lançamentos</h3>
                <p className="cat-novidades-sub">Seja o primeiro a saber quando um novo empreendimento for publicado.</p>
              </div>
            </div>
            {novidOk ? (
              <div className="cat-novidades-ok">
                <span>✓</span> Cadastrado! Entraremos em contato com as novidades em primeira mão.
              </div>
            ) : (
              <form className="cat-novidades-form" onSubmit={enviarNovidades} noValidate>
                <input
                  type="text"
                  value={novidNome}
                  onChange={(e) => setNovidNome(e.target.value)}
                  placeholder="Seu nome"
                  className="cat-novidades-input"
                  autoComplete="name"
                />
                <input
                  type="tel"
                  value={novidFone}
                  onChange={(e) => setNovidFone(mascaraFone(e.target.value))}
                  placeholder="WhatsApp (34) 99999-9999"
                  className="cat-novidades-input"
                  inputMode="numeric"
                  autoComplete="tel"
                />
                <select
                  value={novidPerfil}
                  onChange={(e) => setNovidPerfil(e.target.value)}
                  className="cat-novidades-input cat-novidades-select"
                >
                  <option value="">Meu perfil (opcional)</option>
                  <option>Comprar para morar</option>
                  <option>Investir em imóveis</option>
                  <option>Corretor / assessor</option>
                  <option>Apenas pesquisando</option>
                </select>
                {novidErro && <p className="cat-novidades-erro">{novidErro}</p>}
                <button type="submit" className="cat-novidades-btn">
                  <IconWhats width={14} height={14} /> Receber novidades
                </button>
                <p className="cat-novidades-nota">Sem custo. Sem spam. Só novidades reais.</p>
              </form>
            )}
          </div>
        </aside>

        <div className="cat-resultado">
          {resultado.length > 0 ? (
            <div className="lan-grid lan-grid--cat">
              {resultado.map((e, idx) => (
                <CardEmpLan key={e.blowId || `${e.construtoraSlug}--${e.slug}--${idx}`} e={e} />
              ))}
            </div>
          ) : (
            <div className="cat-vazio">
              <p>Nenhum empreendimento corresponde aos filtros selecionados.</p>
              <button className="btn btn-ghost" onClick={limpar}>Remover filtros</button>
            </div>
          )}
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
