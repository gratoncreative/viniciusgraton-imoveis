import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { buildEstudo, EstudoContent, useFontsPremium } from '../pages/EstudoM2Page'

export default function EstudoModal({ im, est, open, onClose }) {
  useFontsPremium()

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
      <div className="em-panel ep-pg" onClick={e => e.stopPropagation()}>
        <EstudoContent estudo={estudo} im={im} onClose={onClose} />
      </div>
    </div>,
    document.body
  )
}
