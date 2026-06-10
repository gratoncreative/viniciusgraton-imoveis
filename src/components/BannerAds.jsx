import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { linkWhatsApp } from '../data'
import parceirosData from '../parceiros.json'

/**
 * Banner rotativo de publicidade. Mostra parceiros reais quando cadastrados;
 * enquanto há vagas, exibe "Sua marca aqui" com CTA pro WhatsApp do Vinícius.
 * orientacao: 'horizontal' (faixa) | 'vertical' (lateral / skyscraper)
 */
export default function BannerAds({ orientacao = 'horizontal', intervalo = 5000, slots, titulo }) {
  const lista = (slots && slots.length ? slots : parceirosData.slots) || []
  const [i, setI] = useState(0)
  const pausado = useRef(false)

  useEffect(() => {
    if (lista.length <= 1) return
    const t = setInterval(() => { if (!pausado.current) setI((x) => (x + 1) % lista.length) }, intervalo)
    return () => clearInterval(t)
  }, [lista.length, intervalo])

  if (!lista.length) return null
  const s = lista[i % lista.length]
  const href = s.link || linkWhatsApp(s.wa || 'Olá Vinícius! Quero anunciar minha marca no seu site.')
  const dir = orientacao === 'vertical' ? { y: 22 } : { x: 28 }

  return (
    <aside
      className={`adbox adbox--${orientacao}`}
      onMouseEnter={() => { pausado.current = true }}
      onMouseLeave={() => { pausado.current = false }}
      aria-label="Publicidade"
    >
      <span className="adbox-label">Publicidade</span>
      <AnimatePresence mode="wait">
        <motion.a
          key={s.id}
          className={`adslot adslot--c${s.cor ?? 0}`}
          href={href}
          target="_blank"
          rel="noopener"
          initial={{ opacity: 0, ...dir }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, ...{ x: dir.x ? -dir.x : 0, y: dir.y ? -dir.y : 0 } }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {s.img ? (
            <img className="adslot-img" src={s.img} alt={s.titulo} loading="lazy" />
          ) : (
            <>
              <div className="adslot-body">
                <span className="adslot-eyebrow">{s.tipo === 'vaga' ? 'Espaço disponível' : 'Parceiro'}</span>
                <b className="adslot-tit">{s.titulo}</b>
                <span className="adslot-sub">{s.subtitulo}</span>
              </div>
              <span className="adslot-cta">{s.cta} <i>→</i></span>
            </>
          )}
          <span className="adslot-shine" aria-hidden="true" />
        </motion.a>
      </AnimatePresence>
      {lista.length > 1 && (
        <div className="adbox-dots">
          {lista.map((_, k) => <button key={k} type="button" className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`Anúncio ${k + 1}`} />)}
        </div>
      )}
    </aside>
  )
}
