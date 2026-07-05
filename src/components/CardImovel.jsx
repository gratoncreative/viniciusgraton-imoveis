import { useNavigate, Link } from 'react-router-dom'
import { formatPreco, formatArea, resumoImovel, truncar, linkWhatsApp, waImovel, oportunidade, ehEsquina, parcelaEstimada } from '../data'
import PrecoGate from './PrecoGate'
import { IconWhats, ICONS } from './icons'
import Engajamento from './Engajamento'
import { onImgError } from '../img'

const plural = (n, s, p) => (n > 1 ? p : s)

// Selos de oportunidade (legítimos): % de desconto real ou abaixo do m² do bairro
// REGRA: todo selo sobreposto à foto deve dizer o QUE é — o cliente não tem
// contexto. Nada de número solto (ex.: "-11%"); sempre rotular ("Preço caiu 11%").
function SelosOportunidade({ op }) {
  if (!op || (!op.temDesconto && !op.abaixoMercado)) return null
  const setaBaixo = <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
  return (
    <div className="im-selos">
      {op.temDesconto && <span className="im-selo im-selo--off">{setaBaixo}Preço caiu {op.pctDesconto}%</span>}
      {op.abaixoMercado && <span className="im-selo im-selo--mercado">{setaBaixo}Abaixo do mercado</span>}
    </div>
  )
}

// Selo de TOUR 360° — recurso premium que poucos imóveis têm. Destaque dourado na foto.
function Selo360({ im }) {
  if (!im.tour360 && !im.tour3d) return null
  return (
    <span className="im-360" title="Este imóvel tem Tour Virtual 360°">
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 3a14 14 0 0 1 4 9 14 14 0 0 1-4 9 14 14 0 0 1-4-9 14 14 0 0 1 4-9z" /><path d="M3 12h18" /></svg>
      360°
    </span>
  )
}

// Selo de transparência para anúncio impulsionado (publicidade). Clicável: leva o
// visitante a impulsionar o próprio anúncio. Atende à sinalização exigida (CDC/CONAR).
function SeloPublicidade({ im }) {
  if (!im.impulsionado) return null
  return (
    <Link
      to="/impulsionar"
      className="im-pub"
      onClick={(e) => e.stopPropagation()}
      title="Publicidade - anúncio impulsionado (destaque pago). Você também pode impulsionar o seu anúncio."
    >
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 15l7-7 7 7" /></svg>
      Publicidade
    </Link>
  )
}

function Spec({ icon, valor, label }) {
  const Icon = ICONS[icon]
  return (
    <span className="im-spec">
      {Icon && <Icon width={17} height={17} />}
      <b>{valor}</b>{label ? ' ' + label : ''}
    </span>
  )
}

