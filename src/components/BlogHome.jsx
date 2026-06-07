import { Link } from 'react-router-dom'
import Reveal from './Reveal'
import { CardPost } from '../pages/Blog'
import { postsDestaque } from '../blog'
import { IconArrow } from './icons'

export default function BlogHome() {
  const posts = postsDestaque()
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
          {posts.map((p) => <CardPost key={p.slug} p={p} />)}
        </div>
        <div style={{ textAlign: 'center', marginTop: 36 }}>
          <Link className="btn btn-ghost" to="/blog">Ver todos os artigos <IconArrow /></Link>
        </div>
      </div>
    </section>
  )
}
