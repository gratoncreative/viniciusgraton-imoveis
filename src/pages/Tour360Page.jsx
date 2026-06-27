import Reveal from '../components/Reveal'
import { linkWhatsApp } from '../data'
import { IconWhats, IconArrow } from '../components/icons'
import { useSEO } from '../useSEO'

const WA_360 = 'Olá Vinícius! Tenho um imóvel e quero o Tour Virtual 360° (registro R$50, ou grátis na exclusividade de 45 dias). Pode me explicar como funciona?'

const Globo = ({ s = 22 }) => (
  <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 3a14 14 0 0 1 4 9 14 14 0 0 1-4 9 14 14 0 0 1-4-9 14 14 0 0 1 4-9z" /><path d="M3 12h18" /></svg>
)

export default function Tour360Page() {
  useSEO({
    title: 'Tour Virtual 360° para imóveis em Uberlândia | Vinícius Graton',
    description: 'Dê um Tour Virtual 360° ao seu imóvel e venda mais rápido: o comprador visita por dentro de qualquer lugar. Registro por R$50 — ou grátis com exclusividade de 45 dias. Uberlândia.',
    path: '/tour-360',
  })

  const passos = [
    { n: '1', t: 'Eu capturo', d: 'Vou até o imóvel e registro cada ambiente em 360°, com qualidade.' },
    { n: '2', t: 'Publico no anúncio', d: 'O tour entra na ficha do seu imóvel no site, com um selo de destaque exclusivo.' },
    { n: '3', t: 'O cliente explora', d: 'De casa, ele caminha pelo imóvel como se estivesse lá — e chega na visita já decidido.' },
  ]
  const beneficios = [
    { t: 'Mais visitas qualificadas', d: 'Quem agenda já viu o imóvel por dentro — vem com real intenção de comprar.' },
    { t: 'Vende mais rápido', d: 'Imóvel com tour 360° desperta mais interesse e sai do mercado antes.' },
    { t: 'Menos visita à toa', d: 'O comprador filtra sozinho o que não combina — você ganha tempo.' },
    { t: 'Você se destaca', d: 'Pouquíssimos corretores oferecem isso — o seu anúncio chama mais atenção.' },
  ]

  return (
    <main className="t360pg">
      {/* ——— Herói (navy, com respiro pro topo pra não cortar na navbar) ——— */}
      <section className="t360hero">
        <div className="container">
          <Reveal>
            <span className="t360hero-eye"><Globo s={15} /> Diferencial exclusivo</span>
            <h1 className="t360hero-tit">Seu imóvel visitado <em>por dentro</em>, em 360°</h1>
            <p className="t360hero-sub">
              Um Tour Virtual 360° põe o comprador dentro do imóvel de qualquer lugar, a qualquer hora.
              Imóvel com tour recebe mais visitas e vende mais rápido — e pouquíssimos corretores oferecem isso.
            </p>
            <div className="t360hero-oferta">
              <div className="t360hero-of-bloco">
                <span className="t360hero-of-val">R$50</span>
                <span className="t360hero-of-lbl">pelo registro 360° do imóvel</span>
              </div>
              <span className="t360hero-of-ou">ou</span>
              <div className="t360hero-of-bloco">
                <span className="t360hero-of-tag">GRÁTIS</span>
                <span className="t360hero-of-lbl">com <b>exclusividade de 45 dias</b> comigo</span>
              </div>
            </div>
            <a className="btn btn-gold t360hero-cta" href={linkWhatsApp(WA_360)} target="_blank" rel="noopener noreferrer">
              <IconWhats /> Quero o Tour 360° no meu imóvel <IconArrow />
            </a>
            <p className="t360hero-fine">Atendimento em Uberlândia e região · o registro é por minha conta, você só aproveita o resultado.</p>
          </Reveal>
        </div>
      </section>

      {/* ——— Como funciona ——— */}
      <section className="section section--light t360sec">
        <div className="container">
          <div className="t360sec-head">
            <span className="eyebrow">Como funciona</span>
            <h2 className="section-title">Do clique à visita, <em>sem complicação</em></h2>
          </div>
          <div className="t360pitch-passos">
            {passos.map((p) => (
              <div key={p.n} className="t360pitch-passo">
                <span className="t360pitch-passo-n">{p.n}</span>
                <strong>{p.t}</strong>
                <span>{p.d}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ——— Por que vale a pena + CTA final ——— */}
      <section className="section section--light t360sec t360sec--alt">
        <div className="container">
          <div className="t360sec-head">
            <span className="eyebrow">Por que vale a pena</span>
            <h2 className="section-title">O que o 360° faz <em>pelo seu imóvel</em></h2>
          </div>
          <div className="t360benef">
            {beneficios.map((b) => (
              <div key={b.t} className="t360benef-item">
                <span className="t360benef-ck" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></span>
                <div><strong>{b.t}</strong><span>{b.d}</span></div>
              </div>
            ))}
          </div>
          <div className="t360cta-final">
            <h3>Tem um imóvel pra vender? Vamos colocá-lo em 360°.</h3>
            <a className="btn btn-gold" href={linkWhatsApp(WA_360)} target="_blank" rel="noopener noreferrer">
              <IconWhats /> Falar com o Vinícius agora <IconArrow />
            </a>
            <span className="t360cta-final-of">R$50 pelo registro · ou <b>grátis</b> com exclusividade de 45 dias</span>
          </div>
        </div>
      </section>
    </main>
  )
}
