import { Link } from 'react-router-dom'
import Reveal from './Reveal'
import { IconArrow, IconShield } from './icons'

// Chamada para o funil de venda (proprietário) — leva pra /anunciar.
export default function VenderCta() {
  return (
    <section className="vender-cta-sec">
      <div className="container">
        <Reveal>
          <div className="vender-cta">
            <div className="vender-cta-txt">
              <span className="eyebrow">Quer vender ou alugar?</span>
              <h2>Eu cuido da venda do seu imóvel com <em>curadoria e segurança</em></h2>
              <p>Cadastre seu imóvel com fotos em poucos minutos. Eu avalio, faço a curadoria e cuido da divulgação e da negociação — você acompanha tudo de perto, sem dor de cabeça.</p>
              <div className="vender-cta-acoes">
                <Link className="btn btn-gold btn-grande" to="/anunciar">Cadastrar meu imóvel pra vender <IconArrow /></Link>
                <Link className="btn btn-ghost" to="/avaliacao">Quanto vale meu imóvel?</Link>
              </div>
              <p className="vender-cta-nota"><IconShield width={16} height={16} /> Cadastro grátis e sem compromisso. Seus dados e fotos vão direto pra minha avaliação.</p>
            </div>
            <div className="vender-cta-num">
              <div className="vender-cta-foto">
                <img src="/casa-conceito.jpg" alt="Imóvel à venda em Uberlândia com a curadoria do Vinícius Graton" loading="lazy" />
                <span className="vender-cta-foto-tag">Do anúncio à entrega das chaves</span>
              </div>
              <div><b>Grátis</b><span>cadastrar e anunciar seu imóvel não tem nenhum custo</span></div>
              <div><b>Curadoria</b><span>seleciono e divulgo com cuidado, do anúncio à entrega das chaves</span></div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
