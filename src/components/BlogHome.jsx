import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Reveal from './Reveal'
import CardPost from './CardPost'
import { lerBlogViews } from '../engajamento'
import { IconArrow } from './icons'

export default function BlogHome() {
  const [posts, setPosts] = useState(null)
  const [views, setViews] = useState(null)

  useEffect(() => {
    fetch('/blog-preview.json')
      .then((r) => (r.ok ? r.json() : null))
      .then(setPosts)
      .catch(() => setPosts([]))
    lerBlogViews().then(setViews)
  }, [])

  if (!posts || posts.length < 4) return null

  const totalViews = views ? Object.values(views).reduce((a, b) => a + b, 0) : 0
  const fonte = views && totalViews > 0
    ? [...posts].sort((a, b) => (views[b.slug] || 0) - (views[a.slug] || 0))
    : [...posts].sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')))
  const sel = fonte.slice(0, 7)
  if (sel.length < 4) return null
  const feat = sel[0]
  const resto = sel.slice(1, 7)
  const vw = (s) => (views && views[s]) || 0

  return (
    <section className="section--light blog-home">
      <div className="container">
        <Reveal>
          <div className="cat-head" style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 40px' }}>
            <span className="eyebrow" style={{ justifyContent: 'center' }}>Do meu blog</span>
            <h2 className="section-title">Conteúdo que <em>te ajuda a decidir</em></h2>
            <p className="section-sub" style={{ marginTop: 12 }}>Guias práticos pra você comprar, vender e investir com segurança em Uberlândia.</p>
          </div>
        </Reveal>

        <Reveal>
          <Link className="blog-feat" to={`/blog/${feat.slug}`}>
            <span className={`blog-feat-capa blog-cor-${feat.cor}`}>
              {feat.capa && <img src={feat.capa} alt={feat.titulo} loading="lazy" />}
              <span className="post-cat">{feat.categoria}</span>
            </span>
            <span className="blog-feat-body">
              <span className="blog-feat-tag">★ Destaque do blog</span>
              <b className="blog-feat-titulo">{feat.titulo}</b>
              <span className="blog-feat-resumo">{feat.resumo}</span>
              <span className="post-meta">{vw(feat.slug) > 0 ? `${vw(feat.slug)} leituras · ` : ''}{feat.leitura} de leitura <span className="post-ver">Ler artigo <IconArrow width={14} height={14} /></span></span>
            </span>
          </Link>
        </Reveal>

        <div className="post-grid" style={{ marginTop: 24 }}>
          {resto.map((p) => <CardPost key={p.slug} p={p} views={vw(p.slug)} />)}
        </div>

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Link className="btn btn-gold" to="/blog">Ver todos os {posts.length} artigos <IconArrow /></Link>
        </div>
      </div>
    </section>
  )
}
