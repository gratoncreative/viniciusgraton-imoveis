import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getPost, POSTS } from '../blog'
import { CardPost } from './Blog'
import { linkWhatsApp } from '../data'
import { useSEO } from '../useSEO'
import { IconArrow, IconWhats } from '../components/icons'

export default function BlogPost() {
  const { slug } = useParams()
  const p = getPost(slug)

  useSEO({
    title: p ? `${p.titulo} | Blog Vinícius Graton` : 'Post não encontrado',
    description: p ? p.resumo : 'Post não encontrado.',
    path: `/blog/${slug || ''}`,
  })

  useEffect(() => {
    if (!p) return
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = 'post-jsonld'
    el.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Article',
      headline: p.titulo, description: p.resumo, datePublished: p.data, articleSection: p.categoria,
      author: { '@type': 'Person', name: 'Vinícius Graton' },
      publisher: { '@type': 'Organization', name: 'Vinícius Graton Imóveis' },
      mainEntityOfPage: `https://viniciusgraton.com.br/blog/${p.slug}`,
    })
    document.head.appendChild(el)
    return () => { document.getElementById('post-jsonld')?.remove() }
  }, [p])

  if (!p) {
    return (
      <main className="pagina section--light det-vazio">
        <div className="container" style={{ textAlign: 'center' }}>
          <h1 className="section-title">Post não encontrado</h1>
          <Link className="btn btn-gold" to="/blog" style={{ marginTop: 20 }}>Ver o blog <IconArrow /></Link>
        </div>
      </main>
    )
  }

  const outros = POSTS.filter((x) => x.slug !== p.slug).slice(0, 3)
  const dataFmt = new Date(p.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <main className="pagina section--light det blog-post-pg">
      <div className="container" style={{ maxWidth: 820 }}>
        <nav className="det-bread">
          <Link to="/">Início</Link> <span>/</span> <Link to="/blog">Blog</Link> <span>/</span> <b>{p.categoria}</b>
        </nav>

        <div className={`post-hero blog-cor-${p.cor}`}>
          <span className="post-cat">{p.categoria}</span>
          <h1>{p.titulo}</h1>
          <p className="post-hero-meta">{dataFmt} · {p.leitura} de leitura · por Vinícius Graton</p>
        </div>

        <article className="post-artigo">
          <p className="post-lead">{p.resumo}</p>
          {p.conteudo.map((b, i) => b.tipo === 'h'
            ? <h2 key={i}>{b.txt}</h2>
            : <p key={i}>{b.txt}</p>)}
        </article>

        <div className="post-cta">
          <div>
            <b>Quer ajuda com isso na prática?</b>
            <span>Eu te oriento de graça, no seu ritmo, e cuido de tudo até a entrega das chaves.</span>
          </div>
          <a className="btn btn-gold" href={linkWhatsApp('Olá Vinícius! Li um artigo no seu site e quero tirar uma dúvida / começar a procurar meu imóvel.')} target="_blank" rel="noopener">
            <IconWhats /> Falar com o Vinícius
          </a>
        </div>

        <div className="det-rel" style={{ marginTop: 50 }}>
          <h2 className="det-rel-titulo">Continue lendo</h2>
          <div className="post-grid">{outros.map((x) => <CardPost key={x.slug} p={x} />)}</div>
        </div>
      </div>
    </main>
  )
}
