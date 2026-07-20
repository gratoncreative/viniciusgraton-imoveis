import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useSEO } from '../useSEO'
import { linkWhatsApp, CONFIG } from '../data'
import { NavbarVG, FooterVG, WhatsFloatVG } from '../components/vg/ChromeVG'
import { onImgError } from '../img'

const CAIXAS = [
  {
    id: 'comprar',
    kicker: 'Quero comprar',
    titulo: 'Começar minha busca com curadoria',
    texto: 'Conte o que procura, a região e o orçamento. O Vinícius volta com uma seleção enxuta de imóveis que fazem sentido para você.',
    botao: 'Quero comprar um imóvel',
    classe: 'vgx-btn-red',
    msg: 'Olá Vinícius! Quero comprar um imóvel em Uberlândia e gostaria da sua curadoria.',
  },
  {
    id: 'vender',
    kicker: 'Quero vender',
    titulo: 'Anunciar meu imóvel pelo preço certo',
    texto: 'Avaliação criteriosa e de graça, fotos profissionais e divulgação com a estrutura da Rotina Imobiliária. Seu imóvel apresentado aos compradores certos.',
    botao: 'Quero vender meu imóvel',
    classe: 'vgx-btn-red',
    msg: 'Olá Vinícius! Quero vender meu imóvel em Uberlândia e gostaria de uma avaliação.',
  },
  {
    id: 'duvida',
    kicker: 'Só uma dúvida',
    titulo: 'Perguntar sem compromisso',
    texto: 'Financiamento, documentação, momento de mercado: pergunte à vontade. Tirar dúvida não custa nada e não gera obrigação nenhuma.',
    botao: 'Mandar minha dúvida',
    classe: 'vgx-btn-ouro',
    msg: 'Olá Vinícius! Tenho uma dúvida sobre o mercado de imóveis em Uberlândia.',
  },
]

export default function ContatoVG() {
  useSEO({
    title: 'Falar com o Vinícius Graton',
    description:
      'Fale direto com o consultor Vinícius Graton sobre comprar ou vender imóvel em Uberlândia. Resposta pessoal pelo WhatsApp, em horário comercial.',
    path: '/contato',
  })

  // Abre já na caixa certa quando vier de um link com âncora (#vender, #comprar).
  const { hash } = useLocation()
  useEffect(() => {
    if (!hash) return
    const el = document.getElementById(hash.slice(1))
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash])

  return (
    <div className="vgx">
      <NavbarVG ativo="contato" />

      <section className="vgx-cont-hero vgx-reveal">
        <div className="vgx-cont-hero-in">
          <span className="vgx-kicker vgx-kicker--gold">Contato</span>
          <h1>Vamos conversar sobre o seu imóvel</h1>
          <p>
            Sem formulário frio esperando dias por resposta. Escolha o assunto, mande sua mensagem e o
            Vinícius responde pessoalmente, normalmente em minutos, em horário comercial.
          </p>
        </div>
      </section>

      <section className="vgx-cont">
        <div className="vgx-cont-col">
          {CAIXAS.map((c) => (
            <div className="vgx-cont-card" id={c.id} key={c.id}>
              <span className="vgx-kicker vgx-kicker--golddark">{c.kicker}</span>
              <h2>{c.titulo}</h2>
              <p>{c.texto}</p>
              <a href={linkWhatsApp(c.msg)} target="_blank" rel="noopener noreferrer" className={c.classe}>
                {c.botao}
              </a>
            </div>
          ))}
        </div>

        <aside className="vgx-cont-aside">
          <img src="/vinicius-graton.jpg" alt="Vinícius Graton" onError={onImgError} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="vgx-cont-nome">Vinícius Graton</span>
            <span className="vgx-cont-papel">Consultor de imóveis<br />Em parceria com a Rotina Imobiliária</span>
          </div>
          <div className="vgx-cont-rule" />
          <div className="vgx-cont-itens">
            <div className="vgx-cont-item">
              <span className="vgx-cont-rot">WhatsApp</span>
              <a className="vgx-cont-zap" href={`https://wa.me/${CONFIG.whatsapp}`} target="_blank" rel="noopener noreferrer">(34) 99157-0494</a>
            </div>
            <div className="vgx-cont-item">
              <span className="vgx-cont-rot">E-mail</span>
              <a className="vgx-cont-val" href={`mailto:${CONFIG.email}`}>{CONFIG.email}</a>
            </div>
            <div className="vgx-cont-item">
              <span className="vgx-cont-rot">Instagram</span>
              <a className="vgx-cont-val" href={CONFIG.instagram} target="_blank" rel="noopener noreferrer">@viniciusgraton.imoveis</a>
            </div>
            <div className="vgx-cont-item">
              <span className="vgx-cont-rot">Atendimento</span>
              <span className="vgx-cont-txt">Uberlândia · MG, com hora marcada<br />Segunda a sábado, 8h às 19h</span>
            </div>
          </div>
        </aside>
      </section>

      <FooterVG />
      <WhatsFloatVG />
    </div>
  )
}
