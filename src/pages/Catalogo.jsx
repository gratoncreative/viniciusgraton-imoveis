import { useMemo, useState, useEffect, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import CardImovel from '../components/CardImovel'
import AviseMe from '../components/AviseMe'
import FiltroSelect from '../components/FiltroSelect'
import FiltroPills from '../components/FiltroPills'
import { IMOVEIS, TIPOS_IMOVEL, BAIRROS_IMOVEL, FAIXAS_PRECO, linkWhatsApp, WA } from '../data'
import { useSEO } from '../useSEO'
import { IconWhats, IconClose } from '../components/icons'

// Chips de tipo com ícone (referência Chaves na Mão) — cada um agrupa vários tipos
const TIPO_CHIPS = [
  { grupo: 'apartamento', label: 'Apartamento', re: /apart/i, d: 'M4 3h7v18H4zM13 8h7v13h-7zM7 6h.5M7 9h.5M7 12h.5M16 11h.5M16 14h.5M16 17h.5' },
  { grupo: 'casa', label: 'Casas & Sobrados', re: /casa|sobrado/i, d: 'M3 11l9-7 9 7M5 10v10h14V10M10 20v-5h4v5' },
  { grupo: 'kit', label: 'Kitnets & Stúdios', re: /kit|studio|stúdio|loft|flat/i, d: 'M5 3h14v18H5zM9 7h.5M13 7h.5M9 11h.5M13 11h.5M9 15h6v6H9z' },
  { grupo: 'comercial', label: 'Comercial', re: /comerc|sala|loja|ponto|gal/i, d: 'M4 9h16l-1-5H5L4 9zM5 9v11h14V9M9 20v-6h6v6' },
  { grupo: 'terreno', label: 'Terrenos & Lotes', re: /terreno|lote|área|chácara|sítio|fazenda/i, d: 'M3 20h18M5 20l3-9 4 5 3-7 4 11' },
]

// ícones dos filtros (um antes de cada campo)
const FICN = {
  search: 'M21 21l-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z',
  tipo: 'M3 21h18M5 21V7l7-4 7 4v14M9 13h.01M9 17h.01M15 13h.01M15 17h.01',
  bairro: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  preco: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  quartos: 'M3 18v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5M3 18h18M3 18v3M21 18v3M6 11V8a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3M13 11V8a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3',
  suites: 'M12 3l2.2 5.5L20 9l-4.5 4 1.3 6L12 16l-4.8 3 1.3-6L4 9l5.8-.5z',
  vagas: 'M5 13l1.5-4.5A2 2 0 0 1 8.4 7h7.2a2 2 0 0 1 1.9 1.5L19 13m-14 0h14m-14 0v4m14-4v4M7 17h.01M17 17h.01',
  area: 'M3 8V5a2 2 0 0 1 2-2h3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M21 16v3a2 2 0 0 1-2 2h-3',
  carac: 'M4 6h16M4 12h16M4 18h10M19 16l2 2 3-3',
  ordem: 'M3 6h13M3 12h9M3 18h5M19 4v14m0 0l-3-3m3 3l3-3',
}
const FIco = ({ n }) => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={FICN[n]} /></svg>
)

const AREAS = [50, 80, 100, 150, 200, 250, 300, 400, 500, 750, 1000]
const CARACS = ['Piscina', 'Churrasqueira', 'Varanda gourmet', 'Academia', 'Portaria 24h', 'Closet', 'Energia solar']

// atalhos temáticos (buscas rápidas) → catálogo pré-filtrado
const RAPIDAS = [
  { label: 'Casas em condomínio', params: { tipo: 'Casa em condomínio' } },
  { label: 'Apartamentos', params: { tipo: 'Apartamento' } },
  { label: 'Alto padrão', params: { faixa: 4 } },
  { label: 'Com piscina', params: { carac: 'Piscina' } },
  { label: 'Até R$ 600 mil', params: { faixa: 1 } },
  { label: '3+ suítes', params: { suites: 3 } },
]

const blobDe = (im) => {
  const c = im.caracteristicas || {}
  return [...(c.internas || []), ...(c.externas || []), ...(c.extras || []), im.descricao || ''].join(' ').toLowerCase()
}

// números de página com reticências: 1 … 4 [5] 6 … 653
function janelasPaginas(atual, total) {
  const s = new Set([1, total, atual, atual - 1, atual + 1])
  const arr = [...s].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const out = []
  let prev = 0
  for (const p of arr) { if (p - prev > 1) out.push('…'); out.push(p); prev = p }
  return out
}

