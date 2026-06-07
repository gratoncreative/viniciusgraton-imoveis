import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import { POSTS } from '../blog'
import { lerBlogViews } from '../engajamento'
import { useSEO } from '../useSEO'
import { IconArrow } from '../components/icons'

const CATEGORIAS = ['Todos', ...Array.from(new Set(POSTS.map((p) => p.categoria)))]

export function CardPost({ p, views }) {
  return (
    <Link className="post-card" to={`/blog/${p.slug}`}>
      <span className={`post-capa blog-cor-${p.cor}`}>
        {p.capa && <img className="post-capa-img" src={p.capa} alt={p.titulo} loading="lazy" />}
        <span className="post-cat">{p.categoria}</span>
      </span>
      <span className="post-body">
        <b className="post-titulo">{p.titulo}</b>
        <span className="post-resumo">{p.resumo}</span>
        <span className="post-meta">{views > 0 ? `${views} ${views === 1 ? 'leitura' : 'leituras'} · ` : ''}{p.leitura} <span className="post-ver">Ler <IconArrow width={13} height={13} /></span></span>
      </span>
    </Link>
  )
}

export default function Blog() {
  useSEO({
    title: 'Blog — guias de compra, financiamento e bairros de Uberlândia',
    description: 'Conteúdo prático sobre comprar imóvel em Uberlândia: FGTS, financiamento, ITBI, bairros e mercado. Por Vinícius Graton, consultor de imóveis.',
    path: '/blog',
  })
  const [cat, setCat] = useState('Todos')
  const [views, setViews] = useState({})
  useEffect(() => { lerBlogViews().then(setViews) }, [])
  const lista = cat === 'Todos' ? POSTS : POSTS.filter((p) => p.categoria === cat)

  return (
    <main className="pagina section--light det blog-pg">
      <div className="container">
        <Reveal>
          <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 8px' }}>
            <span className="eyebrow" style={{ justifyContent: 'center' }}>Blog</span>
            <h1 className="section-title">Aprenda a comprar <em>sem errar</em></h1>
            <p className="section-sub" style={{ marginTop: 14 }}>
              Guias diretos sobre financiamento, FGTS, custos, bairros e mercado de Uberlândia — pra você decidir com segurança.
            </p>
          </div>
        </Reveal>

        <div className="condo-chips" style={{ justifyContent: 'center', margin: '26px 0 30px' }}>
          {CATEGORIAS.map((c) => (
            <button key={c} className={`condo-chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>

        <div className="post-grid">
          {lista.map((p) => <CardPost key={p.slug} p={p} views={views[p.slug] || 0} />)}
        </div>
      </div>
    </main>
  )
}
