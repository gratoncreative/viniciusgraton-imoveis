import { useState, useMemo, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useSEO } from '../useSEO'
import { getImovel, estudoM2, linkWhatsApp } from '../data'
import { IconWhats } from '../components/icons'

const fmtM2 = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR') + '/m²'

/* ── Bloco de laudo profissional ────────────────────────────────── */
function LaudoProfissional({ codigo, baseLabel, n }) {
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
        alert('O pagamento ainda não está configurado. Me chama no WhatsApp que eu te envio o laudo.')
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
    <div className="est-laudo-bloco">
      <div className="est-laudo-tag">Laudo técnico em PDF · Metodologia bancária NBR 14653</div>
      <div className="est-laudo-preco-row">
        <span className="est-laudo-de">R$ 399</span>
        <strong className="est-laudo-por">R$ 250</strong>
        <span className="est-laudo-desc">entrega imediata</span>
      </div>
      <ul className="est-laudo-itens">
        <li><span className="em2-check">✓</span> {n > 0 ? `Todos os ${n} comparáveis` : baseLabel} com endereço, preço e o motivo de cada ajuste aplicado</li>
        <li><span className="em2-check">✓</span> Cálculo de quanto você pode negociar de desconto com base no mercado real</li>
        <li><span className="em2-check">✓</span> Documento aceito por bancos para questionar avaliação no financiamento</li>
        <li><span className="em2-check">✓</span> Entregue em PDF em até 30 min — você usa ainda hoje na negociação</li>
        <li><span className="em2-check">✓</span> Assinado pelo consultor Vinícius Graton com parecer técnico personalizado</li>
      </ul>
      <p className="em2-urgencia">
        Você está prestes a investir centenas de milhares de reais. Saber se o preço está justo por R$ 250 é a decisão mais inteligente antes de assinar qualquer coisa.
      </p>
      <button
        className="em2-laudo em2-laudo--destaque est-laudo-btn"
        onClick={comprar}
        disabled={comprando}
      >
        <span>{comprando ? 'Processando…' : '📄 Quero o laudo — R$ 250'}</span>
        <em>entrega em PDF imediata · pagamento seguro</em>
      </button>
    </div>
  )
}

/* ── Gráfico de barras (comparáveis de mercado) ─────────────────── */
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
    <div className="em2-chart-card">
      <div className="em2-chart-head">
        <span className="em2-chart-titulo">Comparáveis no mercado</span>
        <p className="em2-chart-sub">{comps.length} imóveis do mesmo tipo · preço/m² homogeneizado</p>
      </div>
      <div className="em2-chart-stage">
        {ticks.map(t => (
          <div key={t} className="em2-chart-grid-line" style={{ bottom: pct(t) }}>
            <span className="em2-chart-grid-label">{fmtMil(t)}</span>
          </div>
        ))}
        <div className="em2-chart-med-line" style={{ bottom: pct(est.referencia) }}>
          <span className="em2-chart-med-tag">mediana</span>
        </div>
        <div className="em2-chart-bars">
          {comps.map((c, i) => {
            const isSubj = String(c.codigo) === String(im.codigo)
            return (
              <div key={i} className="em2-chart-bar-wrap">
                {isSubj && (
                  <span className="em2-bar-subj-label">
                    {`R$ ${Math.round(c.m2).toLocaleString('pt-BR')}/m²`}
                  </span>
                )}
                <div
                  className={`em2-chart-bar${isSubj ? ' em2-chart-bar--subj' : ''}`}
                  style={{ height: pct(c.m2) }}
                />
              </div>
            )
          })}
          {!subjInComps && (
            <div className="em2-chart-bar-wrap">
              <span className="em2-bar-subj-label">
                {`R$ ${Math.round(est.m2Subj).toLocaleString('pt-BR')}/m²`}
              </span>
              <div
                className="em2-chart-bar em2-chart-bar--subj"
                style={{ height: pct(est.m2Subj) }}
              />
            </div>
          )}
        </div>
      </div>
      <div className="em2-chart-legend">
        <span><span className="em2-chart-leg-swatch em2-chart-leg-swatch--comp" />Comparáveis</span>
        <span><span className="em2-chart-leg-swatch em2-chart-leg-swatch--subj" />Este imóvel</span>
        <span><span className="em2-chart-leg-swatch em2-chart-leg-swatch--med" />Mediana</span>
      </div>
    </div>
  )
}

