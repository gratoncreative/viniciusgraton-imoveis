import { useState, useMemo, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSEO } from '../useSEO'
import { todosEmpreendimentosTodos, bairrosComEmpreendimentos, linkWhatsApp, CONSTRUTORAS, BLOW_EMPREENDIMENTOS } from '../data'
import { onImgError } from '../img'
import Reveal from '../components/Reveal'
import { IconWhats, IconArrow, IconPin, IconShield, IconBuilding } from '../components/icons'
import { isLancLivre, getLancVistos, markLancVisto, LANC_LIMIT } from '../components/LancGate'

const WA_PORTAL = 'Olá Vinícius! Acessei o portal de lançamentos e gostaria de saber mais sobre os empreendimentos disponíveis em Uberlândia.'

const STATUS_COR = { 'Lançamento': '#4fa3e0', 'Em obras': '#f59e0b', 'Pronto': '#56c27d' }

export function CardEmpLan({ e, variante }) {
  const nav = useNavigate()
  // empreendimento com landing dedicada (ex.: Louis) linka direto pra ela, sem o limite de visitas
  const landing = e.landingPath || null
  const url = landing || `/construtoras/${e.construtoraSlug}/${e.slug}`
  const key = `${e.construtoraSlug}--${e.slug}`
  const tip = e.tipologias && e.tipologias.length > 0 ? e.tipologias[0] : null
  const tipCurt = tip ? (tip.length > 64 ? tip.slice(0, 64) + '…' : tip) : null
  const tipLinha = tip ? (tip.length > 110 ? tip.slice(0, 110) + '…' : tip) : null

  const handleClick = (ev) => {
    ev.preventDefault()
    if (landing) { nav(url); return } // landing própria: livre (lead magnet)
    if (isLancLivre()) { markLancVisto(key); nav(url); return }
    const vistos = getLancVistos()
    if (vistos.has(key)) { nav(url); return }
    if (vistos.size >= LANC_LIMIT) {
      window.dispatchEvent(new CustomEvent('vg-lanc-gate', { detail: { url, key } }))
      return
    }
    markLancVisto(key)
    nav(url)
  }

  // Variante LINHA — card horizontal de largura cheia (foto à esquerda). Empilhados,
  // ocupam 100% da largura → a lista nunca deixa espaço vazio em nenhuma tela.
  if (variante === 'linha') {
    return (
      <Link to={url} className="lan-row" onClick={handleClick}>
        <div className="lan-row-capa">
          {e.capa
            ? <img src={e.capa} alt={`${e.nome} — ${e.bairro || 'Uberlândia'}`} loading="lazy" referrerPolicy="no-referrer" onError={onImgError} />
            : <span className="lan-card-semfoto"><IconBuilding width={30} height={30} /></span>}
          <span className="lan-row-status" style={{ background: STATUS_COR[e.status] || '#666' }}>{e.status}</span>
        </div>
        <div className="lan-row-main">
          <span className="lan-card-const">{e.construtoraNome}</span>
          <strong className="lan-row-nome">{e.nome}</strong>
          <span className="lan-card-bairro"><IconPin width={12} height={12} />{e.bairro || 'Uberlândia'}</span>
          {tipLinha && <span className="lan-row-tip">{tipLinha}</span>}
        </div>
        <div className="lan-row-aside">
          {e.preco && <span className="lan-row-preco">{e.preco}</span>}
          <span className="lan-card-cta">Ver empreendimento <IconArrow width={13} height={13} /></span>
        </div>
      </Link>
    )
  }

  return (
    <Link to={url} className="lan-card" onClick={handleClick}>
      <div className="lan-card-capa">
        {e.capa
          ? <img src={e.capa} alt={`${e.nome} — ${e.bairro || 'Uberlândia'}`} loading="lazy" referrerPolicy="no-referrer" onError={onImgError} />
          : <span className="lan-card-semfoto"><IconBuilding width={32} height={32} /></span>}
        <span className="lan-card-status" style={{ background: STATUS_COR[e.status] || '#666' }}>{e.status}</span>
      </div>
      <div className="lan-card-body">
        <span className="lan-card-const">{e.construtoraNome}</span>
        <strong className="lan-card-nome">{e.nome}</strong>
        <span className="lan-card-bairro"><IconPin width={12} height={12} />{e.bairro || 'Uberlândia'}</span>
        {tipCurt && <span className="lan-card-tip">{tipCurt}</span>}
        {e.preco && <span className="lan-card-preco">{e.preco}</span>}
        <span className="lan-card-cta">Ver empreendimento <IconArrow width={13} height={13} /></span>
      </div>
    </Link>
  )
}

