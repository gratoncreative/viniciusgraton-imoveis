import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconClose, IconArrow } from './icons'
import { onImgError } from '../img'

const DUR = 4.5 // segundos por foto no tour (dentro do lightbox)

// Galeria estilo portal (Rotina): mosaico-capa (1 foto grande + miniaturas) e,
// ao clicar, abre o lightbox em tela cheia com navegação e tour.
export default function Galeria({ fotos = [], alt = '' }) {
  const [i, setI] = useState(0)
  const [aberto, setAberto] = useState(false)
  const [tour, setTour] = useState(false)
  const touchX = useRef(null)

  const total = fotos.length
  useEffect(() => { if (i >= total && total > 0) setI(0) }, [total, i])
  const ir = useCallback((n) => setI(() => (n + total) % total), [total])
  const prox = useCallback(() => ir(i + 1), [ir, i])
  const ant = useCallback(() => ir(i - 1), [ir, i])

  const abrir = (n) => { setTour(false); setI(n); setAberto(true) }

  // autoplay do tour (só com o lightbox aberto)
  useEffect(() => {
    if (!tour || !aberto || total < 2) return
    const t = setInterval(() => setI((p) => (p + 1) % total), DUR * 1000)
    return () => clearInterval(t)
  }, [tour, aberto, total])

  // teclado + trava de scroll no lightbox
  useEffect(() => {
    if (!aberto) return
    const onKey = (e) => {
      if (e.key === 'Escape') setAberto(false)
      else if (e.key === 'ArrowRight') prox()
      else if (e.key === 'ArrowLeft') ant()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [aberto, prox, ant])

  if (!total) return null

  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX }
  const onTouchEnd = (e) => {
    if (touchX.current == null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    if (dx > 50) ant(); else if (dx < -50) prox()
    touchX.current = null
  }

  const capa = fotos.slice(0, 5) // 1 grande + até 4 miniaturas

  return (
    <div className="gal">
      <div className={`gal-mosaico gal-mosaico--n${Math.min(total, 5)}`}>
        {capa.map((src, n) => {
          const verMais = n === capa.length - 1 && total > capa.length
          return (
            <button
              key={n}
              type="button"
              className={`gal-tile${n === 0 ? ' gal-tile--big' : ''}`}
              onClick={() => abrir(n)}
              aria-label={`Ver foto ${n + 1} de ${total}`}
            >
              <img
                src={src}
                alt={alt ? `${alt} — foto ${n + 1}` : `Foto ${n + 1}`}
                loading={n === 0 ? 'eager' : 'lazy'}
                fetchpriority={n === 0 ? 'high' : 'auto'}
                decoding="async"
                referrerPolicy="no-referrer"
                onError={onImgError}
              />
              {verMais && <span className="gal-mais">+{total - capa.length}<i>Ver mais fotos</i></span>}
            </button>
          )
        })}
        {total > 1 && <span className="gal-count gal-count--capa">⛶ {total} fotos</span>}
        <button type="button" className="gal-vertodas" onClick={() => abrir(0)}>Ver as {total} fotos</button>
      </div>

      {aberto && (
        <div className="lb" onClick={() => setAberto(false)}>
          <div className="lb-bar" onClick={(e) => e.stopPropagation()}>
            <span className="lb-count">{i + 1} / {total}</span>
            {total > 1 && (
              <button className={`lb-tour ${tour ? 'on' : ''}`} onClick={() => setTour((t) => !t)} aria-label={tour ? 'Pausar tour' : 'Iniciar tour'}>
                {tour ? '❚❚' : '▶'}
              </button>
            )}
            <button className="lb-close" onClick={() => setAberto(false)} aria-label="Fechar"><IconClose width={26} height={26} /></button>
          </div>
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
                referrerPolicy="no-referrer"
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
