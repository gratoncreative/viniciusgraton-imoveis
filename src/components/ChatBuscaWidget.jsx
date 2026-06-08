import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import ChatBusca from './ChatBusca'

const IconSpark = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M3 11l9-7 9 7M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" />
    <circle cx="12" cy="13" r="2.2" />
  </svg>
)
const IconX = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>
)

// Launcher flutuante (tipo WhatsApp) que abre o chat de busca num popup.
export default function ChatBuscaWidget() {
  const [aberto, setAberto] = useState(false)
  const { pathname } = useLocation()
  // não mostra no painel/admin nem na própria página dedicada do chat
  const ocultar = /^\/(admin|painel|conta|encontrar-imovel)/.test(pathname)

  // trava o scroll do fundo no mobile enquanto o popup está aberto
  useEffect(() => {
    if (!aberto) return
    const mob = window.matchMedia('(max-width: 600px)').matches
    if (mob) { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }
  }, [aberto])

  if (ocultar) return null

  return (
    <>
      {aberto && <div className="cb-widget-overlay" onClick={() => setAberto(false)} />}

      {aberto && (
        <div className="cb-widget-panel" role="dialog" aria-label="Encontre seu imóvel">
          <div className="cb-widget-head">
            <span className="cb-widget-head-info">
              <img src="/vinicius-graton.jpg" alt="Vinícius Graton" />
              <span><b>Encontre seu imóvel</b><i>Respondo rapidinho com o Vinícius</i></span>
            </span>
            <button className="cb-widget-close" onClick={() => setAberto(false)} aria-label="Fechar"><IconX width={16} height={16} /></button>
          </div>
          <div className="cb-widget-body"><ChatBusca /></div>
        </div>
      )}

      <button className={`cb-launcher ${aberto ? 'is-open' : ''}`} onClick={() => setAberto((o) => !o)} aria-label={aberto ? 'Fechar' : 'Encontre seu imóvel'} aria-expanded={aberto}>
        {aberto ? <IconX width={22} height={22} /> : <><IconSpark width={22} height={22} /><span>Encontre seu imóvel</span></>}
      </button>
    </>
  )
}
