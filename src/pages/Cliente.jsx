import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import CardImovel from '../components/CardImovel'
import { IMOVEIS, getImovel, avaliarMatch, vantagensImovel, formatPreco, linkWhatsApp, oportunidade, estudoM2 } from '../data'
import { useSEO } from '../useSEO'
import { IconWhats, IconHeart, IconClose } from '../components/icons'

const primeiroNome = (n) => (n || '').trim().split(/\s+/)[0] || ''

export default function Cliente() {
  const { token } = useParams()
  const [estado, setEstado] = useState('carregando')
  const [cli, setCli] = useState(null)
  const [feed, setFeed] = useState([])
  const [feedback, setFeedback] = useState({})
  const [salvo, setSalvo] = useState(false)
  const timer = useRef(0)

  useSEO({ title: 'Sua seleção de imóveis · Vinícius Graton', description: 'Imóveis selecionados a dedo para você em Uberlândia.', path: `/cliente/${token || ''}`, noindex: true })

  useEffect(() => {
    let vivo = true
    fetch('/api/cliente?t=' + encodeURIComponent(token || ''))
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

  const visiveis = curados.filter((im) => feedback[String(im.codigo)] !== 'dislike')
  visiveis.sort((a, b) => {
    const sc = (im) => (isOpor(im) ? 2 : 0) + (feedback[String(im.codigo)] === 'like' ? 1 : 0)
    return sc(b) - sc(a)
  })
  const descartados = curados.filter((im) => feedback[String(im.codigo)] === 'dislike')

  const waMsg = `Olá Vinícius! Vi a seleção de imóveis que você preparou pra mim${nome ? ' (' + nome + ')' : ''} e quero agendar uma visita.`

  return (
    <main className="pagina cliente-pg">
      <header className="cliente-hero">
        <div className={`container ${cli.foto ? 'cliente-hero-grid' : ''}`}>
          <div className="cliente-hero-texto">
            <span className="eyebrow">Seleção exclusiva{nome ? ` · ${nome}` : ''}</span>
            <h1 className="section-title">{nome ? `${nome}, ` : ''}essas opções são <em>pensando em você</em></h1>
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
              <p>Ainda não há imóveis nessa seleção. Me chama que eu garimpei algumas opções especiais pra você.</p>
              <a className="btn btn-gold" href={linkWhatsApp(waMsg)} target="_blank" rel="noopener"><IconWhats /> Falar com o Vinícius</a>
            </div>
          ) : (
            <>
              <h2 className="det-rel-titulo">{visiveis.length} {visiveis.length === 1 ? 'opção pra você' : 'opções pra você'}</h2>
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
                        const e = estudoM2(im, baseImoveis)
                        if (!e.ok) return null
                        const { precoM2, m2Subj, referencia, valorVenda, campoMin, campoMax, n, nDesc, veredito } = e
                        const barMin = Math.min(m2Subj, campoMin) * 0.88
                        const barMax = Math.max(m2Subj, campoMax) * 1.12
                        const toBar = (v) => Math.max(2, Math.min(97, Math.round(((v - barMin) / (barMax - barMin)) * 100)))
                        const posImov = toBar(m2Subj)
                        const posMerc = toBar(referencia)
                        const posMin = toBar(campoMin)
                        const posMax = toBar(campoMax)
                        const verdMap = { abaixo: ['Abaixo do mercado', 'verd--abaixo'], dentro: ['Dentro do mercado', 'verd--dentro'], acima: ['Acima do mercado', 'verd--acima'] }
                        const [verdLabel, verdCls] = verdMap[veredito] || verdMap.dentro
                        return (
                          <div className="cli-estudo">
                            <div className="cli-estudo-topo">
                              <span className="cli-estudo-titulo">Estudo do valor do m²</span>
                              <span className={`cli-estudo-verd ${verdCls}`}>{verdLabel}</span>
                            </div>
                            <div className="cli-estudo-m2ref">
                              <span>Valor de mercado (m²)</span>
                              <strong>{formatPreco(referencia)}/m²</strong>
                            </div>
                            <div className="cli-estudo-cols">
                              <div><span>Este anúncio</span><b>{formatPreco(Math.round(precoM2))}/m²</b></div>
                              <div><span>Comparável (s/ vaga)</span><b>{formatPreco(Math.round(m2Subj))}/m²</b></div>
                              <div><span>Estimativa de venda</span><b>{formatPreco(valorVenda)}/m²</b></div>
                            </div>
                            <div className="cli-estudo-barra-wrap">
                              <div className="cli-estudo-barra">
                                <div className="cli-estudo-campo" style={{ left: `${posMin}%`, width: `${Math.max(2, posMax - posMin)}%` }} />
                                <div className="cli-estudo-merc" style={{ left: `${posMerc}%` }} />
                                <div className="cli-estudo-imov" style={{ left: `${posImov}%` }} />
                              </div>
                              <div className="cli-estudo-legenda">
                                <span><i className="cli-dot cli-dot--verde" /> Este imóvel</span>
                                <span><i className="cli-dot cli-dot--ouro" /> Mercado ({formatPreco(referencia)}/m²)</span>
                                <span><i className="cli-dot cli-dot--cinza" /> Campo de arbítrio</span>
                              </div>
                            </div>
                            {n > 0 && <p className="cli-estudo-nota">Campo de arbítrio: {formatPreco(campoMin)}/m² a {formatPreco(campoMax)}/m². Baseado em {n} imóvel(is) do mesmo tipo no {im.bairro}{nDesc > 0 ? ` (${nDesc} descartado(s) no saneamento)` : ''}.</p>}
                          </div>
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
              <p>{nome ? `${nome}, ` : ''}quanto mais você me conta do que gosta, mais eu acerto na mão. Curtiu alguma? Me chama que eu organizo a visita — é o que eu indicaria pra alguém da minha família.</p>
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
    </main>
  )
}
