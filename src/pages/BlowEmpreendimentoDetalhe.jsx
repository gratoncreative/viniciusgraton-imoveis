import { useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import AviseMe from '../components/AviseMe'
import { linkWhatsApp } from '../data'
import { getBlowEmpreendimento } from '../empreendimentos'
import { useSEO } from '../useSEO'
import { useEventoLancamento } from '../eventoLancamento'
import { IconWhats, IconArrow, IconPin, IconShield, IconBuilding } from '../components/icons'
import '../styles/lancamentos.css'
import '../styles/empreendimento.css'
import '../styles/detalhe.css'

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmtPreco = (v) =>
  v ? `R$ ${Number(v).toLocaleString('pt-BR')}` : null

const fmtArea = (v) =>
  v ? `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} m²` : null

const range = (min, max, unit = '') => {
  if (!min && !max) return null
  const a = min || max
  const b = max || min
  return a === b ? `${a}${unit}` : `${a}–${b}${unit}`
}

const fmtData = (iso) => {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

const ytId = (u = '') => {
  const m = String(u).match(/(?:v=|embed\/|youtu\.be\/)([\w-]{11})/)
  return m ? m[1] : ''
}

const COMOD_EMOJI = {
  'Segurança': '🔒',
  'Esporte e Lazer': '🏊',
  'Facilidades': '✨',
  'Estrutura': '🏗️',
  'Tecnologia': '💡',
  'Sustentabilidade': '🌱',
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function BlowEmpreendimentoDetalhe() {
  const { slug } = useParams()
  const e = getBlowEmpreendimento(slug)

  const [plantaFull, setPlantaFull] = useState(null)
  const [descExpanded, setDescExpanded] = useState(false)
  const [mostrarTodasUnidades, setMostrarTodasUnidades] = useState(false)
  const [fotoLightbox, setFotoLightbox] = useState(null)

  const closeLightbox = useCallback(() => {
    setPlantaFull(null)
    setFotoLightbox(null)
  }, [])

  useSEO({
    title: e
      ? `${e.nome} - ${e.construtoraNome}, ${e.bairro || 'Uberlândia'}`
      : 'Empreendimento não encontrado',
    description: e
      ? `${(e.descricao || '').slice(0, 150)} Fale com o Vinícius Graton e agende uma visita ao ${e.nome}.`
      : 'Empreendimento não encontrado.',
    path: `/lancamentos/empreendimento/blow/${slug}`,
  })

  // #12 — schema.org/Event (entrega prevista) quando há data e ainda não foi entregue
  useEventoLancamento(e ? {
    nome: e.nome, status: e.status, entrega: e.dataEntrega,
    bairro: e.bairro, endereco: e.endereco, capa: e.capa,
    construtora: e.construtoraNome,
    url: typeof window !== 'undefined' ? `${window.location.origin}/lancamentos/empreendimento/blow/${slug}` : '',
  } : null)

  if (!e) {
    return (
      <main className="pagina section--light det-vazio">
        <div className="container" style={{ textAlign: 'center' }}>
          <h1 className="section-title">Empreendimento não encontrado</h1>
          <Link className="btn btn-gold" to="/lancamentos" style={{ marginTop: 20 }}>
            Ver lançamentos <IconArrow />
          </Link>
        </div>
      </main>
    )
  }

  // ─ dados preparados
  const fotos = e.fotosComLegenda?.length
    ? e.fotosComLegenda
    : (e.fotos || []).map(url => ({ url, legenda: null }))

  const plantas = e.plantasComLegenda?.length
    ? e.plantasComLegenda
    : (e.plantas || []).map(url => ({ url, legenda: null }))

  const capaUrl = e.capa || fotos[0]?.url || null
  const fotosSemCapa = fotos.filter(f => f.url !== e.capa)

  const unidades = e.unidadesDetalhes || []
  const unidadesVisiveis = mostrarTodasUnidades ? unidades : unidades.slice(0, 6)
  const menorPreco = unidades.length ? unidades[0].valor : null

  const pct = typeof e.fracaoVendida === 'number' ? Math.round(e.fracaoVendida * 100) : null
  const urgenciaNivel = pct !== null ? (pct >= 70 ? 'alta' : pct >= 50 ? 'media' : 'baixa') : null

  const allVideos = e.videos?.length ? e.videos : (e.youtube ? [e.youtube] : [])
  const vid = allVideos.length ? ytId(allVideos[0]) : ''

  const mapsQuery = encodeURIComponent(
    e.endereco ? `${e.endereco}, ${e.bairro}, Uberlândia, MG` : `${e.bairro}, Uberlândia, MG`
  )

  const waBase = `Olá Vinícius! Tenho interesse no ${e.nome} (${e.construtoraNome}), no ${e.bairro || 'Uberlândia'}.`
  const waVisita = linkWhatsApp(`${waBase} Quero agendar uma visita.`)
  const waInfos = linkWhatsApp(`${waBase} Quero ver plantas, valores e condições.`)
  const waFinanc = linkWhatsApp(`${waBase} Quero simular o financiamento.`)

  const gruposComod = e.comodidadesGrupadas && Object.keys(e.comodidadesGrupadas).length
    ? e.comodidadesGrupadas
    : e.comodidades?.length
      ? { 'Estrutura': e.comodidades }
      : {}

  const hasParcelamentos = e.parcelamentos?.length && !e.parcelamentos.every(p => p.descricao === 'A Combinar')

  const fichaItens = [
    e.valorCondominio && { label: 'Condomínio', valor: `R$ ${Number(e.valorCondominio).toLocaleString('pt-BR')}/mês` },
    e.quantAndares && { label: 'Andares', valor: `${e.quantAndares} pavimentos` },
    e.quantElevadores && { label: 'Elevadores', valor: `${e.quantElevadores}` },
    e.aquecimento && { label: 'Aquecimento', valor: e.aquecimento },
    e.arCondicionado && { label: 'Ar-condicionado', valor: e.arCondicionado },
  ].filter(Boolean)

  const descLonga = (e.descricao || '').length > 300
  const descTexto = descLonga && !descExpanded ? e.descricao.slice(0, 300) + '…' : e.descricao

  return (
    <main className="pagina section--light empd-pagina">
      <div className="container">

        {/* breadcrumb */}
        <nav className="det-bread" style={{ marginBottom: 16 }}>
          <Link to="/">Início</Link> <span>/</span>
          <Link to="/lancamentos">Lançamentos</Link> <span>/</span>
          <b>{e.nome}</b>
        </nav>

        {/* ═══ HERO PHOTO ════════════════════════════════════════════════════ */}
        {capaUrl && (
          <div className="empd-hero">
            <img
              src={capaUrl}
              alt={`${e.nome} - ${e.construtoraNome}`}
              className="empd-hero-img"
              loading="eager"
            />
            <div className="empd-hero-badges">
              {e.status && (
                <span className={`empd-badge empd-badge--${e.status === 'Pronto' ? 'pronto' : e.status === 'Lançamento' ? 'lancamento' : 'obras'}`}>
                  {e.status}
                </span>
              )}
              {urgenciaNivel === 'alta' && (
                <span className="empd-badge empd-badge--urgente">🔥 Alta demanda · {pct}% vendido</span>
              )}
              {urgenciaNivel === 'media' && (
                <span className="empd-badge empd-badge--aviso">⚡ {pct}% vendido</span>
              )}
              {e.unidadesDisponiveis > 0 && (
                <span className="empd-badge empd-badge--unid">
                  {e.unidadesDisponiveis} unid. disponíveis{e.totalUnidades ? ` de ${e.totalUnidades}` : ''}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ═══ LAYOUT GRID (main + aside) ════════════════════════════════════ */}
        <div className="empd-grid">

          {/* ─── COLUNA MAIN ─────────────────────────────────────────────── */}
          <div className="empd-main">
            <Reveal>
              {/* HEADER */}
              <div className="empd-header">
                <h1 className="empd-titulo">{e.nome}</h1>
                <p className="empd-meta">
                  {e.construtoraNome}
                  {e.bairro && <><span className="empd-sep">·</span><IconPin width={13} height={13} />{e.bairro}, Uberlândia</>}
                  {e.endereco && <><span className="empd-sep">·</span>{e.endereco}</>}
                </p>
                {e.dataEntrega && (
                  <span className="empd-entrega">
                    🗓 Entrega prevista: {fmtData(e.dataEntrega)}
                  </span>
                )}
              </div>

              {/* SPECS BAR */}
              <div className="empd-specs">
                {(e.quartosMin || e.quartosMax) && (
                  <div className="empd-spec">
                    <span className="empd-spec-ico">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M3 18v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5M3 18h18M3 18v3M21 18v3M6 11V8a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3M13 11V8a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3"/></svg>
                    </span>
                    <span className="empd-spec-val">{range(e.quartosMin, e.quartosMax)}</span>
                    <span className="empd-spec-lbl">quartos</span>
                  </div>
                )}
                {(e.suitesMin || e.suitesMax) && (
                  <div className="empd-spec">
                    <span className="empd-spec-ico">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M12 3l2.2 5.5L20 9l-4.5 4 1.3 6L12 16l-4.8 3 1.3-6L4 9l5.8-.5z"/></svg>
                    </span>
                    <span className="empd-spec-val">{range(e.suitesMin, e.suitesMax)}</span>
                    <span className="empd-spec-lbl">suítes</span>
                  </div>
                )}
                {(e.banheirosMin || e.banheirosMax) && (
                  <div className="empd-spec">
                    <span className="empd-spec-ico">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M9 6a3 3 0 0 1 6 0v9H3v-2a5 5 0 0 1 5-5h.01M3 15l-.5 3h19l-.5-3"/></svg>
                    </span>
                    <span className="empd-spec-val">{range(e.banheirosMin, e.banheirosMax)}</span>
                    <span className="empd-spec-lbl">banheiros</span>
                  </div>
                )}
                {(e.vagasMin || e.vagasMax) && (
                  <div className="empd-spec">
                    <span className="empd-spec-ico">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M5 13l1.5-4.5A2 2 0 0 1 8.4 7h7.2a2 2 0 0 1 1.9 1.5L19 13m-14 0h14m-14 0v4m14-4v4M7 17h.01M17 17h.01"/></svg>
                    </span>
                    <span className="empd-spec-val">{range(e.vagasMin, e.vagasMax)}</span>
                    <span className="empd-spec-lbl">vagas</span>
                  </div>
                )}
                {(e.areaMin || e.areaMax) && (
                  <div className="empd-spec">
                    <span className="empd-spec-ico">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M3 8V5a2 2 0 0 1 2-2h3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M21 16v3a2 2 0 1-2 2h-3"/></svg>
                    </span>
                    <span className="empd-spec-val">{range(e.areaMin, e.areaMax, ' m²')}</span>
                    <span className="empd-spec-lbl">área privativa</span>
                  </div>
                )}
              </div>
            </Reveal>

            {/* ─── URGÊNCIA BAR ──────────────────────────────────────────── */}
            {pct !== null && (
              <Reveal>
                <div className={`empd-urgencia empd-urgencia--${urgenciaNivel}`}>
                  <div className="empd-urg-row">
                    <span className="empd-urg-txt">
                      {pct}% das unidades já foram vendidas
                    </span>
                    {e.unidadesDisponiveis > 0 && e.totalUnidades > 0 && (
                      <span className="empd-urg-sub">
                        {e.unidadesDisponiveis} restam de {e.totalUnidades}
                      </span>
                    )}
                  </div>
                  <div className="empd-urg-barra">
                    <div className="empd-urg-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </Reveal>
            )}

            {/* ─── UNIDADES COM PREÇOS ───────────────────────────────────── */}
            {unidades.length > 0 && (
              <Reveal>
                <div className="empd-secao">
                  <h2 className="empd-secao-titulo">Unidades disponíveis</h2>
                  <div className="empd-unid-grid">
                    {unidadesVisiveis.map((u, i) => (
                      <div key={i} className="empd-unid-card">
                        <div className="empd-unid-topo">
                          <span className="empd-unid-ap">Ap {u.ap}</span>
                          {i === 0 && <span className="empd-unid-badge">Menor valor</span>}
                        </div>
                        {u.tipologia && <span className="empd-unid-tipo">{u.tipologia}</span>}
                        <div className="empd-unid-specs">
                          {u.area && <span>📐 {fmtArea(u.area)}</span>}
                          {u.quartos && <span>🛏 {u.quartos} qtos</span>}
                          {u.suites && <span>⭐ {u.suites} suíte{u.suites > 1 ? 's' : ''}</span>}
                          {u.vagas && <span>🚗 {u.vagas} vaga{u.vagas > 1 ? 's' : ''}</span>}
                        </div>
                        <div className="empd-unid-valor">{fmtPreco(u.valor)}</div>
                        <a
                          href={linkWhatsApp(`${waBase} Quero mais informações sobre o Ap ${u.ap} (${fmtPreco(u.valor)}, ${fmtArea(u.area)}).`)}
                          className="empd-unid-btn"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <IconWhats width={14} height={14} /> Tenho interesse neste ap
                        </a>
                      </div>
                    ))}
                  </div>
                  {unidades.length > 6 && (
                    <button
                      className="empd-ver-mais-btn"
                      onClick={() => setMostrarTodasUnidades(v => !v)}
                    >
                      {mostrarTodasUnidades
                        ? 'Ver menos'
                        : `Ver todas as ${unidades.length} unidades disponíveis`}
                    </button>
                  )}
                </div>
              </Reveal>
            )}

            {/* ─── CONDIÇÕES DE PAGAMENTO ────────────────────────────────── */}
            {hasParcelamentos && (
              <Reveal>
                <div className="empd-secao">
                  <h2 className="empd-secao-titulo">Como financiar</h2>
                  <div className="empd-parc-row">
                    {e.parcelamentos.map((p, i) => (
                      <div key={i} className="empd-parc-item">
                        <div className="empd-parc-nome">{p.descricao}</div>
                        <div className="empd-parc-pct">{Math.round(p.percentual * 100)}%</div>
                        {p.quant > 1 && <div className="empd-parc-detalhe">{p.quant}x</div>}
                      </div>
                    ))}
                  </div>
                  <a href={waFinanc} className="btn btn-ghost" style={{ fontSize: '0.88rem' }} target="_blank" rel="noopener noreferrer">
                    Simular financiamento com o consultor
                  </a>
                </div>
              </Reveal>
            )}

            {/* ─── GALERIA COM LEGENDAS ──────────────────────────────────── */}
            {fotos.length > 0 && (
              <Reveal>
                <div className="empd-secao">
                  <h2 className="empd-secao-titulo">Galeria de fotos</h2>
                  <div className="empd-fotos-grid">
                    {fotos.map((f, i) => (
                      <div
                        key={i}
                        className={`empd-foto-item${!f.legenda ? ' empd-foto-item--semLegenda' : ''}`}
                        onClick={() => setFotoLightbox(f.url)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={ev => ev.key === 'Enter' && setFotoLightbox(f.url)}
                        aria-label={f.legenda || `Foto ${i + 1}`}
                      >
                        <img src={f.url} alt={f.legenda || `${e.nome} - foto ${i + 1}`} className="empd-foto-img" loading="lazy" />
                        {f.legenda && <div className="empd-foto-legenda">{f.legenda}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            )}

            {/* ─── DESCRIÇÃO ─────────────────────────────────────────────── */}
            {e.descricao && (
              <Reveal>
                <div className="empd-secao">
                  <h2 className="empd-secao-titulo">Sobre o empreendimento</h2>
                  <p className="empd-desc-texto">{descTexto}</p>
                  {descLonga && (
                    <button className="empd-desc-toggle" onClick={() => setDescExpanded(v => !v)}>
                      {descExpanded ? '▲ Ver menos' : '▼ Ver descrição completa'}
                    </button>
                  )}
                </div>
              </Reveal>
            )}

            {/* ─── PLANTAS COM LEGENDAS ──────────────────────────────────── */}
            {plantas.length > 0 && (
              <Reveal>
                <div className="empd-secao">
                  <h2 className="empd-secao-titulo">Plantas baixas</h2>
                  <div className="empd-plantas-grid">
                    {plantas.map((p, i) => (
                      <div
                        key={i}
                        className="empd-planta-item"
                        onClick={() => setPlantaFull(p.url)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={ev => ev.key === 'Enter' && setPlantaFull(p.url)}
                        aria-label={p.legenda || `Planta ${i + 1}`}
                      >
                        <img src={p.url} alt={p.legenda || `Planta ${i + 1}`} className="empd-planta-img" loading="lazy" />
                        {p.legenda && <div className="empd-planta-leg">{p.legenda}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            )}

            {/* ─── COMODIDADES AGRUPADAS ─────────────────────────────────── */}
            {Object.keys(gruposComod).length > 0 && (
              <Reveal>
                <div className="empd-secao">
                  <h2 className="empd-secao-titulo">Lazer e estrutura</h2>
                  <div className="empd-comods">
                    {Object.entries(gruposComod).map(([cat, itens]) => (
                      <div key={cat} className="empd-comod-grupo">
                        <div className="empd-comod-cat">
                          {COMOD_EMOJI[cat] || '🏠'} {cat}
                        </div>
                        <div className="empd-comod-lista">
                          {itens.map((item, i) => (
                            <span key={i} className="empd-comod-tag">{item}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            )}

            {/* ─── FICHA TÉCNICA ─────────────────────────────────────────── */}
            {fichaItens.length > 0 && (
              <Reveal>
                <div className="empd-secao">
                  <h2 className="empd-secao-titulo">Ficha técnica</h2>
                  <div className="empd-ficha">
                    {fichaItens.map((item, i) => (
                      <div key={i} className="empd-ficha-row">
                        <span className="empd-ficha-key">{item.label}</span>
                        <span className="empd-ficha-val">{item.valor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            )}

            {/* ─── VÍDEO ─────────────────────────────────────────────────── */}
            {vid && (
              <Reveal>
                <div className="empd-secao">
                  <h2 className="empd-secao-titulo">Vídeo do empreendimento</h2>
                  <div className="empd-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${vid}`}
                      title={`Vídeo ${e.nome}`}
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  </div>
                </div>
              </Reveal>
            )}

            {/* ─── MAPA ──────────────────────────────────────────────────── */}
            <Reveal>
              <div className="empd-secao">
                <h2 className="empd-secao-titulo">Localização</h2>
                <p className="empd-mapa-end">
                  <IconPin width={16} height={16} />
                  {e.endereco ? `${e.endereco}, ${e.bairro}` : `${e.bairro}, Uberlândia - MG`}
                </p>
                <div className="empd-mapa-frame">
                  <iframe
                    title={`Mapa ${e.nome}`}
                    src={`https://maps.google.com/maps?q=${mapsQuery}&z=15&output=embed`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </Reveal>

            {/* ─── CONSTRUTORA ───────────────────────────────────────────── */}
            {e.construtoraPortal && (
              <Reveal>
                <div className="empd-secao">
                  <div className="empd-const-card">
                    {e.construtoraLogo && (
                      <img src={e.construtoraLogo} alt={e.construtoraNome} className="empd-const-logo" />
                    )}
                    <div>
                      <div className="empd-const-nome">{e.construtoraNome}</div>
                      <a href={e.construtoraPortal} className="empd-const-link" target="_blank" rel="noopener nofollow">
                        Ver portal da construtora ↗
                      </a>
                    </div>
                  </div>
                </div>
              </Reveal>
            )}

            {/* ─── AVISE-ME ──────────────────────────────────────────────── */}
            <AviseMe contexto={`${e.bairro || 'Uberlândia'} (${e.construtoraNome})`} />

            {/* ─── BACK ──────────────────────────────────────────────────── */}
            <div style={{ marginTop: 40 }}>
              <Link className="btn btn-ghost" to="/lancamentos">
                <IconArrow style={{ transform: 'rotate(180deg)' }} /> Voltar para lançamentos
              </Link>
            </div>
          </div>

          {/* ─── COLUNA ASIDE ────────────────────────────────────────────── */}
          <aside className="empd-aside">
            <div className="empd-aside-card">
              {menorPreco && (
                <div className="empd-aside-from">
                  <span className="empd-aside-from-label">A partir de</span>
                  <span className="empd-aside-from-val">{fmtPreco(menorPreco)}</span>
                </div>
              )}

              <a href={waVisita} className="btn btn-gold empd-aside-cta" target="_blank" rel="noopener noreferrer">
                <IconWhats width={16} height={16} /> Tenho interesse - quero visitar
              </a>
              <a href={waInfos} className="btn btn-ghost empd-aside-ghost" target="_blank" rel="noopener noreferrer">
                Pedir plantas e condições
              </a>

              {(e.pdfApresentacao || e.pdfTabela) && (
                <div className="empd-aside-pdfs">
                  {e.pdfApresentacao && (
                    <a href={e.pdfApresentacao} target="_blank" rel="noopener noreferrer" className="empd-aside-pdf-btn">
                      📄 Book / Apresentação PDF
                    </a>
                  )}
                  {e.pdfTabela && (
                    <a href={e.pdfTabela} target="_blank" rel="noopener noreferrer" className="empd-aside-pdf-btn">
                      📋 Tabela de preços PDF
                    </a>
                  )}
                </div>
              )}

              <div className="empd-trust">
                <IconShield width={18} height={18} />
                <p>Consultor Rotina Imobiliária - do primeiro contato até a entrega das chaves.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ─── LIGHTBOX FOTOS ─────────────────────────────────────────────────── */}
      {fotoLightbox && (
        <div className="empd-lightbox" onClick={closeLightbox} role="dialog" aria-modal="true">
          <img
            src={fotoLightbox}
            alt="Foto em tela cheia"
            className="empd-lightbox-img"
            onClick={ev => ev.stopPropagation()}
          />
          <button className="empd-lightbox-close" onClick={closeLightbox} aria-label="Fechar">✕</button>
        </div>
      )}

      {/* ─── LIGHTBOX PLANTAS ───────────────────────────────────────────────── */}
      {plantaFull && (
        <div className="empd-lightbox" onClick={closeLightbox} role="dialog" aria-modal="true">
          <img
            src={plantaFull}
            alt="Planta em tela cheia"
            className="empd-lightbox-img"
            onClick={ev => ev.stopPropagation()}
          />
          <button className="empd-lightbox-close" onClick={closeLightbox} aria-label="Fechar">✕</button>
        </div>
      )}
    </main>
  )
}
