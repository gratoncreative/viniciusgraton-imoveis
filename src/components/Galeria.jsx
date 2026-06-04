import { useState, useEffect, useRef, useCallback } from 'react'
import { IconClose, IconArrow } from './icons'

export default function Galeria({ fotos = [], alt = '' }) {
  const [i, setI] = useState(0)
  const [aberto, setAberto] = useState(false)
  const touchX = useRef(null)

  const total = fotos.length
  const ir = useCallback((n) => setI((p) => (n + total) % total), [total])
  const prox = useCallback(() => ir(i + 1), [ir, i])
  const ant = useCallback(() => ir(i - 1), [ir, i])

  // teclado no lightbox
  useEffect(() => {
    if (!aberto) return
    const onKey = (e) => {
      if (e.key === 'Escape') setAberto(false)
      else if (e.key === 'ArrowRight') prox()
      else if (e.key === 'ArrowLeft') ant()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [aberto, prox, ant])

  if (!total) return null

  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX }
  const onTouchEnd = (e) => {
    if (touchX.current == null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    if (dx > 50) ant()
    else if (dx < -50) prox()
    touchX.current = null
  }

  return (
    <div className="gal">
      <div className="gal-main">
        <img src={fotos[i]} alt={alt} onClick={() => setAberto(true)} />
        {total > 1 && (
          <>
            <button className="gal-nav gal-prev" onClick={ant} aria-label="Foto anterior">
              <IconArrow style={{ transform: 'rotate(180deg)' }} />
            </button>
            <button className="gal-nav gal-next" onClick={prox} aria-label="Próxima foto">
              <IconArrow />
            </button>
            <span className="gal-count">{i + 1} / {total}</span>
          </>
        )}
        <button className="gal-zoom" onClick={() => setAberto(true)} aria-label="Ver em tela cheia">
          Ver fotos em tela cheia
        </button>
      </div>

      {total > 1 && (
        <div className="gal-thumbs">
          {fotos.map((src, n) => (
            <button
              key={n}
              className={`gal-thumb ${n === i ? 'on' : ''}`}
              onClick={() => setI(n)}
              aria-label={`Foto ${n + 1}`}
            >
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {aberto && (
        <div className="lb" onClick={() => setAberto(false)}>
          <button className="lb-close" aria-label="Fechar"><IconClose width={28} height={28} /></button>
          {total > 1 && <span className="lb-count">{i + 1} / {total}</span>}
          <div className="lb-stage" onClick={(e) => e.stopPropagation()} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            {total > 1 && (
              <button className="lb-nav lb-prev" onClick={ant} aria-label="Foto anterior">
                <IconArrow style={{ transform: 'rotate(180deg)' }} />
              </button>
            )}
            <img src={fotos[i]} alt={alt} />
            {total > 1 && (
              <button className="lb-nav lb-next" onClick={prox} aria-label="Próxima foto">
                <IconArrow />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
