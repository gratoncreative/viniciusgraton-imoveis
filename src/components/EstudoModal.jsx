import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { buildEstudo, EstudoContent, useFontsPremium } from '../pages/EstudoM2Page'

export default function EstudoModal({ im, est, open, onClose }) {
  useFontsPremium()

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open || !im || !est?.ok) return null

  const estudo = buildEstudo(im, est)

  return createPortal(
    <div className="em-overlay" role="dialog" aria-modal="true" aria-label="Estudo do valor do m²">
      <div className="em-backdrop" onClick={onClose} />
      <div className="em-panel ep-pg">
        <EstudoContent estudo={estudo} im={im} onClose={onClose} />
      </div>
    </div>,
    document.body
  )
}
