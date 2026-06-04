import { motion } from 'framer-motion'
import { linkWhatsApp, WA } from '../data'
import { IconWhats } from './icons'

export default function ParallaxBand({ img, frase, cta, wa }) {
  return (
    <section
      className="band"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(6,9,14,0.78) 0%, rgba(6,9,14,0.62) 50%, rgba(6,9,14,0.85) 100%), url(${img})`,
      }}
    >
      <motion.div
        className="band-inner"
        initial={{ opacity: 0, y: 26 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        <h2 className="band-frase">{frase}</h2>
        {cta && (
          <a className="btn btn-gold" href={linkWhatsApp(WA[wa])} target="_blank" rel="noopener">
            <IconWhats /> {cta}
          </a>
        )}
      </motion.div>
    </section>
  )
}
