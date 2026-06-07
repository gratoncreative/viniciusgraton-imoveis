import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Reveal from './Reveal'
import { CardPost } from '../pages/Blog'
import { POSTS, postsDestaque } from '../blog'
import { lerBlogViews } from '../engajamento'
import { IconArrow } from './icons'

export default function BlogHome() {
  const [views, setViews] = useState(null)
  useEffect(() => { lerBlogViews().then(setViews) }, [])
  // 3 mais lidos (views reais); enquanto não há leituras, usa a curadoria
  const totalViews = views ? Object.values(views).reduce((a, b) => a + b, 0) : 0
  const posts = views && totalViews > 0
    ? [...POSTS].sort((a, b) => (views[b.slug] || 0) - (views[a.slug] || 0)).slice(0, 3)
    : postsDestaque()
  if (!posts.length) return null
  return (
    <section className="section--light blog-home">
      <div className="container">
        <Reveal>
          <div className="cat-head" style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 40px' }}>
            <span className="eyebrow" style={{ justifyContent: 'center' }}>Do meu blog</span>
            <h2 className="section-title">Conteúdo que <em>te ajuda a decidir</em></h2>
            <p className="section-sub" style={{ marginTop: 12 }}>Os artigos mais lidos para você comprar com segurança.</p>
          </div>
        </Reveal>
        <div className="post-grid">
          {posts.map((p) => <CardPost key={p.slug} p={p} views={(views && views[p.slug]) || 0} />)}
        </div>
        <div style={{ textAlign: 'center', marginTop: 36 }}>
          <Link className="btn btn-ghost" to="/blog">Ver todos os artigos <IconArrow /></Link>
        </div>
      </div>
    </section>
  )
}
