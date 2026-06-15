import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSEO } from '../useSEO'
import { estudoM2 } from '../data'

const fmtM2  = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR') + '/m²'
const fmtBRL = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR')

/* ══ CompsChart ═══════════════════════════════════════════════════ */
function CompsChart({ est, im }) {
  if (!est?.comparaveis?.length) return null
  const comps   = est.comparaveis
  const allVals = [...comps.map(c => c.m2), est.m2Subj]
  const pad     = (Math.max(...allVals) - Math.min(...allVals)) * 0.15 || 500
  const cMin    = Math.max(0, Math.min(...allVals) - pad)
  const cMax    = Math.max(...allVals) + pad
  const range   = cMax - cMin || 1
  const pct     = v => ((v - cMin) / range * 100).toFixed(1) + '%'
  const fmtMil  = v => `R$ ${Math.round(v / 1000)} mil`
  const step    = range <= 3000 ? 500 : range <= 6000 ? 1000 : range <= 12000 ? 2000 : 3000
  const ticks   = []
  for (let t = Math.ceil(cMin / step) * step; t <= cMax; t += step) ticks.push(t)

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
          {comps.map((c, i) => (
            <div key={i} className="es3-chart-bar-wrap">
              <div className="es3-chart-bar" style={{ height: pct(c.m2) }} />
              <div className="es3-chart-tooltip">
                <span className="es3-chart-tt-name">{c.bairro}</span>
                <span className="es3-chart-tt-area">{c.area} m² · {c.vagas > 0 ? `${c.vagas} vaga${c.vagas > 1 ? 's' : ''}` : 'sem vaga'}</span>
                <span className="es3-chart-tt-preco">{fmtBRL(c.preco)}</span>
                <span className="es3-chart-tt-m2">{fmtM2(c.m2)}</span>
              </div>
            </div>
          ))}
          <div className="es3-chart-bar-wrap">
            <span className="es3-chart-subj-label">{fmtM2(est.m2Subj)}</span>
            <div className="es3-chart-bar es3-chart-bar--subj" style={{ height: pct(est.m2Subj) }} />
            <div className="es3-chart-tooltip">
              <span className="es3-chart-tt-name">Este imóvel</span>
              <span className="es3-chart-tt-area">{im.area} m²</span>
              <span className="es3-chart-tt-m2">{fmtM2(est.m2Subj)}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="es3-chart-legend">
        <span><span className="es3-chart-swatch es3-chart-swatch--comp" />Comparáveis (Uberlândia)</span>
        <span><span className="es3-chart-swatch es3-chart-swatch--subj" />Este imóvel</span>
        <span><span className="es3-chart-swatch es3-chart-swatch--med" />Mediana</span>
      </div>
    </div>
  )
}

/* ══ PositionRuler ════════════════════════════════════════════════ */
function PositionRuler({ im, est }) {
  const { m2Subj, referencia, campoMin, campoMax } = est
  const dataMin   = Math.min(m2Subj, campoMin)
  const dataMax   = Math.max(m2Subj, campoMax)
  const dataRange = dataMax - dataMin || 1000
  const axisMin   = Math.floor((dataMin - dataRange * 0.18) / 500) * 500
  const axisMax   = Math.ceil((dataMax + dataRange * 0.12) / 500) * 500
  const axisRange = axisMax - axisMin || 1

  const pct      = v => ((v - axisMin) / axisRange * 100).toFixed(1) + '%'
  const pctNum   = v => (v - axisMin) / axisRange * 100
  const fmtK     = v => `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`
  const fmtVal   = v => 'R$ ' + Math.round(v).toLocaleString('pt-BR')
  const tickStep = axisRange <= 4000 ? 500 : axisRange <= 8000 ? 1000 : axisRange <= 16000 ? 2000 : 3000
  const ticks    = []
  for (let t = Math.ceil((axisMin + 1) / tickStep) * tickStep; t <= axisMax; t += tickStep) ticks.push(t)

  const subjPct       = pctNum(m2Subj)
  const medPct        = pctNum(referencia)
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
        <div className="es3-ruler-band" style={{ left: pct(campoMin), width: ((campoMax - campoMin) / axisRange * 100).toFixed(1) + '%' }} />
        <div className="es3-ruler-med-line" style={{ left: pct(referencia) }} />
        <div className="es3-ruler-dot"      style={{ left: pct(m2Subj) }} />
        {ticks.map(t => <div key={t} className="es3-ruler-tick" style={{ left: pct(t) }} />)}
      </div>
      <div className="es3-ruler-labels">
        {ticks.map(t => <span key={t} className="es3-ruler-label" style={{ left: pct(t) }}>{fmtK(t)}</span>)}
      </div>
      <div className="es3-ruler-faixa-info">
        <span>Faixa de mercado:</span>
        <strong>{fmtVal(campoMin)} a {fmtVal(campoMax)}/m²</strong>
        {im.bairro && <span>· {im.bairro}</span>}
      </div>
    </div>
  )
}