export default function Catalogo() {
  const [params, setParams] = useSearchParams()
  useSEO({
    title: 'Imóveis à venda em Uberlândia',
    description: 'Casas, apartamentos e imóveis de alto padrão à venda em Uberlândia. Filtre por bairro, preço, quartos, suítes e características e fale com o Vinícius.',
    path: '/imoveis',
  })

  // Espelho de TODOS os imóveis à venda da Rotina — feed leve carregado em runtime (não vai no bundle).
  const [feed, setFeed] = useState([])
  const [carregandoFeed, setCarregandoFeed] = useState(true)
  useEffect(() => {
    let vivo = true
    fetch('/catalogo.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivo && d && Array.isArray(d.imoveis)) setFeed(d.imoveis) })
      .catch(() => {})
      .finally(() => { if (vivo) setCarregandoFeed(false) })
    return () => { vivo = false }
  }, [])

  // une o feed com os imóveis curados do bundle (estes têm prioridade, com galeria/descrição completas)
  const TODOS = useMemo(() => {
    const mapa = new Map()
    for (const im of feed) mapa.set(String(im.codigo), im)
    // curados têm prioridade (galeria/descrição completas), mas herdam visto/novo do feed
    for (const im of IMOVEIS) {
      const cod = String(im.codigo)
      const base = mapa.get(cod)
      mapa.set(cod, base ? { ...base, ...im } : im)
    }
    return [...mapa.values()]
  }, [feed])
  const BAIRROS_TODOS = useMemo(() => [...new Set(TODOS.map((i) => i.bairro).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [TODOS])
  const LOTE = 12
  const [mostrar, setMostrar] = useState(LOTE)
  const sentinelaRef = useRef(null)
  useEffect(() => { setMostrar(LOTE) }, [params.toString()])

  const f = {
    q: params.get('q') || '',
    tipo: params.get('tipo') || '',
    bairros: (params.get('bairros') || params.get('bairro') || '').split(',').map((s) => s.trim()).filter(Boolean),
    faixa: params.has('faixa') ? parseInt(params.get('faixa'), 10) : -1,
    quartos: parseInt(params.get('quartos') || '0', 10),
    suites: parseInt(params.get('suites') || '0', 10),
    vagas: parseInt(params.get('vagas') || '0', 10),
    area: parseInt(params.get('area') || '0', 10),
    carac: params.get('carac') || '',
    grupo: params.get('grupo') || '',
    ordem: params.get('ordem') || 'recentes',
  }

  // clica num chip de tipo → liga/desliga o grupo (e limpa o tipo exato pra não conflitar)
  const toggleGrupo = (g) => {
    const p = new URLSearchParams(params)
    p.delete('tipo')
    if (f.grupo === g) p.delete('grupo')
    else p.set('grupo', g)
    setParams(p, { replace: true })
  }

  const up = (k, v) => {
    const p = new URLSearchParams(params)
    const vazio = v === '' || v == null || v === -1 || v === 0 || (k === 'ordem' && v === 'recentes')
    if (vazio) p.delete(k)
    else p.set(k, v)
    setParams(p, { replace: true })
  }

  // seleção de MÚLTIPLOS bairros (guardada como lista separada por vírgula na URL)
  const setBairros = (arr) => {
    const p = new URLSearchParams(params)
    p.delete('bairro')
    if (arr && arr.length) p.set('bairros', arr.join(',')); else p.delete('bairros')
    setParams(p, { replace: true })
  }

  // aplica um conjunto de filtros (buscas rápidas), limpando o resto
  const aplicarRapida = (novos) => {
    const p = new URLSearchParams()
    Object.entries(novos).forEach(([k, v]) => p.set(k, v))
    setParams(p, { replace: true })
  }

  const lista = useMemo(() => {
    let r = TODOS.filter((im) => {
      if (f.tipo && im.tipo !== f.tipo) return false
      if (f.grupo) { const g = TIPO_CHIPS.find((c) => c.grupo === f.grupo); if (g && !g.re.test(im.tipo || '')) return false }
      if (f.bairros.length && !f.bairros.includes(im.bairro)) return false
      if (f.quartos && (im.quartos || 0) < f.quartos) return false
      if (f.suites && (im.suites || 0) < f.suites) return false
      if (f.vagas && (im.vagas || 0) < f.vagas) return false
      if (f.area && (im.area || 0) < f.area) return false
      if (f.carac && !blobDe(im).includes(f.carac.toLowerCase())) return false
      if (f.faixa >= 0) {
        const faixa = FAIXAS_PRECO[f.faixa]
        if (im.preco < faixa.min || im.preco >= faixa.max) return false
      }
      if (f.q) {
        const alvo = `${im.tipo} ${im.bairro} ${im.codigo} ${im.cidade}`.toLowerCase()
        if (!alvo.includes(f.q.toLowerCase())) return false
      }
      return true
    })
    // "Mais recentes" (padrão): imóveis recém-chegados (com data de 1ª aparição) primeiro
    if (f.ordem === 'recentes') r = [...r].sort((a, b) => String(b.visto || '').localeCompare(String(a.visto || '')))
    if (f.ordem === 'menor') r = [...r].sort((a, b) => a.preco - b.preco)
    if (f.ordem === 'maior') r = [...r].sort((a, b) => b.preco - a.preco)
    if (f.ordem === 'area-maior') r = [...r].sort((a, b) => (b.area || 0) - (a.area || 0))
    if (f.ordem === 'area-menor') r = [...r].sort((a, b) => (a.area || 0) - (b.area || 0))
    // anúncios impulsionados (publicidade) sobem para o topo da listagem, como nos portais
    r = [...r].sort((a, b) => (b.impulsionado ? 1 : 0) - (a.impulsionado ? 1 : 0))
    return r
  }, [TODOS, f.tipo, f.grupo, f.bairros.join(','), f.quartos, f.suites, f.vagas, f.area, f.carac, f.faixa, f.q, f.ordem])

  const visiveis = lista.slice(0, mostrar)
  const temMais = mostrar < lista.length
  // rolagem infinita: carrega mais um lote quando o sentinela aparece
  useEffect(() => {
    if (!temMais) return
    const el = sentinelaRef.current
    if (!el) return
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setMostrar((m) => Math.min(m + LOTE, lista.length))
    }, { rootMargin: '700px 0px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [temMais, lista.length])

  const limpar = () => setParams({}, { replace: true })
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)

  const chips = [
    f.q && { k: 'q', label: `“${f.q}”`, onRemove: () => up('q', '') },
    f.tipo && { k: 'tipo', label: f.tipo, onRemove: () => up('tipo', '') },
    ...f.bairros.map((b) => ({ k: 'b:' + b, label: b, onRemove: () => setBairros(f.bairros.filter((x) => x !== b)) })),
    f.faixa >= 0 && { k: 'faixa', label: FAIXAS_PRECO[f.faixa].label, onRemove: () => up('faixa', -1) },
    f.quartos > 0 && { k: 'quartos', label: `${f.quartos}+ quartos`, onRemove: () => up('quartos', 0) },
    f.suites > 0 && { k: 'suites', label: `${f.suites}+ suítes`, onRemove: () => up('suites', 0) },
    f.vagas > 0 && { k: 'vagas', label: `${f.vagas}+ vagas`, onRemove: () => up('vagas', 0) },
    f.area > 0 && { k: 'area', label: `${f.area}+ m²`, onRemove: () => up('area', 0) },
    f.carac && { k: 'carac', label: f.carac, onRemove: () => up('carac', '') },
  ].filter(Boolean)

  return (
    <main className="section--light catalogo">
      <div className="container">
        <Reveal>
          <div className="cat-head">
            <span className="eyebrow">Imóveis da Rotina Imobiliária · Uberlândia</span>
            <h1 className="section-title">Imóveis à venda em <em>destaque na Rotina</em></h1>
            <p className="section-sub" style={{ marginTop: 12 }}>
              Imóveis da carteira da <b>Rotina Imobiliária</b>, com o meu atendimento pessoal do começo ao fim. Use os filtros para encontrar o que combina com você.
            </p>
          </div>
        </Reveal>

        {/* botão "Filtros" — só aparece no mobile via CSS */}
        <button
          type="button"
          className={`cat-mob-filtros-btn${chips.length > 0 ? ' tem-filtros' : ''}`}
          onClick={() => setFiltrosAbertos(true)}
          aria-haspopup="dialog"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
          Filtros{chips.length > 0 && <span className="cat-mob-badge">{chips.length}</span>}
        </button>

        {/* backdrop mobile */}
        {filtrosAbertos && <div className="cat-mob-backdrop" onClick={() => setFiltrosAbertos(false)} aria-hidden="true" />}

        <div className="cat-layout">
        <aside className={`cat-rail${filtrosAbertos ? ' cat-rail--aberto' : ''}`} data-lenis-prevent>
        <div className="cat-painel">
        {/* cabeçalho do drawer mobile — close button */}
        <div className="cat-mob-header">
          <span className="cat-mob-titulo">Filtros</span>
          <button type="button" className="cat-mob-fechar" onClick={() => setFiltrosAbertos(false)} aria-label="Fechar filtros">
            <IconClose width={18} height={18} />
          </button>
        </div>
        {/* buscas rápidas */}
        <div className="cat-rapidas">
          {RAPIDAS.map((r) => (
            <button key={r.label} className="cat-rapida" onClick={() => aplicarRapida(r.params)}>{r.label}</button>
          ))}
        </div>

        {/* Campo de busca em destaque */}
        <div className="cat-busca-box">
          <span className="cat-busca-ico"><FIco n="search" /></span>
          <input
            className="cat-busca"
            type="search"
            placeholder="Buscar por código ou bairro"
            value={f.q}
            onChange={(e) => up('q', e.target.value)}
          />
        </div>

        {/* Filtros */}
        <div className="cat-filtros">
          <FiltroSelect icon={<FIco n="tipo" />} placeholder="Todos os tipos" neutral="" value={f.tipo} onChange={(v) => up('tipo', v)}
            options={[{ value: '', label: 'Todos os tipos' }, ...TIPOS_IMOVEL.map((t) => ({ value: t, label: t }))]} />
          <FiltroSelect icon={<FIco n="bairro" />} placeholder="Todos os bairros" multiple searchable value={f.bairros} onChange={setBairros}
            options={(BAIRROS_TODOS.length ? BAIRROS_TODOS : BAIRROS_IMOVEL).map((b) => ({ value: b, label: b }))} />
          <FiltroSelect icon={<FIco n="preco" />} placeholder="Qualquer preço" neutral={-1} value={f.faixa} onChange={(v) => up('faixa', v)}
            options={[{ value: -1, label: 'Qualquer preço' }, ...FAIXAS_PRECO.map((p, i) => ({ value: i, label: p.label }))]} />
          <FiltroPills icon={<FIco n="quartos" />} label="Quartos" value={f.quartos} onChange={(v) => up('quartos', v)} />
          <FiltroPills icon={<FIco n="suites" />} label="Suítes" value={f.suites} onChange={(v) => up('suites', v)} />
          <FiltroPills icon={<FIco n="vagas" />} label="Vagas" value={f.vagas} onChange={(v) => up('vagas', v)} />
          <FiltroSelect icon={<FIco n="area" />} placeholder="Área mín. (m²)" neutral={0} value={f.area} onChange={(v) => up('area', v)}
            options={[{ value: 0, label: 'Qualquer área' }, ...AREAS.map((n) => ({ value: n, label: `${n.toLocaleString('pt-BR')}+ m²` }))]} />
          <FiltroSelect icon={<FIco n="carac" />} placeholder="Característica" neutral="" value={f.carac} onChange={(v) => up('carac', v)}
            options={[{ value: '', label: 'Qualquer' }, ...CARACS.map((c) => ({ value: c, label: c }))]} />
          <FiltroSelect icon={<FIco n="ordem" />} placeholder="Mais recentes" neutral="recentes" value={f.ordem} onChange={(v) => up('ordem', v)}
            options={[{ value: 'recentes', label: 'Mais recentes' }, { value: 'menor', label: 'Menor preço' }, { value: 'maior', label: 'Maior preço' }, { value: 'area-maior', label: 'Maior área' }, { value: 'area-menor', label: 'Menor área' }]} />
        </div>
        {/* botão "Ver X imóveis" — só aparece no drawer mobile */}
        <button type="button" className="cat-mob-aplicar" onClick={() => setFiltrosAbertos(false)}>
          Ver {lista.length} {lista.length === 1 ? 'imóvel' : 'imóveis'}
        </button>
        </div>

        {chips.length > 0 && (
          <div className="cat-chips">
            {chips.map((c) => (
              <button key={c.k} className="cat-chip" onClick={c.onRemove}>
                {c.label} <IconClose width={13} height={13} />
              </button>
            ))}
            <button className="cat-limpar" onClick={limpar}>Limpar tudo</button>
          </div>
        )}
        </aside>

        <div className="cat-main" data-lenis-prevent>
        <div className="cat-tipos">
          {TIPO_CHIPS.map((c) => (
            <button key={c.grupo} type="button" className={`cat-tipo ${f.grupo === c.grupo ? 'on' : ''}`} onClick={() => toggleGrupo(c.grupo)}>
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={c.d} /></svg>
              <span>{c.label}</span>
            </button>
          ))}
        </div>

        <p className="cat-count">{carregandoFeed && !feed.length ? 'Carregando imóveis da Rotina…' : `${lista.length} ${lista.length === 1 ? 'imóvel encontrado' : 'imóveis encontrados'}`}</p>

        {lista.length ? (
          <>
          <div className="cat-lista">
            {visiveis.map((im) => (
              <CardImovel key={im.codigo} im={im} variante="linha" />
            ))}
          </div>
          {temMais && (
            <div ref={sentinelaRef} className="cat-infinito" aria-hidden="true">
              <span className="rota-spinner" /> Carregando mais imóveis…
            </div>
          )}
          </>
        ) : (
          <div className="cat-vazio">
            <p>Não encontrei imóveis com esses filtros. Deixa eu achar pra você?</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link className="btn btn-gold" to="/encontrar-imovel">Encontrar meu imóvel</Link>
              <a className="btn btn-ghost" href={linkWhatsApp(WA.imoveis)} target="_blank" rel="noopener">
                <IconWhats /> Me chamar no WhatsApp
              </a>
            </div>
          </div>
        )}

        <AviseMe />
        </div>
        </div>
      </div>
    </main>
  )
}