/* ── Régua de posicionamento no mercado ─────────────────────────── */
function PositionRuler({ im, est }) {
  const { m2Subj, referencia, campoMin, campoMax } = est

  const dataMin = Math.min(m2Subj, campoMin)
  const dataMax = Math.max(m2Subj, campoMax)
  const dataRange = dataMax - dataMin || 1000
  const axisMin = Math.floor((dataMin - dataRange * 0.18) / 500) * 500
  const axisMax = Math.ceil((dataMax + dataRange * 0.12) / 500) * 500
  const axisRange = axisMax - axisMin || 1

  const pct = v => ((v - axisMin) / axisRange * 100).toFixed(1) + '%'
  const pctNum = v => (v - axisMin) / axisRange * 100

  const tickStep = axisRange <= 4000 ? 500 : axisRange <= 8000 ? 1000 : axisRange <= 16000 ? 2000 : 3000
  const ticks = []
  const firstTick = Math.ceil((axisMin + 1) / tickStep) * tickStep
  for (let t = firstTick; t <= axisMax; t += tickStep) ticks.push(t)

  const fmtK = v => `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`
  const fmtVal = v => 'R$ ' + Math.round(v).toLocaleString('pt-BR')

  const subjPct = pctNum(m2Subj)
  const medianPct = pctNum(referencia)
  const subjTransform = subjPct < 15 ? 'translateX(0)' : subjPct > 85 ? 'translateX(-100%)' : 'translateX(-50%)'
  const showMedianTip = Math.abs(medianPct - subjPct) > 18

  return (
    <div className="em2-ruler-card">
      <div className="em2-ruler-header">
        <div>
          <h3 className="em2-ruler-title">Onde este preço se posiciona no mercado</h3>
          <p className="em2-ruler-sub">
            Valor por m² homogeneizado, comparado à faixa praticada no {im.bairro}
          </p>
        </div>
        <div className="em2-ruler-faixa-info">
          <span className="em2-ruler-faixa-tag">Faixa de mercado</span>
          <span className="em2-ruler-faixa-val">{fmtVal(campoMin)} a {fmtVal(campoMax)} / m²</span>
        </div>
      </div>

      <div className="em2-ruler-stage">
        <div className="em2-ruler-subj-ann" style={{ left: pct(m2Subj), transform: subjTransform }}>
          <span className="em2-ruler-subj-name">Este imóvel</span>
          <span className="em2-ruler-subj-val">{fmtVal(m2Subj)} / m² homogeneizado</span>
        </div>

        {showMedianTip && (
          <div className="em2-ruler-median-ann" style={{ left: pct(referencia) }}>
            <div className="em2-ruler-median-box">
              <span className="em2-ruler-median-val">{fmtVal(referencia)}</span>
              <span className="em2-ruler-median-tag">mercado · m²</span>
            </div>
            <span className="em2-ruler-median-sub">MEDIANA DO BAIRRO</span>
          </div>
        )}

        <div className="em2-ruler-track">
          <div className="em2-ruler-band" style={{
            left: pct(campoMin),
            width: ((campoMax - campoMin) / axisRange * 100).toFixed(1) + '%'
          }} />
          <div className="em2-ruler-median-line" style={{ left: pct(referencia) }} />
          <div className="em2-ruler-dot" style={{ left: pct(m2Subj) }} />
          {ticks.map(t => <div key={t} className="em2-ruler-tick" style={{ left: pct(t) }} />)}
        </div>

        <div className="em2-ruler-tick-labels">
          {ticks.map(t => (
            <span key={t} className="em2-ruler-tick-label" style={{ left: pct(t) }}>
              {fmtK(t)}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ═══ PÁGINA PRINCIPAL ══════════════════════════════════════════ */
export default function EstudoM2Page() {
  const { codigo } = useParams()
  const [imApi, setImApi] = useState(null)
  const [loadingApi, setLoadingApi] = useState(true)
  const [feed, setFeed] = useState([])
  const [metOpen, setMetOpen] = useState(false)

  const staticIm = useMemo(() => getImovel(codigo), [codigo])
  const im = staticIm || imApi

  useEffect(() => {
    if (staticIm) { setLoadingApi(false); return }
    let vivo = true
    setLoadingApi(true)
    fetch(`/api/rotina-imovel?codigo=${encodeURIComponent(codigo)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!vivo) return
        if (j && j.imovel) {
          const a = j.imovel
          setImApi({
            codigo: String(a.codigo),
            tipo: a.tipo || '',
            bairro: a.bairro || '',
            preco: a.valorNum || 0,
            area: a.areaNum || 0,
            vagas: a.vagas || 0,
            quartos: a.quartos || 0,
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
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivo && d && Array.isArray(d.imoveis)) setFeed(d.imoveis) })
      .catch(() => {})
    return () => { vivo = false }
  }, [])

  useSEO({
    title: im ? `Estudo do m² — ${im.tipo} no ${im.bairro} | Vinícius Graton` : 'Estudo do valor do m²',
    description: im ? `Veja se o preço do ${im.tipo} no ${im.bairro} está justo. Análise comparativa de mercado pelo método NBR 14653.` : '',
    path: `/estudo/${codigo}`,
  })

  if (!im) {
    if (loadingApi) {
      return (
        <main className="est-pg est-pg--erro">
          <div className="container" style={{ textAlign: 'center', padding: '120px 20px' }}>
            <p style={{ color: '#8a93a6' }}>Carregando imóvel…</p>
          </div>
        </main>
      )
    }
    return (
      <main className="est-pg est-pg--erro">
        <div className="container" style={{ textAlign: 'center', padding: '120px 20px' }}>
          <p style={{ color: '#8a93a6', marginBottom: 24 }}>Imóvel não encontrado.</p>
          <Link to="/imoveis" className="btn btn-gold">Ver catálogo</Link>
        </div>
      </main>
    )
  }

  const est = (() => { try { return estudoM2(im, feed) } catch { return { ok: false } } })()
  const cor = est?.ok ? (est.veredito === 'abaixo' ? 'ok' : est.veredito === 'acima' ? 'alto' : 'neutro') : 'neutro'
  const verdito = est?.ok
    ? est.veredito === 'abaixo'
      ? `Abaixo do mercado · ${Math.abs(est.diffPct)}% mais barato`
      : est.veredito === 'acima'
        ? `Acima da média · +${est.diffPct}%`
        : 'Dentro do valor de mercado'
    : ''

  const waMsg = `Olá Vinícius! Vi o estudo de valor do m² do imóvel cód. ${im.codigo} (${im.tipo} no ${im.bairro}) e quero entender melhor. Pode me ajudar?`

  return (
    <main className="pagina est-pg">

      {/* ── Topo de navegação ── */}
      <div className="est-nav">
        <div className="container est-nav-inner">
          <Link to={`/imovel/${im.codigo}`} className="est-nav-back">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Voltar ao imóvel
          </Link>
          <span className="est-nav-eyebrow">Análise de preço · {im.tipo} no {im.bairro}</span>
        </div>
      </div>

      <div className={`container est-container${est?.ok ? ' est-container--dash' : ''}`}>

        {/* ── Header do imóvel ── */}
        <div className="est-header">
          <span className="em2-preview-badge">✦ Preview gratuito · dados reais do bairro</span>
          <h1 className="est-titulo">Este {im.tipo} no {im.bairro} está com preço justo?</h1>
          {im.preco > 0 && im.area > 0 && (
            <p className="est-subtitulo">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(im.preco)}
              {' · '}{im.area} m²
              {im.quartos > 0 && ` · ${im.quartos} quartos`}
            </p>
          )}
        </div>

        {est?.ok ? (
          <div className="em2-dash">

            {/* ── A: métricas ── */}
            <div className="em2-dash-a">

              <div className="em2-hero em2-hero--dash">
                <span className="em2-hero-label">Análise de Mercado · m²</span>
                <div className="em2-hero-body">
                  <div className="em2-hero-left">
                    <div className="em2-hero-row">
                      <span className="em2-hero-metric">{fmtM2(est.m2Subj)}</span>
                      <span className={`em2-hero-badge em2-hero-badge--${cor}`}>
                        {est.diffPct > 0 ? '+' : ''}{est.diffPct}%
                      </span>
                    </div>
                    <p className="em2-hero-veredito">{verdito}</p>
                    <p className="em2-hero-fonte" style={{ marginTop: 8 }}>
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3v18h18M7 14l4-4 3 3 5-6"/></svg>
                      Mediana do bairro: {fmtM2(est.referencia)}
                    </p>
                  </div>
                  <div className="em2-hero-chips">
                    <span className="em2-hero-chip">
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {im.bairro}
                    </span>
                    <span className="em2-hero-chip">
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                      {im.tipo}
                    </span>
                    <span className="em2-hero-chip">
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                      {im.area} m²
                    </span>
                  </div>
                </div>
              </div>

              <div className="em2-dash-card">
                <span className="em2-dash-card-label">Campo de mercado</span>
                <div className="em2-triptych em2-triptych--side">
                  <div className="em2-triptych-card">
                    <span className="em2-tri-ico">
                      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
                    </span>
                    <b>{fmtM2(est.campoMin)}</b>
                    <span>Mínimo</span>
                  </div>
                  <div className="em2-triptych-card em2-triptych-card--destaque">
                    <span className="em2-tri-ico">
                      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
                    </span>
                    <b>{fmtM2(est.referencia)}</b>
                    <span>Mediana</span>
                  </div>
                  <div className="em2-triptych-card">
                    <span className="em2-tri-ico">
                      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    </span>
                    <b>{fmtM2(est.campoMax)}</b>
                    <span>Máximo</span>
                  </div>
                </div>
                <p className="em2-hero-fonte" style={{ marginTop: 14 }}>
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {est.baseLabel}
                </p>
              </div>

              <div className="em2-stats-grid">
                <div className="em2-stat">
                  <span className="em2-stat-label">Preço anunciado</span>
                  <b className="em2-stat-val">{fmtM2(est.precoM2)}</b>
                  <span className="em2-stat-sub">por m² (com vaga)</span>
                </div>
                <div className="em2-stat">
                  <span className="em2-stat-label">M² ajustado</span>
                  <b className="em2-stat-val">{fmtM2(est.m2Subj)}</b>
                  <span className="em2-stat-sub">para comparação justa</span>
                </div>
                <div className="em2-stat">
                  <span className="em2-stat-label">Valor justo</span>
                  <b className="em2-stat-val">{fmtM2(est.valorVenda)}</b>
                  <span className="em2-stat-sub">estimativa de mercado</span>
                </div>
                {est.n > 0 && (
                  <div className="em2-stat">
                    <span className="em2-stat-label">Imóveis comparados</span>
                    <b className="em2-stat-val">{est.n}</b>
                    <span className="em2-stat-sub">na amostra</span>
                  </div>
                )}
              </div>

            </div>

            {/* ── B: gráficos e análise ── */}
            <div className="em2-dash-b">

              <CompsChart est={est} im={im} />

              <PositionRuler im={im} est={est} />

              {/* CTA inline (visível só em mobile) */}
              <div className="em2-cta-inline">
                <p className="em2-cta-inline-text">Ficou com dúvida sobre esse valor?</p>
                <a className="btn btn-ghost" href={linkWhatsApp(waMsg)} target="_blank" rel="noopener" style={{ justifyContent: 'center' }}>
                  <IconWhats width={16} height={16} /> Falar com o Vinícius
                </a>
              </div>

              {/* Metodologia colapsável */}
              {(est.fatoresAplicados?.length > 0 || est.limitacoes?.length > 0) && (
                <section className="est-sec">
                  <div className="em2-met-header" onClick={() => setMetOpen(o => !o)}>
                    <div>
                      <div className="est-sec-label">Metodologia · ABNT NBR 14653</div>
                      <h2 className="est-sec-titulo" style={{ marginBottom: 0 }}>Como chegamos nesse valor</h2>
                    </div>
                    <button className="em2-met-toggle" type="button" onClick={e => { e.stopPropagation(); setMetOpen(o => !o) }}>
                      {metOpen ? 'Recolher' : 'Ver detalhes'}
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: metOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><path d="M6 9l6 6 6-6"/></svg>
                    </button>
                  </div>
                  {metOpen && (
                    <div className="em2-met-body">
                      {est.fatoresAplicados?.length > 0 && (
                        <ul className="em2-fatores-list est-fatores">
                          {est.fatoresAplicados.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                      )}
                      {est.limitacoes?.length > 0 && (
                        <>
                          <h3 className="est-met-subtit est-met-subtit--lim" style={{ marginTop: 16 }}>O que este estudo não cobre</h3>
                          <ul className="em2-fatores-list em2-fatores-list--lim est-fatores">
                            {est.limitacoes.map((f, i) => <li key={i}>{f}</li>)}
                          </ul>
                        </>
                      )}
                    </div>
                  )}
                  <p className="em2-disc" style={{ marginTop: metOpen ? undefined : 8 }}>
                    Estudo comparativo de mercado pelo método ABNT NBR 14653.
                    Estimativa de referência — não substitui laudo com vistoria presencial.
                  </p>
                </section>
              )}

            </div>

            {/* ── C: conversão ── */}
            <div className="em2-dash-c">

              <div className="em2-dash-card">
                <div className="est-sec-label">Laudo profissional</div>
                <h2 className="est-sec-titulo" style={{ marginBottom: 12 }}>Tenha argumentos reais na negociação</h2>
                <LaudoProfissional codigo={im.codigo} baseLabel={est.baseLabel} n={est.n} />
              </div>

              <p className="em2-wa-pre">Prefere conversar antes de decidir?</p>
              <a className="btn btn-ghost est-wa-btn" href={linkWhatsApp(waMsg)} target="_blank" rel="noopener" style={{ width: '100%', justifyContent: 'center', boxSizing: 'border-box' }}>
                <IconWhats width={18} height={18} /> Falar com o Vinícius
              </a>

            </div>

          </div>
        ) : (
          <div className="est-sem-dados">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 3v18h18M7 14l4-4 3 3 5-6"/></svg>
            <p>Estudo de m² não disponível para este imóvel no momento.</p>
            <Link to={`/imovel/${im.codigo}`} className="btn btn-ghost">Voltar ao imóvel</Link>
          </div>
        )}

        {/* ── CTA flutuante mobile ── */}
        {est?.ok && (
          <div className="em2-cta-mobile-bar">
            <a className="btn btn-gold" href={linkWhatsApp(waMsg)} target="_blank" rel="noopener" style={{ flex: 1, justifyContent: 'center' }}>
              <IconWhats width={16} height={16} /> Falar com o Vinícius
            </a>
          </div>
        )}

        {/* ── Link de volta ── */}
        <div className="est-footer-nav">
          <Link to={`/imovel/${im.codigo}`} className="btn btn-ghost">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Voltar ao imóvel
          </Link>
          <Link to="/imoveis" className="btn btn-ghost">Ver outros imóveis</Link>
        </div>

      </div>
    </main>
  )
}
