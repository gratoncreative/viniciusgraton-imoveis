import { Component } from 'react'
import { CONFIG, linkWhatsApp, WA } from '../data'

// Evita "tela branca da morte": se qualquer componente lançar erro em runtime,
// mostra um fallback amigável com caminho para o WhatsApp em vez de quebrar tudo.
export default class ErrorBoundary extends Component {
  state = { erro: false }

  static getDerivedStateFromError() {
    return { erro: true }
  }

  componentDidCatch(error, info) {
    // log silencioso (sem quebrar a experiência do usuário)
    if (typeof console !== 'undefined') console.error('ErrorBoundary:', error, info)
  }

  render() {
    if (!this.state.erro) return this.props.children
    return (
      <main className="section--light det-vazio">
        <div className="container" style={{ textAlign: 'center' }}>
          <span className="eyebrow" style={{ justifyContent: 'center' }}>Ops</span>
          <h1 className="section-title">Algo não carregou como deveria</h1>
          <p className="section-sub" style={{ margin: '14px auto 30px', maxWidth: 480 }}>
            Tive um problema ao mostrar esta parte do site. Recarregue a página — ou me chame no
            WhatsApp que eu te ajudo agora mesmo.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-gold" onClick={() => window.location.reload()}>Recarregar página</button>
            <a className="btn btn-ghost" href={linkWhatsApp(WA.contato)} target="_blank" rel="noopener">
              Falar com {CONFIG.nome.split(' ')[0]}
            </a>
          </div>
        </div>
      </main>
    )
  }
}
