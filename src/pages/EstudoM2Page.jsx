import { useState, useMemo, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useSEO } from '../useSEO'
import { getImovel, estudoM2, linkWhatsApp } from '../data'
import { IconWhats } from '../components/icons'

const fmtM2  = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR') + '/m²'
const fmtBRL = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR')

/* ══ Laudo profissional ═══════════════════════════════════════════ */
function LaudoProfissional({ codigo, n }) {
  const [comprando, setComprando] = useState(false)

  const comprar = async () => {
    setComprando(true)
    try {
      const r = await fetch('/api/laudo-pagar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ codigo }),
      })
      const j = await r.json()
      if (j?.naoConfigurado) {
        alert('Pagamento ainda não configurado. Chame no WhatsApp que eu te envio o laudo.')
        return
      }
      if (j?.url) window.location.href = j.url
    } catch {
      alert('Erro ao processar pagamento. Tente novamente.')
    } finally {
      setComprando(false)
    }
  }

  return (
    <>
      <ul className="es3-laudo-lista">
        <li>{n > 0 ? `${n} comparáveis` : 'Comparáveis'} com endereço, preço e motivo de cada ajuste</li>
        <li>Cálculo de quanto você pode negociar de desconto</li>
        <li>Aceito por bancos para contestar avaliação no financiamento</li>
        <li>Entregue em PDF em até 30 minutos</li>
        <li>Assinado pelo consultor com parecer técnico personalizado</li>
      </ul>
      <button className="es3-laudo-btn" onClick={comprar} disabled={comprando}>
        <span className="es3-laudo-btn-main">
          {comprando ? 'Processando…' : '📄 Quero o laudo — R$ 250'}
        </span>
        <span className="es3-laudo-btn-sub">entrega em PDF imediata · pagamento seguro</span>
      </button>
    </>
  )
}

/* ══ Gráfico de comparáveis ═══════════════════════════════════════ */
function CompsChart({ est, im }) {
  if (!est?.comparaveis?.length) return null
  const comps = est.comparaveis
  const allVals = [...comps.map(c => c.m2), est.m2Subj]
  const rawMin = Math.min(...allVals)
  const rawMax = Math.max(...allVals)
  const pad = (rawMax - rawMin) * 0.15 || 500
  const cMin = Math.max(0, rawMin - pad)
  const cMax = rawMax + pad
  const range = cMax - cMin || 1

  const pct = v => ((v - cMin) / range * 100).toFixed(1) + '%'
  const fmtMil = v => `R$ ${Math.round(v / 1000)} mil`
  const step = range <= 3000 ? 500 : range <= 6000 ? 1000 : range <= 12000 ? 2000 : 3000
  const ticks = []
  for (let t = Math.ceil(cMin / step) * step; t <= cMax; t += step) ticks.push(t)

  const subjInComps = comps.some(c => String(c.codigo) === String(im.codigo))

  return (
    <div className="es3-chart">
      <div className="es3-chart-stage">
        {ticks.map(t => (
          <div key={t} className="es3-chart-grid" style={{ bottom: pct(t) }}>
            <span className="es3-chart-grid-label">{fmtMil(t)}</span>
          </div>
        ))}
        <div className="es3-chart-med" style={{ bottom: pct(est.referencia) }}>
          <span className="es3-chart-med-tag">mediana</span>
        </div>
        <div className="es3-chart-bars">
          {comps.map((c, i) => {
            const isSubj = String(c.codigo) === String(im.codigo)
            return (
              <div key={i} className="es3-chart-bar-wrap">
                {isSubj && (
                  <span className="es3-chart-subj-label">
                    {`R$ ${Math.round(c.m2).toLocaleString('pt-BR')}/m²`}
                  </span>
                )}
                <div
                  className={`es3-chart-bar${isSubj ? ' es3-chart-bar--subj' : ''}`}
                  style={{ height: pct(c.m2) }}
                  title={`${c.bairro} · ${c.area}m² · ${fmtBRL(c.preco)}`}
                />
              </div>
            )
          })}
          {!subjInComps && (
            <div className="es3-chart-bar-wrap">
              <span className="es3-chart-subj-label">
                {`R$ ${Math.round(est.m2Subj).toLocaleString('pt-BR')}/m²`}
              </span>
              <div className="es3-chart-bar es3-chart-bar--subj" style={{ height: pct(est.m2Subj) }} />
            </div>
          )}
        </div>
      </div>
      <div className="es3-chart-legend">
        <span><span className="es3-chart-swatch es3-chart-swatch--comp" />Comparáveis</span>
        <span><span className="es3-chart-swatch es3-chart-swatch--subj" />Este imóvel</span>
        <span><span className="es3-chart-swatch es3-chart-swatch--med" />Mediana</span>
      </div>
    </div>
  )
}