export default function CardImovel({ im, variante, overlayLabel }) {
  const navigate = useNavigate()

  const ehApto = /apart|kit|studio|stúdio|loft|flat|cobertura/i.test(im.tipo || '')
  const temAndar = im.andar !== undefined && im.andar !== null && im.andar !== ''
  const terreo = im.andar === 0 || im.andar === '0' || /t[eé]rreo/i.test(String(im.andar))
  const specs = [
    im.quartos > 0 && { icon: 'bed', valor: im.quartos, label: plural(im.quartos, 'quarto', 'quartos') },
    im.suites > 0 && { icon: 'sparkle', valor: im.suites, label: plural(im.suites, 'suíte', 'suítes') },
    im.banheiros > 0 && { icon: 'bath', valor: im.banheiros, label: plural(im.banheiros, 'banheiro', 'banheiros') },
    im.vagas > 0 && { icon: 'car', valor: im.vagas, label: plural(im.vagas, 'vaga', 'vagas') },
    im.area > 0 && { icon: 'area', valor: formatArea(im.area), label: '' },
    ehApto && temAndar && { icon: 'floor', valor: terreo ? 'Térreo' : `${im.andar}º`, label: terreo ? '' : 'andar' },
    ehApto && typeof im.elevador === 'boolean' && { icon: 'elevator', valor: im.elevador ? 'Com' : 'Sem', label: 'elevador' },
  ].filter(Boolean)

  const op = oportunidade(im)
  const parc = parcelaEstimada(im.preco)
  // aluguel tem rota própria (códigos de venda e aluguel podem coincidir) + preço "/mês"
  const ehAluguel = im.finalidade === 'Aluguel' || im.finalidade === 'Locação'
  const detalhe = ehAluguel ? `/alugar/imovel/${im.codigo}` : `/imovel/${im.codigo}`
  const precoSufixo = ehAluguel ? '/mês' : ''
  const irParaImovel = () => navigate(detalhe)

  // ——— variante horizontal (listagem estilo portal): foto à esquerda, infos à direita ———
  if (variante === 'linha') {
    return (
      <article className={`im-linha card-clickable ${im.impulsionado ? 'im-pub-on' : ''} ${(im.tour360 || im.tour3d) ? 'im-has360' : ''}`} onClick={irParaImovel}>
        <div className="im-linha-media">
          <img src={im.img} alt={`${im.tipo} no ${im.bairro}, Uberlândia`} loading="lazy" decoding="async" onError={onImgError} />
          {overlayLabel && (
            <div className="im-linha-lbl">
              <span className="im-linha-lbl-eye">{overlayLabel.eyebrow}</span>
              <strong className="im-linha-lbl-tit">{overlayLabel.titulo} <em>{overlayLabel.em}</em></strong>
            </div>
          )}
          <span className="im-tag">{im.tipo}{ehEsquina(im) && <em className="im-tag-esq">· Esquina</em>}</span>
          {im.novo && <span className="im-novo">Novo</span>}
          <SeloPublicidade im={im} />
          <SelosOportunidade op={op} />
          <Selo360 im={im} />
        </div>
        <div className="im-linha-body">
          <div className="im-linha-top">
            <div className="im-linha-tit">
              <span className="im-linha-tipo">{im.tipo}{im.suites > 0 ? ` · ${im.suites} ${plural(im.suites, 'suíte', 'suítes')}` : ''}</span>
              <h3 className="im-bairro">{im.bairro}</h3>
              <p className="im-local">{im.cidade} - {im.uf} · Cód. {im.codigo}</p>
            </div>
            <Engajamento im={im} variante="detalhe" />
          </div>
          <div className="im-specs im-specs--min">
            {[
              im.area > 0 && { icon: 'area', valor: formatArea(im.area), label: '' },
              im.quartos > 0 && { icon: 'bed', valor: im.quartos, label: plural(im.quartos, 'quarto', 'quartos') },
              im.banheiros > 0 && { icon: 'bath', valor: im.banheiros, label: plural(im.banheiros, 'banheiro', 'banheiros') },
              im.vagas > 0 && { icon: 'car', valor: im.vagas, label: plural(im.vagas, 'vaga', 'vagas') },
            ].filter(Boolean).map((s, i) => <Spec key={i} {...s} />)}
          </div>
          {im.baixouEm && (
            <span className="im-baixou-em">
              Preço reduzido em {new Date(im.baixouEm).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          )}
          <div className="im-linha-rodape">
            <div className="im-linha-precobloco">
              <PrecoGate valor={im.preco} anterior={im.precoAnterior} className="im-linha-preco" tipo="linha" sufixo={precoSufixo} />
              {im.condominio > 0 && <span className="im-linha-cond">Condomínio R$ {Number(im.condominio).toLocaleString('pt-BR')}</span>}
            </div>
            <div className="im-actions">
              <Link className="im-ver" to={detalhe} onClick={(e) => e.stopPropagation()}>Ver detalhes</Link>
              <a className="im-cta" href={linkWhatsApp(waImovel(im))} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                <IconWhats width={18} height={18} /> Contatar
              </a>
            </div>
          </div>
        </div>
      </article>
    )
  }

  return (
    <article
      className={`card-imovel im-card card-clickable ${im.impulsionado ? 'im-pub-on' : ''} ${(im.tour360 || im.tour3d) ? 'im-has360' : ''}`}
      onClick={irParaImovel}
    >
      <div className="card-media im-media">
        <img src={im.img} alt={`${im.tipo} no ${im.bairro}, Uberlândia`} loading="lazy" decoding="async" onError={onImgError} />
        <span className="im-tag">{im.tipo}{ehEsquina(im) && <em className="im-tag-esq">· Esquina</em>}</span>
        {im.novo && <span className="im-novo">Novo</span>}
        <SeloPublicidade im={im} />
        <SelosOportunidade op={op} />
        <Selo360 im={im} />
        <Engajamento im={im} variante="card" />
        <PrecoGate valor={im.preco} anterior={im.precoAnterior} className="im-preco" tipo="card" sufixo={precoSufixo} />
      </div>
      <div className="card-body im-body">
        <h3 className="im-bairro">{im.bairro}</h3>
        <p className="im-local">{im.cidade} - {im.uf} · Cód. {im.codigo}</p>
        <p className="im-desc">{truncar(resumoImovel(im), 150)}</p>
        {im.baixouEm && (
          <span className="im-baixou-em im-baixou-em--card">
            Reduzido em {new Date(im.baixouEm).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        )}
        <div className="im-specs">
          {specs.map((s, i) => <Spec key={i} {...s} />)}
        </div>
        {!ehAluguel && parc > 0 && (
          <p className="im-parcela" title="Estimativa: entrada de 20%, 420 meses, ~11,19% a.a. (tabela Price). Sujeito a análise de crédito.">
            ou financie a partir de <b>R$ {parc.toLocaleString('pt-BR')}</b>/mês <i>· estimativa</i>
          </p>
        )}
        <div className="im-actions">
          <Link
            className="im-ver"
            to={detalhe}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Ver detalhes do ${im.tipo} no ${im.bairro}, ${im.cidade}`}
          >
            Ver detalhes
          </Link>
          <a
            className="im-cta"
            href={linkWhatsApp(waImovel(im))}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            <IconWhats width={18} height={18} /> Contatar
          </a>
        </div>
      </div>
    </article>
  )
}
