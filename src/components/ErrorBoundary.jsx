import { Component, useState, useEffect } from 'react'
import { CONFIG, linkWhatsApp, WA } from '../data'

// Ilustração leve (casa + guindaste) em linha dourada, com leve animação.
function CasaObra() {
  return (
    <span className="erro-ilustra" aria-hidden="true">
      <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <g className="erro-casa">
          <path d="M22 58 L52 34 L82 58" />
          <path d="M28 54 V92 H76 V54" />
          <path d="M44 92 V70 H60 V92" />
          <path d="M66 64 h4 M66 72 h4" />
        </g>
        <g className="erro-guindaste">
          <path d="M92 96 V30 M84 96 H100" />
          <path d="M92 30 H58" />
          <path d="M92 38 L66 30" />
        </g>
        <g className="erro-gancho">
          <path d="M66 30 V44" />
          <rect x="60" y="44" width="12" height="9" rx="1.5" />
        </g>
      </svg>
    </span>
  )
}

const RELOAD_FLAG = 'vg_erro_reload'

// Erros de "chunk velho" após um deploy novo: o import() dinâmico de uma rota aponta
// pra um arquivo com hash antigo que não existe mais. São transitórios — basta recarregar.
function ehErroDeChunk(err) {
  const msg = (err && (err.message || String(err))) || ''
  const nome = err && err.name
  return nome === 'ChunkLoadError' ||
    /dynamically imported module|importing a module script failed|failed to fetch dynamically imported module|error loading dynamically imported|loading chunk|loading css chunk/i.test(msg)
}

// Fallback amigável. autoReload só na 1ª vez (evita loop infinito em erro persistente).
function ErroFallback({ chunk }) {
  const [seg, setSeg] = useState(6)
  useEffect(() => {
    if (!chunk) return // erro real: NÃO recarrega em loop — só mostra a tela com os botões
    if (seg <= 0) { window.location.reload(); return }
    const t = setTimeout(() => setSeg((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [seg, chunk])

  return (
    <main className="section--light det-vazio erro-tela">
      <div className="container" style={{ textAlign: 'center' }}>
        <CasaObra />
        <span className="eyebrow" style={{ justifyContent: 'center' }}>Voltando ao ar</span>
        <h1 className="section-title">Opa! Estamos atualizando o site</h1>
        <p className="section-sub" style={{ margin: '14px auto 18px', maxWidth: 520 }}>
          {chunk
            ? <>Acabaram de chegar <b>novos imóveis</b> e estou colocando tudo no ar pra você. Já vou recarregar pra pegar a versão nova.</>
            : <>Tive um probleminha pra abrir isso. Toque em <b>Atualizar agora</b> — se persistir, me chame que eu resolvo rapidinho.</>}
        </p>
        {chunk && (
          <div className="erro-contador" role="status" aria-live="polite">
            <span className="erro-spin" aria-hidden="true" />
            Atualizando automaticamente em <b>0:{String(Math.max(0, seg)).padStart(2, '0')}</b>
          </div>
        )}
        <div className="erro-acoes">
          <button className="btn btn-gold" onClick={() => window.location.reload()}>Atualizar agora</button>
          <a className="btn btn-ghost" href={linkWhatsApp(WA.contato)} target="_blank" rel="noopener noreferrer">
            Falar com {CONFIG.nome.split(' ')[0]}
          </a>
        </div>
      </div>
    </main>
  )
}

// Evita "tela branca da morte". Para erro de CHUNK (deploy novo) recarrega UMA vez na hora
// (guarda em sessionStorage p/ não repetir). Para erro REAL, mostra a tela sem auto-reload
// em loop. O flag é limpo por App.jsx quando o app fica saudável alguns segundos.
export default class ErrorBoundary extends Component {
  state = { erro: false, chunk: false }

  static getDerivedStateFromError(error) {
    return { erro: true, chunk: ehErroDeChunk(error) }
  }

  componentDidCatch(error, info) {
    if (typeof console !== 'undefined') console.error('ErrorBoundary:', error, info)
    if (ehErroDeChunk(error)) {
      try {
        if (!sessionStorage.getItem(RELOAD_FLAG)) {
          sessionStorage.setItem(RELOAD_FLAG, '1')
          window.location.reload() // chunk antigo: recarrega já (pega o index/chunks novos)
        }
      } catch { try { window.location.reload() } catch {} }
    }
  }

  render() {
    if (!this.state.erro) return this.props.children
    // se já recarregou nesta sessão e ainda deu chunk-error, não fica em loop: mostra estático
    let jaTentou = false
    try { jaTentou = !!sessionStorage.getItem(RELOAD_FLAG) } catch {}
    return <ErroFallback chunk={this.state.chunk && !jaTentou} />
  }
}
