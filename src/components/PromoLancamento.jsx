import { useState } from 'react'
import { linkWhatsApp } from '../data'
import { IconWhats } from './icons'

// Publicidade de lançamento (Louis Studios) no MESMO layout dos imóveis da página
// (card estilo .im-linha): imagem ilustrativa escurecida à esquerda, infos à direita,
// selo "Publicidade", CTA pro WhatsApp. Aparece sempre em primeiro lugar.
const MSG =
  'Olá Vinícius! Vi o lançamento Louis Studios (Studios próximos ao Campus UFU Umuarama) e quero saber mais sobre as unidades, entrada, parcelas e rentabilidade.'

export default function PromoLancamento() {
  const [imgOk, setImgOk] = useState(true)
  const href = linkWhatsApp(MSG)
  const abrir = () => window.open(href, '_blank', 'noopener')

  return (
    <article className="im-linha card-clickable promo-imovel" onClick={abrir} aria-label="Publicidade — lançamento Louis Studios">
      <div className="im-linha-media promo-imovel-media">
        <span className="promo-imovel-marca" aria-hidden="true">Louis<i>living experience</i></span>
        {imgOk && (
          <img
            src="/anuncios/louis-studios.jpg"
            alt="Louis Studios — studios próximos ao Campus UFU Umuarama, Uberlândia/MG"
            loading="lazy"
            decoding="async"
            onError={() => setImgOk(false)}
          />
        )}
        <span className="promo-imovel-tint" aria-hidden="true" />
        <span className="im-pub promo-imovel-pub" title="Publicidade — anúncio de lançamento">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 15l7-7 7 7" /></svg>
          Publicidade
        </span>
        <span className="im-tag">Lançamento</span>
      </div>
      <div className="im-linha-body">
        <div className="im-linha-top">
          <div className="im-linha-tit">
            <span className="im-linha-tipo">Studios · 36 e 37 m² · Gestão Housi</span>
            <h3 className="im-bairro">Louis Studios</h3>
            <p className="im-local">Próximos ao Campus UFU Umuarama · Uberlândia — MG</p>
          </div>
        </div>
        <div className="im-specs im-specs--min">
          <span className="im-spec"><b>1,5%</b> a.m.</span>
          <span className="im-spec"><b>36–37</b> m²</span>
          <span className="im-spec"><b>Housi</b> gestão</span>
        </div>
        <div className="im-linha-rodape">
          <div className="im-linha-precobloco">
            <span className="promo-imovel-preco">Entrada <b>R$ 41.400</b></span>
            <span className="im-linha-cond">Mensais R$ 2.000 + intermediárias</span>
          </div>
          <div className="im-actions">
            <a className="im-cta" href={href} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>
              <IconWhats width={18} height={18} /> Quero saber mais
            </a>
          </div>
        </div>
      </div>
    </article>
  )
}
