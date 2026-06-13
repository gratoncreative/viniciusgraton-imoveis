import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { linkWhatsApp } from '../data'
import { IconClose, IconWhats } from './icons'

const fmtM2 = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR') + '/m²'

export default function EstudoM2({ im, est, onClose, onLaudo }) {
  const [slide, setSlide] = useState(0)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const k = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setSlide(s => Math.min(s + 1, 2))
      if (e.key === 'ArrowLeft') setSlide(s => Math.max(s - 1, 0))
    }
    document.addEventListener('keydown', k)
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', k) }
  }, [onClose])

  if (!est || !est.ok) return null

  const lo = Math.min(est.m2Subj, est.min, est.campoMin) * 0.96
  const hi = Math.max(est.m2Subj, est.max, est.campoMax) * 1.04
  const pos = (v) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100))
  const cor = est.veredito === 'abaixo' ? 'ok' : est.veredito === 'acima' ? 'alto' : 'neutro'
  const verdito = est.veredito === 'abaixo'
    ? `Abaixo do mercado · ${Math.abs(est.diffPct)}% mais barato`
    : est.veredito === 'acima' ? `Acima da média · +${est.diffPct}%` : 'Dentro do valor de mercado'
  const msg = `Olá Vinícius! Vi o estudo de valor do m² do imóvel cód. ${im.codigo} (${im.tipo} no ${im.bairro}) e quero entender melhor. Pode me ajudar?`

  const SLIDES = [
    /* 0 — Dados + Oferta (tudo junto no primeiro slide) */
    <div key="dados" className="em2-slide">
      <div className="em2-preview-badge">✦ Preview gratuito · dados reais do bairro</div>

      <div className="em2-topo">
        <div className="em2-num">
          <span>Valor de mercado (m²)</span>
          <b>{fmtM2(est.referencia)}</b>
        </div>
        <div className={`em2-verdito em2-verdito--${cor}`}>{verdito}</div>
      </div>

      <div className="em2-cards">
        <div className="em2-card"><span>Este anúncio</span><b>{fmtM2(est.precoM2)}</b></div>
        <div className="em2-card"><span>Comparável (s/ vaga)</span><b>{fmtM2(est.m2Subj)}</b></div>
        <div className="em2-card"><span>Estimativa de venda</span><b>{fmtM2(est.valorVenda)}</b></div>
      </div>

      <div className="em2-regua" aria-hidden="true">
        <span className="em2-banda" style={{ left: pos(est.campoMin) + '%', width: (pos(est.campoMax) - pos(est.campoMin)) + '%' }} />
        <span className="em2-ref" style={{ left: pos(est.referencia) + '%' }} />
        <span className="em2-eu" style={{ left: pos(est.m2Subj) + '%' }} />
      </div>
      <div className="em2-legenda">
        <span><i className="em2-dot em2-dot--eu" /> Este imóvel</span>
        <span><i className="em2-dot em2-dot--ref" /> Mercado ({fmtM2(est.referencia)})</span>
        <span><i className="em2-dot em2-dot--banda" /> Campo de arbítrio</span>
      </div>
      <p className="em2-base">
        <b>Campo de arbítrio:</b> {fmtM2(est.campoMin)} a {fmtM2(est.campoMax)}.{' '}
        Baseado em <b>{est.baseLabel}</b>{est.nDesc > 0 ? ` (${est.nDesc} descartado(s) no saneamento)` : ''}.
      </p>

      {onLaudo && (
        <div className="em2-oferta">
          <div className="em2-oferta-preco">
            <span className="em2-preco-tag">Laudo técnico em PDF · metodologia bancária NBR 14653</span>
            <div className="em2-preco-row">
              <span className="em2-preco-de">R$ 399</span>
              <strong className="em2-preco-por">R$ 250</strong>
            </div>
          </div>
          <ul className="em2-gatilhos">
            <li><span className="em2-check">✓</span> Todos os {est.baseLabel} com preço, área e homogeneização detalhada</li>
            <li><span className="em2-check">✓</span> Metodologia NBR 14653 — a mesma que bancos usam para aprovar financiamento</li>
            <li><span className="em2-check">✓</span> PDF em minutos · argumento técnico na hora de negociar o preço</li>
          </ul>
          <button className="em2-laudo em2-laudo--destaque" onClick={onLaudo}>
            <span>📄 Quero o laudo e entrar na negociação com dados</span>
            <em>R$ 250 · entrega imediata · minha decisão precisa de dados reais</em>
          </button>
          <p className="em2-urgencia">Você está prestes a investir centenas de milhares de reais. Saber se o preço está justo por R$ 250 é a decisão mais inteligente antes de assinar qualquer coisa.</p>
        </div>
      )}
    </div>,

    /* 1 — Metodologia */
    <div key="metod" className="em2-slide">
      <h4 className="em2-slide-tit">Como chegamos nesse valor</h4>
      <ul className="em2-fatores-list">
        {(est.fatoresAplicados || []).map((f, i) => <li key={i}>{f}</li>)}
      </ul>
      {(est.limitacoes || []).length > 0 && (<>
        <h4 className="em2-slide-tit em2-slide-tit--lim">O que este estudo não cobre</h4>
        <ul className="em2-fatores-list em2-fatores-list--lim">
          {est.limitacoes.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      </>)}
    </div>,

    /* 2 — Fontes + CTA */
    <div key="fontes" className="em2-slide">
      <h4 className="em2-slide-tit">Fontes utilizadas</h4>
      <ul className="em2-fatores-list">
        {(est.fontes || []).map((f, i) => <li key={i}>{f}</li>)}
      </ul>
      <p className="em2-disc">
        Estudo comparativo de mercado, calculado pelo método ABNT NBR 14653 com homogeneização da amostra.
        É uma estimativa de referência — não substitui um laudo com vistoria por profissional credenciado.
      </p>
      <a className="btn btn-gold em2-cta" href={linkWhatsApp(msg)} target="_blank" rel="noopener">
        <IconWhats width={18} height={18} /> Falar sobre o preço com o Vinícius
      </a>
    </div>,
  ]

  const prev = () => setSlide(s => Math.max(s - 1, 0))
  const next = () => setSlide(s => Math.min(s + 1, SLIDES.length - 1))

  return createPortal(
    <div className="modal-overlay modal-overlay--top" onClick={onClose}>
      <div className="em2-wrapper" onClick={(e) => e.stopPropagation()}>

        {/* Seta esquerda */}
        <button
          className={`em2-arrow em2-arrow--left${slide === 0 ? ' em2-arrow--off' : ''}`}
          onClick={prev}
          aria-label="Slide anterior"
          tabIndex={slide === 0 ? -1 : 0}
        >
          ‹
        </button>

        <div className="em2" role="dialog" aria-modal="true" aria-label="Estudo do valor do m²">
          <button className="modal-close" onClick={onClose} aria-label="Fechar"><IconClose width={22} height={22} /></button>

          <span className="eyebrow">Estudo do valor do m² · método NBR 14653</span>
          <h3 className="em2-tit">{im.tipo} no {im.bairro}</h3>

          <div className="em2-progress">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                className={`em2-pip ${i === slide ? 'em2-pip--ativo' : ''}`}
                onClick={() => setSlide(i)}
                aria-label={`Ir para slide ${i + 1}`}
              />
            ))}
            <span className="em2-progress-label">{slide + 1} de {SLIDES.length}</span>
          </div>

          <div className="em2-slides">
            {SLIDES[slide]}
          </div>
        </div>

        {/* Seta direita */}
        <button
          className={`em2-arrow em2-arrow--right${slide === SLIDES.length - 1 ? ' em2-arrow--off' : ''}`}
          onClick={next}
          aria-label="Próximo slide"
          tabIndex={slide === SLIDES.length - 1 ? -1 : 0}
        >
          ›
        </button>

      </div>
    </div>,
    document.body
  )
}
