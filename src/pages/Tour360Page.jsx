import Reveal from '../components/Reveal'
import { linkWhatsApp } from '../data'
import { IconWhats, IconArrow } from '../components/icons'
import { useSEO } from '../useSEO'
import '../styles/tour360.css'

const WA_360 = 'Olá Vinícius! Tenho um imóvel e quero o Tour Virtual 360° (R$50 por cômodo, ou grátis na exclusividade de 90 dias). Pode me explicar como funciona?'

const Globo = ({ s = 22 }) => (
  <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 3a14 14 0 0 1 4 9 14 14 0 0 1-4 9 14 14 0 0 1-4-9 14 14 0 0 1 4-9z" /><path d="M3 12h18" /></svg>
)
const Ico = ({ d }) => (<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>)

export default function Tour360Page() {
  useSEO({
    title: 'Tour Virtual 360° para imóveis em Uberlândia | Vinícius Graton',
    description: 'Dê um Tour Virtual 360° ao seu imóvel e venda mais rápido: o comprador visita por dentro de qualquer lugar. R$50 por cômodo fotografado, ou grátis com exclusividade de 90 dias. Uberlândia.',
    path: '/tour-360',
  })

  const passos = [
    { n: '1', t: 'Eu capturo', d: 'Vou até o imóvel e registro cada ambiente em 360°, com qualidade profissional.' },
    { n: '2', t: 'Publico no anúncio', d: 'O tour entra na ficha do seu imóvel no site, com um selo de destaque exclusivo.' },
    { n: '3', t: 'O cliente explora', d: 'De casa, ele caminha pelo imóvel como se estivesse lá, e chega na visita já decidido.' },
  ]
  const beneficios = [
    { ic: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', t: 'Mais visitas qualificadas', d: 'Quem agenda já viu o imóvel por dentro, vem com real intenção de comprar.' },
    { ic: 'M13 2 3 14h9l-1 8 10-12h-9z', t: 'Vende mais rápido', d: 'Imóvel com tour 360° desperta mais interesse e sai do mercado antes.' },
    { ic: 'M3 4h18l-7 8v7l-4 2v-9z', t: 'Menos visita à toa', d: 'O comprador filtra sozinho o que não combina, e você ganha tempo.' },
    { ic: 'M12 2l3 7 7 .5-5.5 4.5L18 21l-6-3.8L6 21l1.5-7L2 9.5 9 9z', t: 'Você se destaca', d: 'Pouquíssimos corretores oferecem isso, então o seu anúncio chama mais atenção.' },
  ]
  const chips = ['Sala', 'Cozinha', 'Suíte', 'Varanda']

  return (
    <main className="t360pg">
      {/* Herói 2 colunas: texto + visor 360 estilizado */}
      <section className="t360hero">
        <div className="container t360hero-grid">
          <Reveal>
            <div className="t360hero-txt">
              <span className="t360hero-eye"><Globo s={15} /> Diferencial exclusivo</span>
              <h1 className="t360hero-tit">Seu imóvel visitado <em>por dentro</em>, em 360°</h1>
              <p className="t360hero-sub">Um Tour Virtual 360° põe o comprador dentro do imóvel de qualquer lugar, a qualquer hora. Imóvel com tour recebe mais visitas e vende mais rápido, e pouquíssimos corretores oferecem isso.</p>
              <div className="t360hero-oferta">
                <div className="t360hero-of-bloco">
                  <span className="t360hero-of-val">R$50</span>
                  <span className="t360hero-of-lbl">por cômodo fotografado</span>
                </div>
                <span className="t360hero-of-ou">ou</span>
                <div className="t360hero-of-bloco">
                  <span className="t360hero-of-tag">GRÁTIS</span>
                  <span className="t360hero-of-lbl">com <b>exclusividade de 90 dias</b> comigo</span>
                </div>
              </div>
              <a className="btn btn-gold t360hero-cta" href={linkWhatsApp(WA_360)} target="_blank" rel="noopener noreferrer"><IconWhats /> Quero o Tour 360° no meu imóvel <IconArrow /></a>
              <p className="t360hero-fine">Atendimento em Uberlândia e região · o registro é por minha conta, você só aproveita o resultado.</p>
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="t360viewer" aria-hidden="true">
              <span className="t360viewer-ring" />
              <span className="t360viewer-globe"><Globo s={96} /></span>
              <span className="t360viewer-360">360°</span>
              {chips.map((c, i) => <span key={c} className={`t360viewer-chip c${i}`}>{c}</span>)}
              <span className="t360viewer-hint"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9M3 12l3-3M3 12l3 3" /></svg> Arraste para girar</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Como funciona */}
      <section className="t360sec">
        <div className="container">
          <div className="t360sec-head">
            <span className="eyebrow">Como funciona</span>
            <h2 className="section-title">Do clique à visita, <em>sem complicação</em></h2>
          </div>
          <div className="t360steps">
            {passos.map((p) => (
              <Reveal key={p.n} delay={(+p.n - 1) * 0.08}>
                <div className="t360step">
                  <span className="t360step-n">{p.n}</span>
                  <strong>{p.t}</strong>
                  <span className="t360step-d">{p.d}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Por que vale a pena */}
      <section className="t360sec t360sec--alt">
        <div className="container">
          <div className="t360sec-head">
            <span className="eyebrow">Por que vale a pena</span>
            <h2 className="section-title">O que o 360° faz <em>pelo seu imóvel</em></h2>
          </div>
          <div className="t360benef">
            {beneficios.map((b, i) => (
              <Reveal key={b.t} delay={(i % 2) * 0.08}>
                <div className="t360benef-item">
                  <span className="t360benef-ck"><Ico d={b.ic} /></span>
                  <div><strong>{b.t}</strong><span>{b.d}</span></div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Faixa CTA final (marinho) */}
      <section className="t360ctaband">
        <div className="container">
          <Reveal>
            <div className="t360ctaband-in">
              <div>
                <h3>Tem um imóvel pra vender? Vamos colocá-lo em 360°.</h3>
                <span className="t360ctaband-of">R$50 por cômodo · ou <b>grátis</b> com exclusividade de 90 dias</span>
              </div>
              <a className="btn btn-gold" href={linkWhatsApp(WA_360)} target="_blank" rel="noopener noreferrer"><IconWhats /> Falar com o Vinícius agora <IconArrow /></a>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  )
}
