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

function ErroFallback() {
  const [seg, setSeg] = useState(30)

  // SEMPRE: contagem regressiva de 30s e recarrega a página automaticamente ao zerar.
  useEffect(() => {
    if (seg <= 0) { window.location.reload(); return }
    const t = setTimeout(() => setSeg((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [seg])

  const mmss = `0:${String(Math.max(0, seg)).padStart(2, '0')}`

  return (
    <main className="section--light det-vazio erro-tela">
      <div className="container" style={{ textAlign: 'center' }}>
        <CasaObra />
        <span className="eyebrow" style={{ justifyContent: 'center' }}>Voltando ao ar</span>
        <h1 className="section-title">Opa! Estamos atualizando o site</h1>
        <p className="section-sub" style={{ margin: '14px auto 18px', maxWidth: 520 }}>
          Acabaram de chegar <b>novos imóveis</b> e estou colocando tudo no ar pra você. A página
          atualiza sozinha em alguns segundos — ou toque em atualizar.
        </p>
        <div className="erro-contador" role="status" aria-live="polite">
          <span className="erro-spin" aria-hidden="true" />
          Atualizando automaticamente em <b>{mmss}</b>
        </div>
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

// Evita "tela branca da morte": se qualquer componente lançar erro em runtime,
// mostra um fallback amigável (com contagem que recarrega sozinho) em vez de quebrar tudo.
export default class ErrorBoundary extends Component {
  state = { erro: false }

  static getDerivedStateFromError() {
    return { erro: true }
  }

  componentDidCatch(error, info) {
    if (typeof console !== 'undefined') console.error('ErrorBoundary:', error, info)
  }

  render() {
    if (!this.state.erro) return this.props.children
    return <ErroFallback />
  }
}
