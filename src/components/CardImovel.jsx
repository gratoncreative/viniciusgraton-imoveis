import { useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { formatPreco, formatArea, resumoImovel, truncar, linkWhatsApp, waImovel } from '../data'
import { IconWhats, ICONS } from './icons'
import Engajamento from './Engajamento'
import { onImgError } from '../img'

const plural = (n, s, p) => (n > 1 ? p : s)

function Spec({ icon, valor, label }) {
  const Icon = ICONS[icon]
  return (
    <span className="im-spec">
      {Icon && <Icon width={17} height={17} />}
      <b>{valor}</b>{label ? ' ' + label : ''}
    </span>
  )
}

export default function CardImovel({ im, variante }) {
  const ref = useRef(null)
  const raf = useRef(0)
  const navigate = useNavigate()

  const onMove = (e) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const mx = (e.clientX - r.left) / r.width
    const my = (e.clientY - r.top) / r.height
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => {
      el.style.setProperty('--ry', `${(mx - 0.5) * 7}deg`)
      el.style.setProperty('--rx', `${(0.5 - my) * 5}deg`)
      el.style.setProperty('--act', '1')
    })
  }
  const onLeave = () => {
    const el = ref.current
    if (!el) return
    cancelAnimationFrame(raf.current)
    el.style.setProperty('--ry', '0deg')
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--act', '0')
  }

  const specs = [
    im.quartos > 0 && { icon: 'bed', valor: im.quartos, label: plural(im.quartos, 'quarto', 'quartos') },
    im.suites > 0 && { icon: 'sparkle', valor: im.suites, label: plural(im.suites, 'suíte', 'suítes') },
    im.banheiros > 0 && { icon: 'bath', valor: im.banheiros, label: plural(im.banheiros, 'banheiro', 'banheiros') },
    im.vagas > 0 && { icon: 'car', valor: im.vagas, label: plural(im.vagas, 'vaga', 'vagas') },
    im.area > 0 && { icon: 'area', valor: formatArea(im.area), label: '' },
  ].filter(Boolean)

  const irParaImovel = () => navigate(`/imovel/${im.codigo}`)

  // ——— variante horizontal (listagem estilo portal): foto à esquerda, infos à direita ———
  if (variante === 'linha') {
    return (
      <article className="im-linha card-clickable" onClick={irParaImovel}>
        <div className="im-linha-media">
          <img src={im.img} alt={`${im.tipo} no ${im.bairro}, Uberlândia`} loading="lazy" decoding="async" onError={onImgError} />
          <span className="im-tag">{im.tipo}</span>
          {im.novo && <span className="im-novo">Novo</span>}
        </div>
        <div className="im-linha-body">
          <div className="im-linha-top">
            <div>
              <h3 className="im-bairro">{im.bairro}</h3>
              <p className="im-local">{im.cidade} — {im.uf} · Cód. {im.codigo}</p>
            </div>
            <Engajamento im={im} variante="detalhe" />
          </div>
          <p className="im-desc">{truncar(resumoImovel(im), 165)}</p>
          <div className="im-specs">
            {specs.map((s, i) => <Spec key={i} {...s} />)}
          </div>
          <div className="im-linha-rodape">
            <span className="im-linha-preco">{formatPreco(im.preco)}</span>
            <div className="im-actions">
              <Link className="im-ver" to={`/imovel/${im.codigo}`} onClick={(e) => e.stopPropagation()}>Ver detalhes</Link>
              <a className="im-cta" href={linkWhatsApp(waImovel(im))} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>
                <IconWhats width={18} height={18} /> Tenho interesse
              </a>
            </div>
          </div>
        </div>
      </article>
    )
  }

  return (
    <article
      ref={ref}
      className="card-imovel im-card card-clickable"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={irParaImovel}
    >
      <div className="card-media im-media" data-depth>
        <img src={im.img} alt={`${im.tipo} no ${im.bairro}, Uberlândia`} loading="lazy" decoding="async" onError={onImgError} />
        <span className="im-tag">{im.tipo}</span>
        {im.novo && <span className="im-novo">Novo</span>}
        <Engajamento im={im} variante="card" />
        <span className="im-preco">{formatPreco(im.preco)}</span>
      </div>
      <div className="card-body im-body">
        <h3 className="im-bairro">{im.bairro}</h3>
        <p className="im-local">{im.cidade} — {im.uf} · Cód. {im.codigo}</p>
        <p className="im-desc">{truncar(resumoImovel(im), 150)}</p>
        <div className="im-specs">
          {specs.map((s, i) => <Spec key={i} {...s} />)}
        </div>
        <div className="im-actions">
          <Link
            className="im-ver"
            to={`/imovel/${im.codigo}`}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Ver detalhes do ${im.tipo} no ${im.bairro}, ${im.cidade}`}
          >
            Ver detalhes
          </Link>
          <a
            className="im-cta"
            href={linkWhatsApp(waImovel(im))}
            target="_blank"
            rel="noopener"
            onClick={(e) => e.stopPropagation()}
          >
            <IconWhats width={18} height={18} /> Tenho interesse
          </a>
        </div>
      </div>
      <span className="card-glare" aria-hidden="true" />
    </article>
  )
}