/* ══ Régua de posicionamento ══════════════════════════════════════ */
function PositionRuler({ im, est }) {
  const { m2Subj, referencia, campoMin, campoMax } = est
  const dataMin = Math.min(m2Subj, campoMin)
  const dataMax = Math.max(m2Subj, campoMax)
  const dataRange = dataMax - dataMin || 1000
  const axisMin = Math.floor((dataMin - dataRange * 0.18) / 500) * 500
  const axisMax = Math.ceil((dataMax + dataRange * 0.12) / 500) * 500
  const axisRange = axisMax - axisMin || 1

  const pct    = v => ((v - axisMin) / axisRange * 100).toFixed(1) + '%'
  const pctNum = v => (v - axisMin) / axisRange * 100
  const fmtK   = v => `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`
  const fmtVal = v => 'R$ ' + Math.round(v).toLocaleString('pt-BR')

  const tickStep = axisRange <= 4000 ? 500 : axisRange <= 8000 ? 1000 : axisRange <= 16000 ? 2000 : 3000
  const ticks = []
  for (let t = Math.ceil((axisMin + 1) / tickStep) * tickStep; t <= axisMax; t += tickStep) ticks.push(t)

  const subjPct = pctNum(m2Subj)
  const medPct  = pctNum(referencia)
  const subjTransform = subjPct < 15 ? 'translateX(0)' : subjPct > 85 ? 'translateX(-100%)' : 'translateX(-50%)'

  return (
    <div className="es3-ruler">
      <div className="es3-ruler-ann-row">
        <div className="es3-ruler-subj-ann" style={{ left: pct(m2Subj), transform: subjTransform }}>
          <span className="es3-ruler-subj-name">Este imóvel</span>
          <span className="es3-ruler-subj-val">{fmtVal(m2Subj)}/m²</span>
        </div>
        {Math.abs(medPct - subjPct) > 18 && (
          <div className="es3-ruler-med-ann" style={{ left: pct(referencia), transform: 'translateX(-50%)' }}>
            <span className="es3-ruler-med-val">{fmtVal(referencia)}</span>
            <span className="es3-ruler-med-sub">mediana</span>
          </div>
        )}
      </div>
      <div className="es3-ruler-track">
        <div className="es3-ruler-band" style={{
          left:  pct(campoMin),
          width: ((campoMax - campoMin) / axisRange * 100).toFixed(1) + '%',
        }} />
        <div className="es3-ruler-med-line" style={{ left: pct(referencia) }} />
        <div className="es3-ruler-dot"      style={{ left: pct(m2Subj) }} />
        {ticks.map(t => <div key={t} className="es3-ruler-tick" style={{ left: pct(t) }} />)}
      </div>
      <div className="es3-ruler-labels">
        {ticks.map(t => (
          <span key={t} className="es3-ruler-label" style={{ left: pct(t) }}>{fmtK(t)}</span>
        ))}
      </div>
      <div className="es3-ruler-faixa-info">
        <span>Faixa de mercado:</span>
        <strong>{fmtVal(campoMin)} a {fmtVal(campoMax)}/m²</strong>
        <span>· {im.bairro}</span>
      </div>
    </div>
  )
}

