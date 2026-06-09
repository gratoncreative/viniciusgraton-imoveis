import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { linkWhatsApp, WA } from '../data'
import { IconWhats, IconArrow, IconClose } from './icons'

// Pop-up de intenção de saída: quando o visitante leva o cursor pra fora (topo),
// oferece montar a seleção antes de ir. Aparece 1x por sessão, fácil de fechar.
export default function ExitIntent() {
  const [aberto, setAberto] = useState(false)
  const { pathname } = useLocation()
  const bloquear = /^\/(admin|painel|conta|encontrar-imovel|cliente)/.test(pathname)

  useEffect(() => {
    if (bloquear) return
    let mostrou = false
    try { mostrou = sessionStorage.getItem('vg_exit') === '1' } catch {}
    if (mostrou) return
    let pronto = false
    const liberar = setTimeout(() => { pronto = true }, 6000) // só depois de 6s de navegação
    const onLeave = (e) => {
      if (!pronto || e.clientY > 0) return
      setAberto(true)
      try { sessionStorage.setItem('vg_exit', '1') } catch {}
      document.removeEventListener('mouseout', onLeave)
    }
    document.addEventListener('mouseout', onLeave)
    return () => { clearTimeout(liberar); document.removeEventListener('mouseout', onLeave) }
  }, [bloquear])

  if (!aberto) return null
  return (
    <div className="exit-overlay" onClick={() => setAberto(false)}>
      <div className="exit-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Antes de ir">
        <button className="exit-close" onClick={() => setAberto(false)} aria-label="Fechar"><IconClose width={18} height={18} /></button>
        <span className="eyebrow">Espera um segundo…</span>
        <h3>Antes de ir, deixa eu achar o imóvel <em>certo pra você</em></h3>
        <p>Responde 1 minutinho que eu monto uma seleção sob medida e ela fica salva num link só seu — sem custo e sem compromisso.</p>
        <div className="exit-acoes">
          <Link className="btn btn-gold" to="/encontrar-imovel" onClick={() => setAberto(false)}>Montar minha seleção <IconArrow /></Link>
          <a className="btn btn-ghost" href={linkWhatsApp(WA.hero)} target="_blank" rel="noopener" onClick={() => setAberto(false)}><IconWhats /> Falar no WhatsApp</a>
        </div>
      </div>
    </div>
  )
}
