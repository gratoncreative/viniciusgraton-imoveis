import { useState, useMemo, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useSEO } from '../useSEO'
import { getImovel, estudoM2, linkWhatsApp } from '../data'
import { IconWhats } from '../components/icons'

const fmtM2 = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR') + '/m²'

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
            {/* ── Hero: Análise de Preço ── */}
            <div className="em2-hero">
              <span className="em2-hero-label">Análise de Preço</span>

              <div className="em2-hero-body">
                <div className="em2-hero-left">
                  <div className="em2-hero-row">
                    <span className="em2-hero-metric">{fmtM2(est.referencia)}</span>
                    <span className={`em2-hero-badge em2-hero-badge--${cor}`}>
                      {est.diffPct > 0 ? '+' : ''}{est.diffPct}%
                    </span>
                  </div>
                  <p className="em2-hero-veredito">{verdito}</p>
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

              <div className="em2-triptych">
                <div className="em2-triptych-card">
                  <span className="em2-tri-ico">
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
                  </span>
                  <b>{fmtM2(est.campoMin)}</b>
                  <span>Mínimo estimado</span>
                </div>
                <div className="em2-triptych-card em2-triptych-card--destaque">
                  <span className="em2-tri-ico">
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
                  </span>
                  <b>{fmtM2(est.referencia)}</b>
                  <span>Média de mercado</span>
                </div>
                <div className="em2-triptych-card">
                  <span className="em2-tri-ico">
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  </span>
                  <b>{fmtM2(est.campoMax)}</b>
                  <span>Máximo estimado</span>
                </div>
              </div>

              <p className="em2-hero-fonte">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {est.baseLabel}{est.nDesc > 0 ? ` · ${est.nDesc} descartado(s) no saneamento` : ''}
              </p>
            </div>

            {/* ── Metodologia + Fontes ── */}
            {(est.fatoresAplicados?.length > 0 || est.limitacoes?.length > 0 || est.fontes?.length > 0) && (
              <section className="est-sec">
                <div className="est-sec-label">Metodologia · ABNT NBR 14653</div>
                <h2 className="est-sec-titulo">Como chegamos nesse valor</h2>

                {est.fatoresAplicados?.length > 0 && (
                  <>
                    <h3 className="est-met-subtit">Fatores aplicados</h3>
                    <ul className="em2-fatores-list est-fatores">
                      {est.fatoresAplicados.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </>
                )}
                {est.limitacoes?.length > 0 && (
                  <>
                    <h3 className="est-met-subtit est-met-subtit--lim" style={{ marginTop: 16 }}>O que este estudo não cobre</h3>
                    <ul className="em2-fatores-list em2-fatores-list--lim est-fatores">
                      {est.limitacoes.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </>
                )}
                {est.fontes?.length > 0 && (
                  <>
                    <h3 className="est-met-subtit" style={{ marginTop: 16 }}>Fontes</h3>
                    <ul className="em2-fatores-list est-fatores">
                      {est.fontes.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </>
                )}
                <p className="em2-disc">
                  Estudo comparativo de mercado pelo método ABNT NBR 14653 com homogeneização da amostra.
                  É uma estimativa de referência — não substitui laudo com vistoria por profissional credenciado.
                </p>
              </section>
            )}

            {/* ── Laudo profissional ── */}
            <section className="est-sec">
              <div className="est-sec-label">Laudo profissional</div>
              <h2 className="est-sec-titulo">Quer o laudo completo em PDF?</h2>
              <p className="est-sec-sub">
                O laudo técnico inclui toda a amostra de comparáveis, os fatores de homogeneização aplicados,
                o parecer do consultor e análise do bairro — no padrão usado por bancos para financiamento.
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
