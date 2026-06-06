import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { linkWhatsApp, WA, formatPreco } from '../data'
import { IconWhats, IconArrow } from './icons'

export default function ParallaxBand({ img, eyebrow, frase, cta, wa, imovel, light }) {
  // variante CLARA: seção creme com texto + banner amplo de imóvel (ilustrativo)
  if (light) {
    return (
      <section className="band-light section--light">
        <div className="container">
          <motion.div
            className="band-light-head"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          >
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h2 className="band-light-frase">{frase}</h2>
            {cta && (
              <a className="btn btn-gold band-cta" href={linkWhatsApp(WA[wa])} target="_blank" rel="noopener">
                <IconWhats /> {cta}
              </a>
            )}
          </motion.div>

          <motion.figure
            className="band-light-media"
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <img src={img} alt="Casa de alto padrão" loading="lazy" />
            <figcaption className="band-light-cap">Imagem ilustrativa</figcaption>
          </motion.figure>
        </div>
      </section>
    )
  }

  // variante ESCURA (cinematográfica, com imóvel real da carteira)
  return (
    <section
      className="band"
      style={{
        backgroundImage: `linear-gradient(100deg, rgba(6,9,14,0.94) 0%, rgba(6,9,14,0.72) 45%, rgba(6,9,14,0.4) 100%), url(${img})`,
      }}
    >
      <motion.div
        className="container band-inner"
        initial={{ opacity: 0, y: 26 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        {eyebrow && <span className="band-eyebrow">{eyebrow}</span>}
        <h2 className="band-frase">{frase}</h2>
        {cta && (
          <a className="btn btn-gold band-cta" href={linkWhatsApp(WA[wa])} target="_blank" rel="noopener">
            <IconWhats /> {cta}
          </a>
        )}
      </motion.div>

      {imovel && (
        <Link className="band-credito" to={`/imovel/${imovel.codigo}`}>
          <span className="band-credito-top">Imóvel da foto</span>
          <span className="band-credito-nome">{imovel.tipo} · {imovel.bairro}</span>
          <span className="band-credito-preco">{formatPreco(imovel.preco)} <IconArrow width={14} height={14} /></span>
        </Link>
      )}
    </section>
  )
}
