import { useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import CardImovel from '../components/CardImovel'
import AviseMe from '../components/AviseMe'
import { IMOVEIS, TIPOS_IMOVEL, BAIRROS_IMOVEL, FAIXAS_PRECO, linkWhatsApp, WA } from '../data'
import { useSEO } from '../useSEO'
import { IconWhats, IconClose } from '../components/icons'

const AREAS = [60, 100, 150, 200, 300]
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

export default function Catalogo() {
  const [params, setParams] = useSearchParams()
  useSEO({
    title: 'Imóveis à venda em Uberlândia',
    description: 'Casas, apartamentos e imóveis de alto padrão à venda em Uberlândia. Filtre por bairro, preço, quartos, suítes e características e fale com o Vinícius.',
    path: '/imoveis',
  })

  const f = {
    q: params.get('q') || '',
    tipo: params.get('tipo') || '',
    bairro: params.get('bairro') || '',
    faixa: params.has('faixa') ? parseInt(params.get('faixa'), 10) : -1,
    quartos: parseInt(params.get('quartos') || '0', 10),
    suites: parseInt(params.get('suites') || '0', 10),
    vagas: parseInt(params.get('vagas') || '0', 10),
    area: parseInt(params.get('area') || '0', 10),
    carac: params.get('carac') || '',
    ordem: params.get('ordem') || 'recentes',
  }

  const up = (k, v) => {
    const p = new URLSearchParams(params)
    const vazio = v === '' || v == null || v === -1 || v === 0 || (k === 'ordem' && v === 'recentes')
    if (vazio) p.delete(k)
    else p.set(k, v)
    setParams(p, { replace: true })
  }

  // aplica um conjunto de filtros (buscas rápidas), limpando o resto
  const aplicarRapida = (novos) => {
    const p = new URLSearchParams()
    Object.entries(novos).forEach(([k, v]) => p.set(k, v))
    setParams(p, { replace: true })
  }

  const lista = useMemo(() => {
    let r = IMOVEIS.filter((im) => {
      if (f.tipo && im.tipo !== f.tipo) return false
      if (f.bairro && im.bairro !== f.bairro) return false
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
    if (f.ordem === 'menor') r = [...r].sort((a, b) => a.preco - b.preco)
    if (f.ordem === 'maior') r = [...r].sort((a, b) => b.preco - a.preco)
    return r
  }, [f.tipo, f.bairro, f.quartos, f.suites, f.vagas, f.area, f.carac, f.faixa, f.q, f.ordem])

  const limpar = () => setParams({}, { replace: true })

  const chips = [
    f.q && { k: 'q', label: `“${f.q}”`, reset: '' },
    f.tipo && { k: 'tipo', label: f.tipo, reset: '' },
    f.bairro && { k: 'bairro', label: f.bairro, reset: '' },
    f.faixa >= 0 && { k: 'faixa', label: FAIXAS_PRECO[f.faixa].label, reset: -1 },
    f.quartos > 0 && { k: 'quartos', label: `${f.quartos}+ quartos`, reset: 0 },
    f.suites > 0 && { k: 'suites', label: `${f.suites}+ suítes`, reset: 0 },
    f.vagas > 0 && { k: 'vagas', label: `${f.vagas}+ vagas`, reset: 0 },
    f.area > 0 && { k: 'area', label: `${f.area}+ m²`, reset: 0 },
    f.carac && { k: 'carac', label: f.carac, reset: '' },
  ].filter(Boolean)

  return (
    <main className="section--light catalogo">
      <div className="container">
        <Reveal>
          <div className="cat-head">
            <span className="eyebrow">Vitrine de imóveis · Uberlândia</span>
            <h1 className="section-title">Imóveis à <em>venda</em></h1>
            <p className="section-sub" style={{ marginTop: 12 }}>
              Selecionados da minha carteira. Use os filtros para encontrar o que combina com você.
            </p>
          </div>
        </Reveal>

        {/* buscas rápidas */}
        <div className="cat-rapidas">
          {RAPIDAS.map((r) => (
            <button key={r.label} className="cat-rapida" onClick={() => aplicarRapida(r.params)}>{r.label}</button>
          ))}
        </div>

        {/* Filtros */}
        <div className="cat-filtros">
          <input
            className="cat-busca"
            type="search"
            placeholder="Buscar por bairro, tipo ou código…"
            value={f.q}
            onChange={(e) => up('q', e.target.value)}
          />
          <select value={f.tipo} onChange={(e) => up('tipo', e.target.value)}>
            <option value="">Todos os tipos</option>
            {TIPOS_IMOVEL.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={f.bairro} onChange={(e) => up('bairro', e.target.value)}>
            <option value="">Todos os bairros</option>
            {BAIRROS_IMOVEL.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={f.faixa} onChange={(e) => up('faixa', parseInt(e.target.value, 10))}>
            <option value={-1}>Qualquer preço</option>
            {FAIXAS_PRECO.map((p, i) => <option key={i} value={i}>{p.label}</option>)}
          </select>
          <select value={f.quartos} onChange={(e) => up('quartos', parseInt(e.target.value, 10))}>
            <option value={0}>Quartos</option>
            {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}+ quartos</option>)}
          </select>
          <select value={f.suites} onChange={(e) => up('suites', parseInt(e.target.value, 10))}>
            <option value={0}>Suítes</option>
            {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}+ suítes</option>)}
          </select>
          <select value={f.vagas} onChange={(e) => up('vagas', parseInt(e.target.value, 10))}>
            <option value={0}>Vagas</option>
            {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}+ vagas</option>)}
          </select>
          <select value={f.area} onChange={(e) => up('area', parseInt(e.target.value, 10))}>
            <option value={0}>Área</option>
            {AREAS.map((n) => <option key={n} value={n}>{n}+ m²</option>)}
          </select>
          <select value={f.carac} onChange={(e) => up('carac', e.target.value)}>
            <option value="">Característica</option>
            {CARACS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={f.ordem} onChange={(e) => up('ordem', e.target.value)}>
            <option value="recentes">Mais recentes</option>
            <option value="menor">Menor preço</option>
            <option value="maior">Maior preço</option>
          </select>
        </div>

        {chips.length > 0 && (
          <div className="cat-chips">
            {chips.map((c) => (
              <button key={c.k} className="cat-chip" onClick={() => up(c.k, c.reset)}>
                {c.label} <IconClose width={13} height={13} />
              </button>
            ))}
            <button className="cat-limpar" onClick={limpar}>Limpar tudo</button>
          </div>
        )}

        <p className="cat-count">{lista.length} {lista.length === 1 ? 'imóvel encontrado' : 'imóveis encontrados'}</p>

        {lista.length ? (
          <div className="im-grid" style={{ perspective: '1400px' }}>
            {lista.map((im, i) => (
              <Reveal key={im.codigo} delay={(i % 3) * 0.06}>
                <CardImovel im={im} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="cat-vazio">
            <p>Não encontrei imóveis com esses filtros.</p>
            <a className="btn btn-gold" href={linkWhatsApp(WA.imoveis)} target="_blank" rel="noopener">
              <IconWhats /> Me conta o que você procura
            </a>
          </div>
        )}

        <AviseMe />
      </div>
    </main>
  )
}
