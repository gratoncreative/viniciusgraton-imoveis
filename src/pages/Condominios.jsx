import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import CondominioLead from '../components/CondominioLead'
import { CONDOMINIOS } from '../data'
import { useSEO } from '../useSEO'
import { onImgError } from '../img'
import { IconArrow, IconPin, IconBuilding, IconShield } from '../components/icons'

function CardCondo({ c }) {
  return (
    <Link className="condo-card" to={`/condominios/${c.slug}`}>
      <span className="condo-capa">
        {c.capa ? (
          <img src={c.capa} alt={`${c.nome} — condomínio fechado em Uberlândia`} loading="lazy" referrerPolicy="no-referrer" onError={onImgError} />
        ) : (
          <span className="condo-capa-vazia"><IconBuilding width={32} height={32} /></span>
        )}
        <span className="condo-tipo">{c.tipo}</span>
      </span>
      <span className="condo-body">
        <b className="condo-nome">{c.nome}</b>
        <span className="condo-regiao"><IconPin width={14} height={14} /> {c.regiao}</span>
        {(c.destaques || []).length > 0 && <span className="condo-destaque">{c.destaques[0]}</span>}
        <span className="condo-ver">Ver condomínio <IconArrow width={14} height={14} /></span>
      </span>
    </Link>
  )
}

export default function Condominios() {
  useSEO({
    title: 'Condomínios fechados em Uberlândia — casas, lotes e alto padrão',
    description: 'Conheça os condomínios fechados horizontais de Uberlândia: casas e lotes de alto padrão na Zona Sul, Granja Marileusa e Represa de Miranda. Veja todas as opções e fale com o Vinícius para uma curadoria sob medida.',
    path: '/condominios',
  })

  return (
    <main className="pagina section--light det condos-pg">
      <div className="container">
        <Reveal>
          <h1 className="sr-only">Condomínios fechados em Uberlândia</h1>
          <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 10px' }}>
            <span className="eyebrow" style={{ justifyContent: 'center' }}>Morar em condomínio fechado</span>
            <h2 className="section-title">Os condomínios fechados de <em>Uberlândia</em></h2>
            <p className="section-sub" style={{ marginTop: 14 }}>
              Reuni aqui os principais condomínios horizontais da cidade — casas e lotes de alto padrão. Escolha onde você sonha em morar; eu faço a curadoria e levanto os terrenos e imóveis disponíveis pra você.
            </p>
          </div>
        </Reveal>

        <div className="condo-strip-wrap">
          <div className="condo-strip">
            {CONDOMINIOS.map((c) => <CardCondo key={c.slug} c={c} />)}
          </div>
        </div>

        <div className="det-trust" style={{ marginTop: 30, maxWidth: 900 }}>
          <IconShield width={20} height={20} />
          <p><b>Faço a curadoria pra você.</b> Me diga em qual condomínio quer morar e o seu perfil (quartos, suítes, vagas) que eu levanto pessoalmente os terrenos e imóveis à venda lá dentro — inclusive oportunidades que não estão anunciadas. Disponibilidade e valores confirmados no atendimento.</p>
        </div>

        <div style={{ marginTop: 8 }}>
          <CondominioLead />
        </div>
      </div>
    </main>
  )
}
