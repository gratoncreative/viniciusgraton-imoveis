import { useState, useMemo, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useSEO } from '../useSEO'
import { getImovel, estudoM2, linkWhatsApp } from '../data'
import { IconWhats } from '../components/icons'

const fmtM2 = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR') + '/m²'

/* ── Régua de posição ───────────────────────────────────────────── */
function Regua({ est }) {
  const lo = Math.min(est.m2Subj, est.min, est.campoMin) * 0.96
  const hi = Math.max(est.m2Subj, est.max, est.campoMax) * 1.04
  const pos = (v) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100))
  return (
    <>
      <div className="em2-regua" aria-hidden="true">
        <span className="em2-banda" style={{ left: pos(est.campoMin) + '%', width: (pos(est.campoMax) - pos(est.campoMin)) + '%' }} />
        <span className="em2-ref" style={{ left: pos(est.referencia) + '%' }} />
        <span className="em2-eu" style={{ left: pos(est.m2Subj) + '%' }} />
      </div>
      <div className="em2-legenda">
        <span><i className="em2-dot em2-dot--eu" /> Este imóvel</span>
        <span><i className="em2-dot em2-dot--ref" /> Mercado ({fmtM2(est.referencia)})</span>
        <span><i className="em2-dot em2-dot--banda" /> Campo de arbítrio</span>
      </div>
    </>
  )
}

/* ── Bloco de laudo profissional ────────────────────────────────── */
function LaudoProfissional({ codigo, baseLabel }) {
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
        <li><span className="em2-check">✓</span> Todos os {baseLabel} com preço, área e homogeneização detalhada</li>
        <li><span className="em2-check">✓</span> Metodologia NBR 14653 — a mesma que bancos usam para aprovar financiamento</li>
        <li><span className="em2-check">✓</span> PDF em minutos · argumento técnico na hora de negociar o preço</li>
        <li><span className="em2-check">✓</span> Análise completa da amostra com fatores de homogeneização aplicados</li>
        <li><span className="em2-check">✓</span> Assinatura do consultor com parecer técnico personalizado</li>
      </ul>
      <button
        className="em2-laudo em2-laudo--destaque est-laudo-btn"
        onClick={comprar}
        disabled={comprando}
      >
        <span>{comprando ? 'Processando…' : '📄 Quero o laudo e entrar na negociação com dados'}</span>
        <em>R$ 250 · entrega imediata · minha decisão precisa de dados reais</em>
      </button>
      <p className="em2-urgencia">
        Você está prestes a investir centenas de milhares de reais. Saber se o preço está justo por R$ 250 é a decisão mais inteligente antes de assinar qualquer coisa.
      </p>
    </div>
  )
}

