import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSEO } from '../useSEO'
import { todosEmpreendimentosTodos, bairrosComEmpreendimentos, linkWhatsApp } from '../data'
import { BAIRROS_EDITORIAL } from '../bairros-editorial'
import Reveal from '../components/Reveal'
import { IconArrow, IconWhats, IconPin } from '../components/icons'
import { CardEmpLan } from './PortalLancamentosHome'

const slugify = (b) =>
  b.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-')

const deSlugify = (slug) => {
  const todos = bairrosComEmpreendimentos()
  const match = todos.find((b) => slugify(b.bairro) === slug)
  return match?.bairro ?? null
}

export default function LancamentoBairro() {
  const { slug } = useParams()
  const bairroNome = useMemo(() => deSlugify(slug), [slug])
  const empreendimentos = useMemo(
    () => todosEmpreendimentosTodos().filter((e) => e.bairro && slugify(e.bairro) === slug),
    [slug]
  )
  const editorial = bairroNome ? BAIRROS_EDITORIAL[bairroNome] : null

  const waMsg = bairroNome
    ? `Olá Vinícius! Estou pesquisando lançamentos no bairro ${bairroNome}, em Uberlândia. Pode me ajudar?`
    : 'Olá Vinícius! Gostaria de saber sobre lançamentos em Uberlândia.'

  useSEO({
    title: bairroNome
      ? `Lançamentos no ${bairroNome} — Uberlândia | Vinícius Graton`
      : 'Lançamentos por bairro em Uberlândia',
    description: bairroNome
      ? `${empreendimentos.length} empreendimento${empreendimentos.length !== 1 ? 's' : ''} no ${bairroNome} com curadoria de um consultor da Rotina Imobiliária. Veja plantas, vídeos e fale direto com o consultor.`
      : 'Pesquise lançamentos imobiliários por bairro em Uberlândia com curadoria independente.',
    path: `/lancamentos/bairros/${slug}`,
  })

  if (!bairroNome || empreendimentos.length === 0) {
    return (
      <main className="pagina">
        <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
          <h1>Bairro não encontrado</h1>
          <p className="section-sub">Não há empreendimentos publicados neste bairro no momento.</p>
          <Link to="/lancamentos/catalogo" className="btn btn-gold" style={{ marginTop: 24 }}>
            Ver catálogo completo <IconArrow width={14} height={14} />
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="pagina bairro-lan-pagina">
      {/* Hero */}
      <section className="bairlan-hero">
        <div className="container">
          <Reveal>
            <nav className="breadcrumb" aria-label="Localização">
              <Link to="/">Início</Link>
              <span>/</span>
              <Link to="/lancamentos">Lançamentos</Link>
              <span>/</span>
              <span>Bairros</span>
              <span>/</span>
              <span>{bairroNome}</span>
            </nav>
            <span className="eyebrow" style={{ color: 'var(--gold-2)' }}>
              <IconPin width={13} height={13} /> {bairroNome} · Uberlândia/MG
            </span>
            <h1 className="bairlan-titulo">
              Lançamentos no {bairroNome}
            </h1>
            <p className="bairlan-sub">
              {empreendimentos.length} empreendimento{empreendimentos.length !== 1 ? 's' : ''} com curadoria de consultor da Rotina Imobiliária.
              {editorial?.intro ? ` ${editorial.intro}` : ''}
            </p>
          </Reveal>
        </div>
      </section>

      {/* Grid de empreendimentos */}
      <section className="section--light">
        <div className="container">
          <div className="lan-grid">
            {empreendimentos.map((e) => (
              <CardEmpLan key={`${e.construtoraSlug}--${e.slug}`} e={e} />
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <a href={linkWhatsApp(waMsg)} className="btn btn-gold" target="_blank" rel="noopener">
              <IconWhats width={16} height={16} /> Perguntar sobre lançamentos no {bairroNome}
            </a>
          </div>
        </div>
      </section>

      {/* Sobre o bairro (editorial) */}
      {editorial && (
        <section className="bairlan-editorial">
          <div className="container bairlan-editorial-inner">
            <div className="bairlan-editorial-texto">
              {editorial.historia && (
                <>
                  <h2>O bairro {bairroNome}</h2>
                  <p>{editorial.historia}</p>
                </>
              )}
              {editorial.perfil && (
                <>
                  <h3>Perfil dos moradores</h3>
                  <p>{editorial.perfil}</p>
                </>
              )}
              {editorial.curiosidades && (
                <>
                  <h3>Características do bairro</h3>
                  <p>{editorial.curiosidades}</p>
                </>
              )}
              {editorial.destaques && editorial.destaques.length > 0 && (
                <>
                  <h3>Pontos de referência próximos</h3>
                  <ul className="bairlan-destaques">
                    {editorial.destaques.map((d, i) => (
                      <li key={i}><IconPin width={13} height={13} />{d}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* CTA bairros próximos */}
      <section className="bairlan-outros">
        <div className="container">
          <h2 className="section-title" style={{ textAlign: 'center' }}>Outros bairros com lançamentos</h2>
          <BairrosSugeridos atual={bairroNome} />
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Link to="/lancamentos/catalogo" className="btn btn-ghost">
              Ver catálogo completo com todos os bairros <IconArrow width={13} height={13} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

function BairrosSugeridos({ atual }) {
  const todos = useMemo(() => bairrosComEmpreendimentos(), [])
  const outros = todos.filter((b) => b.bairro !== atual).slice(0, 8)

  return (
    <div className="lan-bairros-grid" style={{ marginTop: 20 }}>
      {outros.map(({ bairro, lista }) => (
        <Link key={bairro} to={`/lancamentos/bairros/${slugify(bairro)}`} className="lan-bairro-chip">
          <span className="lan-bairro-nome">{bairro}</span>
          <span className="lan-bairro-count">
            {lista.length} {lista.length === 1 ? 'empreendimento' : 'empreendimentos'}
          </span>
        </Link>
      ))}
    </div>
  )
}
