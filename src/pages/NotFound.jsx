import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CONFIG, linkWhatsApp, WA } from '../data'
import { IconArrow, IconWhats } from '../components/icons'

export default function NotFound() {
  useEffect(() => {
    document.title = `Página não encontrada | ${CONFIG.nome}`
    return () => { document.title = CONFIG.marca }
  }, [])

  return (
    <main className="section--light det-vazio">
      <div className="container" style={{ textAlign: 'center' }}>
        <span className="eyebrow" style={{ justifyContent: 'center' }}>Erro 404</span>
        <h1 className="section-title">Esta página não existe</h1>
        <p className="section-sub" style={{ margin: '14px auto 30px', maxWidth: 480 }}>
          O link pode estar quebrado ou o imóvel saiu do catálogo. Deixa eu te ajudar a encontrar o que você procura.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link className="btn btn-gold" to="/imoveis">Ver imóveis <IconArrow /></Link>
          <Link className="btn btn-ghost" to="/">Voltar ao início</Link>
          <a className="btn btn-ghost" href={linkWhatsApp(WA.contato)} target="_blank" rel="noopener">
            <IconWhats /> Falar comigo
          </a>
        </div>
      </div>
    </main>
  )
}
