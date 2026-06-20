import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import { useSEO } from '../useSEO'
import { CONFIG, linkWhatsApp } from '../data'
import { onImgError } from '../img'
import { registrarLead } from '../engajamento'
import { IconWhats, IconArrow, IconPin } from '../components/icons'

const SITE = 'https://viniciusgraton.com.br'
const PATH = '/lancamentos/louis-studios-umuarama'
const OG = '/lancamentos/louis/og.jpg'

const WA_MSG =
  'Olá Vinícius! Vi a página do Louis (studios no Umuarama) e quero entender a oportunidade de investimento — rentabilidade, tabela de preços e disponibilidade. Pode me ajudar?'

// Cenários de locação por temporada — ESTIMATIVAS divulgadas no material da Select/Housi
// (diária média ~R$200–300, conforme ocupação). Não são promessa de rentabilidade.
const CENARIOS = [
  { nome: 'Pessimista', ocup: '65% · ~20 dias/mês', valor: 'R$ 4.000', cor: '#8a8f99' },
  { nome: 'Realista', ocup: '85% · ~25 dias/mês', valor: 'R$ 5.000', cor: '#1C2A44', destaque: true },
  { nome: 'Otimista', ocup: '100% · ~30 dias/mês', valor: 'R$ 6.000', cor: '#C20020' },
]

const ANCORAS = [
  { t: 'Hospital de Clínicas (HCU)', d: '3º maior hospital universitário do Brasil — mais de 3.000 funcionários e fluxo diário de pacientes, acompanhantes e profissionais da saúde.' },
  { t: 'Hospital do Câncer de Uberlândia', d: 'Mais de 8.200 pacientes e cerca de 600 atendimentos por dia, vindos de mais de 75 cidades da região — demanda constante por estadia.' },
  { t: 'Campus Umuarama — UFU', d: 'Cerca de 20 mil alunos e mais de 6.000 funcionários nas áreas de saúde e ciências biológicas. Demanda fixa de moradia estudantil.' },
  { t: 'Polo Jornalístico', d: 'Por ser o bairro mais alto da cidade, concentra as emissoras de TV e rádio — região consolidada e de fácil acesso.' },
]

