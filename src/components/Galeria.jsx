import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconClose, IconArrow } from './icons'
import { onImgError } from '../img'

const DUR = 4.5 // segundos por foto no tour

export default function Galeria({ fotos = [], alt = '' }) {
  const [i, setI] = useState(0)
  const [aberto, setAberto] = useState(false)
  const [tour, setTour] = useState(false)
  const touchX = useRef(null)

  const total = fotos.length
  // se a lista de fotos mudar (troca de imóvel) e o índice ficar fora, volta ao começo
  useEffect(() => { if (i >= total && total > 0) setI(0) }, [total, i])
  const ir = useCallback((n) => setI(() => (n + total) % total), [total])
  const prox = useCallback(() => ir(i + 1), [ir, i])
  const ant = useCallback(() => ir(i - 1), [ir, i])

  // autoplay do "tour em vídeo"
  useEffect(() => {
    if (!tour || total < 2) return
    const t = setInterval(() => setI((p) => (p + 1) % total), DUR * 1000)
    return () => clearInterval(t)
  }, [tour, total])

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
  // navegação manual pausa o tour
  const manual = (fn) => () => { setTour(false); fn() }

  return (
    <div className="gal">
      <div className={`gal-main ${tour ? 'gal-playing' : ''}`}>
        <AnimatePresence initial={false}>
          <motion.img
            key={i}
            className="gal-slide"
            src={fotos[i]}
            alt={alt}
            referrerPolicy="no-referrer"
            onError={onImgError}
            onClick={() => setAberto(true)}
            initial={{ opacity: 0, scale: 1.0 }}
            animate={{ opacity: 1, scale: tour ? 1.1 : 1.0 }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: 0.9, ease: 'easeInOut' },
              scale: { duration: tour ? DUR + 1 : 0.5, ease: 'linear' },
            }}
          />
        </AnimatePresence>

        {tour && total > 1 && (
          <motion.span
            className="gal-progress"
            key={'p' + i}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: DUR, ease: 'linear' }}
          />
        )}

        {total > 1 && (
          <>
            <button className="gal-nav gal-prev" onClick={manual(ant)} aria-label="Foto anterior">
              <IconArrow style={{ transform: 'rotate(180deg)' }} />
            </button>
            <button className="gal-nav gal-next" onClick={manual(prox)} aria-label="Próxima foto">
              <IconArrow />
            </button>
            <span className="gal-count">{i + 1} / {total}</span>
            <button className={`gal-tour ${tour ? 'on' : ''}`} onClick={() => setTour((t) => !t)} aria-label={tour ? 'Pausar tour' : 'Iniciar tour do imóvel'}>
              <span className="gal-tour-ico">{tour ? '❚❚' : '▶'}</span> {tour ? 'Pausar tour' : 'Tour do imóvel'}
            </button>
          </>
        )}
        <button className="gal-zoom" onClick={() => setAberto(true)} aria-label="Ver em tela cheia">⛶ Tela cheia</button>
      </div>

      {total > 1 && (
        <div className="gal-thumbs">
          {fotos.map((src, n) => (
            <button
              key={n}
              className={`gal-thumb ${n === i ? 'on' : ''}`}
              onClick={manual(() => setI(n))}
              aria-label={`Foto ${n + 1}`}
            >
              <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={onImgError} />
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
            <AnimatePresence initial={false} mode="popLayout">
              <motion.img
                key={i}
                src={fotos[i]}
                alt={alt}
                onError={onImgError}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              />
            </AnimatePresence>
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
