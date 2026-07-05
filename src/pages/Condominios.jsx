import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import CondominioLead from '../components/CondominioLead'
import { CONDOMINIOS } from '../empreendimentos'
import { useSEO } from '../useSEO'
import { onCondImgError, CAPA_COND_PADRAO } from '../img'
import { IconArrow, IconPin, IconShield, IconSearch } from '../components/icons'
import '../styles/condominios.css'
import '../styles/detalhe.css'
import '../styles/condominio.css'
import '../styles/construtoras.css'

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

const IcoChevron = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 9l6 6 6-6"/>
  </svg>
)

function CardCondo({ c }) {
  return (
    <Link className="condo-card" to={`/condominios/${c.slug}`}>
      <span className="condo-capa">
        <img src={c.capa || CAPA_COND_PADRAO} alt={`${c.nome} - condomínio fechado em Uberlândia`} loading="lazy" referrerPolicy="no-referrer" onError={onCondImgError} />
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
    title: 'Condomínios fechados em Uberlândia - casas, lotes e alto padrão',
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
    <main className="pagina condos-pg">
      <h1 className="sr-only">Condomínios fechados em Uberlândia</h1>

      {/* ── Hero com imagem de fundo ── */}
      <section className="condos-hero">
        <div className="container condos-hero-inner">
          <Reveal>
            <span className="condos-hero-eyebrow">Morar em condomínio fechado</span>
            <h2 className="condos-hero-title">Os condomínios fechados de <em>Uberlândia</em></h2>
            <p className="condos-hero-desc">
              Casas, lotes e chácaras nos principais condomínios fechados de Uberlândia.
            </p>
            <div className="condos-hero-stats">
              <span><b>{base.length}</b> condomínios</span>
              <i aria-hidden="true" />
              <span><b>{ZONAS.length}</b> regiões</span>
              <i aria-hidden="true" />
              <span><b>{TIPOS.length}</b> tipos</span>
            </div>
          </Reveal>

          {/* Busca */}
          <div className="condos-hero-search">
            <IconSearch width={18} height={18} />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar condomínio pelo nome (ex.: Alphaville, Jardins, Tamboré...)"
              aria-label="Buscar condomínio pelo nome"
            />
            {busca && <button className="condos-search-x" onClick={() => setBusca('')} aria-label="Limpar busca">✕</button>}
          </div>

          {/* Filtros — dropdowns */}
          <div className="condos-hero-filtros">
            <div className="condos-hf">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <select value={zona} onChange={(e) => setZona(e.target.value)} aria-label="Filtrar por região">
                <option value="">Região</option>
                {ZONAS.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
              <IcoChevron />
            </div>
            <div className="condos-hf">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Filtrar por tipo">
                <option value="">Tipo</option>
                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <IcoChevron />
            </div>
            <div className="condos-hf">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <select value={seg} onChange={(e) => setSeg(e.target.value)} aria-label="Filtrar por padrão">
                <option value="">Padrão</option>
                {SEGMENTOS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <IcoChevron />
            </div>
            <div className="condos-hf">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrar por situação">
                <option value="">Situação</option>
                {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <IcoChevron />
            </div>
            <div className="condos-hf condos-hf--wide">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m3 11 8.5-8.5L21 12v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5"/><path d="M9 21v-9h6v4"/></svg>
              <select value={dest} onChange={(e) => setDest(e.target.value)} aria-label="Filtrar por destaques e diferenciais">
                <option value="">Destaques e Diferenciais</option>
                {DESTAQUES.map(([label]) => <option key={label} value={label}>{label}</option>)}
              </select>
              <IcoChevron />
            </div>
            {temFiltro && (
              <button className="condos-hf-limpar" onClick={limpar}>Limpar</button>
            )}
          </div>
        </div>
      </section>

      {/* ── Lista de condomínios ── */}
      <div className="container condos-lista">
        <div className="condo-contagem">
          <span>{lista.length} {lista.length === 1 ? 'condomínio' : 'condomínios'}</span>
        </div>

        {lista.length ? (
          <div className="construtora-projs condo-grid">
            {lista.map((c) => <CardCondo key={c.slug} c={c} />)}
          </div>
        ) : (
          <p className="section-sub" style={{ textAlign: 'center', padding: '30px 0' }}>
            Nenhum condomínio com esses filtros.{' '}
            <button className="condo-limpar" onClick={limpar}>Ver todos</button>{' '}
            ou me chame no WhatsApp que eu busco pra você.
          </p>
        )}

        <div className="det-trust" style={{ marginTop: 30, maxWidth: 900 }}>
          <IconShield width={20} height={20} />
          <p><b>Faço a curadoria pra você.</b> Me diga em qual condomínio quer morar e o seu perfil (quartos, suítes, vagas) que eu levanto pessoalmente os terrenos e imóveis à venda lá dentro - inclusive oportunidades que não estão anunciadas. Disponibilidade e valores confirmados no atendimento.</p>
        </div>

        <div style={{ marginTop: 8 }}>
          <CondominioLead />
        </div>
      </div>
    </main>
  )
}