/* ═══ PÁGINA PRINCIPAL ══════════════════════════════════════════ */
export default function EstudoM2Page() {
  const { codigo } = useParams()
  const [imApi, setImApi] = useState(null)
  const [loadingApi, setLoadingApi] = useState(true)
  const [feed, setFeed] = useState([])

  const staticIm = useMemo(() => getImovel(codigo), [codigo])
  const im = staticIm || imApi

  // Fallback: busca na API da Rotina quando o imóvel não está no bundle estático
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

  // Catálogo para comparação no estudo de m²
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
          <span className="est-nav-eyebrow">Estudo do valor do m² · método NBR 14653</span>
        </div>
      </div>

      <div className="container est-container">

        {/* ── Header do imóvel ── */}
        <div className="est-header">
          <span className="em2-preview-badge">✦ Preview gratuito · dados reais do bairro</span>
          <h1 className="est-titulo">{im.tipo} no {im.bairro}</h1>
          {im.preco > 0 && im.area > 0 && (
            <p className="est-subtitulo">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(im.preco)}
              {' · '}{im.area} m²
              {im.quartos > 0 && ` · ${im.quartos} quartos`}
            </p>
          )}
        </div>

        {est?.ok ? (
          <>
            {/* ── Seção 1: Dados do mercado ── */}
            <section className="est-sec">
              <div className="est-sec-label">Análise de preço</div>
              <h2 className="est-sec-titulo">Comparativo de mercado</h2>

              <div className="est-dados-grid">
                {/* Valor de referência + veredito */}
                <div className="est-dado-principal">
                  <div className="em2-topo">
                    <div className="em2-num">
                      <span>Valor de mercado (m²)</span>
                      <b>{fmtM2(est.referencia)}</b>
                    </div>
                    <div className={`em2-verdito em2-verdito--${cor}`}>{verdito}</div>
                  </div>

                  <div className="em2-cards">
                    <div className="em2-card"><span>Este anúncio</span><b>{fmtM2(est.precoM2)}</b></div>
                    <div className="em2-card"><span>Comparável (s/ vaga)</span><b>{fmtM2(est.m2Subj)}</b></div>
                    <div className="em2-card"><span>Estimativa de venda</span><b>{fmtM2(est.valorVenda)}</b></div>
                  </div>

                  <Regua est={est} />

                  <p className="em2-base">
                    <b>Campo de arbítrio:</b> {fmtM2(est.campoMin)} a {fmtM2(est.campoMax)}.{' '}
                    Baseado em <b>{est.baseLabel}</b>{est.nDesc > 0 ? ` (${est.nDesc} descartado(s) no saneamento)` : ''}.
                  </p>
                </div>

                {/* Cards de contexto */}
                <div className="est-contexto">
                  <div className="est-ctx-card">
                    <span className="est-ctx-ico">📍</span>
                    <div>
                      <b>Bairro analisado</b>
                      <span>{im.bairro}</span>
                    </div>
                  </div>
                  <div className="est-ctx-card">
                    <span className="est-ctx-ico">🏠</span>
                    <div>
                      <b>Tipo de imóvel</b>
                      <span>{im.tipo}</span>
                    </div>
                  </div>
                  <div className="est-ctx-card">
                    <span className="est-ctx-ico">📐</span>
                    <div>
                      <b>Área do imóvel</b>
                      <span>{im.area} m²</span>
                    </div>
                  </div>
                  {est.n > 0 && (
                    <div className="est-ctx-card">
                      <span className="est-ctx-ico">📊</span>
                      <div>
                        <b>Amostra utilizada</b>
                        <span>{est.n} imóveis comparáveis</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ── Seção 2: Metodologia ── */}
            {(est.fatoresAplicados?.length > 0 || est.limitacoes?.length > 0) && (
              <section className="est-sec">
                <div className="est-sec-label">Metodologia</div>
                <h2 className="est-sec-titulo">Como chegamos nesse valor</h2>
                <p className="est-sec-sub">
                  A análise segue o método comparativo direto da ABNT NBR 14653 com homogeneização da amostra,
                  removendo influências de vaga, área e nível de oferta para comparar imóveis em condições iguais.
                </p>

                {est.fatoresAplicados?.length > 0 && (
                  <div className="est-metodologia">
                    <h3 className="est-met-subtit">Fatores aplicados</h3>
                    <ul className="em2-fatores-list est-fatores">
                      {est.fatoresAplicados.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                )}

                {est.limitacoes?.length > 0 && (
                  <div className="est-metodologia est-metodologia--lim">
                    <h3 className="est-met-subtit est-met-subtit--lim">O que este estudo não cobre</h3>
                    <ul className="em2-fatores-list em2-fatores-list--lim est-fatores">
                      {est.limitacoes.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {/* ── Seção 3: Fontes ── */}
            {est.fontes?.length > 0 && (
              <section className="est-sec">
                <div className="est-sec-label">Fontes</div>
                <h2 className="est-sec-titulo">Fontes utilizadas</h2>
                <ul className="em2-fatores-list est-fatores">
                  {est.fontes.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
                <p className="em2-disc">
                  Estudo comparativo de mercado, calculado pelo método ABNT NBR 14653 com homogeneização da amostra.
                  É uma estimativa de referência — não substitui um laudo com vistoria por profissional credenciado.
                </p>
              </section>
            )}

            {/* ── Seção 4: Laudo profissional ── */}
            <section className="est-sec">
              <div className="est-sec-label">Laudo profissional</div>
              <h2 className="est-sec-titulo">Quer o laudo completo em PDF?</h2>
              <p className="est-sec-sub">
                O laudo técnico inclui toda a amostra de comparáveis, os fatores de homogeneização aplicados
                item por item, o parecer do consultor e uma análise ampliada do mercado do bairro — no mesmo
                padrão utilizado por bancos para aprovação de financiamento.
              </p>
              <LaudoProfissional codigo={im.codigo} baseLabel={est.baseLabel} />
            </section>

            {/* ── CTA WhatsApp ── */}
            <div className="est-wa-wrap">
              <a className="btn btn-gold est-wa-btn" href={linkWhatsApp(waMsg)} target="_blank" rel="noopener">
                <IconWhats width={18} height={18} /> Falar sobre o preço com o Vinícius
              </a>
              <p className="est-wa-hint">Tire suas dúvidas antes de tomar qualquer decisão</p>
            </div>
          </>
        ) : (
          /* Sem dados suficientes */
          <div className="est-sem-dados">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 3v18h18M7 14l4-4 3 3 5-6"/></svg>
            <p>Estudo de m² não disponível para este imóvel no momento.</p>
            <Link to={`/imovel/${im.codigo}`} className="btn btn-ghost">Voltar ao imóvel</Link>
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
