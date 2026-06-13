import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSEO } from '../useSEO'
import { todosEmpreendimentosTodos, bairrosComEmpreendimentos, linkWhatsApp, CONSTRUTORAS, BLOW_EMPREENDIMENTOS } from '../data'
import { onImgError } from '../img'
import Reveal from '../components/Reveal'
import { IconWhats, IconArrow, IconPin, IconShield, IconBuilding } from '../components/icons'
import { isLancLivre, getLancVistos, markLancVisto, LANC_LIMIT } from '../components/LancGate'

const WA_PORTAL = 'Olá Vinícius! Acessei o portal de lançamentos e gostaria de saber mais sobre os empreendimentos disponíveis em Uberlândia.'

const STATUS_COR = { 'Lançamento': '#4fa3e0', 'Em obras': '#f59e0b', 'Pronto': '#56c27d' }
const STATUS_TAB_COR = { 'todos': null, 'Lançamento': '#4fa3e0', 'Em obras': '#f59e0b', 'Pronto': '#56c27d' }

export function CardEmpLan({ e }) {
  const nav = useNavigate()
  const url = `/construtoras/${e.construtoraSlug}/${e.slug}`
  const key = `${e.construtoraSlug}--${e.slug}`
  const tip = e.tipologias && e.tipologias.length > 0 ? e.tipologias[0] : null
  const tipCurt = tip ? (tip.length > 64 ? tip.slice(0, 64) + '…' : tip) : null

  const handleClick = (ev) => {
    ev.preventDefault()
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
  const [filtroStatus, setFiltroStatus] = useState('todos')

  const PRIORIDADE = { Lançamento: 0, 'Em obras': 1, Pronto: 2 }
  const STATUS_TABS = [
    { key: 'todos', label: 'Todos' },
    { key: 'Lançamento', label: 'Lançamentos' },
    { key: 'Em obras', label: 'Em obras' },
    { key: 'Pronto', label: 'Prontos' },
  ]

  const vitrine = useMemo(() => {
    const base = filtroStatus === 'todos' ? todos : todos.filter((e) => e.status === filtroStatus)
    return base
      .filter((e) => e.capa)
      .sort((a, b) => (PRIORIDADE[a.status] ?? 9) - (PRIORIDADE[b.status] ?? 9))
      .slice(0, 12)
  }, [todos, filtroStatus])

  const contPorStatus = (k) => (k === 'todos' ? todos.length : todos.filter((e) => e.status === k).length)

  const slugBairro = (b) =>
    b.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-')

  const totalConstrutoras = CONSTRUTORAS.length + new Set(BLOW_EMPREENDIMENTOS.map((e) => e.construtoraSlug)).size

  return (
    <main className="pagina lan-portal">
      {/* Hero */}
      <section className="lan-hero">
        <div className="container lan-hero-inner">
          <Reveal>
            <span className="eyebrow" style={{ justifyContent: 'center', color: 'var(--gold-2)' }}>
              Portal de Lançamentos · Uberlândia
            </span>
            <h1 className="lan-hero-title">
              Lançamentos de Uberlândia<br />
              <em>com curadoria de consultor</em>
            </h1>
            <p className="lan-hero-sub">
              Acompanho mais de {Math.floor(totalConstrutoras / 5) * 5} construtoras — comparo, filtro e indico só o que faz sentido para o seu perfil, com análise independente e sem viés de incorporadora.
            </p>
            <div className="lan-hero-ctas">
              <Link to="/lancamentos/catalogo" className="btn btn-gold">
                Ver catálogo completo <IconArrow width={15} height={15} />
              </Link>
              <a href={linkWhatsApp(WA_PORTAL)} className="btn btn-ghost" target="_blank" rel="noopener">
                <IconWhats width={16} height={16} /> Falar com o consultor
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Stats bar — dark cards */}
      <div className="lan-stats-bar lan-stats-bar--v2">
        <div className="container lan-stats-inner lan-stats-inner--v2">
          <div className="lan-stat-v2">
            <span className="lan-stat-v2-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
              </svg>
            </span>
            <div className="lan-stat-v2-txt">
              <b>{totalConstrutoras}</b>
              <span>construtoras</span>
            </div>
          </div>
          <div className="lan-stat-v2">
            <span className="lan-stat-v2-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </span>
            <div className="lan-stat-v2-txt">
              <b>{todos.length}</b>
              <span>empreendimentos</span>
            </div>
          </div>
          <div className="lan-stat-v2">
            <span className="lan-stat-v2-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
            </span>
            <div className="lan-stat-v2-txt">
              <b>{bairros.length}</b>
              <span>bairros cobertos</span>
            </div>
          </div>
          <div className="lan-stat-v2">
            <span className="lan-stat-v2-ico" aria-hidden="true">
              <IconShield width={22} height={22} />
            </span>
            <div className="lan-stat-v2-txt">
              <b>100%</b>
              <span>com curadoria</span>
            </div>
          </div>
        </div>
      </div>

      {/* Vitrine */}
      <section className="section--light lan-vitrine">
        <div className="container">
          <div className="lan-vitrine-head">
            <div>
              <span className="eyebrow">Empreendimentos</span>
              <h2 className="section-title" style={{ marginTop: 4 }}>Lançamentos em destaque</h2>
            </div>
            <Link to="/lancamentos/catalogo" className="btn btn-ghost lan-ver-todos">
              Catálogo completo <IconArrow width={13} height={13} />
            </Link>
          </div>

          {/* Tabs V2 */}
          <div className="lan-tabs lan-tabs--v2">
            {STATUS_TABS.map((t) => {
              const cor = STATUS_TAB_COR[t.key]
              return (
                <button
                  key={t.key}
                  className={`lan-tab lan-tab-v2${filtroStatus === t.key ? ' lan-tab-v2--ativo' : ''}`}
                  onClick={() => setFiltroStatus(t.key)}
                >
                  {cor && <span className="lan-tab-v2-dot" style={{ background: cor }} />}
                  {t.label}
                  <span className="lan-tab-v2-count">{contPorStatus(t.key)}</span>
                </button>
              )
            })}
          </div>

          {vitrine.length > 0 ? (
            <div className="lan-grid">
              {vitrine.map((e) => <CardEmpLan key={`${e.construtoraSlug}--${e.slug}`} e={e} />)}
            </div>
          ) : (
            <p className="section-sub" style={{ textAlign: 'center', margin: '32px auto' }}>
              Nenhum empreendimento nesta categoria no momento.
            </p>
          )}

          <div style={{ textAlign: 'center', marginTop: 36 }}>
            <Link to="/lancamentos/catalogo" className="btn btn-gold">
              Ver todos os {todos.length} empreendimentos com filtros <IconArrow width={14} height={14} />
            </Link>
          </div>
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

      {/* Guia CTA */}
      <section className="lan-guia-cta">
        <div className="container lan-guia-cta-inner">
          <Reveal>
            <h2 className="section-title">Primeira vez comprando na planta?</h2>
            <p className="section-sub">
              Leia o guia completo antes de assinar qualquer contrato. Documentação, financiamento, INCC, prazo de entrega.. tudo que você precisa saber para comprar com segurança.
            </p>
            <Link to="/lancamentos/guia" className="btn btn-gold" style={{ marginTop: 24 }}>
              Ler o guia gratuito <IconArrow width={14} height={14} />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* CTA WhatsApp */}
      <section className="lan-wa-cta">
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 className="section-title">Não encontrou o que procura?</h2>
          <p className="section-sub" style={{ maxWidth: 520, margin: '12px auto 0' }}>
            Informe o bairro, a faixa de preço e o número de dormitórios. Faço a curadoria personalizada para o seu perfil entre todos os lançamentos ativos em Uberlândia.
          </p>
          <a
            href={linkWhatsApp(WA_PORTAL)}
            className="btn btn-gold"
            target="_blank"
            rel="noopener"
            style={{ marginTop: 28, display: 'inline-flex', gap: 8 }}
          >
            <IconWhats width={17} height={17} /> Falar com Vinícius Graton
          </a>
          <p className="lan-wa-creci">
            Consultor da Rotina Imobiliária · CRECI PJ 132 · (34) 99157-0494
          </p>
        </div>
      </section>
    </main>
  )
}
