import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import CardImovel from '../components/CardImovel'
import { IMOVEIS, getImovel, avaliarMatch, vantagensImovel, formatPreco, linkWhatsApp, oportunidade, estudoM2 } from '../data'
import { useSEO } from '../useSEO'
import { IconWhats, IconHeart, IconClose } from '../components/icons'
import { getConta, salvarConta } from '../conta'

const primeiroNome = (n) => (n || '').trim().split(/\s+/)[0] || ''

export default function Cliente() {
  const { token } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const bairroFiltro = searchParams.get('bairro') || ''
  const [estado, setEstado] = useState('carregando')
  const [cli, setCli] = useState(null)
  const [feed, setFeed] = useState([])
  const [feedback, setFeedback] = useState({})
  const [salvo, setSalvo] = useState(false)
  const timer = useRef(0)

  // laudo m²: modal, autenticação e pagamento
  const [laudoModal, setLaudoModal] = useState(null)   // { im, est } | null
  const [conta, setConta] = useState(() => getConta())
  const [laudoWa, setLaudoWa] = useState('')
  const [laudoPagando, setLaudoPagando] = useState(false)
  const [laudoComprado, setLaudoComprado] = useState(() => new Set())
  const [laudoPendente, setLaudoPendente] = useState(null) // { paymentId, codigo } detectado na URL

  useSEO({ title: 'Sua seleção de imóveis · Vinícius Graton', description: 'Imóveis selecionados a dedo para você em Uberlândia.', path: `/cliente/${token || ''}`, noindex: true })

  useEffect(() => {
    let vivo = true
    fetch('/api/cliente?t=' + encodeURIComponent(token || ''), { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (!vivo) return
        if (j && j.ok) {
          setCli(j.cliente)
          setFeedback(j.cliente.feedback || {})
          setEstado('ok')
        } else setEstado('erro')
      })
      .catch(() => vivo && setEstado('erro'))
    return () => { vivo = false }
  }, [token])

  // base COMPLETA (espelho de todos os imóveis) p/ resolver as sugestões
  useEffect(() => {
    let vivo = true
    fetch('/catalogo.json').then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivo && d && Array.isArray(d.imoveis)) setFeed(d.imoveis) })
      .catch(() => {})
    return () => { vivo = false }
  }, [])

  // Detecta retorno do Mercado Pago na URL (laudo=1&collection_id=xxx&codigo=xxx)
  useEffect(() => {
    const laudo = searchParams.get('laudo')
    const paymentId = searchParams.get('collection_id') || searchParams.get('payment_id')
    const codigoParam = searchParams.get('codigo')
    if (laudo === '1' && paymentId && codigoParam) {
      setLaudoPendente({ paymentId, codigo: codigoParam })
    }
    if (laudo) {
      const p = new URLSearchParams(searchParams)
      ;['laudo','collection_id','payment_id','collection_status','payment_type','merchant_order_id','preference_id'].forEach(k => p.delete(k))
      setSearchParams(p, { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Processa pagamento pendente quando os dados já estão carregados
  useEffect(() => {
    if (!laudoPendente || estado !== 'ok' || feed.length === 0) return
    const { paymentId, codigo } = laudoPendente
    setLaudoPendente(null)
    fetch(`/api/laudo-verificar?payment_id=${encodeURIComponent(paymentId)}&codigo=${encodeURIComponent(codigo)}`)
      .then(r => r.json())
      .then(async j => {
        if (!j.ok) return
        const im = baseImoveis.find(i => String(i.codigo) === String(codigo)) || getImovel(codigo)
        if (!im) return
        const est = estudoM2(im, baseImoveis)
        if (!est.ok) return
        setLaudoComprado(prev => new Set([...prev, String(codigo)]))
        setLaudoModal({ im, est })
        // Download automático
        const { gerarPdfLaudoM2Blob } = await import('../pdfLaudoM2')
        const blob = await gerarPdfLaudoM2Blob(im, est)
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `laudo-m2-${im.codigo}.pdf`; document.body.appendChild(a); a.click()
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url) }, 1000)
        // Envia por email (silenciosamente, sem bloquear)
        const c = getConta()
        if (c?.email) {
          const reader = new FileReader()
          reader.readAsDataURL(blob)
          reader.onload = () => {
            const b64 = reader.result.split(',')[1]
            fetch('/api/laudo-email', {
              method: 'POST', headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ email: c.email, nome: c.nome, pdf_b64: b64, filename: `laudo-m2-${im.codigo}.pdf`, codigo: im.codigo, payment_id: paymentId }),
            }).catch(() => {})
          }
        }
      })
      .catch(() => {})
  }, [laudoPendente, estado, feed.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const agendarSalvar = (novoFb) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      fetch('/api/cliente-refina', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t: token, feedback: novoFb }) })
        .then(() => { setSalvo(true); setTimeout(() => setSalvo(false), 1500) }).catch(() => {})
    }, 700)
  }

  const setFb = (cod, val) => {
    const novo = { ...feedback }
    if (novo[cod] === val) delete novo[cod]; else novo[cod] = val
    setFeedback(novo)
    agendarSalvar(novo)
  }

  if (estado === 'carregando') return <main className="pagina section--light det-vazio"><div className="container" style={{ textAlign: 'center' }}><p className="section-sub">Carregando sua seleção…</p></div></main>
  if (estado === 'erro' || !cli) {
    return (
      <main className="pagina section--light det-vazio">
        <div className="container" style={{ textAlign: 'center' }}>
          <h1 className="section-title">Seleção não encontrada</h1>
          <p className="section-sub" style={{ margin: '14px auto 24px', maxWidth: 480 }}>Esse link pode ter expirado. Me chama no WhatsApp que eu te mando sua seleção atualizada.</p>
          <a className="btn btn-gold" href={linkWhatsApp('Olá Vinícius! O link da minha seleção de imóveis não abriu, pode me reenviar?')} target="_blank" rel="noopener"><IconWhats /> Falar com o Vinícius</a>
        </div>
      </main>
    )
  }

  const nome = primeiroNome(cli.nome)
  // prefs do cliente conforme cadastrado pelo corretor (somente leitura, para o avaliarMatch)
  const prefs = { tipos: cli.tipos || [], bairros: cli.bairros || [], precoMin: +cli.precoMin || 0, precoMax: +cli.precoMax || 0, quartosMin: +cli.quartosMin || 0, suitesMin: +cli.suitesMin || 0, vagasMin: +cli.vagasMin || 0, areaMin: +cli.areaMin || 0 }

  // base completa: espelho (catalogo.json) + curados do bundle (estes têm prioridade)
  const baseImoveis = (() => {
    const mapa = new Map()
    for (const im of feed) mapa.set(String(im.codigo), im)
    for (const im of IMOVEIS) mapa.set(String(im.codigo), im)
    return [...mapa.values()]
  })()
  const acharImovel = (c) => baseImoveis.find((i) => String(i.codigo) === String(c)) || getImovel(c)
  const curados = (cli.sugeridos || []).map((c) => acharImovel(c)).filter(Boolean)

  // m²/preço: mediana e range da seleção curada (base para gauge e destaque de oportunidade)
  const m2vals = curados.map((im) => im.preco > 0 && im.area > 0 ? im.preco / im.area : 0).filter((v) => v > 0).sort((a, b) => a - b)
  const m2med = m2vals.length ? m2vals[Math.floor(m2vals.length / 2)] : 0
  const m2rMin = m2vals[0] || 0
  const m2rMax = m2vals[m2vals.length - 1] || 0
  const m2tagIm = (im) => {
    if (!m2med || !im.preco || !im.area) return ''
    const r = im.preco / im.area
    return r < m2med * 0.85 ? 'bom' : r > m2med * 1.15 ? 'alto' : 'ok'
  }
  const isOpor = (im) => {
    const op = oportunidade(im)
    return op.abaixoMercado || op.temDesconto || m2tagIm(im) === 'bom'
  }

  const visiveis = curados
    .filter((im) => feedback[String(im.codigo)] !== 'dislike')
    .filter((im) => !bairroFiltro || im.bairro === bairroFiltro)
  visiveis.sort((a, b) => {
    const sc = (im) => (isOpor(im) ? 2 : 0) + (feedback[String(im.codigo)] === 'like' ? 1 : 0)
    return sc(b) - sc(a)
  })
  const descartados = curados.filter((im) => feedback[String(im.codigo)] === 'dislike')

  const waMsg = `Olá Vinícius! Vi a seleção de imóveis${bairroFiltro ? ` no ${bairroFiltro}` : ''} que você preparou pra mim${nome ? ' (' + nome + ')' : ''} e quero agendar uma visita.`

  return (
    <main className="pagina cliente-pg">
      <header className="cliente-hero">
        <div className={`container ${cli.foto ? 'cliente-hero-grid' : ''}`}>
          <div className="cliente-hero-texto">
            <span className="eyebrow">Seleção exclusiva{bairroFiltro ? ` · ${bairroFiltro}` : ''}{nome ? ` · ${nome}` : ''}</span>
            <h1 className="section-title">{nome ? `${nome}, ` : ''}essas opções{bairroFiltro ? ` no ${bairroFiltro}` : ''} são <em>pensando em você</em></h1>
            <p className="cliente-intro">Selecionei a dedo o que combina com o que você procura. Curte o que gostou e descarta o que não é bem isso — me ajuda a entender ainda melhor o seu gosto. {salvo && <span className="cliente-salvo">✓ salvo</span>}</p>
            {cli.nota && (
              <div className="cliente-nota">
                <span className="cliente-nota-label">💬 O que você procura</span>
                <p>{cli.nota}</p>
              </div>
            )}
            <div className="cliente-assina">
              <img src="/vinicius-graton.jpg" alt="Vinícius Graton" loading="lazy" />
              <div>
                <b>Selecionado pessoalmente por Vinícius Graton</b>
                <span>Consultor de imóveis em Uberlândia · Rotina Imobiliária.</span>
              </div>
            </div>
          </div>
          {cli.foto && (
            <div className="cliente-hero-foto">
              <img src={cli.foto} alt={nome || 'Cliente'} loading="lazy" />
              {nome && <span className="cliente-hero-foto-nome">{nome}</span>}
            </div>
          )}
        </div>
      </header>

      <section className="section--light">
        <div className="container">
          {visiveis.length === 0 ? (
            <div className="cat-vazio">
              {bairroFiltro ? (
                <>
                  <p>Nenhum imóvel desta seleção está no {bairroFiltro}.</p>
                  <a className="btn btn-gold" href={`/cliente/${token}`}>← Ver seleção completa</a>
                </>
              ) : (
                <>
                  <p>Ainda não há imóveis nessa seleção. Me chama que eu garimpei algumas opções especiais pra você.</p>
                  <a className="btn btn-gold" href={linkWhatsApp(waMsg)} target="_blank" rel="noopener"><IconWhats /> Falar com o Vinícius</a>
                </>
              )}
            </div>
          ) : (
            <>
              {bairroFiltro && <a href={`/cliente/${token}`} className="cli-bairro-volta">← Toda a seleção</a>}
              <h2 className="det-rel-titulo">{visiveis.length} {visiveis.length === 1 ? 'opção' : 'opções'}{bairroFiltro ? ` no ${bairroFiltro}` : ' pra você'}</h2>
              <div className="cliente-grid">
                {visiveis.map((im) => {
                  const fb = feedback[String(im.codigo)]
                  const m = avaliarMatch(im, prefs)
                  const opor = isOpor(im)
                  const tag = m2tagIm(im)
                  const m2 = im.preco > 0 && im.area > 0 ? Math.round(im.preco / im.area) : 0
                  const m2pct = m2 && m2rMin < m2rMax ? Math.round(((im.preco / im.area - m2rMin) / (m2rMax - m2rMin)) * 100) : 50
                  return (
                    <div className={`cliente-item ${fb === 'like' ? 'curtido' : ''} ${opor ? 'oport' : ''}`} key={im.codigo}>
                      {opor && (
                        <div className="cliente-badge-oport">
                          <svg className="cliente-badge-oport-ico" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                          <div>
                            <span className="cliente-badge-oport-tag">Oportunidade</span>
                            <span className="cliente-badge-oport-desc">Preço/m² abaixo do mercado nesta região</span>
                          </div>
                        </div>
                      )}
                      {!opor && fb === 'like' && <span className="cliente-badge-like"><IconHeart filled width={13} height={13} /> Você curtiu</span>}
                      {opor && fb === 'like' && <span className="cliente-badge-like" style={{ marginTop: 6 }}><IconHeart filled width={13} height={13} /> Você curtiu</span>}
                      <CardImovel im={im} />
                      {(() => {
                        const est = estudoM2(im, baseImoveis)
                        if (!est.ok) return null
                        const dp = Math.abs(est.diffPct)
                        const txt = est.veredito === 'abaixo' ? `${dp}% abaixo do mercado` : est.veredito === 'acima' ? `+${dp}% acima da média` : 'Dentro do mercado'
                        return (
                          <button type="button" className={`cli-laudo-btn cli-laudo-btn--${est.veredito}`} onClick={(ev) => { ev.stopPropagation(); setLaudoModal({ im, est }) }}>
                            <span className={`cli-laudo-dot cli-laudo-dot--${est.veredito}`} />
                            <div className="cli-laudo-body">
                              <span className={`cli-laudo-txt cli-laudo-txt--${est.veredito}`}>{txt}</span>
                              <span className="cli-laudo-sub">
                                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                                {' '}Ver estudo do valor do m²
                              </span>
                            </div>
                            <svg className="cli-laudo-seta" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
                          </button>
                        )
                      })()}
                      <div className="cliente-fb">
                        <button type="button" className={`cliente-fb-btn ${fb === 'like' ? 'on-like' : ''}`} onClick={() => setFb(String(im.codigo), 'like')}><IconHeart filled={fb === 'like'} width={16} height={16} /> Gostei</button>
                        <button type="button" className={`cliente-fb-btn ${fb === 'dislike' ? 'on-dislike' : ''}`} onClick={() => setFb(String(im.codigo), 'dislike')}><IconClose width={15} height={15} /> Não é bem isso</button>
                      </div>
                      {(() => { const van = vantagensImovel(im); return van.length > 0 && (
                        <div className="cliente-motivos cliente-vantagens">
                          <b>Vantagens deste imóvel</b>
                          <ul>{van.map((va, i) => <li key={i}><span>★</span> {va}</li>)}</ul>
                        </div>
                      ) })()}
                      {m && m.motivos && m.motivos.length > 0 && (
                        <div className="cliente-motivos">
                          <b>Por que combina com você</b>
                          <ul>{m.motivos.slice(0, 4).map((mo, i) => <li key={i}><span>✓</span> {mo}</li>)}</ul>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {descartados.length > 0 && (
            <details className="cliente-descartados">
              <summary>Você descartou {descartados.length} {descartados.length === 1 ? 'imóvel' : 'imóveis'} — ver / trazer de volta</summary>
              <div className="cliente-desc-lista">
                {descartados.map((im) => (
                  <div className="cliente-desc-item" key={im.codigo}>
                    <span>{im.tipo} · {im.bairro} · {formatPreco(im.preco)}</span>
                    <button type="button" className="admin-btn" onClick={() => setFb(String(im.codigo), 'dislike')}>Trazer de volta</button>
                  </div>
                ))}
              </div>
            </details>
          )}

          <div className="cliente-recado">
            <img src="/vinicius-graton.jpg" alt="Vinícius Graton" loading="lazy" />
            <div>
              <p>{nome ? `${nome}, cada` : 'Cada'} imóvel desta lista passou pela minha análise de preço, localização e oportunidade — só indico o que, de fato, faz sentido para o seu perfil. Se algum chamou sua atenção, me chame e organizamos a visita. É lá que você vai sentir qual é o certo.</p>
              <span className="cliente-recado-assina">Um abraço,<br /><b>Vinícius Graton</b></span>
            </div>
          </div>

          <div className="post-cta" style={{ marginTop: 28 }}>
            <div>
              <b>Gostou de alguma? Bora ver de perto.</b>
              <span>Me diz quais te chamaram atenção que eu organizo as visitas num dia só, no horário melhor pra você.</span>
            </div>
            <a className="btn btn-gold" href={linkWhatsApp(waMsg)} target="_blank" rel="noopener"><IconWhats /> Agendar visita com o Vinícius</a>
          </div>
        </div>
      </section>
      {laudoModal && (() => {
        const { im: mIm, est: mEst } = laudoModal
        const comprado = laudoComprado.has(String(mIm.codigo))
        const barMin = Math.min(mEst.m2Subj, mEst.campoMin) * 0.88
        const barMax = Math.max(mEst.m2Subj, mEst.campoMax) * 1.12
        const toBar = (v) => Math.max(2, Math.min(97, Math.round(((v - barMin) / (barMax - barMin)) * 100)))
        const posImov = toBar(mEst.m2Subj)
        const posMerc = toBar(mEst.referencia)
        const posMin = toBar(mEst.campoMin)
        const posMax = toBar(mEst.campoMax)
        const dp = Math.abs(mEst.diffPct)
        const verdTxt = mEst.veredito === 'abaixo' ? `Abaixo do mercado · ${dp}% mais barato` : mEst.veredito === 'acima' ? `Acima do mercado · +${dp}%` : 'Dentro do mercado'

        const iniciarPagamento = async () => {
          setLaudoPagando(true)
          try {
            const origemUrl = `${window.location.origin}/cliente/${token}?codigo=${mIm.codigo}`
            const r = await fetch('/api/laudo-pagar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ codigo: String(mIm.codigo), origemUrl }) })
            const j = await r.json()
            if (j.naoConfigurado) { window.open(linkWhatsApp(`Quero o laudo técnico do m² do imóvel cód. ${mIm.codigo} (R$ 250)`), '_blank'); setLaudoPagando(false); return }
            if (j.ok && j.url) { window.location.href = j.url; return }
          } catch {}
          setLaudoPagando(false)
        }

        const salvarWaEPagar = () => {
          if (laudoWa.replace(/\D/g, '').length < 8) return
          salvarConta({ whatsapp: laudoWa })
          setConta(getConta())
          iniciarPagamento()
        }

        const baixarNovamente = async () => {
          const { gerarPdfLaudoM2 } = await import('../pdfLaudoM2')
          gerarPdfLaudoM2(mIm, mEst)
        }

        return (
          <div className="cli-modal-overlay" onClick={() => setLaudoModal(null)}>
            <div className="cli-modal" onClick={e => e.stopPropagation()}>
              <div className="cli-modal-header">
                <span className="cli-modal-titulo">Estudo do valor do m² · Método NBR 14653</span>
                <button type="button" className="cli-modal-fechar" onClick={() => setLaudoModal(null)} aria-label="Fechar">✕</button>
              </div>
              <div className="cli-modal-body">
                <h2 className="cli-modal-nome">{mIm.tipo} no {mIm.bairro}</h2>

                {comprado ? (
                  <div className="cli-modal-success">
                    <div className="cli-modal-success-ico">✅</div>
                    <p>Pagamento confirmado! Seu laudo foi baixado automaticamente. Se não apareceu, clique abaixo para baixar de novo.</p>
                    <button type="button" className="cli-modal-baixar" onClick={baixarNovamente}>⬇ Baixar laudo em PDF</button>
                  </div>
                ) : (
                  <>
                    <div className="cli-modal-preview-badge">
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                      <span>Preview gratuito · dados reais do bairro</span>
                    </div>

                    <p className="cli-modal-merc-label">Valor de mercado (m²)</p>
                    <div className="cli-modal-merc-row">
                      <span className="cli-modal-merc-val">{formatPreco(mEst.referencia)}/m²</span>
                      <span className={`cli-modal-verd cli-modal-verd--${mEst.veredito}`}>{verdTxt}</span>
                    </div>

                    <div className="cli-modal-cols">
                      <div className="cli-modal-col"><span className="cli-modal-col-label">Este anúncio</span><b className="cli-modal-col-val">{formatPreco(Math.round(mEst.precoM2))}/m²</b></div>
                      <div className="cli-modal-col"><span className="cli-modal-col-label">Comparável (s/ vaga)</span><b className="cli-modal-col-val">{formatPreco(Math.round(mEst.m2Subj))}/m²</b></div>
                      <div className="cli-modal-col"><span className="cli-modal-col-label">Estimativa de venda</span><b className="cli-modal-col-val">{formatPreco(mEst.valorVenda)}/m²</b></div>
                    </div>

                    <div className="cli-modal-barra-wrap">
                      <div className="cli-modal-barra">
                        <div className="cli-modal-barra-campo" style={{ left: `${posMin}%`, width: `${Math.max(2, posMax - posMin)}%` }} />
                        <div className="cli-modal-barra-merc" style={{ left: `${posMerc}%` }} />
                        <div className={`cli-modal-barra-imov cli-modal-barra-imov--${mEst.veredito}`} style={{ left: `${posImov}%` }} />
                      </div>
                      <div className="cli-modal-legenda">
                        <span><i className="cli-mdot cli-mdot--verde" /> Este imóvel</span>
                        <span><i className="cli-mdot cli-mdot--ouro" /> Mercado ({formatPreco(mEst.referencia)}/m²)</span>
                        <span><i className="cli-mdot cli-mdot--cinza" /> Campo de arbítrio</span>
                      </div>
                    </div>

                    {mEst.n > 0 && <p className="cli-modal-nota"><b>Campo de arbítrio:</b> {formatPreco(mEst.campoMin)}/m² a {formatPreco(mEst.campoMax)}/m². Baseado em <b>{mEst.n} imóveis do mesmo tipo no {mIm.bairro}</b>, homogeneizados{mEst.nDesc > 0 ? ` (${mEst.nDesc} descartado(s) no saneamento)` : ''}.</p>}

                    <div className="cli-modal-pay">
                      <p className="cli-modal-pay-label">Laudo técnico em PDF · metodologia bancária NBR 14653</p>
                      <div className="cli-modal-pay-preco">
                        <span className="cli-modal-pay-antes">R$ 399</span>
                        <span className="cli-modal-pay-atual">R$ 250</span>
                      </div>
                      <ul className="cli-modal-pay-items">
                        {mEst.n > 0 && <li>Todos os {mEst.n} imóveis do mesmo tipo no {mIm.bairro}, com preço, área e homogeneização detalhada</li>}
                        <li>Metodologia NBR 14653 — a mesma que bancos usam para aprovar financiamento</li>
                        <li>PDF em minutos · argumento técnico na hora de negociar o preço</li>
                      </ul>

                      {!conta ? (
                        <div className="cli-modal-gate">
                          <p>Para comprar o laudo, você precisa criar uma conta gratuita ou entrar.</p>
                          <Link to="/conta" className="cli-modal-gate-btn" onClick={() => setLaudoModal(null)}>Entrar / criar conta gratuita</Link>
                        </div>
                      ) : !conta.whatsapp && !laudoWa ? (
                        <div className="cli-modal-wa-wrap">
                          <p className="cli-modal-wa-label">Informe seu WhatsApp para receber o laudo:</p>
                          <input type="tel" className="cli-modal-wa-input" placeholder="(34) 99999-9999" value={laudoWa} onChange={e => setLaudoWa(e.target.value)} />
                          <button type="button" className="cli-modal-pay-btn" disabled={laudoWa.replace(/\D/g,'').length < 8 || laudoPagando} onClick={salvarWaEPagar}>
                            <span>📄 Quero o laudo e entrar na negociação com dados</span>
                            <span className="cli-modal-pay-btn-sub">R$ 250 · entrega imediata · minha decisão precisa de dados reais</span>
                          </button>
                        </div>
                      ) : (
                        <button type="button" className="cli-modal-pay-btn" disabled={laudoPagando} onClick={iniciarPagamento}>
                          <span>{laudoPagando ? 'Aguarde…' : '📄 Quero o laudo e entrar na negociação com dados'}</span>
                          <span className="cli-modal-pay-btn-sub">R$ 250 · entrega imediata · minha decisão precisa de dados reais</span>
                        </button>
                      )}

                      <p className="cli-modal-pay-promo">⏳ Preço promocional · válido por tempo limitado</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </main>
  )
}
