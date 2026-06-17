import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { buildEstudo, EstudoContent, useFontsPremium } from '../pages/EstudoM2Page'

export default function EstudoModal({ im, est, open, onClose }) {
  useFontsPremium()
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const scrollY = window.scrollY
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    document.body.classList.add('estudo-aberto') // p/ imprimir só o estudo (CSS @media print)
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.classList.remove('estudo-aberto')
      window.scrollTo(0, scrollY)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    // Rola o painel do estudo com a roda do mouse independente de onde o
    // cursor estiver (sobre o painel ou sobre o fundo escuro ao redor).
    const onWheel = (e) => {
      // Ctrl+roda (e pinça no trackpad) é gesto de zoom do navegador — não intercepta.
      if (e.ctrlKey) return
      const panel = panelRef.current
      if (!panel) return
      e.preventDefault()
      panel.scrollBy({ top: e.deltaY, left: e.deltaX })
    }
    document.addEventListener('wheel', onWheel, { passive: false })
    return () => document.removeEventListener('wheel', onWheel)
  }, [open])

  // Fecha com a tecla ESC
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !im || !est?.ok) return null

  const estudo = buildEstudo(im, est)

  return createPortal(
    <div
      className="em-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Estudo do valor do m²"
      onClick={onClose}
    >
      <div className="em-panel ep-pg" ref={panelRef} onClick={e => e.stopPropagation()}>
        <EstudoContent estudo={estudo} im={im} onClose={onClose} />
      </div>
    </div>,
    document.body
  )
}
