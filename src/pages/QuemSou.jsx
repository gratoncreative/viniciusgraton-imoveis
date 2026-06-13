import { useState } from 'react'
import Sobre from '../components/Sobre'
import Compromisso from '../components/Compromisso'
import Reveal from '../components/Reveal'
import { useSEO } from '../useSEO'
import { linkWhatsApp, WA } from '../data'
import { IconWhats, IconShield, IconEye } from '../components/icons'

// ícones inline simples
const IcoLaptop = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="2" y="3" width="20" height="13" rx="2"/>
    <path d="M2 19h20M8 21l2-2h4l2 2"/>
  </svg>
)
const IcoUser = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6"/>
  </svg>
)
const IcoBuilding = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M3 21h18M5 21V6h6v15M13 21V10h6v11M7 9h2M7 13h2M7 17h2M15 14h2M15 17h2"/>
  </svg>
)
const IcoChevron = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
    <path d="M6 9l6 6 6-6"/>
  </svg>
)

// — dados —
const NUMEROS = [
  { val: '5.000+', label: 'imóveis disponíveis via Rotina Imobiliária' },
  { val: '30+',   label: 'anos da Rotina atendendo Uberlândia' },
  { val: '12',    label: 'ferramentas gratuitas na plataforma' },
  { val: '100%',  label: 'atendimento direto comigo, sem intermediários' },
]

const PROCESSO = [
  { num: '01', titulo: 'Conversa inicial',   texto: 'Entendo o que você precisa: perfil, orçamento, prazos e o que é inegociável pra você.' },
  { num: '02', titulo: 'Curadoria',          texto: 'Seleciono só os imóveis que realmente fazem sentido pro seu perfil. Sem lista genérica.' },
  { num: '03', titulo: 'Visitas',            texto: 'Te acompanho apontando pontos fortes, riscos e potencial de cada imóvel visitado.' },
  { num: '04', titulo: 'Negociação',         texto: 'Negocio preço e condições a seu favor, com argumento técnico e conhecimento de mercado.' },
  { num: '05', titulo: 'Documentação',       texto: 'Confiro a situação jurídica do imóvel antes de qualquer assinatura ou compromisso.' },
]

const DIFS = [
  {
    ico: <IcoLaptop />,
    titulo: 'Plataforma digital própria',
    texto: 'Criei um portal com 12 ferramentas gratuitas para o comprador: simulador de financiamento, calculadora de ITBI, análise de mercado e mais. Informação que a maioria guarda pra si, eu coloco na sua mão — de graça.',
  },
  {
    ico: <IcoUser />,
    titulo: 'Atendimento direto comigo',
    texto: 'Do primeiro contato à entrega das chaves, quem te atende sou eu. Sem assistentes, sem call center, sem repasse. Você tem o meu número, não o de um CRM.',
  },
  {
    ico: <IcoBuilding />,
    titulo: 'Estrutura da Rotina Imobiliária',
    texto: 'Trabalho com o apoio da Rotina, referência em Uberlândia há mais de 30 anos, com 5.000+ imóveis ativos e equipe completa de especialistas em financiamento, captação e jurídico.',
  },
  {
    ico: <IconEye width={24} height={24} />,
    titulo: 'Transparência sobre riscos',
    texto: 'Não escondo problemas dos imóveis. Se tem risco, você fica sabendo antes de decidir — e antes do contrato. Essa é a diferença entre uma compra segura e um arrependimento caro.',
  },
]

const FAQ_ITEMS = [
  {
    q: 'Quanto custa o seu atendimento?',
    a: 'Para o comprador e o locatário, o atendimento é gratuito. A comissão do consultor é paga pelo vendedor, nos termos legais. Você não paga nada extra por ter alguém do seu lado durante o processo.',
  },
  {
    q: 'Você atende qual região de Uberlândia?',
    a: 'Atendo todos os bairros de Uberlândia e cidades da região, sem restrição de área. Do setor central ao Santa Mônica, do Tibery ao Morada do Sol — onde o imóvel certo estiver, eu vou.',
  },
  {
    q: 'Posso usar o FGTS na compra?',
    a: 'Sim, para imóveis que se enquadram nas condições do SFH e do Minha Casa Minha Vida. Verifico a elegibilidade do imóvel antes de você se comprometer com qualquer proposta, e explico todo o processo sem jargão.',
  },
  {
    q: 'Você trabalha com locação também?',
    a: 'Sim, atendo busca de imóveis para aluguel com o mesmo cuidado na triagem. Oriento também sobre as modalidades de garantia disponíveis: fiador, seguro fiança e caução.',
  },
  {
    q: 'O que acontece depois que eu entro em contato?',
    a: 'A gente tem uma conversa rápida pelo WhatsApp onde entendo o que você procura. A partir daí, faço a curadoria e te apresento as opções que realmente fazem sentido — sem te encher de imóvel aleatório.',
  },
]

// — seções —

