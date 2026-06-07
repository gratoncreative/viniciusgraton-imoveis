import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import CondominioLead from '../components/CondominioLead'
import { CONDOMINIOS } from '../data'
import { useSEO } from '../useSEO'
import { onImgError } from '../img'
import { IconArrow, IconPin, IconBuilding, IconShield } from '../components/icons'

const zonaDe = (r = '') => /sul/i.test(r) ? 'Zona Sul' : (/leste|marileusa/i.test(r) ? 'Zona Leste' : (/represa|miranda/i.test(r) ? 'Represa de Miranda' : 'Outras regiões'))
const ehTipo = (t = '', f) => f === 'Casas' ? /casas?/i.test(t) : f === 'Lotes' ? /lote/i.test(t) : f === 'Chácaras' ? /ch[áa]cara/i.test(t) : true

const ZONAS = ['Zona Sul', 'Zona Leste', 'Represa de Miranda']
const TIPOS = ['Casas', 'Lotes', 'Chácaras']
const SEGMENTOS = ['Alto padrão', 'Médio padrão']

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
        {c.segmento && <span className="condo-seg">{c.segmento}</span>}
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
    description: 'Conheça os condomínios fechados horizontais de Uberlândia: casas e lotes de alto padrão na Zona Sul, Granja Marileusa e Represa de Miranda. Filtre por região, tipo e padrão e fale com o Vinícius para uma curadoria sob medida.',
    path: '/condominios',
  })

  const [zona, setZona] = useState('')
  const [tipo, setTipo] = useState('')
  const [seg, setSeg] = useState('')

  const lista = useMemo(() => CONDOMINIOS.filter((c) =>
    !c.grupo &&
    (!zona || zonaDe(c.regiao) === zona) &&
    (!tipo || ehTipo(c.tipo, tipo)) &&
    (!seg || c.segmento === seg)
  ), [zona, tipo, seg])

  const limpar = () => { setZona(''); setTipo(''); setSeg('') }
  const temFiltro = zona || tipo || seg

  return (
    <main className="pagina section--light det condos-pg">
      <div className="container">
        <Reveal>
          <h1 className="sr-only">Condomínios fechados em Uberlândia</h1>
          <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 8px' }}>
            <span className="eyebrow" style={{ justifyContent: 'center' }}>Morar em condomínio fechado</span>
            <h2 className="section-title">Os condomínios fechados de <em>Uberlândia</em></h2>
            <p className="section-sub" style={{ marginTop: 14 }}>
              Reuni os principais condomínios horizontais da cidade — casas e lotes. Escolha onde você sonha em morar; eu faço a curadoria e levanto os terrenos e imóveis disponíveis pra você.
            </p>
          </div>
        </Reveal>

        <div className="condo-filtros">
          <div className="condo-filtro-grupo">
            <span className="condo-filtro-rot">Região</span>
            <div className="condo-chips">
              <button className={`condo-chip ${!zona ? 'on' : ''}`} onClick={() => setZona('')}>Todas</button>
              {ZONAS.map((z) => <button key={z} className={`condo-chip ${zona === z ? 'on' : ''}`} onClick={() => setZona(z)}>{z}</button>)}
            </div>
          </div>
          <div className="condo-filtro-grupo">
            <span className="condo-filtro-rot">Tipo</span>
            <div className="condo-chips">
              <button className={`condo-chip ${!tipo ? 'on' : ''}`} onClick={() => setTipo('')}>Todos</button>
              {TIPOS.map((t) => <button key={t} className={`condo-chip ${tipo === t ? 'on' : ''}`} onClick={() => setTipo(t)}>{t}</button>)}
            </div>
          </div>
          <div className="condo-filtro-grupo">
            <span className="condo-filtro-rot">Padrão</span>
            <div className="condo-chips">
              <button className={`condo-chip ${!seg ? 'on' : ''}`} onClick={() => setSeg('')}>Todos</button>
              {SEGMENTOS.map((s) => <button key={s} className={`condo-chip ${seg === s ? 'on' : ''}`} onClick={() => setSeg(s)}>{s}</button>)}
            </div>
          </div>
        </div>

        <div className="condo-contagem">
          <span>{lista.length} {lista.length === 1 ? 'condomínio' : 'condomínios'}</span>
          {temFiltro && <button className="condo-limpar" onClick={limpar}>Limpar filtros ✕</button>}
        </div>

        {lista.length ? (
          <div className="construtora-projs condo-grid">
            {lista.map((c) => <CardCondo key={c.slug} c={c} />)}
          </div>
        ) : (
          <p className="section-sub" style={{ textAlign: 'center', padding: '30px 0' }}>
            Nenhum condomínio com esses filtros. <button className="condo-limpar" onClick={limpar}>Ver todos</button> ou me chame no WhatsApp que eu busco pra você.
          </p>
        )}

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
