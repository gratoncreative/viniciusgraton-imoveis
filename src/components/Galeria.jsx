import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconClose, IconArrow } from './icons'
import { onImgError } from '../img'

const DUR = 4.5 // segundos por foto no tour (dentro do lightbox)

// Galeria do imóvel. Duas variantes:
//   'mosaico' (padrão) — capa com 1 foto grande + miniaturas, abre lightbox ao clicar.
//   'hero'             — carrossel full-width no topo da página (estilo portal), setas
//                        transparentes nas laterais; clicar abre o lightbox em tela cheia.
export default function Galeria({ fotos = [], alt = '', variante = 'mosaico' }) {
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

  // Lightbox (tela cheia) — compartilhado pelas duas variantes
  const lightbox = aberto && (
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
  )

  // ——— Variante HERO — carrossel full-width no topo (estilo portal) ———
  if (variante === 'hero') {
    return (
      <div className="gal gal-hero">
        <div className="gal-hero-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.img
              key={i}
              src={fotos[i]}
              alt={alt ? `${alt} — foto ${i + 1}` : `Foto ${i + 1}`}
              loading={i === 0 ? 'eager' : 'lazy'}
              fetchpriority={i === 0 ? 'high' : 'auto'}
              decoding="async"
              referrerPolicy="no-referrer"
              onClick={() => abrir(i)}
              onError={onImgError}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.32 }}
            />
          </AnimatePresence>
          {total > 1 && (
            <>
              <button type="button" className="gal-hero-nav gal-hero-prev" onClick={ant} aria-label="Foto anterior">
                <IconArrow style={{ transform: 'rotate(180deg)' }} />
              </button>
              <button type="button" className="gal-hero-nav gal-hero-next" onClick={prox} aria-label="Próxima foto">
                <IconArrow />
              </button>
            </>
          )}
          <button type="button" className="gal-hero-expand" onClick={() => abrir(i)} aria-label="Ver fotos em tela cheia">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M16 21h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
        </button>
          {total > 1 && <span className="gal-hero-count">{i + 1} / {total}</span>}
        </div>
        {lightbox}
      </div>
    )
  }

  // ——— Variante MOSAICO (padrão) ———
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
                onLoad={(e) => e.currentTarget.parentElement.classList.add('gal-tile--ok')}
                onError={(e) => { e.currentTarget.parentElement.classList.add('gal-tile--ok'); onImgError(e) }}
              />
              {verMais && <span className="gal-mais">+{total - capa.length}<i>Ver mais fotos</i></span>}
            </button>
          )
        })}
        {total > 1 && <span className="gal-count gal-count--capa">⛶ {total} fotos</span>}
        <button type="button" className="gal-vertodas" onClick={() => abrir(0)}>Ver as {total} fotos</button>
      </div>
      {lightbox}
    </div>
  )
}
