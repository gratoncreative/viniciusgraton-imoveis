import { Link } from 'react-router-dom'
import { onImgError } from '../../img'

const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

// "2026-07-20" → "20 jul 2026" (determinístico, sem depender do locale do aparelho)
export function dataCurta(d) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || ''))
  if (!m) return ''
  return `${m[3]} ${MES[Number(m[2]) - 1] || ''} ${m[1]}`
}

// Card de artigo no padrão do redesign (.vgx). `mini` = versão do "Continue lendo".
export function CardPostVG({ p, views = 0, mini = false }) {
  if (mini) {
    return (
      <Link to={`/blog/${p.slug}`} className="vgx-bcard vgx-bcard--mini">
        <img className="vgx-bcard-img" src={p.capa} alt={p.titulo} loading="lazy" onError={onImgError} />
        <span className="vgx-bcard-body">
          <span className="vgx-bcard-tema">{p.categoria}</span>
          <span className="vgx-bcard-tit">{p.titulo}</span>
        </span>
      </Link>
    )
  }

  return (
    <Link to={`/blog/${p.slug}`} className="vgx-bcard">
      <img className="vgx-bcard-img" src={p.capa} alt={p.titulo} loading="lazy" onError={onImgError} />
      <span className="vgx-bcard-body">
        <span className="vgx-bcard-meta">
          {p.categoria}
          {p.data ? ` · ${dataCurta(p.data)}` : ''}
        </span>
        <span className="vgx-bcard-tit">{p.titulo}</span>
        <span className="vgx-bcard-res">{p.resumo}</span>
        <span className="vgx-bcard-ler">
          <span className="vgx-bcard-ler-a">Ler artigo →</span>
          <span className="vgx-bcard-ler-b">
            {views > 0 ? `${views} ${views === 1 ? 'leitura' : 'leituras'} · ` : ''}
            {p.leitura}
          </span>
        </span>
      </span>
    </Link>
  )
}

export default CardPostVG
