import { Link } from 'react-router-dom'
import { useSEO } from '../useSEO'
import { linkWhatsApp } from '../data'
import { NavbarVG, FooterVG, WhatsFloatVG } from '../components/vg/ChromeVG'
import { onImgError } from '../img'

const PRINCIPIOS = [
  {
    titulo: 'Honestidade antes da venda',
    texto: 'Se o imóvel tem problema de documentação, preço fora da realidade ou não combina com o seu momento, você fica sabendo antes de se apaixonar por ele.',
  },
  {
    titulo: 'Curadoria, não catálogo',
    texto: 'Em vez de dezenas de opções genéricas, você recebe poucos imóveis escolhidos a dedo. Seu tempo vale mais do que uma lista infinita de visitas.',
  },
  {
    titulo: 'Do contato às chaves',
    texto: 'Financiamento, escritura, registro, vistoria: nenhuma etapa fica por sua conta. O acompanhamento só termina com as chaves na sua mão.',
  },
]

export default function SobreVG() {
  useSEO({
    title: 'Sobre o Vinícius Graton',
    description:
      'Consultoria é diferente de venda. Conheça o trabalho do Vinícius Graton, consultor de imóveis em Uberlândia em parceria com a Rotina Imobiliária.',
    path: '/sobre',
  })

  const wa = linkWhatsApp('Olá Vinícius! Quero agendar uma conversa sobre imóveis em Uberlândia.')

  return (
    <div className="vgx">
      <NavbarVG ativo="sobre" />

      <section className="vgx-sobre-topo vgx-reveal">
        <div className="vgx-sobre-foto">
          <span className="vgx-frame" />
          <img src="/vinicius-graton.jpg" alt="Vinícius Graton, consultor de imóveis em Uberlândia" onError={onImgError} />
        </div>
        <div className="vgx-sobre-txt">
          <span className="vgx-kicker vgx-kicker--golddark">Sobre o Vinícius</span>
          <h1>Consultoria é diferente de venda</h1>
          <p className="vgx-sobre-p">
            O Vinícius não se apresenta como corretor, e isso não é detalhe. Corretor vende imóvel.
            Consultor ajuda você a tomar a decisão certa, mesmo quando a resposta é "esse imóvel não é
            para você agora".
          </p>
          <p className="vgx-sobre-p">
            O trabalho dele é construído em cima de uma promessa simples: você compra seu imóvel sem medo
            de errar. Isso significa entender o momento da sua família antes de mostrar qualquer imóvel,
            analisar documentação e preço com rigor técnico e acompanhar pessoalmente cada visita,
            proposta e assinatura.
          </p>
          <p className="vgx-sobre-p">
            A atuação é em parceria com a Rotina Imobiliária, uma das principais da cidade. Na prática,
            você tem o atendimento pessoal de um consultor com a estrutura, a carteira de imóveis e a
            segurança jurídica de uma imobiliária completa.
          </p>
          <div className="vgx-sobre-acoes">
            <a href={wa} target="_blank" rel="noopener noreferrer" className="vgx-btn-red">Agendar uma conversa</a>
            <Link to="/imoveis" className="vgx-btn-ouro">Ver imóveis</Link>
          </div>
        </div>
      </section>

      <section className="vgx-principios vgx-reveal">
        <div className="vgx-secao-center">
          <span className="vgx-kicker vgx-kicker--golddark">Como o Vinícius trabalha</span>
          <h2 className="vgx-h2">Três compromissos com você</h2>
        </div>
        <div className="vgx-princ-grid">
          {PRINCIPIOS.map((p) => (
            <div className="vgx-princ" key={p.titulo}>
              <b>{p.titulo}</b>
              <p>{p.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="vgx-parceria vgx-reveal">
        <div className="vgx-parceria-in">
          <div className="vgx-parceria-col">
            <span className="vgx-kicker vgx-kicker--gold">A parceria</span>
            <h2>Vinícius Graton + Rotina Imobiliária</h2>
            <p>
              Atendimento pessoal de consultor com estrutura de imobiliária: carteira completa de imóveis
              de Uberlândia, departamento jurídico para contratos e escrituras e força de negociação junto
              a proprietários e incorporadoras.
            </p>
          </div>
          <a href={wa} target="_blank" rel="noopener noreferrer" className="vgx-btn-red">Começar minha busca</a>
        </div>
      </section>

      <FooterVG />
      <WhatsFloatVG />
    </div>
  )
}
