import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { linkWhatsApp } from '../data'
import { IconClose, IconWhats } from './icons'

const fmtM2 = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR') + '/m²'

// Estudo do valor do m² — comparativo de mercado homogeneizado (NBR 14653).
export default function EstudoM2({ im, est, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const k = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', k)
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', k) }
  }, [onClose])
  if (!est || !est.ok) return null

  const lo = Math.min(est.m2Subj, est.min, est.campoMin) * 0.96
  const hi = Math.max(est.m2Subj, est.max, est.campoMax) * 1.04
  const pos = (v) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100))
  const cor = est.veredito === 'abaixo' ? 'ok' : est.veredito === 'acima' ? 'alto' : 'neutro'
  const verdito = est.veredito === 'abaixo' ? `Abaixo do mercado · ${Math.abs(est.diffPct)}% mais barato`
    : est.veredito === 'acima' ? `Acima da média · +${est.diffPct}%` : 'Dentro do valor de mercado'
  const msg = `Olá Vinícius! Vi o estudo de valor do m² do imóvel cód. ${im.codigo} (${im.tipo} no ${im.bairro}) e quero entender melhor. Pode me ajudar?`

  return createPortal(
    <div className="modal-overlay modal-overlay--top" onClick={onClose}>
      <div className="em2" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Estudo do valor do m²">
        <button className="modal-close" onClick={onClose} aria-label="Fechar"><IconClose width={22} height={22} /></button>
        <span className="eyebrow">Estudo do valor do m² · método NBR 14653</span>
        <h3 className="em2-tit">{im.tipo} no {im.bairro}</h3>

        <div className="em2-topo">
          <div className="em2-num"><span>Valor de mercado (m²)</span><b>{fmtM2(est.referencia)}</b></div>
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
          <b>Campo de arbítrio:</b> {fmtM2(est.campoMin)} a {fmtM2(est.campoMax)}.
          {' '}Baseado em <b>{est.baseLabel}</b>{est.nDesc > 0 ? ` (${est.nDesc} descartado(s) no saneamento)` : ''}.
        </p>

        <div className="em2-fatores">
          <b>Como chegamos nesse valor</b>
          <ul>{(est.fatoresAplicados || []).map((f, i) => <li key={i}>{f}</li>)}</ul>
        </div>

        {(est.limitacoes || []).length > 0 && (
          <div className="em2-fatores em2-fatores--lim">
            <b>O que este estudo não cobre</b>
            <ul>{est.limitacoes.map((f, i) => <li key={i}>{f}</li>)}</ul>
          </div>
        )}

        <div className="em2-fontes">
          <b>Fontes</b>
          <ul>{(est.fontes || []).map((f, i) => <li key={i}>{f}</li>)}</ul>
        </div>

        <p className="em2-disc">
          Estudo comparativo de mercado, calculado individualmente para este imóvel pelo método da norma ABNT NBR 14653, com homogeneização da amostra. É uma estimativa de referência — não substitui um laudo de avaliação com vistoria, feito por profissional credenciado.
        </p>

        <a className="btn btn-gold em2-cta" href={linkWhatsApp(msg)} target="_blank" rel="noopener"><IconWhats width={18} height={18} /> Falar sobre o preço com o Vinícius</a>
      </div>
    </div>,
    document.body
  )
}