export default function PortalLancamentosHome() {
  useSEO({
    title: 'Portal de Lançamentos de Uberlândia — Curadoria Vinícius Graton',
    description:
      'Os lançamentos imobiliários de Uberlândia com curadoria de um consultor da Rotina Imobiliária. Compare empreendimentos, veja plantas, simule financiamento e fale direto com o consultor credenciado.',
    path: '/lancamentos',
  })

  const todos = useMemo(() => todosEmpreendimentosTodos(), [])
  const bairros = useMemo(() => bairrosComEmpreendimentos(), [])

  // Busca por nome/bairro/construtora (filtro único) + rolagem infinita
  const [busca, setBusca] = useState('')
  const [qtd, setQtd] = useState(12)
  const sentinelaRef = useRef(null)

  const PRIORIDADE = { Lançamento: 0, 'Em obras': 1, Pronto: 2 }

  const resultado = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return todos
      .filter((e) =>
        !q ||
        (e.nome || '').toLowerCase().includes(q) ||
        (e.bairro || '').toLowerCase().includes(q) ||
        (e.construtoraNome || '').toLowerCase().includes(q) ||
        (e.tipologias || []).join(' ').toLowerCase().includes(q)
      )
      .sort((a, b) => {
        if (!!b.destaqueTopo !== !!a.destaqueTopo) return (b.destaqueTopo ? 1 : 0) - (a.destaqueTopo ? 1 : 0) // campanha no topo
        if (!!b.capa !== !!a.capa) return (b.capa ? 1 : 0) - (a.capa ? 1 : 0) // com foto primeiro
        return (PRIORIDADE[a.status] ?? 9) - (PRIORIDADE[b.status] ?? 9)
      })
  }, [todos, busca])

  const visiveis = useMemo(() => resultado.slice(0, qtd), [resultado, qtd])
  const temFiltro = !!busca
  const limparFiltros = () => setBusca('')

  // ao mexer na busca, volta ao começo da lista
  useEffect(() => { setQtd(12) }, [busca])

  // rolagem infinita: carrega +12 quando o sentinela entra na viewport
  useEffect(() => {
    const el = sentinelaRef.current
    if (!el) return
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setQtd((q) => (q < resultado.length ? Math.min(q + 12, resultado.length) : q))
    }, { rootMargin: '700px 0px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [resultado.length])

  const slugBairro = (b) =>
    b.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-')

  const totalConstrutoras = CONSTRUTORAS.length + new Set(BLOW_EMPREENDIMENTOS.map((e) => e.construtoraSlug)).size

  return (
    <main className="pagina lan-portal">
      {/* Hero — MESMA estrutura/posição de filtro de /condominios (padronizado) */}
      <section className="condos-hero condos-hero--lanc">
        <div className="container condos-hero-inner">
          <Reveal>
            <span className="condos-hero-eyebrow">Portal de Lançamentos · Uberlândia</span>
            <h2 className="condos-hero-title">Lançamentos de <em>Uberlândia</em></h2>
            <p className="condos-hero-desc">
              Filtro, comparo e indico só o que faz sentido para o seu perfil — com análise independente.
            </p>
            <div className="condos-hero-stats">
              <span><b>{totalConstrutoras}</b> construtoras</span>
              <i aria-hidden="true" />
              <span><b>{todos.length}</b> empreendimentos</span>
              <i aria-hidden="true" />
              <span><b>{bairros.length}</b> bairros</span>
            </div>
          </Reveal>

          {/* Busca — único filtro (por nome, bairro ou construtora) */}
          <div className="condos-hero-search">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar empreendimento pelo nome, bairro ou construtora…" aria-label="Buscar empreendimentos" />
            {busca && <button className="condos-search-x" onClick={() => setBusca('')} aria-label="Limpar busca">✕</button>}
          </div>
        </div>
      </section>

      {/* Vitrine — grade direta (sem cabeçalho redundante); só uma contagem fina */}
      <section className="section--light lan-vitrine">
        <div className="container">
          <div className="lan-contagem-bar">
            <span className="lan-contagem"><b>{resultado.length}</b> {resultado.length === 1 ? 'empreendimento' : 'empreendimentos'}</span>
            {temFiltro && <button type="button" className="lan-filtro-limpar" onClick={limparFiltros}>limpar filtros ✕</button>}
          </div>

          {resultado.length > 0 ? (
            <>
              <div className="lan-lista">
                {visiveis.map((e) => <CardEmpLan key={`${e.construtoraSlug}--${e.slug}`} e={e} variante="linha" />)}
              </div>
              {qtd < resultado.length && (
                <>
                  <div ref={sentinelaRef} aria-hidden="true" style={{ height: 1 }} />
                  <div style={{ textAlign: 'center', marginTop: 28 }}>
                    <button type="button" className="btn btn-ghost" onClick={() => setQtd((q) => Math.min(q + 12, resultado.length))}>
                      Carregar mais ({resultado.length - qtd} restantes)
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <p className="section-sub" style={{ textAlign: 'center', margin: '32px auto' }}>
              Nenhum empreendimento encontrado com esses filtros. <button type="button" className="lan-filtro-limpar" onClick={limparFiltros}>Limpar filtros</button>
            </p>
          )}
        </div>
      </section>

      {/* Bairros */}
      <section className="lan-bairros">
        <div className="container">
          <Reveal>
            <span className="eyebrow" style={{ justifyContent: 'center' }}>Regiões</span>
            <h2 className="section-title" style={{ textAlign: 'center', marginBottom: 28 }}>Explore por bairro</h2>
          </Reveal>
          <div className="lan-bairros-grid">
            {bairros.slice(0, 12).map(({ bairro, lista }) => (
              <Link key={bairro} to={`/lancamentos/bairros/${slugBairro(bairro)}`} className="lan-bairro-chip">
                <span className="lan-bairro-nome">{bairro}</span>
                <span className="lan-bairro-count">
                  {lista.length} {lista.length === 1 ? 'empreendimento' : 'empreendimentos'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Diferenciais */}
      <section className="section--light lan-diferenciais">
        <div className="container">
          <Reveal>
            <span className="eyebrow" style={{ justifyContent: 'center' }}>Por que aqui</span>
            <h2 className="section-title" style={{ textAlign: 'center', marginBottom: 36 }}>O que este portal oferece</h2>
          </Reveal>
          <div className="lan-difs-grid">
            <div className="lan-dif">
              <span className="lan-dif-ico"><IconShield width={22} height={22} /></span>
              <h3>Curadoria técnica e independente</h3>
              <p>Cada empreendimento é avaliado pelo histórico de entrega da construtora, padrão construtivo e localização. Sem influência comercial de nenhuma incorporadora.</p>
            </div>
            <div className="lan-dif">
              <span className="lan-dif-ico">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 12h6M9 16h4" />
                </svg>
              </span>
              <h3>Material completo em um só lugar</h3>
              <p>Plantas, vídeos, fotos do decorado e informações de tipologias. Tudo reunido sem precisar navegar por vários sites de construtora.</p>
            </div>
            <div className="lan-dif">
              <span className="lan-dif-ico"><IconWhats width={22} height={22} /></span>
              <h3>Consultor disponível no WhatsApp</h3>
              <p>Dúvidas sobre financiamento, documentação, prazo de entrega ou comparação entre empreendimentos. Fale diretamente com o consultor credenciado da Rotina Imobiliária.</p>
            </div>
            <div className="lan-dif">
              <span className="lan-dif-ico">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                </svg>
              </span>
              <h3>Acompanhamento até a entrega das chaves</h3>
              <p>Da visita ao decorado até a vistoria final. Presença em cada etapa para que a compra na planta seja segura do início ao fim.</p>
            </div>
          </div>
        </div>
      </section>

    </main>
  )
}
