import { useState } from 'react'
import { linkWhatsApp } from '../data'
import { IconWhats } from './icons'

// Publicidade de lançamento (Louis Studios). Mostra o pôster quando a imagem
// existe em /anuncios/louis-studios.jpg; se não, exibe um cartão-texto elegante
// (nunca quebra). Clique leva ao WhatsApp do consultor.
const MSG =
  'Olá Vinícius! Vi o lançamento Louis Studios (Studios próximos ao Campus UFU Umuarama) e quero saber mais sobre as unidades, entrada, parcelas e rentabilidade.'

export default function PromoLancamento({ compact = false }) {
  // Mostra o cartão-texto por padrão; troca pelo pôster só quando a imagem
  // /anuncios/louis-studios.jpg carregar de fato (nunca exibe imagem quebrada).
  const [ok, setOk] = useState(false)
  const href = linkWhatsApp(MSG)

  return (
    <section className={`promo-lanc${compact ? ' promo-lanc--compact' : ''}`} aria-label="Publicidade — lançamento">
      <div className="container">
        <span className="eyebrow promo-lanc-eye">Publicidade · Lançamento</span>
        <a className={`promo-lanc-card${ok ? ' promo-lanc-card--img' : ''}`} href={href} target="_blank" rel="noopener">
          <img
            className="promo-lanc-img"
            src="/anuncios/louis-studios.jpg"
            alt="Louis Studios — studios próximos ao Campus UFU Umuarama, Uberlândia/MG. 36 e 37 m², rentabilidade 1,5% a.m., gestão Housi. Entrada R$ 41.400."
            decoding="async"
            aria-hidden={!ok}
            onLoad={(e) => { if (e.currentTarget.naturalWidth > 1) setOk(true) }}
            style={ok ? undefined : { position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
          />
          {!ok && (
            <div className="promo-lanc-txt">
              <span className="promo-lanc-marca">Louis · living experience</span>
              <strong className="promo-lanc-tit">Studios <em>próximos à UFU Umuarama</em></strong>
              <p className="promo-lanc-sub">Uberlândia/MG · 36 e 37 m² · Gestão Housi · Rentabilidade 1,5% a.m.</p>
              <div className="promo-lanc-nums">
                <span><i>Entrada</i> R$ 41.400</span>
                <span><i>Mensais</i> R$ 2.000 <small>+ intermediárias</small></span>
              </div>
            </div>
          )}
          <span className="promo-lanc-cta"><IconWhats width={18} height={18} /> Quero saber mais</span>
        </a>
      </div>
    </section>
  )
}
