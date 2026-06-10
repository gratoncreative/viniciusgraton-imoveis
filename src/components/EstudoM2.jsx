import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { linkWhatsApp } from '../data'
import { IconClose, IconWhats } from './icons'

const fmtM2 = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR') + '/m²'

// Estudo do valor do m² — comparativo de mercado individual do imóvel.
export default function EstudoM2({ im, est, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const k = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', k)
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', k) }
  }, [onClose])
  if (!est || !est.ok) return null

  const lo = Math.min(est.precoM2, est.referencia, est.bairro?.min ?? est.referencia) * 0.94
  const hi = Math.max(est.precoM2, est.referencia, est.bairro?.max ?? est.referencia) * 1.06
  const pos = (v) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100))
  const cor = est.veredito === 'abaixo' ? 'ok' : est.veredito === 'acima' ? 'alto' : 'neutro'
  const verdito = est.veredito === 'abaixo' ? `Abaixo do mercado · ${Math.abs(est.diffPct)}% mais barato`
    : est.veredito === 'acima' ? `Acima da média do bairro · +${est.diffPct}%`
      : 'Dentro do valor de mercado'
  const msg = `Olá Vinícius! Vi o estudo de valor do m² do imóvel cód. ${im.codigo} (${im.tipo} no ${im.bairro}) e quero entender melhor. Pode me ajudar?`

  return createPortal(
    <div className="modal-overlay modal-overlay--top" onClick={onClose}>
      <div className="em2" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Estudo do valor do m²">
        <button className="modal-close" onClick={onClose} aria-label="Fechar"><IconClose width={22} height={22} /></button>
        <span className="eyebrow">Estudo do valor do m²</span>
        <h3 className="em2-tit">{im.tipo} no {im.bairro}</h3>

        <div className="em2-topo">
          <div className="em2-num"><span>Preço deste imóvel</span><b>{fmtM2(est.precoM2)}</b></div>
          <div className={`em2-verdito em2-verdito--${cor}`}>{verdito}</div>
        </div>

        <div className="em2-regua" aria-hidden="true">
          {est.bairro && <span className="em2-banda" style={{ left: pos(est.bairro.p25) + '%', width: (pos(est.bairro.p75) - pos(est.bairro.p25)) + '%' }} />}
          <span className="em2-ref" style={{ left: pos(est.referencia) + '%' }} />
          <span className="em2-eu" style={{ left: pos(est.precoM2) + '%' }} />
        </div>
        <div className="em2-legenda">
          <span><i className="em2-dot em2-dot--eu" /> Este imóvel</span>
          <span><i className="em2-dot em2-dot--ref" /> Mercado ({fmtM2(est.referencia)})</span>
          {est.bairro && <span><i className="em2-dot em2-dot--banda" /> Faixa do bairro</span>}
        </div>

        <p className="em2-base">
          Comparado com a <b>{est.baseLabel}</b>.
          {est.bairro ? ` Faixa observada no bairro: ${fmtM2(est.bairro.min)} a ${fmtM2(est.bairro.max)} (${est.bairro.n} imóveis do mesmo tipo).` : ''}
        </p>

        <div className="em2-fatores">
          <b>O que entra nessa conta</b>
          <ul>{(est.fatores || []).map((f, i) => <li key={i}>{f}</li>)}</ul>
        </div>

        <p className="em2-disc">
          Estudo comparativo calculado individualmente para este imóvel, a partir dos preços anunciados (carteira da Rotina) e de índices públicos de bairro{est.refFonte ? ` (${est.refFonte}${est.refRef ? ', ' + est.refRef : ''})` : ''}. É uma estimativa de referência — não substitui uma avaliação oficial feita por avaliador credenciado.
        </p>

        <a className="btn btn-gold em2-cta" href={linkWhatsApp(msg)} target="_blank" rel="noopener"><IconWhats width={18} height={18} /> Falar sobre o preço com o Vinícius</a>
      </div>
    </div>,
    document.body
  )
}
