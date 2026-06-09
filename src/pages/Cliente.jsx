import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import CardImovel from '../components/CardImovel'
import { getImovel, filtrarParaCliente, avaliarMatch, formatPreco, linkWhatsApp, TIPOS_IMOVEL, BAIRROS_IMOVEL } from '../data'
import { useSEO } from '../useSEO'
import { IconWhats, IconHeart, IconClose } from '../components/icons'

const primeiroNome = (n) => (n || '').trim().split(/\s+/)[0] || ''
const FAIXAS = [
  { v: '', label: 'Qualquer valor' },
  { v: '0-300000', label: 'Até R$ 300 mil' },
  { v: '300000-500000', label: 'R$ 300–500 mil' },
  { v: '500000-800000', label: 'R$ 500–800 mil' },
  { v: '800000-1200000', label: 'R$ 800 mil – 1,2 mi' },
  { v: '1200000-0', label: 'Acima de R$ 1,2 mi' },
]
const faixaDe = (min, max) => {
  for (const f of FAIXAS) { if (!f.v) continue; const [a, b] = f.v.split('-').map(Number); if ((min || 0) === a && (max || 0) === b) return f.v }
  return ''
}

export default function Cliente() {
  const { token } = useParams()
  const [estado, setEstado] = useState('carregando')
  const [cli, setCli] = useState(null)
  const [prefs, setPrefs] = useState({})
  const [feedback, setFeedback] = useState({})
  const [mexeu, setMexeu] = useState(false)
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
          setPrefs({ tipos: j.cliente.tipos || [], bairros: j.cliente.bairros || [], precoMin: j.cliente.precoMin || 0, precoMax: j.cliente.precoMax || 0, quartosMin: j.cliente.quartosMin || 0, suitesMin: j.cliente.suitesMin || 0, vagasMin: j.cliente.vagasMin || 0, areaMin: j.cliente.areaMin || 0 })
          setFeedback(j.cliente.feedback || {})
          setEstado('ok')
        } else setEstado('erro')
      })
      .catch(() => vivo && setEstado('erro'))
    return () => { vivo = false }
  }, [token])

  // salva (com pequeno atraso) o ESTADO COMPLETO das escolhas do cliente no
  // perfil dele — sempre o mapa inteiro, nunca um delta, pra nada se perder.
  const agendarSalvar = (novosPrefs, novoFb) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      fetch('/api/cliente-refina', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t: token, prefs: novosPrefs, feedback: novoFb }) })
        .then(() => { setSalvo(true); setTimeout(() => setSalvo(false), 1500) }).catch(() => {})
    }, 700)
  }
  const mudarPref = (patch) => { const np = { ...prefs, ...patch }; setPrefs(np); setMexeu(true); agendarSalvar(np, feedback) }
  const toggleArr = (k, val) => { const a = new Set(prefs[k] || []); a.has(val) ? a.delete(val) : a.add(val); mudarPref({ [k]: [...a] }) }
  const setFb = (cod, val) => {
    const novo = { ...feedback }
    if (novo[cod] === val) delete novo[cod]; else novo[cod] = val
    setFeedback(novo); setMexeu(true)
    agendarSalvar(prefs, novo)
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
  const curados = (cli.sugeridos || []).map((c) => getImovel(c)).filter(Boolean)
  const usarFiltro = mexeu || curados.length === 0
  const base = usarFiltro ? filtrarParaCliente(prefs).map((x) => x.im) : curados
  const visiveis = base.filter((im) => feedback[String(im.codigo)] !== 'dislike')
  visiveis.sort((a, b) => (feedback[String(b.codigo)] === 'like' ? 1 : 0) - (feedback[String(a.codigo)] === 'like' ? 1 : 0))
  const descartados = base.filter((im) => feedback[String(im.codigo)] === 'dislike')

  const waMsg = `Olá Vinícius! Vi a seleção de imóveis que você preparou pra mim${nome ? ' (' + nome + ')' : ''} e ajustei o que procuro. Quero agendar uma visita.`

  return (
    <main className="pagina cliente-pg">
      <header className="cliente-hero">
        <div className={`container ${cli.foto ? 'cliente-hero-grid' : ''}`}>
          <div className="cliente-hero-texto">
            <span className="eyebrow">Seleção exclusiva{nome ? ` · ${nome}` : ''}</span>
            <h1 className="section-title">{nome ? `${nome}, ` : ''}essas opções são <em>pensando em você</em></h1>
            <p className="cliente-intro">Selecionei a dedo o que combina com o que você procura. E você pode <b>refinar aqui mesmo</b> — curta o que gostou, descarte o que não é bem isso, e ajuste o que importa. Tudo isso me ajuda a achar o imóvel certo pra você. {salvo && <span className="cliente-salvo">✓ salvo</span>}</p>
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
          {/* Painel de refino */}
          <div className="cliente-refino">
            <b className="cliente-refino-tit">Afine o que você procura</b>
            <div className="cliente-refino-grupo">
              <span>Tipo</span>
              <div className="crm-chips">
                {TIPOS_IMOVEL.map((t) => <button key={t} type="button" className={`crm-chip ${(prefs.tipos || []).includes(t) ? 'on' : ''}`} onClick={() => toggleArr('tipos', t)}>{t}</button>)}
              </div>
            </div>
            <div className="cliente-refino-grupo">
              <span>Valor</span>
              <select value={faixaDe(prefs.precoMin, prefs.precoMax)} onChange={(e) => { const [a, b] = (e.target.value || '0-0').split('-').map(Number); mudarPref({ precoMin: a || 0, precoMax: b || 0 }) }}>
                {FAIXAS.map((f) => <option key={f.v} value={f.v}>{f.label}</option>)}
              </select>
            </div>
            <div className="cliente-refino-grupo">
              <span>Quartos</span>
              <div className="crm-chips">
                {[1, 2, 3, 4].map((n) => <button key={n} type="button" className={`crm-chip ${prefs.quartosMin === n ? 'on' : ''}`} onClick={() => mudarPref({ quartosMin: prefs.quartosMin === n ? 0 : n })}>{n}+</button>)}
              </div>
            </div>
            <div className="cliente-refino-grupo">
              <span>Bairros</span>
              <div className="crm-chips crm-chips--bairros">
                {BAIRROS_IMOVEL.map((b) => <button key={b} type="button" className={`crm-chip ${(prefs.bairros || []).includes(b) ? 'on' : ''}`} onClick={() => toggleArr('bairros', b)}>{b}</button>)}
              </div>
            </div>
          </div>

          {visiveis.length === 0 ? (
            <div className="cat-vazio">
              <p>Com esses ajustes não achei uma opção exata agora.. mas tenho acesso a muito mais na base. Me chama que eu garimpo pra você.</p>
              <a className="btn btn-gold" href={linkWhatsApp(waMsg)} target="_blank" rel="noopener"><IconWhats /> Falar com o Vinícius</a>
            </div>
          ) : (
            <>
              <h2 className="det-rel-titulo">{visiveis.length} {visiveis.length === 1 ? 'opção pra você' : 'opções pra você'}</h2>
              <div className="cliente-grid">
                {visiveis.map((im) => {
                  const fb = feedback[String(im.codigo)]
                  const m = avaliarMatch(im, prefs)
                  return (
                    <div className={`cliente-item ${fb === 'like' ? 'curtido' : ''}`} key={im.codigo}>
                      {fb === 'like' && <span className="cliente-badge-like"><IconHeart filled width={13} height={13} /> Você curtiu</span>}
                      <CardImovel im={im} />
                      <div className="cliente-fb">
                        <button type="button" className={`cliente-fb-btn ${fb === 'like' ? 'on-like' : ''}`} onClick={() => setFb(String(im.codigo), 'like')}><IconHeart filled={fb === 'like'} width={16} height={16} /> Gostei</button>
                        <button type="button" className={`cliente-fb-btn ${fb === 'dislike' ? 'on-dislike' : ''}`} onClick={() => setFb(String(im.codigo), 'dislike')}><IconClose width={15} height={15} /> Não é bem isso</button>
                      </div>
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