/* ══ PÁGINA PRINCIPAL ═════════════════════════════════════════════ */
export default function EstudoM2Page() {
  const { codigo } = useParams()
  const [imApi,      setImApi]      = useState(null)
  const [loadingApi, setLoadingApi] = useState(true)
  const [feed,       setFeed]       = useState([])
  const [metOpen,    setMetOpen]    = useState(false)

  const staticIm = useMemo(() => getImovel(codigo), [codigo])
  const im = staticIm || imApi

  useEffect(() => {
    if (staticIm) { setLoadingApi(false); return }
    let vivo = true
    setLoadingApi(true)
    fetch(`/api/rotina-imovel?codigo=${encodeURIComponent(codigo)}`)
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        if (!vivo) return
        if (j?.imovel) {
          const a = j.imovel
          setImApi({
            codigo: String(a.codigo), tipo: a.tipo || '', bairro: a.bairro || '',
            preco: a.valorNum || 0, area: a.areaNum || 0,
            vagas: a.vagas || 0, quartos: a.quartos || 0,
          })
        }
        setLoadingApi(false)
      })
      .catch(() => { if (vivo) setLoadingApi(false) })
    return () => { vivo = false }
  }, [codigo, staticIm])

  useEffect(() => {
    let vivo = true
    fetch('/catalogo.json')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (vivo && Array.isArray(d?.imoveis)) setFeed(d.imoveis) })
      .catch(() => {})
    return () => { vivo = false }
  }, [])

  useSEO({
    title: im ? `Estudo do m² — ${im.tipo} no ${im.bairro} | Vinícius Graton` : 'Estudo de valor do m²',
    description: im ? `Veja se o preço do ${im.tipo} no ${im.bairro} está justo. Análise comparativa de mercado pelo método NBR 14653.` : '',
    path: `/estudo/${codigo}`,
  })

  /* ── loading / erro ── */
  if (!im) {
    if (loadingApi) return (
      <main className="pagina es3-pg">
        <div className="es3-loading">
          <div className="es3-loading-spin" />
          <p>Carregando análise…</p>
        </div>
      </main>
    )
    return (
      <main className="pagina es3-pg">
        <div className="es3-loading">
          <p style={{ color: '#8a93a6', marginBottom: 24 }}>Imóvel não encontrado.</p>
          <Link to="/imoveis" className="btn btn-gold">Ver catálogo</Link>
        </div>
      </main>
    )
  }

  const est = (() => { try { return estudoM2(im, feed) } catch { return { ok: false } } })()

  /* cor semântica baseada no veredicto */
  const cor = est?.ok
    ? est.veredito === 'abaixo' ? 'ok'
    : est.veredito === 'acima'  ? 'alto'
    : 'neutro'
    : 'neutro'

  /* frase do veredicto */
  const verdito = est?.ok
    ? est.veredito === 'abaixo' ? `Este imóvel está ${Math.abs(est.diffPct)}% abaixo da mediana do bairro`
    : est.veredito === 'acima'  ? `Este imóvel está ${est.diffPct}% acima da mediana do bairro`
    : 'Este imóvel está dentro da faixa de mercado'
    : ''

  const badgeTexto = est?.ok
    ? est.veredito === 'abaixo' ? 'Abaixo do mercado'
    : est.veredito === 'acima'  ? 'Acima do mercado'
    : 'Na média do mercado'
    : ''

  const waMsg = `Olá Vinícius! Vi o estudo de valor do m² do imóvel cód. ${im.codigo} (${im.tipo} no ${im.bairro}) e quero entender melhor. Pode me ajudar?`

  return (
    <main className="pagina es3-pg">

      {/* ── nav ── */}
      <div className="es3-nav">
        <div className="container es3-nav-inner">
          <Link to={`/imovel/${im.codigo}`} className="es3-back">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Voltar ao imóvel
          </Link>
          <span className="es3-eyebrow">Análise de valor do m²</span>
        </div>
      </div>

      {est?.ok ? (
        <>
          {/* ── hero ── */}
          <div className={`es3-hero es3-hero--${cor}`}>
            <div className="container">

              {/* breadcrumb */}
              <div className="es3-ctx">
                <span>{im.tipo}</span>
                <span className="es3-ctx-sep">·</span>
                <span>{im.bairro}</span>
                <span className="es3-ctx-sep">·</span>
                <span>{im.area} m²</span>
                {im.quartos > 0 && <><span className="es3-ctx-sep">·</span><span>{im.quartos} quartos</span></>}
                {im.vagas > 0   && <><span className="es3-ctx-sep">·</span><span>{im.vagas} vaga{im.vagas > 1 ? 's' : ''}</span></>}
              </div>

              {/* veredicto principal */}
              <div className="es3-veredicto">
                <span className={`es3-badge es3-badge--${cor}`}>{badgeTexto}</span>

                <div className="es3-metrics">
                  <div className="es3-metric-bloco">
                    <span className="es3-metric-label">Preço/m² deste imóvel</span>
                    <span className="es3-metric-valor">{fmtM2(est.m2Subj)}</span>
                  </div>
                  <div className={`es3-diff-pill es3-diff-pill--${cor}`}>
                    {est.diffPct > 0 ? '+' : ''}{est.diffPct}%
                  </div>
                  <div className="es3-metrics-sep" />
                  <div className="es3-metric-bloco">
                    <span className="es3-metric-label">Mediana do bairro</span>
                    <span className="es3-metric-valor es3-metric-valor--ref">{fmtM2(est.referencia)}</span>
                  </div>
                </div>

                <p className="es3-veredicto-frase">{verdito}</p>
              </div>

            </div>
          </div>

          {/* ── corpo ── */}
          <div className="container es3-body-wrap">
            <div className="es3-body">

              {/* ── coluna principal ── */}
              <div className="es3-main">

                {/* campo de mercado */}
                <div className="es3-card es3-card--campo">
                  <div className="es3-sec-head">
                    <span className="es3-sec-label">Análise · Campo de Mercado</span>
                    <h2 className="es3-card-titulo">Faixa de preços praticada no bairro</h2>
                    <p className="es3-card-sub">{est.baseLabel}</p>
                  </div>
                  <div className="es3-campo">
                    <div className="es3-campo-item">
                      <span className="es3-campo-label">Mínimo</span>
                      <span className="es3-campo-val">{fmtM2(est.campoMin)}</span>
                    </div>
                    <div className="es3-campo-divider" />
                    <div className="es3-campo-item es3-campo-item--dest">
                      <span className="es3-campo-label">Mediana</span>
                      <span className="es3-campo-val">{fmtM2(est.referencia)}</span>
                    </div>
                    <div className="es3-campo-divider" />
                    <div className="es3-campo-item">
                      <span className="es3-campo-label">Máximo</span>
                      <span className="es3-campo-val">{fmtM2(est.campoMax)}</span>
                    </div>
                  </div>
                </div>

                {/* posicionamento */}
                <div className="es3-card es3-card--ruler">
                  <div className="es3-sec-head">
                    <span className="es3-sec-label">Análise · Posicionamento</span>
                    <h2 className="es3-card-titulo">Onde este imóvel está no mercado</h2>
                    <p className="es3-card-sub">Preço/m² ajustado comparado à faixa praticada no {im.bairro}</p>
                  </div>
                  <PositionRuler im={im} est={est} />
                </div>

                {/* comparáveis */}
                {est.comparaveis?.length > 0 && (
                  <div className="es3-card es3-card--chart">
                    <div className="es3-sec-head">
                      <span className="es3-sec-label">Evidências · Comparáveis</span>
                      <h2 className="es3-card-titulo">Imóveis usados na análise</h2>
                      <p className="es3-card-sub">{est.comparaveis.length} imóveis do mesmo tipo · preço/m² homogeneizado</p>
                    </div>
                    <CompsChart est={est} im={im} />
                  </div>
                )}

                {/* stats */}
                <div className="es3-card es3-card--stats">
                  <div className="es3-sec-head">
                    <span className="es3-sec-label">Dados · Homogeneização</span>
                    <h2 className="es3-card-titulo">Como o preço/m² foi calculado</h2>
                  </div>
                  <div className="es3-stats">
                    <div className="es3-stat">
                      <span className="es3-stat-label">Preço anunciado/m²</span>
                      <span className="es3-stat-val">{fmtM2(est.precoM2)}</span>
                      <span className="es3-stat-sub">sem ajuste de vaga</span>
                    </div>
                    <div className="es3-stat">
                      <span className="es3-stat-label">M² homogeneizado</span>
                      <span className="es3-stat-val">{fmtM2(est.m2Subj)}</span>
                      <span className="es3-stat-sub">com vaga ponderada</span>
                    </div>
                    <div className="es3-stat">
                      <span className="es3-stat-label">Valor justo estimado</span>
                      <span className="es3-stat-val">{fmtM2(est.valorVenda)}</span>
                      <span className="es3-stat-sub">referência de negociação</span>
                    </div>
                    {est.n > 0 && (
                      <div className="es3-stat">
                        <span className="es3-stat-label">Amostra comparável</span>
                        <span className="es3-stat-val">{est.n} imóveis</span>
                        <span className="es3-stat-sub">{est.nDesc > 0 ? `${est.nDesc} desc.` : 'aproveitados'}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* metodologia */}
                {(est.fatoresAplicados?.length > 0 || est.limitacoes?.length > 0) && (
                  <div className="es3-card es3-card--met">
                    <button
                      className="es3-met-btn"
                      onClick={() => setMetOpen(o => !o)}
                    >
                      <div>
                        <span className="es3-met-tag">Metodologia · ABNT NBR 14653</span>
                        <span className="es3-card-titulo" style={{ margin: 0 }}>Como chegamos nesse valor</span>
                      </div>
                      <svg
                        viewBox="0 0 24 24" width="18" height="18" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        style={{ transform: metOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}
                      ><path d="M6 9l6 6 6-6"/></svg>
                    </button>
                    {metOpen && (
                      <div className="es3-met-body">
                        {est.fatoresAplicados?.length > 0 && (
                          <ul className="es3-met-list">
                            {est.fatoresAplicados.map((f, i) => <li key={i}>{f}</li>)}
                          </ul>
                        )}
                        {est.limitacoes?.length > 0 && (
                          <>
                            <p className="es3-met-subtit">O que este estudo não cobre</p>
                            <ul className="es3-met-list es3-met-list--warn">
                              {est.limitacoes.map((f, i) => <li key={i}>{f}</li>)}
                            </ul>
                          </>
                        )}
                      </div>
                    )}
                    <p className="es3-disc">
                      Estudo comparativo pelo método ABNT NBR 14653.
                      Estimativa de referência — não substitui laudo com vistoria presencial.
                    </p>
                  </div>
                )}

              </div>

              {/* ── sidebar ── */}
              <aside className="es3-sidebar">

                {/* laudo card */}
                <div className="es3-laudo-card">
                  <div className="es3-laudo-head">
                    <span className="es3-laudo-tag">Laudo Técnico em PDF · NBR 14653</span>
                    <h3 className="es3-laudo-titulo">Tenha argumentos reais na negociação</h3>
                  </div>

                  <div className="es3-laudo-preco">
                    <span className="es3-laudo-de">R$ 399</span>
                    <strong className="es3-laudo-por">R$ 250</strong>
                    <span className="es3-laudo-imediata">entrega imediata</span>
                  </div>

                  <LaudoProfissional codigo={im.codigo} n={est.n} />

                  <p className="es3-laudo-trust">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    Sem risco · pagamento seguro · suporte pelo WhatsApp
                  </p>
                </div>

                {/* whatsapp */}
                <div className="es3-wa-card">
                  <p className="es3-wa-pre">Prefere tirar dúvidas antes de decidir?</p>
                  <a
                    className="btn btn-ghost"
                    href={linkWhatsApp(waMsg)}
                    target="_blank" rel="noopener"
                    style={{ width: '100%', justifyContent: 'center', boxSizing: 'border-box' }}
                  >
                    <IconWhats width={16} height={16} /> Falar com o Vinícius
                  </a>
                </div>

              </aside>
            </div>
          </div>

          {/* ── CTA flutuante mobile ── */}
          <div className="es3-mobile-bar">
            <a
              className="btn btn-gold"
              href={linkWhatsApp(waMsg)}
              target="_blank" rel="noopener"
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <IconWhats width={15} height={15} /> Falar com o Vinícius
            </a>
          </div>
        </>
      ) : (
        <div className="es3-loading">
          {loadingApi
            ? <><div className="es3-loading-spin" /><p>Calculando análise…</p></>
            : <><p style={{ color: '#8a93a6', marginBottom: 24 }}>Análise não disponível para este imóvel.</p><Link to={`/imovel/${im.codigo}`} className="btn btn-ghost">Voltar ao imóvel</Link></>
          }
        </div>
      )}

      {/* ── footer nav ── */}
      <div className="container es3-footer-nav">
        <Link to={`/imovel/${im.codigo}`} className="btn btn-ghost">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Voltar ao imóvel
        </Link>
        <Link to="/imoveis" className="btn btn-ghost">Ver outros imóveis</Link>
      </div>

    </main>
  )
}
