import { Link } from 'react-router-dom'
import { IconArrow } from './icons'
import '../styles/blog.css'

export default function CardPost({ p, views }) {
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