const PORQUES = [
  { ico: 'M3 21h18M5 21V7l7-4 7 4v14M9 13h.01M9 17h.01M15 13h.01M15 17h.01', t: 'Demanda que não falta', d: 'Estudantes da UFU, profissionais e acompanhantes dos hospitais. Público que precisa morar perto — todos os meses do ano.' },
  { ico: 'M20 7h-9M14 17H5M17 3v8M7 13v8M3 7a2 2 0 1 0 4 0 2 2 0 0 0-4 0M17 7a2 2 0 1 0 4 0 2 2 0 0 0-4 0', t: 'Gestão Housi, sem dor de cabeça', d: 'A Housi cuida da locação por temporada de ponta a ponta — anúncio, reservas, limpeza e repasse. Você recebe sem administrar nada.' },
  { ico: 'M3 3v18h18M7 14l3-3 3 3 5-6', t: 'Locação por temporada autorizada', d: 'Locação de curta estadia (Airbnb) prevista em convenção do condomínio — modelo pensado desde o projeto para render mais que o aluguel tradicional.' },
  { ico: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', t: 'Entrada acessível, no lançamento', d: 'A partir de R$ 38.700 de sinal e parcelamento direto com a construtora, comprando ainda na planta — o melhor preço da curva.' },
]

// Renders oficiais (extraídos do book da Select) — studios + lazer do prédio
const VISUAIS = [
  { img: 'pool.jpg', t: 'Piscina & rooftop', wide: true },
  { img: 'living.jpg', t: 'Living do studio' },
  { img: 'kitchen.jpg', t: 'Cozinha integrada' },
  { img: 'bedroom.jpg', t: 'Dormitório' },
  { img: 'gym.jpg', t: 'Academia' },
  { img: 'gourmet.jpg', t: 'Espaço gourmet', wide: true },
  { img: 'lounge.jpg', t: 'Lounge & coworking', wide: true },
  { img: 'entrance.jpg', t: 'Entrada e fachada', wide: true },
]

function Stat({ k, v }) {
  return (
    <div className="lou-stat">
      <strong>{v}</strong>
      <span>{k}</span>
    </div>
  )
}

export default function LancamentoLouis() {
  useSEO({
    title: 'Louis Studios Umuarama — Investir ao lado da UFU e dos hospitais | Vinícius Graton',
    description:
      'Louis Living Experience: studios de 35 a 37 m² no Umuarama, Uberlândia — ao lado do Campus UFU, do Hospital do Câncer e do HCU. A partir de R$ 387.000, entrada de R$ 38.700, gestão Housi e locação por temporada. Renda estimada de R$ 4.000 a R$ 6.000/mês. Fale com o consultor.',
    path: PATH,
    image: OG,
  })

  const formRef = useRef(null)
  const [nome, setNome] = useState('')
  const [fone, setFone] = useState('')
  const [perfil, setPerfil] = useState('Investir (renda de aluguel)')
  const [enviado, setEnviado] = useState(false)

  // JSON-LD (Apartment/Offer + RealEstateAgent + Breadcrumb) — crawlers entendem
  // que é um imóvel à venda em Uberlândia com preço e localização.
  useEffect(() => {
    const ld = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': ['Product', 'Residence'],
          name: 'Louis Living Experience — Studios no Umuarama',
          description:
            'Studios de 35 a 37 m² no bairro Umuarama, Uberlândia/MG, ao lado do Campus Umuarama da UFU, do Hospital do Câncer e do Hospital de Clínicas (HCU). Locação por temporada com gestão Housi.',
          image: [SITE + '/lancamentos/louis/tower.jpg', SITE + '/lancamentos/louis/og.jpg'],
          brand: { '@type': 'Brand', name: 'Select Construtora' },
          url: SITE + PATH,
          address: {
            '@type': 'PostalAddress',
            streetAddress: 'Rua Dr. Luiz Antônio Waack, 1.163',
            addressLocality: 'Uberlândia',
            addressRegion: 'MG',
            addressCountry: 'BR',
          },
          offers: {
            '@type': 'Offer',
            priceCurrency: 'BRL',
            price: '387000',
            availability: 'https://schema.org/InStock',
            url: SITE + PATH,
            seller: { '@type': 'RealEstateAgent', name: 'Vinícius Graton — Rotina Imobiliária' },
          },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Início', item: SITE + '/' },
            { '@type': 'ListItem', position: 2, name: 'Lançamentos', item: SITE + '/lancamentos' },
            { '@type': 'ListItem', position: 3, name: 'Louis Studios Umuarama', item: SITE + PATH },
          ],
        },
      ],
    }
    document.getElementById('ld-louis')?.remove()
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = 'ld-louis'
    el.textContent = JSON.stringify(ld)
    document.head.appendChild(el)
    return () => { document.getElementById('ld-louis')?.remove() }
  }, [])

  const enviar = (e) => {
    e.preventDefault()
    if (!nome.trim() || !fone.trim()) return
    registrarLead({ cod: 'louis-umuarama', nome: nome.trim(), fone: fone.trim(), bairro: `Louis (${perfil})` })
    setEnviado(true)
    const msg = `Olá Vinícius! Sou ${nome.trim()}. Tenho interesse no Louis (studios no Umuarama) — perfil: ${perfil}. Meu WhatsApp é ${fone.trim()}. Pode me passar a tabela e a disponibilidade?`
    window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener')
  }
  const irForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <main className="lou-pg">
      {/* ---------- HERO ---------- */}
      <section className="lou-hero">
        <div className="lou-hero-bg" aria-hidden="true" />
        <div className="container lou-hero-grid">
          <div className="lou-hero-txt">
            <Reveal>
              <span className="lou-eyebrow">Lançamento · Umuarama · Uberlândia</span>
              <h1 className="lou-h1">
                <span className="lou-marca">LOUIS</span>
                <span className="lou-marca-sub">living experience</span>
                Studios para <em>investir</em>, ao lado da UFU e dos hospitais
              </h1>
              <p className="lou-lead">
                Studios de 35 a 37 m² no bairro mais estratégico de Uberlândia para renda — colado no Campus Umuarama da UFU,
                no Hospital do Câncer e no Hospital de Clínicas. Locação por temporada com <b>gestão Housi</b>:
                você investe, a Housi opera, você recebe.
              </p>
              <div className="lou-stats">
                <Stat k="por studio" v="A partir de R$ 387 mil" />
                <Stat k="de sinal (entrada)" v="R$ 38.700" />
                <Stat k="renda estimada/mês" v="R$ 4 mil a R$ 6 mil" />
              </div>
              <div className="lou-hero-cta">
                <a className="btn btn-gold lou-btn-wa" href={linkWhatsApp(WA_MSG)} target="_blank" rel="noopener noreferrer">
                  <IconWhats /> Quero entender a oportunidade
                </a>
                <button type="button" className="lou-btn-ghost" onClick={irForm}>Receber a tabela de preços <IconArrow /></button>
              </div>
              <p className="lou-disc">Valores e disponibilidade da Select Construtora, sujeitos a alteração. Estimativas de renda não constituem promessa de rentabilidade.</p>
            </Reveal>
          </div>
          <div className="lou-hero-fig">
            <img src="/lancamentos/louis/torre-louis.jpg" alt="Render do edifício Louis Living Experience, no Umuarama, Uberlândia" loading="eager" />
          </div>
        </div>
      </section>

      {/* ---------- POR QUE INVESTIR ---------- */}
      <section className="lou-sec section--light">
        <div className="container">
          <Reveal>
            <span className="eyebrow">Por que o Louis</span>
            <h2 className="lou-h2">Um investimento que se sustenta sozinho</h2>
            <p className="lou-sub">Não é promessa — é localização. O entorno gera demanda de moradia o ano inteiro, e a operação é terceirizada para quem entende de temporada.</p>
          </Reveal>
          <div className="lou-porques">
            {PORQUES.map((p, i) => (
              <Reveal key={p.t} delay={i * 60}>
                <div className="lou-card">
                  <span className="lou-card-ico" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={p.ico} /></svg>
                  </span>
                  <h3>{p.t}</h3>
                  <p>{p.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- STUDIOS & LAZER (renders) ---------- */}
      <section className="lou-sec lou-sec--vis section--light">
        <div className="container">
          <Reveal>
            <span className="eyebrow">Studios & lazer</span>
            <h2 className="lou-h2">Um produto desenhado para render</h2>
            <p className="lou-sub">Studios prontos para morar ou alugar por temporada, com lazer completo no prédio — exatamente a estrutura que o hóspede procura e que mantém a ocupação alta o ano inteiro.</p>
          </Reveal>
          <div className="lou-visuais">
            {VISUAIS.map((v) => (
              <figure key={v.img} className={`lou-vis ${v.wide ? 'lou-vis--wide' : ''}`}>
                <img src={`/lancamentos/louis/${v.img}`} alt={`Louis Living Experience — ${v.t}`} loading="lazy" referrerPolicy="no-referrer" onError={onImgError} />
                <figcaption>{v.t}</figcaption>
              </figure>
            ))}
          </div>
          <p className="lou-vis-nota">Imagens de render meramente ilustrativas, fornecidas pela Select Construtora.</p>
        </div>
      </section>

      {/* ---------- VÍDEOS & MATERIAL ---------- */}
      <section className="lou-sec section--light">
        <div className="container">
          <Reveal>
            <span className="eyebrow">Veja por dentro</span>
            <h2 className="lou-h2">Vídeos e material completo</h2>
            <p className="lou-sub">Um tour pelo Louis e pela região — e o book oficial da Select com plantas, tipologias e lazer, pra você analisar com calma.</p>
          </Reveal>
          <div className="lou-videos">
            <video className="lou-video lou-video--port" controls preload="metadata" playsInline poster="/lancamentos/louis/entrance.jpg">
              <source src="/lancamentos/louis/louis-tour-1.mp4" type="video/mp4" />
              Seu navegador não suporta vídeo.
            </video>
            <video className="lou-video lou-video--land" controls preload="metadata" playsInline poster="/lancamentos/louis/pool.jpg">
              <source src="/lancamentos/louis/louis-tour-2.mp4" type="video/mp4" />
              Seu navegador não suporta vídeo.
            </video>
          </div>
          <a className="lou-material" href="/lancamentos/louis/louis-book.pdf" target="_blank" rel="noopener noreferrer">
            <span className="lou-material-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" /></svg>
            </span>
            <span className="lou-material-txt">
              <b>Book completo do Louis (PDF)</b>
              <i>Plantas, tipologias, lazer e apresentação oficial da Select · 4 MB</i>
            </span>
            <span className="lou-material-go">Abrir →</span>
          </a>
        </div>
      </section>

      {/* ---------- RENDA ESTIMADA ---------- */}
      <section className="lou-sec lou-sec--dark">
        <div className="container">
          <Reveal>
            <span className="eyebrow eyebrow--gold">Cenários de locação por temporada</span>
            <h2 className="lou-h2 lou-h2--light">Quanto pode render por mês</h2>
            <p className="lou-sub lou-sub--light">Estimativas divulgadas no material da Select/Housi, considerando diária média e taxa de ocupação. São cenários de referência — não garantia.</p>
          </Reveal>
          <div className="lou-cenarios">
            {CENARIOS.map((c, i) => (
              <Reveal key={c.nome} delay={i * 70}>
                <div className={`lou-cen ${c.destaque ? 'lou-cen--on' : ''}`}>
                  <span className="lou-cen-tag">{c.nome}</span>
                  <strong className="lou-cen-val">{c.valor}<i>/mês</i></strong>
                  <span className="lou-cen-ocup">{c.ocup}</span>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="lou-nota">Público que alimenta a ocupação: estudantes da UFU, profissionais da saúde, acompanhantes de pacientes e empresas. Diária média de mercado na região em torno de R$ 200 a R$ 300.</p>
        </div>
      </section>

      {/* ---------- CONDIÇÕES ---------- */}
      <section className="lou-sec section--light">
        <div className="container lou-cond-grid">
          <Reveal>
            <div className="lou-cond-txt">
              <span className="eyebrow">Condições de compra</span>
              <h2 className="lou-h2">Comprar na planta, no melhor preço</h2>
              <p className="lou-sub">Parcelamento direto com a construtora até a entrega das chaves. Depois, financiamento bancário do saldo.</p>
              <ul className="lou-cond-lista">
                <li><span>Valor da unidade</span><b>a partir de R$ 387.000</b></li>
                <li><span>Sinal (entrada)</span><b>R$ 38.700</b></li>
                <li><span>Parcelas mensais</span><b>36× de R$ 998</b></li>
                <li><span>Balões anuais</span><b>3× de R$ 15.840</b></li>
                <li><span>Saldo nas chaves (financiável)</span><b>~ R$ 264.852 <i>(+ INCC)</i></b></li>
              </ul>
              <p className="lou-disc">Tabela válida até 30/06/2026, sujeita a alteração sem aviso prévio. Parcelas reajustadas pela variação do INCC-M até o Habite-se. Parcela de financiamento aproximada (~R$ 2.825) apenas para referência.</p>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <aside className="lou-cond-cta">
              <h3>Quer simular o seu caso?</h3>
              <p>Eu monto a conta cheia — entrada, parcelas, financiamento e a estimativa de retorno — pra você decidir com clareza.</p>
              <a className="btn btn-gold" href={linkWhatsApp(WA_MSG)} target="_blank" rel="noopener noreferrer"><IconWhats /> Falar com o Vinícius</a>
              <button type="button" className="lou-btn-ghost lou-btn-ghost--dark" onClick={irForm}>Deixar meu contato <IconArrow /></button>
            </aside>
          </Reveal>
        </div>
      </section>

      {/* ---------- LOCALIZAÇÃO / ÂNCORAS ---------- */}
      <section className="lou-loc">
        <div className="lou-loc-fig">
          <img src="/lancamentos/louis/aerial.jpg" alt="Vista aérea do bairro Umuarama, em Uberlândia, onde fica o Louis" loading="lazy" />
        </div>
        <div className="container lou-loc-in">
          <Reveal>
            <span className="eyebrow eyebrow--gold">Localização</span>
            <h2 className="lou-h2 lou-h2--light">No coração da economia do Umuarama</h2>
            <p className="lou-end"><IconPin width={16} height={16} /> Rua Dr. Luiz Antônio Waack, 1.163 — Umuarama, Uberlândia/MG</p>
          </Reveal>
          <div className="lou-ancoras">
            {ANCORAS.map((a, i) => (
              <Reveal key={a.t} delay={i * 60}>
                <div className="lou-anc">
                  <h3>{a.t}</h3>
                  <p>{a.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- GALERIA / OBRA ---------- */}
      <section className="lou-sec section--light">
        <div className="container">
          <Reveal>
            <span className="eyebrow">Projeto e obra</span>
            <h2 className="lou-h2">O Louis já está saindo do papel</h2>
            <p className="lou-sub">Render do empreendimento e fotos reais da obra em andamento.</p>
          </Reveal>
          <div className="lou-galeria">
            <figure className="lou-gal lou-gal--big"><img src="/lancamentos/louis/tower.jpg" alt="Render do edifício Louis" loading="lazy" /></figure>
            <figure className="lou-gal"><img src="/lancamentos/louis/obra1.jpg" alt="Obra do Louis em andamento — fundação" loading="lazy" /><figcaption>Obras em andamento</figcaption></figure>
            <figure className="lou-gal"><img src="/lancamentos/louis/obra2.jpg" alt="Obra do Louis em andamento" loading="lazy" /><figcaption>Fundação e contenção</figcaption></figure>
            <figure className="lou-gal"><img src="/lancamentos/louis/obra3.jpg" alt="Canteiro de obras do Louis" loading="lazy" /><figcaption>Canteiro de obras</figcaption></figure>
          </div>
        </div>
      </section>

      {/* ---------- LEAD FORM ---------- */}
      <section className="lou-form-sec" ref={formRef}>
        <div className="container lou-form-wrap">
          <Reveal>
            <div className="lou-form-txt">
              <span className="eyebrow eyebrow--gold">Garanta a sua unidade</span>
              <h2 className="lou-h2 lou-h2--light">As melhores unidades saem primeiro</h2>
              <p className="lou-sub lou-sub--light">Deixe seu contato que eu te mando a tabela atualizada, a disponibilidade por andar e a simulação completa de retorno. Atendimento direto comigo, consultor da Rotina Imobiliária.</p>
            </div>
          </Reveal>
          <Reveal delay={80}>
            {enviado ? (
              <div className="lou-form-ok">
                <span className="lou-form-ok-ico"><IconWhats width={28} height={28} /></span>
                <h3>Recebido, {nome.trim().split(' ')[0]}!</h3>
                <p>Já abri o WhatsApp pra gente conversar. Te mando a tabela e a disponibilidade do Louis em seguida.</p>
              </div>
            ) : (
              <form className="lou-form" onSubmit={enviar}>
                <div className="lou-form-row">
                  <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" aria-label="Seu nome" required />
                  <input type="tel" value={fone} onChange={(e) => setFone(e.target.value)} placeholder="WhatsApp com DDD" aria-label="Seu WhatsApp" inputMode="tel" required />
                </div>
                <label className="lou-form-lbl">Seu objetivo
                  <select value={perfil} onChange={(e) => setPerfil(e.target.value)}>
                    <option>Investir (renda de aluguel)</option>
                    <option>Comprar para uso próprio</option>
                    <option>Ainda estou avaliando</option>
                  </select>
                </label>
                <button type="submit" className="btn btn-gold lou-form-btn"><IconWhats /> Quero a tabela e a disponibilidade</button>
                <p className="lou-disc">Seus dados ficam só comigo, para este atendimento. Sem spam.</p>
              </form>
            )}
          </Reveal>
        </div>
      </section>

      <div className="container lou-rodape">
        <p>
          Material informativo com base em dados da <b>Select Construtora</b> e da <b>Housi</b>. Imagens de render são ilustrativas;
          fotos de obra são reais. Valores, prazos e disponibilidade sujeitos a alteração. Estimativas de locação são cenários de
          referência e não constituem promessa de rentabilidade. Atendimento por <b>Vinícius Graton</b>, consultor da Rotina Imobiliária (CRECI PJ 132).
          {' '}<Link to="/lancamentos">Ver outros lançamentos de Uberlândia →</Link>
        </p>
      </div>
    </main>
  )
}
