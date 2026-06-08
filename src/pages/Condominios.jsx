import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import CondominioLead from '../components/CondominioLead'
import { CONDOMINIOS } from '../data'
import { useSEO } from '../useSEO'
import { onCondImgError, CAPA_COND_PADRAO } from '../img'
import { IconArrow, IconPin, IconShield, IconSearch } from '../components/icons'

const norm = (s = '') => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const zonaDe = (r = '') => /sul/i.test(r) ? 'Zona Sul' : (/leste|marileusa/i.test(r) ? 'Zona Leste' : (/represa|miranda/i.test(r) ? 'Represa de Miranda' : (/oeste/i.test(r) ? 'Zona Oeste' : 'Outras regiões')))
const ehTipo = (t = '', f) => f === 'Casas' ? /casas?/i.test(t) : f === 'Lotes' ? /lote/i.test(t) : f === 'Chácaras' ? /ch[áa]cara/i.test(t) : true
const statusDe = (s = '') => /lan[çc]/i.test(s) ? 'Lançamento' : (/pronto|consolidad|implantad|opera/i.test(s) ? 'Pronto para morar' : 'Em comercialização')

const ZONAS = ['Zona Sul', 'Zona Leste', 'Zona Oeste', 'Represa de Miranda']
const TIPOS = ['Casas', 'Lotes', 'Chácaras']
const SEGMENTOS = ['Alto padrão', 'Médio padrão']
const STATUS = ['Lançamento', 'Em comercialização', 'Pronto para morar']

const blob = (c) => [c.nome, c.regiao, c.descricao, ...(c.amenidades || []), ...(c.destaques || [])].join(' ').toLowerCase()
const DESTAQUES = [
  ['Beira de represa/lago', /represa|lago|miranda|n[aá]utico|orla|p[ií]er/],
  ['Com piscina', /piscina/],
  ['Quadra de tênis', /t[eê]nis/],
  ['Beach tennis', /beach tennis/],
  ['Pet place', /\bpet\b/],
  ['Campo de futebol', /futebol|society|futsal/],
]

function CardCondo({ c }) {
  return (
    <Link className="condo-card" to={`/condominios/${c.slug}`}>
      <span className="condo-capa">
        <img src={c.capa || CAPA_COND_PADRAO} alt={`${c.nome} — condomínio fechado em Uberlândia`} loading="lazy" referrerPolicy="no-referrer" onError={onCondImgError} />
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
    description: 'Conheça os condomínios fechados horizontais de Uberlândia: casas e lotes de alto padrão na Zona Sul, Granja Marileusa e Represa de Miranda. Busque pelo nome, filtre por região, tipo, padrão e situação, e fale com o Vinícius para uma curadoria sob medida.',
    path: '/condominios',
  })

  const [busca, setBusca] = useState('')
  const [zona, setZona] = useState('')
  const [tipo, setTipo] = useState('')
  const [seg, setSeg] = useState('')
  const [status, setStatus] = useState('')
  const [dest, setDest] = useState('')

  const base = useMemo(() => CONDOMINIOS.filter((c) => !c.grupo), [])

  const lista = useMemo(() => {
    const q = norm(busca)
    const re = DESTAQUES.find((d) => d[0] === dest)?.[1]
    return base.filter((c) =>
      (!q || norm(`${c.nome} ${c.regiao}`).includes(q)) &&
      (!zona || zonaDe(c.regiao) === zona) &&
      (!tipo || ehTipo(c.tipo, tipo)) &&
      (!seg || c.segmento === seg) &&
      (!status || statusDe(c.status) === status) &&
      (!re || re.test(blob(c)))
    ).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [base, busca, zona, tipo, seg, status, dest])

  const limpar = () => { setBusca(''); setZona(''); setTipo(''); setSeg(''); setStatus(''); setDest('') }
  const temFiltro = busca || zona || tipo || seg || status || dest

  return (
    <main className="pagina section--light det condos-pg">
      <div className="container">
        <Reveal>
          <h1 className="sr-only">Condomínios fechados em Uberlândia</h1>
          <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 8px' }}>
            <span className="eyebrow" style={{ justifyContent: 'center' }}>Morar em condomínio fechado</span>
            <h2 className="section-title">Os condomínios fechados de <em>Uberlândia</em></h2>
            <p className="section-sub" style={{ marginTop: 14 }}>
              Reuni os principais condomínios horizontais da cidade — casas, lotes e chácaras. Busque pelo nome, filtre pelo seu perfil e escolha onde você sonha em morar; eu faço a curadoria e levanto os terrenos e imóveis disponíveis pra você.
            </p>
          </div>
        </Reveal>

        <div className="condo-busca-wrap">
          <span className="condo-busca">
            <IconSearch width={18} height={18} />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar condomínio pelo nome (ex.: Alphaville, Jardins, Tamboré...)"
              aria-label="Buscar condomínio pelo nome"
            />
            {busca && <button className="condo-busca-x" onClick={() => setBusca('')} aria-label="Limpar busca">✕</button>}
          </span>
        </div>

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
          <div className="condo-filtro-grupo">
            <span className="condo-filtro-rot">Situação</span>
            <div className="condo-chips">
              <button className={`condo-chip ${!status ? 'on' : ''}`} onClick={() => setStatus('')}>Todas</button>
              {STATUS.map((s) => <button key={s} className={`condo-chip ${status === s ? 'on' : ''}`} onClick={() => setStatus(s)}>{s}</button>)}
            </div>
          </div>
          <div className="condo-filtro-grupo condo-filtro-grupo--full">
            <span className="condo-filtro-rot">Destaques</span>
            <div className="condo-chips">
              <button className={`condo-chip ${!dest ? 'on' : ''}`} onClick={() => setDest('')}>Todos</button>
              {DESTAQUES.map(([label]) => <button key={label} className={`condo-chip ${dest === label ? 'on' : ''}`} onClick={() => setDest(label)}>{label}</button>)}
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
