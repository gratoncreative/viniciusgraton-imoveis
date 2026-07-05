import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getPost, POSTS } from '../blog'
import CardPost from '../components/CardPost'
import { linkWhatsApp } from '../data'
import { registrarView } from '../engajamento'
import { useSEO } from '../useSEO'
import { IconArrow, IconWhats } from '../components/icons'
import OuvirPost from '../components/OuvirPost'

// negrito estratégico **termo** e links [texto](url) (internos e externos)
const richText = (t) => String(t || '').split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).map((s, i) => {
  if (s.startsWith('**') && s.endsWith('**')) return <strong key={i}>{s.slice(2, -2)}</strong>
  const m = s.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
  if (m) {
    const ext = /^https:\/\//.test(m[2])
    const interno = /^[/#]/.test(m[2]) // só caminho interno seguro (bloqueia javascript:, data:, etc.)
    if (ext) return <a key={i} href={m[2]} target="_blank" rel="noopener noreferrer">{m[1]}</a>
    if (interno) return <Link key={i} to={m[2]}>{m[1]}</Link>
    return m[1] // esquema não permitido → vira texto puro
  }
  return s
})

export default function BlogPost() {
  const { slug } = useParams()
  const p = getPost(slug)
  const [views, setViews] = useState(0)

  // registra a leitura (contador real no KV)
  useEffect(() => {
    if (!p) return
    registrarView(p.slug).then((r) => { if (r && typeof r.views === 'number') setViews(r.views) })
  }, [p?.slug])

  useSEO({
    title: p ? `${p.titulo} | Blog Vinícius Graton` : 'Post não encontrado',
    description: p ? p.resumo : 'Post não encontrado.',
    path: `/blog/${slug || ''}`,
    image: p?.capa || undefined,
  })

  useEffect(() => {
    if (!p) return
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = 'post-jsonld'
    const url = `https://viniciusgraton.com.br/blog/${p.slug}`
    const faqBloco = (p.conteudo || []).find((b) => b.tipo === 'faq')
    const grafo = [{
      '@type': 'Article',
      '@id': `${url}#article`,
      headline: p.titulo, description: p.resumo, datePublished: p.data, dateModified: p.atualizado || p.data, articleSection: p.categoria,
      url,
      ...(p.capa ? { image: { '@type': 'ImageObject', url: `https://viniciusgraton.com.br${p.capa}`, contentUrl: `https://viniciusgraton.com.br${p.capa}` } } : {}),
      author: { '@type': 'Person', name: 'Vinícius Graton', jobTitle: 'Consultor de Imóveis', worksFor: { '@type': 'Organization', name: 'Rotina Imobiliária', url: 'https://www.rotina.com.br/' } },
      publisher: { '@type': 'Organization', name: 'Vinícius Graton Imóveis', url: 'https://viniciusgraton.com.br', logo: { '@type': 'ImageObject', url: 'https://viniciusgraton.com.br/icon-512.png', width: 512, height: 512 }},
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    }]
    if (faqBloco && (faqBloco.perguntas || []).length) {
      grafo.push({ '@type': 'FAQPage', mainEntity: faqBloco.perguntas.map((q) => ({ '@type': 'Question', name: q.q, acceptedAnswer: { '@type': 'Answer', text: q.a } })) })
    }
    grafo.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: 'https://viniciusgraton.com.br/' },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://viniciusgraton.com.br/blog' },
        { '@type': 'ListItem', position: 3, name: p.titulo, item: url },
      ],
    })
    el.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': grafo })
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
          {p.capa && <img className="post-hero-img" src={p.capa} alt={p.titulo} />}
          <span className="post-cat">{p.categoria}</span>
          <h1>{p.titulo}</h1>
          <p className="post-hero-meta">{dataFmt} · {p.leitura} de leitura{views > 0 ? ` · ${views} ${views === 1 ? 'leitura' : 'leituras'}` : ''} · por Vinícius Graton</p>
        </div>

        <article className="post-artigo">
          <OuvirPost post={p} />
          <p className="post-lead">{p.resumo}</p>
          {p.conteudo.map((b, i) => {
            switch (b.tipo) {
              case 'h2': case 'h': return <h2 key={i}>{b.txt}</h2>
              case 'h3': return <h3 key={i}>{b.txt}</h3>
              case 'lista': return <ul className="post-lista" key={i}>{(b.itens || []).map((it, j) => <li key={j}>{richText(it)}</li>)}</ul>
              case 'tabela': return (
                <div className="post-tabela-wrap" key={i}>
                  <table className="post-tabela">
                    {b.cols && <thead><tr>{b.cols.map((c, j) => <th key={j}>{c}</th>)}</tr></thead>}
                    <tbody>{(b.linhas || []).map((ln, j) => <tr key={j}>{ln.map((cel, k) => <td key={k}>{richText(cel)}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              )
              case 'destaque': return <div className="post-destaque" key={i}>{richText(b.txt)}</div>
              case 'img': case 'imagem': return <figure className="post-fig" key={i}><img src={b.src} alt={b.alt || ''} loading="lazy" referrerPolicy="no-referrer" />{b.legenda && <figcaption>{b.legenda}</figcaption>}</figure>
              case 'cta': return <div className="post-cta-inline" key={i}><a className="btn btn-gold" href={linkWhatsApp(b.txt || 'Olá Vinícius! Quero falar sobre meu imóvel em Uberlândia.')} target="_blank" rel="noopener noreferrer"><IconWhats /> {b.label || 'Falar com o Vinícius'}</a></div>
              case 'faq': return (
                <div className="post-faq" key={i}>
                  <h2>Perguntas frequentes</h2>
                  {(b.perguntas || []).map((q, j) => <div className="post-faq-item" key={j}><b>{q.q}</b><p>{richText(q.a)}</p></div>)}
                </div>
              )
              default: return <p key={i}>{richText(b.txt)}</p>
            }
          })}
          {(p.fontes || []).length > 0 && (
            <div className="post-fontes">
              <b>Fontes e referências:</b>
              <ul>{p.fontes.map((f, i) => <li key={i}><a href={f.url} target="_blank" rel="noopener noreferrer">{f.nome}</a></li>)}</ul>
            </div>
          )}
          <div className="post-autor">
            <img src="/vinicius-graton.jpg" alt="Vinícius Graton, consultor de imóveis em Uberlândia" loading="lazy" />
            <div>
              <b>Vinícius Graton</b>
              <span>Consultor de imóveis em Uberlândia pela Rotina Imobiliária. Atende compra, venda e locação com curadoria criteriosa e acompanhamento da primeira conversa à entrega das chaves.{p.atualizado ? ` Atualizado em ${new Date(p.atualizado + 'T12:00:00').toLocaleDateString('pt-BR')}.` : ''}</span>
            </div>
          </div>
        </article>

        <div className="post-cta">
          <div>
            <b>Quer um acompanhamento de verdade nessa decisão?</b>
            <span>Comigo você tem atenção dedicada do início ao fim - eu cuido de cada detalhe, no seu tempo, até a entrega das chaves. Aqui você não é mais um número.</span>
          </div>
          <a className="btn btn-gold" href={linkWhatsApp('Olá Vinícius! Li um artigo no seu site e quero tirar uma dúvida / começar a procurar meu imóvel.')} target="_blank" rel="noopener noreferrer">
            <IconWhats /> Falar com o Vinícius
          </a>
        </div>

        <p style={{ marginTop: 18, fontSize: 14, color: '#5a6478' }}>
          Vai vender um imóvel em Uberlândia? Você também pode <a href="https://aicapitei.com.br" target="_blank" rel="noopener" style={{ color: '#1C2A44', fontWeight: 600 }}>anunciar grátis no aicapitei</a>, portal parceiro que divulga em todos os portais e dá cashback na venda.
        </p>

        <div className="det-rel" style={{ marginTop: 50 }}>
          <h2 className="det-rel-titulo">Continue lendo</h2>
          <div className="post-grid">{outros.map((x) => <CardPost key={x.slug} p={x} />)}</div>
        </div>
      </div>
    </main>
  )
}
