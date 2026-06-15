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
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      window.scrollTo(0, scrollY)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    // Rola o painel do estudo com a roda do mouse independente de onde o
    // cursor estiver (sobre o painel ou sobre o fundo escuro ao redor).
    const onWheel = (e) => {
      const panel = panelRef.current
      if (!panel) return
      e.preventDefault()
      panel.scrollBy({ top: e.deltaY })
    }
    document.addEventListener('wheel', onWheel, { passive: false })
    return () => document.removeEventListener('wheel', onWheel)
  }, [open])

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
