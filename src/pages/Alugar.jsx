import { useMemo, useState, useEffect, useRef } from 'react'
import { useSearchParams, useParams, Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import CardImovel from '../components/CardImovel'
import AviseMe from '../components/AviseMe'
import FiltroSelect from '../components/FiltroSelect'
import FiltroPills from '../components/FiltroPills'
import InputMoeda from '../components/InputMoeda'
import ComprarAlugarToggle from '../components/ComprarAlugarToggle'
import { slugify, linkWhatsApp, WA } from '../data'
import { useAlugueis } from '../useAlugueis'
import { useSEO } from '../useSEO'
import { IconWhats, IconClose } from '../components/icons'

const ORDENS = [
  { value: 'menor', label: 'Menor aluguel' },
  { value: 'maior', label: 'Maior aluguel' },
  { value: 'area-maior', label: 'Maior área' },
]

export default function Alugar() {
  const { bairro: bairroSlug } = useParams() // presente em /alugar/uberlandia/:bairro
  const [params, setParams] = useSearchParams()
  const { alugueis, carregando } = useAlugueis()

  // nome real do bairro (a partir do slug) p/ título e filtro fixo
  const bairroNome = useMemo(() => {
    if (!bairroSlug) return ''
    const hit = alugueis.find((im) => im.bairro && slugify(im.bairro) === bairroSlug)
    return hit ? hit.bairro : bairroSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }, [bairroSlug, alugueis])

  useSEO({
    title: bairroNome
      ? `Imóveis para alugar em ${bairroNome}, Uberlândia — casas e apartamentos`
      : 'Imóveis para alugar em Uberlândia — casas, apartamentos e kitnets',
    description: bairroNome
      ? `Casas e apartamentos para alugar em ${bairroNome}, Uberlândia. Filtre por preço, quartos e tipo e fale com o Vinícius Graton.`
      : 'Imóveis para alugar em Uberlândia: casas, apartamentos, kitnets e salas. Filtre por bairro, preço e quartos e fale direto com o Vinícius Graton.',
    path: bairroSlug ? `/alugar/uberlandia/${bairroSlug}` : '/alugar',
  })

  const tipos = useMemo(
    () => [...new Set(alugueis.map((i) => (i.tipo || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [alugueis]
  )
  const bairros = useMemo(
    () => [...new Set(alugueis.map((i) => (i.bairro || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [alugueis]
  )

  const f = {
    q: params.get('q') || '',
    tipo: params.get('tipo') || '',
    bairros: (params.get('bairros') || '').split(',').map((s) => s.trim()).filter(Boolean),
    precoMin: parseInt(params.get('precoMin') || '0', 10) || 0,
    precoMax: parseInt(params.get('precoMax') || '0', 10) || 0,
    quartos: parseInt(params.get('quartos') || '0', 10),
    ordem: params.get('ordem') || 'menor',
  }
  const up = (k, v) => {
    const p = new URLSearchParams(params)
    const vazio = v === '' || v == null || v === 0 || (k === 'ordem' && v === 'menor')
    if (vazio) p.delete(k); else p.set(k, v)
    setParams(p, { replace: true })
  }
  const setBairros = (arr) => {
    const p = new URLSearchParams(params)
    if (arr && arr.length) p.set('bairros', arr.join(',')); else p.delete('bairros')
    setParams(p, { replace: true })
  }

  const lista = useMemo(() => {
    let r = alugueis.filter((im) => {
      if (!(im.preco >= 200 && im.preco <= 200000)) return false // descarta placeholder (R$1) e erro de venda no feed de aluguel
      if (bairroSlug && slugify(im.bairro || '') !== bairroSlug) return false
      if (f.tipo && im.tipo !== f.tipo) return false
      if (f.bairros.length && !f.bairros.includes((im.bairro || '').trim())) return false
      if (f.quartos && (im.quartos || 0) < f.quartos) return false
      if (f.precoMin && (im.preco || 0) < f.precoMin) return false
      if (f.precoMax && (im.preco || 0) > f.precoMax) return false
      if (f.q) {
        const blob = `${im.tipo} ${im.bairro} ${im.rua || ''} ${im.codigo}`.toLowerCase()
        if (!blob.includes(f.q.toLowerCase())) return false
      }
      return true
    })
    if (f.ordem === 'menor') r = [...r].sort((a, b) => (a.preco || 0) - (b.preco || 0))
    if (f.ordem === 'maior') r = [...r].sort((a, b) => (b.preco || 0) - (a.preco || 0))
    if (f.ordem === 'area-maior') r = [...r].sort((a, b) => (b.area || 0) - (a.area || 0))
    return r
  }, [alugueis, bairroSlug, f.tipo, f.bairros.join(','), f.quartos, f.precoMin, f.precoMax, f.q, f.ordem])

  const LOTE = 12
  const [mostrar, setMostrar] = useState(LOTE)
  const sentinelaRef = useRef(null)
  useEffect(() => { setMostrar(LOTE) }, [params.toString(), bairroSlug])
  const visiveis = lista.slice(0, mostrar)
  const temMais = mostrar < lista.length
  useEffect(() => {
    if (!temMais) return
    const el = sentinelaRef.current; if (!el) return
    const obs = new IntersectionObserver((e) => { if (e[0].isIntersecting) setMostrar((m) => Math.min(m + LOTE, lista.length)) }, { rootMargin: '700px 0px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [temMais, lista.length])

  // grade SEO: bairros com mais imóveis de aluguel → /alugar/uberlandia/:slug
  const topBairros = useMemo(() => {
    if (bairroSlug) return []
    const cont = new Map()
    for (const im of alugueis) { const b = (im.bairro || '').trim(); if (b) cont.set(b, (cont.get(b) || 0) + 1) }
    return [...cont.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).slice(0, 40)
  }, [alugueis, bairroSlug])

  const chips = [
    f.q && { k: 'q', label: `“${f.q}”`, onRemove: () => up('q', '') },
    f.tipo && { k: 'tipo', label: f.tipo, onRemove: () => up('tipo', '') },
    ...f.bairros.map((b) => ({ k: 'b:' + b, label: b, onRemove: () => setBairros(f.bairros.filter((x) => x !== b)) })),
    f.precoMin > 0 && { k: 'precoMin', label: `A partir de R$ ${f.precoMin.toLocaleString('pt-BR')}`, onRemove: () => up('precoMin', 0) },
    f.precoMax > 0 && { k: 'precoMax', label: `Até R$ ${f.precoMax.toLocaleString('pt-BR')}`, onRemove: () => up('precoMax', 0) },
    f.quartos > 0 && { k: 'quartos', label: `${f.quartos}+ quartos`, onRemove: () => up('quartos', 0) },
  ].filter(Boolean)

  return (
    <main className="section--light catalogo">
      <div className="container">
        <Reveal>
          <div className="cat-head">
            <nav className="cat-bread" aria-label="Navegação">
              <Link to="/">Início</Link><span aria-hidden="true">›</span>
              <Link to="/alugar">Alugar</Link>
              {bairroNome && <><span aria-hidden="true">›</span><span>{bairroNome}</span></>}
            </nav>
            <ComprarAlugarToggle />
            <h1 className="cat-h1">
              {carregando && !alugueis.length
                ? <>Imóveis para <em>alugar</em> em Uberlândia</>
                : <><b>{lista.length.toLocaleString('pt-BR')}</b> {lista.length === 1 ? 'imóvel' : 'imóveis'} para <em>alugar</em> em {bairroNome || 'Uberlândia'}</>}
            </h1>
            <p className="cat-head-sub">
              Imóveis de locação da carteira da <b>Rotina Imobiliária</b>, com o meu atendimento do começo ao fim — análise de garantia (fiador, seguro-fiança ou caução) e agendamento de visita.
            </p>
          </div>
        </Reveal>

        {/* filtros (barra horizontal) */}
        <div className="alg-filtros">
          <input className="cat-busca" type="search" placeholder="Buscar por rua, bairro ou código" value={f.q} onChange={(e) => up('q', e.target.value)} autoComplete="off" />
          <FiltroSelect placeholder="Todos os tipos" neutral="" value={f.tipo} onChange={(v) => up('tipo', v)}
            options={[{ value: '', label: 'Todos os tipos' }, ...tipos.map((t) => ({ value: t, label: t }))]} />
          {!bairroSlug && (
            <FiltroSelect placeholder="Todos os bairros" multiple searchable multiNoun="bairros" value={f.bairros} onChange={setBairros}
              options={bairros.map((b) => ({ value: b, label: b }))} />
          )}
          <div className="cat-preco alg-preco">
            <InputMoeda className="cat-preco-input" placeholder="Aluguel mín." value={f.precoMin || ''} onChange={(v) => up('precoMin', v || 0)} />
            <span className="cat-preco-ate">até</span>
            <InputMoeda className="cat-preco-input" placeholder="Aluguel máx." value={f.precoMax || ''} onChange={(v) => up('precoMax', v || 0)} />
          </div>
          <FiltroPills label="Quartos" value={f.quartos} onChange={(v) => up('quartos', v)} />
          <FiltroSelect placeholder="Menor aluguel" neutral="menor" value={f.ordem} onChange={(v) => up('ordem', v)} options={ORDENS} />
        </div>

        {chips.length > 0 && (
          <div className="cat-chips">
            {chips.map((c) => <button key={c.k} className="cat-chip" onClick={c.onRemove}>{c.label} <IconClose width={13} height={13} /></button>)}
            <button className="cat-limpar" onClick={() => setParams({}, { replace: true })}>Limpar tudo</button>
          </div>
        )}

        <p className="cat-count">{carregando && !alugueis.length ? 'Carregando imóveis para alugar…' : `${lista.length} ${lista.length === 1 ? 'imóvel encontrado' : 'imóveis encontrados'}`}</p>

        {lista.length ? (
          <>
            <div className="cat-grid">
              {visiveis.map((im) => <CardImovel key={im.codigo} im={im} />)}
            </div>
            {temMais && <div ref={sentinelaRef} className="cat-infinito" aria-hidden="true"><span className="rota-spinner" /> Carregando mais imóveis…</div>}
          </>
        ) : !carregando ? (
          <div className="cat-vazio">
            <p>Não encontrei imóveis para alugar com esses filtros. Me chama que eu procuro pra você.</p>
            <a className="btn btn-gold" href={linkWhatsApp(WA?.imoveis || 'Olá Vinícius! Procuro um imóvel para alugar em Uberlândia.')} target="_blank" rel="noopener noreferrer"><IconWhats /> Falar no WhatsApp</a>
          </div>
        ) : null}

        {topBairros.length > 12 && (
          <section className="cat-seo-bairros" aria-label="Imóveis para alugar por bairro">
            <h2 className="cat-seo-tit">Imóveis para alugar nos bairros mais procurados de <em>Uberlândia</em></h2>
            <div className="cat-seo-grid">
              {topBairros.map(([b, n]) => (
                <Link key={b} to={`/alugar/uberlandia/${slugify(b)}`} className="cat-seo-link">Alugar no {b} <span>{n}</span></Link>
              ))}
            </div>
          </section>
        )}

        <AviseMe contexto={bairroNome ? `aluguel em ${bairroNome}` : 'aluguel'} />
      </div>
    </main>
  )
}
