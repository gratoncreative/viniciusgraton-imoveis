import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Reveal from '../components/Reveal'
import { linkWhatsApp, WA } from '../data'
import { useSEO } from '../useSEO'
import { IconWhats, IconArrow, IconShield } from '../components/icons'
import '../styles/diferenciais.css'

const ICN = {
  curadoria: 'M21 21l-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM8.5 11l2 2 3.5-3.5',
  transparencia: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  documentacao: 'M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M9 13l2 2 4-4',
  negociacao: 'M12 3v18M7 21h10M5 7h14l-3 7H8L5 7zM7 7 5 12h4L7 7zm10 0-2 5h4l-2-5z',
}
const Ico = ({ d }) => (
  <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
)

const DIFERENCIAIS = [
  {
    slug: 'curadoria',
    icon: 'curadoria',
    titulo: 'Curadoria criteriosa',
    lead: 'Você não recebe uma enxurrada de anúncios. Recebe os imóveis certos.',
    paras: [
      'A maioria dos compradores se perde em dezenas de links que não têm nada a ver com o que procuram. Eu faço o contrário: entendo o seu objetivo, seu orçamento e o que é inegociável pra você, e só então separo as opções que realmente fazem sentido.',
      'Antes de te enviar qualquer imóvel, eu já olhei a localização, o estado de conservação, o valor frente ao mercado do bairro e os pontos de atenção. Você ganha tempo e foco - e chega na visita já sabendo o que esperar.',
    ],
    ganha: ['Opções alinhadas ao seu perfil, sem ruído', 'Comparativo justo de preço por m² do bairro', 'Visitas mais produtivas, sem perder o dia'],
  },
  {
    slug: 'transparencia',
    icon: 'transparencia',
    titulo: 'Pontos fortes e riscos, na transparência',
    lead: 'Todo imóvel tem qualidades e pontos de atenção. Eu te conto os dois.',
    paras: [
      'Vendedor que só fala maravilha esconde o que importa. Comigo é diferente: eu aponto o que valoriza o imóvel e também o que merece cuidado - posição solar, barulho, idade da construção, custo de condomínio, o que precisa de reforma.',
      'Comprar um imóvel é uma das maiores decisões da sua vida. Você merece tomá-la com a informação completa na mão, sem surpresa depois da assinatura.',
    ],
    ganha: ['Avaliação honesta de prós e contras', 'Sem surpresa depois do negócio fechado', 'Decisão segura, com os olhos abertos'],
  },
  {
    slug: 'documentacao',
    icon: 'documentacao',
    titulo: 'Documentação conferida',
    lead: 'A parte chata e técnica é comigo. Você compra com segurança jurídica.',
    paras: [
      'Matrícula atualizada, certidões do imóvel e do vendedor, débitos de IPTU e condomínio, situação do financiamento - tudo isso é conferido antes de avançar. Com o suporte da estrutura da Rotina Imobiliária (CRECI PJ 132, mais de 30 anos de mercado), nada passa batido.',
      'Você não precisa virar especialista em cartório nem em financiamento. Eu te explico cada etapa em português claro e cuido pra que a compra ande sem dor de cabeça.',
    ],
    ganha: ['Checagem completa da documentação', 'Apoio em financiamento, ITBI e cartório', 'Processo conduzido do início à entrega das chaves'],
  },
  {
    slug: 'negociacao',
    icon: 'negociacao',
    titulo: 'Negociação a seu favor',
    lead: 'Eu trabalho pelo seu melhor negócio - preço, prazo e condições.',
    paras: [
      'Conhecer o mercado do bairro, o tempo de anúncio e a real motivação do vendedor muda completamente a conversa. Eu uso isso pra negociar o melhor valor e as melhores condições pra você, sem desgaste.',
      'Do primeiro contato à proposta, você tem alguém do seu lado defendendo o seu interesse - não o do outro lado da mesa.',
    ],
    ganha: ['Estratégia de proposta baseada em dados', 'Melhor preço, prazo e condições possíveis', 'Você negocia com tranquilidade, sem pressão'],
  },
]

export default function Diferenciais() {
  const { hash } = useLocation()
  useSEO({
    title: 'Meus diferenciais - por que comprar comigo',
    description: 'Curadoria criteriosa, transparência sobre pontos fortes e riscos, documentação conferida e negociação a seu favor. Conheça como o Vinícius Graton conduz a sua compra em Uberlândia.',
    path: '/diferenciais',
  })
  useEffect(() => {
    if (hash) { const el = document.querySelector(hash); if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120) }
  }, [hash])

  return (
    <main className="pagina section--light det dif-pg">
      <section className="dif-banner">
        <div className="dif-banner-bg" style={{ backgroundImage: 'url(/vinicius-graton.jpg)' }} />
        <div className="dif-banner-tint" />
        <div className="container dif-banner-in">
          <Reveal>
            <span className="eyebrow">Por que comprar comigo</span>
            <h1 className="dif-banner-tit">O que me torna <em>diferente</em></h1>
            <p className="dif-banner-sub">
              Comprar imóvel não é sobre receber links. É sobre ter alguém de confiança do seu lado em cada etapa. Esses são os quatro pilares do meu atendimento.
            </p>
          </Reveal>
        </div>
      </section>

      <div className="container">

        <div className="dif-nav">
          {DIFERENCIAIS.map((d) => (
            <a key={d.slug} href={`#${d.slug}`} className="dif-nav-item"><span className="dif-nav-ico"><Ico d={ICN[d.icon]} /></span>{d.titulo}</a>
          ))}
        </div>

        {DIFERENCIAIS.map((d, i) => (
          <Reveal key={d.slug}>
            <section id={d.slug} className={`dif-sec ${i % 2 ? 'dif-sec--alt' : ''}`}>
              <div className="dif-sec-ico"><Ico d={ICN[d.icon]} /></div>
              <div className="dif-sec-corpo">
                <span className="dif-num">{String(i + 1).padStart(2, '0')}</span>
                <h2>{d.titulo}</h2>
                <p className="dif-lead">{d.lead}</p>
                {d.paras.map((p, k) => <p key={k} className="dif-para">{p}</p>)}
                <ul className="dif-ganha">
                  {d.ganha.map((g, k) => (
                    <li key={k}><span className="dif-check"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></span>{g}</li>
                  ))}
                </ul>
              </div>
            </section>
          </Reveal>
        ))}

        <div className="dif-cta">
          <IconShield width={26} height={26} />
          <h3>Pronto pra comprar com quem cuida de você?</h3>
          <p>Me conta o que você procura. Eu trago as opções certas e cuido de tudo, do começo ao fim.</p>
          <div className="dif-cta-acoes">
            <a className="btn btn-gold" href={linkWhatsApp(WA.hero)} target="_blank" rel="noopener noreferrer"><IconWhats /> Falar comigo agora</a>
            <Link className="btn btn-ghost" to="/imoveis">Ver imóveis disponíveis <IconArrow /></Link>
          </div>
        </div>
      </div>
    </main>
  )
}