function NumerosFaixa() {
  return (
    <section className="qs-numeros">
      <div className="container qs-numeros-grid">
        {NUMEROS.map((n) => (
          <div key={n.val} className="qs-num-item">
            <div className="qs-num-val">{n.val}</div>
            <div className="qs-num-label">{n.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Historia() {
  return (
    <section className="qs-historia">
      <div className="container qs-historia-grid">
        <Reveal>
          <div className="qs-historia-text">
            <span className="eyebrow">Por que imóveis</span>
            <h2 className="section-title">Uma escolha feita <em>com propósito</em></h2>
            <p>
              Comprar um imóvel é uma das maiores decisões da vida — financeira, familiar,
              emocional. E ao mesmo tempo, é uma das mais opacas: linguagem técnica, burocracia,
              pressão de prazo, medo de pagar caro demais ou de comprar errado.
            </p>
            <p>
              Escolhi esse mercado exatamente por isso. Quero ser o tipo de consultor que eu
              gostaria de ter do meu lado numa compra assim: alguém que explica tudo com clareza,
              aponta os riscos antes do contrato, e que está genuinamente comprometido com a
              melhor decisão para você — não com a comissão mais rápida.
            </p>
            <p>
              Trabalho pela <strong>Rotina Imobiliária</strong>, referência em Uberlândia há
              mais de 30 anos, o que me dá acesso a uma das maiores bases de imóveis da cidade
              e a uma equipe completa de especialistas em financiamento, captação e jurídico.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="qs-historia-box">
            <blockquote>
              "A diferença entre uma boa compra e um arrependimento caro é simples: ter ao
              seu lado alguém que te diz a verdade — antes da assinatura, não depois."
            </blockquote>
            <div className="qs-historia-ass">
              <img src="/favicon.svg" alt="" aria-hidden="true" className="qs-historia-logo" />
              <div>
                <strong>Vinícius Graton</strong>
                <span>Consultor · Rotina Imobiliária · Uberlândia/MG</span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function Processo() {
  return (
    <section className="qs-processo">
      <div className="container">
        <Reveal>
          <div className="qs-sec-header">
            <span className="eyebrow">Do primeiro contato às chaves</span>
            <h2 className="section-title">Como eu <em>trabalho</em></h2>
          </div>
        </Reveal>
        <div className="qs-processo-steps">
          {PROCESSO.map((s, i) => (
            <Reveal key={s.num} delay={i * 0.07}>
              <div className="qs-proc-step">
                <div className="qs-proc-num">{s.num}</div>
                <div className="qs-proc-body">
                  <h4>{s.titulo}</h4>
                  <p>{s.texto}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function Diferenciais() {
  return (
    <section className="qs-difs">
      <div className="container">
        <Reveal>
          <div className="qs-sec-header" style={{ maxWidth: 560 }}>
            <span className="eyebrow">Por que me escolher</span>
            <h2 className="section-title">O que me <em>diferencia</em></h2>
            <p className="section-sub">
              Num mercado com muitos consultores de perfil genérico, algumas coisas me separam
              da maioria.
            </p>
          </div>
        </Reveal>
        <div className="qs-difs-grid">
          {DIFS.map((d, i) => (
            <Reveal key={i} delay={i * 0.07}>
              <div className="qs-dif-item">
                <div className="qs-dif-ico">{d.ico}</div>
                <h4>{d.titulo}</h4>
                <p>{d.texto}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`qs-faq-item${open ? ' open' : ''}`}>
      <button className="qs-faq-q" onClick={() => setOpen(!open)}>
        <span>{q}</span>
        <IcoChevron width={18} height={18} style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.22s', flexShrink: 0 }} />
      </button>
      {open && <p className="qs-faq-a">{a}</p>}
    </div>
  )
}

function FaqSection() {
  return (
    <section className="qs-faq">
      <div className="container">
        <Reveal>
          <div className="qs-sec-header" style={{ textAlign: 'center' }}>
            <span className="eyebrow" style={{ justifyContent: 'center' }}>Dúvidas comuns</span>
            <h2 className="section-title">Perguntas <em>frequentes</em></h2>
          </div>
        </Reveal>
        <div className="qs-faq-list">
          {FAQ_ITEMS.map((item) => (
            <Reveal key={item.q} delay={0.05}>
              <FaqItem {...item} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTAFinal() {
  return (
    <section className="qs-cta-final">
      <div className="container">
        <Reveal>
          <span className="eyebrow" style={{ justifyContent: 'center' }}>Vamos conversar</span>
          <h2 className="section-title">Pronto para dar o <em>próximo passo</em>?</h2>
          <p>
            Não precisa ter certeza ainda. Uma conversa rápida pelo WhatsApp já ajuda a
            organizar as ideias e traçar o caminho certo pra você.
          </p>
          <div className="qs-cta-final-acoes">
            <a className="btn btn-gold" href={linkWhatsApp(WA.contato)} target="_blank" rel="noopener">
              <IconWhats /> Falar pelo WhatsApp
            </a>
            <span className="sobre-selo">
              <IconShield width={18} height={18} /> Atendimento gratuito para compradores
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default function QuemSou() {
  useSEO({
    title: 'Sobre mim — consultor de imóveis em Uberlândia | Vinícius Graton',
    description:
      'Vinícius Graton, consultor de imóveis em Uberlândia. Curadoria personalizada, transparência sobre riscos, documentação conferida e atendimento direto — do primeiro contato à chave na sua mão.',
    path: '/sobre',
  })
  return (
    <main className="pagina">
      <h1 className="sr-only">Sobre Vinícius Graton, consultor de imóveis em Uberlândia</h1>
      <Sobre />
      <NumerosFaixa />
      <Historia />
      <Processo />
      <Compromisso />
      <Diferenciais />
      <FaqSection />
      <CTAFinal />
    </main>
  )
}
