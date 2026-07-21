import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { linkWhatsApp } from '../data'
import { registrarView } from '../engajamento'
import { useSEO } from '../useSEO'
import { onImgError } from '../img'
import OuvirPost from '../components/OuvirPost'
import { NavbarVG, FooterVG, WhatsFloatVG } from '../components/vg/ChromeVG'
import { CardPostVG, dataCurta } from '../components/vg/CardPostVG'

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

const ancora = (txt, i) =>
  'sec-' + i + '-' + String(txt || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)

export default function BlogPostVG() {
  const { slug } = useParams()
  // O post vem por fetch de /blog-data/{slug}.json (gerado no build pelo prerender) —
  // assim o bundle JS do blog não carrega os 189 posts (blog-extra.json, 1,4MB).
  // undefined = carregando · null = não existe · objeto = post.
  const [p, setP] = useState(undefined)
  const [outros, setOutros] = useState([])
  const [views, setViews] = useState(0)

  useEffect(() => {
    let vivo = true
    setP(undefined)
    fetch(`/blog-data/${encodeURIComponent(slug || '')}.json`)
      .then((r) => {
        if (r.ok) return r.json()
        // em produção o 404 é resposta definitiva (post não existe) — não baixa o fallback
        if (r.status === 404 && !import.meta.env.DEV) return null
        return Promise.reject(new Error('sem blog-data'))
      })
      .then((post) => { if (vivo) setP(post && post.slug ? post : null) })
      .catch(() => {
        // dev (vite serve só o public/, sem blog-data) ou falha de rede: cai pro módulo
        // completo, que vira um chunk lazy próprio — em produção este caminho não roda.
        import('../blog')
          .then((m) => { if (vivo) setP(m.getPost(slug) || null) })
          .catch(() => { if (vivo) setP(null) })
      })
    return () => { vivo = false }
  }, [slug])

  // "Continue lendo": usa o índice leve que a listagem do blog já usa (e já pode estar em cache)
  useEffect(() => {
    let vivo = true
    fetch('/blog-preview.json')
      .then((r) => (r.ok ? r.json() : []))
      .then((lista) => { if (vivo && Array.isArray(lista)) setOutros(lista) })
      .catch(() => {})
    return () => { vivo = false }
  }, [])

  // registra a leitura (contador real no KV)
  useEffect(() => {
    if (!p) return
    registrarView(p.slug).then((r) => { if (r && typeof r.views === 'number') setViews(r.views) })
  }, [p?.slug])

  useSEO({
    title: p ? `${p.titulo} | Blog Vinícius Graton` : (p === null ? 'Post não encontrado' : 'Blog | Vinícius Graton'),
    description: p ? p.resumo : 'Blog de imóveis de Uberlândia por Vinícius Graton.',
    path: `/blog/${slug || ''}`,
    image: p?.capa || undefined,
    // post inexistente não deve ser indexado (o Google não gosta de "soft 404")
    noindex: p === null,
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

  // índice do artigo (só quando há seções suficientes para valer a pena)
  const indice = useMemo(() => {
    if (!p) return []
    return (p.conteudo || [])
      .map((b, i) => ({ b, i }))
      .filter(({ b }) => (b.tipo === 'h2' || b.tipo === 'h') && b.txt)
      .map(({ b, i }) => ({ id: ancora(b.txt, i), txt: b.txt }))
  }, [p])

  const wa = linkWhatsApp(
    p ? `Olá Vinícius! Li o artigo "${p.titulo}" no site e tenho uma dúvida.`
      : 'Olá Vinícius! Li um artigo no seu site e quero tirar uma dúvida.',
  )

  if (p === undefined) {
    return (
      <div className="vgx">
        <NavbarVG ativo="blog" />
        <div className="vgx-art-load" aria-busy="true">Carregando o artigo...</div>
        <FooterVG />
      </div>
    )
  }

  if (!p) {
    return (
      <div className="vgx">
        <NavbarVG ativo="blog" />
        <section className="vgx-art-404">
          <h1>Post não encontrado</h1>
          <p>O artigo que você procura saiu do ar ou mudou de endereço.</p>
          <Link to="/blog" className="vgx-btn-red">Ver o blog</Link>
        </section>
        <FooterVG />
        <WhatsFloatVG />
      </div>
    )
  }

  const maisPosts = outros.filter((x) => x.slug !== p.slug).slice(0, 3)
  const atualizadoFmt = p.atualizado ? dataCurta(p.atualizado) : ''

  return (
    <div className="vgx">
      <NavbarVG ativo="blog" />

      <article className="vgx-artigo">
        <nav className="vgx-art-bread">
          <Link to="/">Início</Link>
          <span>/</span>
          <Link to="/blog">Blog</Link>
          <span>/</span>
          <b>{p.categoria}</b>
        </nav>

        <header className="vgx-art-head">
          <span className="vgx-art-kicker">
            {[p.categoria, dataCurta(p.data), p.leitura, views > 0 ? `${views} ${views === 1 ? 'leitura' : 'leituras'}` : '']
              .filter(Boolean)
              .join(' · ')}
          </span>
          <h1>{p.titulo}</h1>
          <p className="vgx-art-lead">{p.resumo}</p>
        </header>

        {p.capa && (
          <img className="vgx-art-capa" src={p.capa} alt={p.titulo} onError={onImgError} />
        )}

        <div className="vgx-art-ouvir"><OuvirPost post={p} /></div>

        {indice.length >= 3 && (
          <nav className="vgx-art-indice" aria-label="Índice do artigo">
            <b>Neste artigo</b>
            <ul>
              {indice.map((s) => <li key={s.id}><a href={`#${s.id}`}>{s.txt}</a></li>)}
            </ul>
          </nav>
        )}

        <div className="vgx-art-corpo">
          {(p.conteudo || []).map((b, i) => {
            switch (b.tipo) {
              case 'h2': case 'h':
                return <h2 key={i} id={ancora(b.txt, i)}>{b.txt}</h2>
              case 'h3':
                return <h3 key={i}>{b.txt}</h3>
              case 'lista':
                return <ul className="vgx-art-lista" key={i}>{(b.itens || []).map((it, j) => <li key={j}>{richText(it)}</li>)}</ul>
              case 'tabela':
                return (
                  <div className="vgx-art-tabela-wrap" key={i}>
                    <table className="vgx-art-tabela">
                      {b.cols && <thead><tr>{b.cols.map((c, j) => <th key={j}>{c}</th>)}</tr></thead>}
                      <tbody>{(b.linhas || []).map((ln, j) => <tr key={j}>{ln.map((cel, k) => <td key={k}>{richText(cel)}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                )
              case 'destaque':
                return <div className="vgx-art-destaque" key={i}>{richText(b.txt)}</div>
              case 'img': case 'imagem':
                return (
                  <figure className="vgx-art-fig" key={i}>
                    <img src={b.src} alt={b.alt || ''} loading="lazy" referrerPolicy="no-referrer" onError={onImgError} />
                    {b.legenda && <figcaption>{b.legenda}</figcaption>}
                  </figure>
                )
              case 'cta':
                return (
                  <div className="vgx-art-cta-inline" key={i}>
                    <a
                      className="vgx-btn-red"
                      href={linkWhatsApp(b.txt || 'Olá Vinícius! Quero falar sobre meu imóvel em Uberlândia.')}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {b.label || 'Falar com o Vinícius'}
                    </a>
                  </div>
                )
              case 'faq':
                return (
                  <div className="vgx-art-faq" key={i}>
                    <h2 id={`faq-${i}`}>Perguntas frequentes</h2>
                    {(b.perguntas || []).map((q, j) => (
                      <div className="vgx-art-faq-item" key={j}>
                        <b>{q.q}</b>
                        <p>{richText(q.a)}</p>
                      </div>
                    ))}
                  </div>
                )
              default:
                return <p key={i}>{richText(b.txt)}</p>
            }
          })}
        </div>

        {(p.fontes || []).length > 0 && (
          <div className="vgx-art-fontes">
            <b>Fontes e referências</b>
            <ul>{p.fontes.map((f, i) => <li key={i}><a href={f.url} target="_blank" rel="noopener noreferrer">{f.nome}</a></li>)}</ul>
          </div>
        )}

        <div className="vgx-art-autor">
          <img src="/vinicius-graton.jpg" alt="Vinícius Graton, consultor de imóveis em Uberlândia" loading="lazy" onError={onImgError} />
          <div className="vgx-art-autor-txt">
            <b>Escrito por Vinícius Graton</b>
            <span>
              Consultor de imóveis em Uberlândia, em parceria com a Rotina Imobiliária. Acompanha compra,
              venda e locação com curadoria criteriosa, da primeira conversa à entrega das chaves.
              {atualizadoFmt ? ` Atualizado em ${atualizadoFmt}.` : ''}
            </span>
          </div>
          <a href={wa} target="_blank" rel="noopener noreferrer" className="vgx-btn-red">Tirar uma dúvida</a>
        </div>

        <p className="vgx-art-nota">
          Vai vender um imóvel em Uberlândia? Você também pode{' '}
          <a href="https://aicapitei.com.br" target="_blank" rel="noopener noreferrer">anunciar grátis no aicapitei</a>,
          portal parceiro que divulga em todos os portais e dá cashback na venda.
        </p>
      </article>

      {maisPosts.length > 0 && (
        <section className="vgx-art-outros vgx-reveal">
          <h2>Continue lendo</h2>
          <div className="vgx-bgrid vgx-bgrid--mini">
            {maisPosts.map((x) => <CardPostVG key={x.slug} p={x} mini />)}
          </div>
        </section>
      )}

      <FooterVG />
      <WhatsFloatVG />
    </div>
  )
}
