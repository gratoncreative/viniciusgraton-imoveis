import { useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import CardImovel from '../components/CardImovel'
import AviseMe from '../components/AviseMe'
import BannerAds from '../components/BannerAds'
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

  // aplica um conjunto de filtros (buscas rápidas), limpando o resto
  const aplicarRapida = (novos) => {
    const p = new URLSearchParams()
    Object.entries(novos).forEach(([k, v]) => p.set(k, v))
    setParams(p, { replace: true })
  }

  const lista = useMemo(() => {
    let r = IMOVEIS.filter((im) => {
      if (f.tipo && im.tipo !== f.tipo) return false
      if (f.grupo) { const g = TIPO_CHIPS.find((c) => c.grupo === f.grupo); if (g && !g.re.test(im.tipo || '')) return false }
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
    if (f.ordem === 'area-maior') r = [...r].sort((a, b) => (b.area || 0) - (a.area || 0))
    if (f.ordem === 'area-menor') r = [...r].sort((a, b) => (a.area || 0) - (b.area || 0))
    return r
  }, [f.tipo, f.grupo, f.bairro, f.quartos, f.suites, f.vagas, f.area, f.carac, f.faixa, f.q, f.ordem])

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

        <div className="cat-layout">
        <aside className="cat-rail">
        <div className="cat-painel">
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
            placeholder="Buscar por código ou bairro"
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
            <option value="area-maior">Maior área</option>
            <option value="area-menor">Menor área</option>
          </select>
        </div>
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

        <BannerAds orientacao="vertical" />
        </aside>

        <div className="cat-main">
        <div className="cat-tipos">
          {TIPO_CHIPS.map((c) => (
            <button key={c.grupo} type="button" className={`cat-tipo ${f.grupo === c.grupo ? 'on' : ''}`} onClick={() => toggleGrupo(c.grupo)}>
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={c.d} /></svg>
              <span>{c.label}</span>
            </button>
          ))}
        </div>

        <p className="cat-count">{lista.length} {lista.length === 1 ? 'imóvel encontrado' : 'imóveis encontrados'}</p>

        {lista.length ? (
          <div className="cat-lista">
            {lista.map((im) => (
              <CardImovel key={im.codigo} im={im} variante="linha" />
            ))}
          </div>
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