/* ══ Análise qualitativa IA ═══════════════════════════════════════ */
const COND = {
  novo:       { label: 'Imóvel novo',         color: '#4ade80' },
  reformado:  { label: 'Reformado',            color: '#a3e635' },
  bom:        { label: 'Bom estado',           color: '#93c5fd' },
  a_reformar: { label: 'Precisa de reformas',  color: '#fb923c' },
}

function QualidadeCard({ analise }) {
  if (!analise) return null
  const cond = COND[analise.condicao] || { label: analise.condicao, color: '#93c5fd' }
  return (
    <div className="es3-card au-card-qual">
      <div className="es3-sec-head">
        <span className="es3-sec-label">Análise · IA Qualitativa</span>
        <h2 className="es3-card-titulo">Avaliação do imóvel</h2>
        {analise.resumo && <p className="es3-card-sub">{analise.resumo}</p>}
      </div>
      <div className="au-qual-body">
        <div className="au-qual-cond" style={{ '--cond-color': cond.color }}>
          <span className="au-qual-cond-dot" />
          <span>{cond.label}</span>
          {analise.premium && <span className="au-qual-premium">✦ Alto padrão</span>}
        </div>
        {analise.pontos_positivos?.length > 0 && (
          <div className="au-qual-sec">
            <p className="au-qual-sec-title">O que agrega valor</p>
            <ul className="au-qual-list au-qual-list--pos">
              {analise.pontos_positivos.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        )}
        {analise.pontos_atencao?.length > 0 && (
          <div className="au-qual-sec">
            <p className="au-qual-sec-title">Pontos de atenção</p>
            <ul className="au-qual-list au-qual-list--neg">
              {analise.pontos_atencao.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

/* ══ PÁGINA ═══════════════════════════════════════════════════════ */
export default function AnalisarUrlPage() {
  const [url,      setUrl]      = useState('')
  const [fase,     setFase]     = useState('idle')   // idle | carregando | resultado | erro
  const [resultado, setResultado] = useState(null)
  const [erroMsg,  setErroMsg]  = useState('')
  const [feed,     setFeed]     = useState([])

  useSEO({
    title: 'Analisar imóvel por link — ZAP, Viva Real, Rotina | Vinícius Graton',
    description: 'Cole o link de qualquer anúncio imobiliário e descubra se o preço pedido é justo pelo m² do bairro. Funciona com ZAP, Viva Real, Rotina, OLX e outros portais.',
    path: '/ferramentas/analisar-imovel',
  })

  useEffect(() => {
    fetch('/catalogo.json')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (Array.isArray(d?.imoveis)) setFeed(d.imoveis) })
      .catch(() => {})
  }, [])

  const analisar = async (e) => {
    e.preventDefault()
    const u = url.trim()
    if (!u) return
    setFase('carregando')
    setErroMsg('')
    setResultado(null)
    try {
      const r = await fetch('/api/analisar-url', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: u }),
      })
      const j = await r.json()
      if (!j.ok) {
        setErroMsg(j.erro || 'Não foi possível analisar este anúncio.')
        setFase('erro')
        return
      }
      const { dados, analise } = j
      const im = {
        codigo:   dados.codigo || 'ext',
        tipo:     dados.tipo || 'Apartamento',
        bairro:   dados.bairro || '',
        cidade:   dados.cidade || 'Uberlândia',
        preco:    dados.preco || 0,
        area:     dados.area || 0,
        vagas:    dados.vagas || 0,
        quartos:  dados.quartos || 0,
      }
      const est = (() => { try { return estudoM2(im, feed) } catch { return { ok: false } } })()
      setResultado({ dados, analise, im, est })
      setFase('resultado')
    } catch {
      setErroMsg('Erro de conexão. Verifique sua internet e tente novamente.')
      setFase('erro')
    }
  }

  const reiniciar = () => { setFase('idle'); setResultado(null); setUrl('') }

  // resultado: referências rápidas
  const dados   = resultado?.dados
  const analise = resultado?.analise
  const im      = resultado?.im
  const est     = resultado?.est

  const cor = est?.ok
    ? est.veredito === 'abaixo' ? 'ok'
    : est.veredito === 'acima'  ? 'alto'
    : 'neutro'
    : 'neutro'

  const badgeTexto = est?.ok
    ? est.veredito === 'abaixo' ? 'Abaixo do mercado'
    : est.veredito === 'acima'  ? 'Acima do mercado'
    : 'Na média do mercado'
    : ''

  const fraseveredito = est?.ok
    ? est.veredito === 'abaixo' ? `Este imóvel está ${Math.abs(est.diffPct)}% abaixo da mediana do bairro em Uberlândia`
    : est.veredito === 'acima'  ? `Este imóvel está ${est.diffPct}% acima da mediana do bairro em Uberlândia`
    : 'Este imóvel está dentro da faixa de mercado em Uberlândia'
    : ''

  const waMsg = dados
    ? encodeURIComponent(`Olá Vinícius! Analisei este imóvel pela sua ferramenta: ${dados.urlOriginal}\nQuer me dar sua opinião profissional antes de eu fazer uma proposta?`)
    : ''

  return (
    <main className="pagina au-pg">

      {/* ── nav ── */}
      <div className="es3-nav">
        <div className="container es3-nav-inner">
          <Link to="/ferramentas" className="es3-back">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Ferramentas
          </Link>
          <span className="es3-eyebrow">Análise por link</span>
        </div>
      </div>

      {/* ── form ── */}
      <div className={`au-form-sect${fase === 'resultado' ? ' au-form-sect--compact' : ''}`}>
        <div className="container">
          {fase !== 'resultado' && (
            <div className="au-form-head">
              <div className="au-form-icon-wrap">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              </div>
              <h1 className="au-form-titulo">Analisar imóvel por link</h1>
              <p className="au-form-sub">Cole o link de qualquer anúncio e descubra se o preço pedido faz sentido pelo m² do bairro</p>
            </div>
          )}

          <form className="au-form" onSubmit={analisar}>
            <div className="au-input-wrap">
              <svg className="au-input-icon" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              <input
                className="au-input"
                type="text"
                inputMode="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://zapimoveis.com.br/… ou vivareal.com.br/…"
                disabled={fase === 'carregando'}
                autoComplete="off"
                spellCheck={false}
              />
              <button className="au-btn" type="submit" disabled={fase === 'carregando' || !url.trim()}>
                {fase === 'carregando'
                  ? <span className="au-btn-spin" aria-hidden="true" />
                  : 'Analisar'
                }
              </button>
            </div>
            {fase !== 'resultado' && (
              <p className="au-form-hint">Funciona com ZAP Imóveis · Viva Real · Rotina Imobiliária · OLX e outros portais</p>
            )}
          </form>

          {fase === 'erro' && (
            <div className="au-feedback au-feedback--erro">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
              </svg>
              <span>{erroMsg}</span>
            </div>
          )}

          {fase === 'carregando' && (
            <div className="au-carregando">
              <div className="au-dots"><span/><span/><span/></div>
              <p>Lendo o anúncio e calculando o valor de mercado…</p>
            </div>
          )}
        </div>
      </div>

      {/* ══ RESULTADO ══ */}
      {fase === 'resultado' && dados && (
        <>
          {/* hero veredicto */}
          {est?.ok ? (
            <div className={`es3-hero es3-hero--${cor}`}>
              <div className="container">
                <div className="es3-ctx">
                  <span>{im.tipo}</span>
                  <span className="es3-ctx-sep">·</span>
                  <span>{im.bairro || 'bairro não informado'}</span>
                  <span className="es3-ctx-sep">·</span>
                  <span>{im.area} m²</span>
                  {im.quartos > 0 && <><span className="es3-ctx-sep">·</span><span>{im.quartos} quartos</span></>}
                  {im.vagas > 0   && <><span className="es3-ctx-sep">·</span><span>{im.vagas} vaga{im.vagas > 1 ? 's' : ''}</span></>}
                  <span className="es3-ctx-sep">·</span>
                  <span className="au-fonte-chip">{dados.fonte}</span>
                </div>
                <div className="es3-veredicto">
                  <span className={`es3-badge es3-badge--${cor}`}>{badgeTexto}</span>
                  <div className="es3-metrics">
                    <div className="es3-metric-bloco">
                      <span className="es3-metric-label">Preço/m² pedido</span>
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
                  <p className="es3-veredicto-frase">{fraseveredito}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="au-sem-m2">
              <div className="container">
                <p className="au-sem-m2-info">
                  {im.tipo} · {im.bairro || 'bairro não informado'} · {im.area} m² · {fmtBRL(im.preco)}
                </p>
                <p className="au-sem-m2-aviso">
                  Dados insuficientes para análise de m² neste bairro — nossa base cobre Uberlândia/MG.
                </p>
              </div>
            </div>
          )}

          {/* corpo 2 colunas */}
          <div className="container es3-body-wrap">
            <div className="es3-body">

              {/* coluna principal */}
              <div className="es3-main">

                {/* card do imóvel extraído */}
                <div className="es3-card au-card-imovel">
                  <div className="es3-sec-head">
                    <span className="es3-sec-label">Dados · Imóvel Analisado · {dados.fonte}</span>
                    <h2 className="es3-card-titulo">{dados.titulo || `${dados.tipo} em ${dados.bairro || 'bairro não informado'}`}</h2>
                    <a href={dados.urlOriginal} target="_blank" rel="noopener noreferrer" className="au-link-orig">
                      Ver anúncio original ↗
                    </a>
                  </div>

                  <div className="au-specs">
                    {dados.preco > 0 && (
                      <div className="au-spec">
                        <span className="au-spec-label">Preço pedido</span>
                        <span className="au-spec-val au-spec-val--dest">{fmtBRL(dados.preco)}</span>
                      </div>
                    )}
                    {dados.area > 0 && (
                      <div className="au-spec">
                        <span className="au-spec-label">Área</span>
                        <span className="au-spec-val">{dados.area} m²</span>
                      </div>
                    )}
                    {dados.quartos > 0 && (
                      <div className="au-spec">
                        <span className="au-spec-label">Quartos</span>
                        <span className="au-spec-val">{dados.quartos}</span>
                      </div>
                    )}
                    {dados.suites > 0 && (
                      <div className="au-spec">
                        <span className="au-spec-label">Suítes</span>
                        <span className="au-spec-val">{dados.suites}</span>
                      </div>
                    )}
                    {dados.banheiros > 0 && (
                      <div className="au-spec">
                        <span className="au-spec-label">Banheiros</span>
                        <span className="au-spec-val">{dados.banheiros}</span>
                      </div>
                    )}
                    {dados.vagas > 0 && (
                      <div className="au-spec">
                        <span className="au-spec-label">Vagas</span>
                        <span className="au-spec-val">{dados.vagas}</span>
                      </div>
                    )}
                    {dados.bairro && (
                      <div className="au-spec">
                        <span className="au-spec-label">Bairro</span>
                        <span className="au-spec-val">{dados.bairro}</span>
                      </div>
                    )}
                    {dados.cidade && (
                      <div className="au-spec">
                        <span className="au-spec-label">Cidade</span>
                        <span className="au-spec-val">{dados.cidade}</span>
                      </div>
                    )}
                    {dados.preco > 0 && dados.area > 0 && (
                      <div className="au-spec">
                        <span className="au-spec-label">Preço/m² bruto</span>
                        <span className="au-spec-val">{fmtM2(dados.preco / dados.area)}</span>
                      </div>
                    )}
                  </div>

                  {dados.amenidades?.length > 0 && (
                    <div className="au-chips">
                      {dados.amenidades.slice(0, 14).map((a, i) => (
                        <span key={i} className="au-chip">{a}</span>
                      ))}
                    </div>
                  )}

                  {dados.fotos?.length > 0 && (
                    <div className="au-fotos">
                      {dados.fotos.slice(0, 4).map((f, i) => (
                        <img key={i} src={f} alt="" className="au-foto" loading="lazy" />
                      ))}
                    </div>
                  )}
                </div>

                {/* análise qualitativa IA */}
                <QualidadeCard analise={analise} />

                {/* análise de m² (só se disponível) */}
                {est?.ok && (
                  <>
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
                      {(() => {
                        const span    = est.campoMax - est.campoMin || 1
                        const pctSubj = Math.max(2, Math.min(98, (est.m2Subj - est.campoMin) / span * 100))
                        const pctMed  = Math.max(2, Math.min(98, (est.referencia - est.campoMin) / span * 100))
                        return (
                          <div className="es3-campo-track-wrap">
                            <div className="es3-campo-track">
                              <div className="es3-campo-track-band" />
                              <div className="es3-campo-track-med" style={{ left: pctMed.toFixed(1) + '%' }} />
                              <div className={`es3-campo-track-dot es3-campo-track-dot--${cor}`} style={{ left: pctSubj.toFixed(1) + '%' }}>
                                <div className="es3-campo-track-label">Este imóvel</div>
                              </div>
                            </div>
                            <div className="es3-campo-track-ends">
                              <span>{fmtM2(est.campoMin)}</span>
                              <span>{fmtM2(est.campoMax)}</span>
                            </div>
                          </div>
                        )
                      })()}
                    </div>

                    <div className="es3-card es3-card--ruler">
                      <div className="es3-sec-head">
                        <span className="es3-sec-label">Análise · Posicionamento</span>
                        <h2 className="es3-card-titulo">Onde este imóvel está no mercado</h2>
                        <p className="es3-card-sub">Preço/m² ajustado comparado à faixa praticada {im.bairro ? `no ${im.bairro}` : 'no bairro'}</p>
                      </div>
                      <PositionRuler im={im} est={est} />
                    </div>

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
                  </>
                )}

              </div>{/* es3-main */}

              {/* sidebar */}
              <aside className="es3-side">

                <div className="au-side-cta">
                  <div className="au-side-cta-icon">VG</div>
                  <p className="au-side-cta-pretit">Tem dúvidas sobre este imóvel?</p>
                  <h3 className="au-side-cta-titulo">Fale comigo antes de dar uma proposta</h3>
                  <p className="au-side-cta-desc">Posso te ajudar a negociar o melhor preço e avaliar os riscos do imóvel presencialmente.</p>
                  <a
                    href={`https://wa.me/5534991570494?text=${waMsg}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="au-side-cta-btn"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                    </svg>
                    Falar no WhatsApp
                  </a>
                </div>

                <div className="au-side-nova">
                  <button className="au-nova-btn" onClick={reiniciar}>
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
                    </svg>
                    Analisar outro imóvel
                  </button>
                  <p className="au-side-aviso">Análise baseada em dados de Uberlândia/MG. Para imóveis de outras cidades, o campo de mercado pode não estar disponível.</p>
                </div>

              </aside>
            </div>
          </div>
        </>
      )}
    </main>
  )
}
