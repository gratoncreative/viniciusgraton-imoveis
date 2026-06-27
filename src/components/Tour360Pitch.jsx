import { Link } from 'react-router-dom'
import { linkWhatsApp } from '../data'
import { IconWhats, IconArrow } from './icons'

// Mensagem de WhatsApp do proprietário interessado no Tour 360°.
const WA_360 = 'Olá Vinícius! Tenho um imóvel e quero o Tour Virtual 360° (registro R$50, ou grátis na exclusividade de 45 dias). Pode me explicar como funciona?'

const ICONE_360 = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 3a14 14 0 0 1 4 9 14 14 0 0 1-4 9 14 14 0 0 1-4-9 14 14 0 0 1 4-9z" /><path d="M3 12h18" /></svg>
)

// Pitch reutilizável do diferencial Tour 360° + a oferta (R$50 · grátis com exclusividade 45 dias).
// variante: 'pagina' (landing completa) | 'bloco' (cartão dentro de outra página) | 'faixa' (faixa fina)
export default function Tour360Pitch({ variante = 'bloco' }) {
  if (variante === 'faixa') {
    return (
      <Link to="/tour-360" className="t360pitch-faixa">
        <span className="t360pitch-faixa-ico">{ICONE_360}</span>
        <span className="t360pitch-faixa-txt">
          <strong>Tem imóvel pra vender? Faço seu Tour Virtual 360°.</strong>
          <span>Registro por R$50 — ou <b>grátis</b> com exclusividade de 45 dias. Saiba mais →</span>
        </span>
      </Link>
    )
  }

  const Oferta = () => (
    <div className="t360pitch-oferta">
      <div className="t360pitch-preco">
        <span className="t360pitch-preco-val">R$50</span>
        <span className="t360pitch-preco-lbl">pelo registro 360° do imóvel</span>
      </div>
      <div className="t360pitch-ou">ou</div>
      <div className="t360pitch-gratis">
        <span className="t360pitch-gratis-tag">GRÁTIS</span>
        <span className="t360pitch-gratis-lbl">com <b>exclusividade de 45 dias</b> comigo</span>
      </div>
    </div>
  )

  const CTA = () => (
    <a className="btn btn-gold t360pitch-cta" href={linkWhatsApp(WA_360)} target="_blank" rel="noopener noreferrer">
      <IconWhats /> Quero o Tour 360° no meu imóvel <IconArrow />
    </a>
  )

  if (variante === 'pagina') {
    const passos = [
      { n: '1', t: 'Eu capturo', d: 'Vou até o imóvel e registro cada ambiente em 360°, com qualidade.' },
      { n: '2', t: 'Publico no anúncio', d: 'O tour entra na ficha do seu imóvel no site, com selo de destaque exclusivo.' },
      { n: '3', t: 'O cliente explora', d: 'De casa, ele caminha pelo imóvel como se estivesse lá — e chega na visita mais decidido.' },
    ]
    return (
      <section className="t360pitch t360pitch--pagina">
        <span className="eyebrow" style={{ justifyContent: 'center' }}>Diferencial exclusivo</span>
        <h1 className="section-title">Seu imóvel visitado <em>por dentro</em>, em 360°</h1>
        <p className="section-sub t360pitch-sub">
          Um Tour Virtual 360° põe o comprador dentro do imóvel de qualquer lugar, a qualquer hora.
          Imóvel com tour recebe mais visitas e vende mais rápido — e pouquíssimos corretores oferecem isso.
        </p>
        <div className="t360pitch-passos">
          {passos.map((p) => (
            <div key={p.n} className="t360pitch-passo">
              <span className="t360pitch-passo-n">{p.n}</span>
              <strong>{p.t}</strong>
              <span>{p.d}</span>
            </div>
          ))}
        </div>
        <Oferta />
        <CTA />
        <p className="t360pitch-fine">Atendimento em Uberlândia e região. O registro é por minha conta — você só aproveita o resultado.</p>
      </section>
    )
  }

  // bloco (cartão dentro de outra página)
  return (
    <section className="t360pitch t360pitch--bloco">
      <div className="t360pitch-bloco-in">
        <span className="eyebrow">Diferencial exclusivo</span>
        <h2 className="t360pitch-tit">Dê um <em>Tour Virtual 360°</em> ao seu imóvel</h2>
        <p className="t360pitch-sub">O comprador caminha pelo imóvel de casa — mais visitas e venda mais rápida. Um diferencial que poucos oferecem.</p>
        <Oferta />
        <CTA />
      </div>
    </section>
  )
}
