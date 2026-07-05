import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { formatPreco } from '../data'
import '../styles/laudo.css'
import '../styles/lancamentos.css'

/* ── Score ring ─────────────────────────────────────────── */
function ScoreRing({ score }) {
  const pct = Math.min(100, Math.max(0, Math.round((score / 80) * 100)))
  const r = 30, circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const color = pct >= 72 ? '#4ec567' : pct >= 50 ? '#c49a3c' : '#8a96a8'
  const grade = pct >= 72 ? 'A' : pct >= 50 ? 'B' : 'C'
  const label = pct >= 72 ? 'Excelente' : pct >= 50 ? 'Muito bom' : 'Bom'
  return (
    <div className="ldr-ring">
      <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7"/>
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          transform="rotate(-90 40 40)"/>
        <text x="40" y="37" textAnchor="middle" fontSize="17" fontWeight="800" fill={color}>{pct}</text>
        <text x="40" y="51" textAnchor="middle" fontSize="8.5" fill="rgba(255,255,255,0.38)" fontWeight="600">{grade}</text>
      </svg>
      <span className="ldr-ring-label">{label}</span>
    </div>
  )
}

/* ── m² posição bar ─────────────────────────────────────── */
function M2Bar({ m2, m2Mediana }) {
  if (!m2 || !m2Mediana) return null
  const min = m2Mediana * 0.58, max = m2Mediana * 1.42
  const range = max - min
  const pct    = Math.min(94, Math.max(6, ((m2 - min) / range) * 100))
  const medPct = Math.min(94, Math.max(6, ((m2Mediana - min) / range) * 100))
  const diff   = Math.round((m2 / m2Mediana - 1) * 100)
  const tag    = diff <= -10 ? 'bom' : diff >= 10 ? 'alto' : 'ok'
  return (
    <div className="ldr-m2bar">
      <div className="ldr-m2bar-header">
        <span className="ldr-m2bar-val">{formatPreco(Math.round(m2))}/m²</span>
        <span className={`ldr-m2bar-tag ldr-m2bar-tag--${tag}`}>
          {tag === 'bom' ? `↓ ${Math.abs(diff)}% abaixo do mercado` : tag === 'alto' ? `↑ ${diff}% acima do mercado` : '= dentro da média'}
        </span>
      </div>
      <div className="ldr-m2bar-track">
        <div className="ldr-m2bar-grad"/>
        <div className="ldr-m2bar-med" style={{ left: `${medPct}%` }} aria-label={`Mediana: ${formatPreco(Math.round(m2Mediana))}/m²`}>
          <span className="ldr-m2bar-med-tip">Mercado<br/>{formatPreco(Math.round(m2Mediana))}</span>
        </div>
        <div className="ldr-m2bar-dot" style={{ left: `${pct}%` }} aria-label={`Este imóvel: ${formatPreco(Math.round(m2))}/m²`}/>
      </div>
      <div className="ldr-m2bar-ends">
        <span>← melhor custo/m²</span>
        <span>custo/m² maior →</span>
      </div>
    </div>
  )
}

/* ── specs icons ────────────────────────────────────────── */
const Ico = ({ d, d2 }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d}/>{d2 && <path d={d2}/>}
  </svg>
)
const SPECS_CONF = [
  { key: 'quartos',   d: 'M2 9V7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2M2 9v8h20V9M2 9h20',               singular: 'quarto',   plural: 'quartos' },
  { key: 'suites',    d: 'M4 12h16M4 12V6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6M4 12v6h16v-6',            singular: 'suíte',    plural: 'suítes' },
  { key: 'banheiros', d: 'M4 12h16v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6zM4 12V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v7', singular: 'banheiro', plural: 'banheiros' },
  { key: 'vagas',     d: 'M2 8h20v13H2zM8 8V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3M8 14v1M16 14v1',       singular: 'vaga',     plural: 'vagas' },
  { key: 'area',      d: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',                        singular: 'm²',       plural: 'm²',   fmt: (v) => `${v} m²` },
  { key: 'andar',     d: 'M2 20h20M17 20V4a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v16',                         singular: 'andar',    plural: 'andar', fmt: (v) => `${v}º andar` },
]

function SpecGrid({ item }) {
  const specs = SPECS_CONF.map(({ key, d, singular, plural, fmt }) => {
    const v = item[key]
    if (!v) return null
    const label = fmt ? fmt(v) : `${v} ${v === 1 ? singular : plural}`
    return { key, d, label }
  }).filter(Boolean)
  if (!specs.length) return null
  return (
    <div className="ldr-specs">
      {specs.map(({ key, d, label }) => (
        <span key={key} className="ldr-spec"><Ico d={d}/>{label}</span>
      ))}
    </div>
  )
}

/* ── custo de aquisição ─────────────────────────────────── */
function CustoCard({ item }) {
  if (!item.preco) return null
  const itbi = Math.round(item.preco * 0.02)
  const cart = Math.round(item.preco * 0.03)
  const aval = item.aceitaFinanciamento ? 3500 : 0
  const total = item.preco + itbi + cart + aval
  const economia = item.m2Mediana > 0 && item.area > 0 && item.m2 > 0
    ? Math.round((item.m2Mediana - item.m2) * item.area)
    : 0
  return (
    <div className="ldr-custo-card">
      <p className="ldr-custo-titulo">Custo estimado de aquisição</p>
      <div className="ldr-custo-rows">
        <div className="ldr-custo-row"><span>Valor do imóvel</span><b>{formatPreco(item.preco)}</b></div>
        <div className="ldr-custo-row"><span>ITBI (~2%)</span><b>{formatPreco(itbi)}</b></div>
        <div className="ldr-custo-row"><span>Cartório (escritura + registro ~3%)</span><b>{formatPreco(cart)}</b></div>
        {aval > 0 && <div className="ldr-custo-row"><span>Avaliação bancária (estimativa)</span><b>~{formatPreco(aval)}</b></div>}
        <div className="ldr-custo-row ldr-custo-row--total"><span>Total estimado</span><b>{formatPreco(total)}</b></div>
      </div>
      {economia > 0 && (
        <p className="ldr-custo-economia">
          Economia estimada vs. mercado: <strong>{formatPreco(economia)}</strong>
          <span> - você paga {formatPreco(Math.round(item.m2))} vs {formatPreco(Math.round(item.m2Mediana))}/m² de referência</span>
        </p>
      )}
    </div>
  )
}

/* ── razões automáticas ─────────────────────────────────── */
function gerarRazoes(item, top3) {
  const r = []
  if (item.abaixoMercado && item.pctAbaixo >= 5)
    r.push({ tag: 'destaque', txt: `Preço ${item.pctAbaixo}% abaixo do valor médio do m² no ${item.bairro} - você paga menos que a maioria dos imóveis disponíveis na região.` })
  if (item.temDesconto && item.pctDesconto >= 5)
    r.push({ tag: 'positivo', txt: `Desconto real de ${item.pctDesconto}% em relação ao preço anterior registrado - oportunidade com dado concreto.` })
  if (item.m2 && item.m2Mediana && item.m2 < item.m2Mediana * 0.92) {
    const econ = Math.round(item.m2Mediana - item.m2)
    r.push({ tag: 'positivo', txt: `${formatPreco(econ)}/m² mais barato que a mediana do mercado - em ${item.area > 0 ? item.area + ' m²' : 'uma área generosa'}, isso representa economia real no total.` })
  }
  const maiorArea = top3.length > 1 && item.area > 0 && top3.every((x) => x.codigo === item.codigo || (x.area || 0) <= item.area)
  if (maiorArea)
    r.push({ tag: 'positivo', txt: `Maior área entre as 3 opções (${item.area} m²) - mais espaço pelo custo total mais competitivo da seleção.` })
  if (item.vagas >= 2)
    r.push({ tag: 'positivo', txt: `${item.vagas} vagas de garagem - diferencial valorizado e que impacta positivamente a revenda.` })
  if (item.aceitaFinanciamento && item.aceitaFgts)
    r.push({ tag: 'neutro', txt: 'Aceita financiamento bancário e FGTS - amplia as possibilidades de compra.' })
  else if (item.aceitaFinanciamento)
    r.push({ tag: 'neutro', txt: 'Aceita financiamento bancário - você pode parcelar com taxas do banco.' })
  if (item.suites >= 2)
    r.push({ tag: 'positivo', txt: `${item.suites} suítes - conforto que eleva o padrão do imóvel e o diferencia no mercado.` })
  return r.slice(0, 4)
}

/* ── galeria de fotos ───────────────────────────────────── */
function Galeria({ item }) {
  const fotos = item.fotos?.length ? item.fotos : item.img ? [item.img] : []
  const [slide, setSlide] = useState(0)
  if (!fotos.length) return <div className="ldr-sem-foto">Imóvel sem fotos disponíveis</div>
  const cur = Math.min(slide, fotos.length - 1)
  return (
    <div className="ldr-galeria">
      <img src={fotos[cur]} alt={`${item.tipo} ${item.bairro}`} className="ldr-galeria-img"/>
      {fotos.length > 1 && (
        <>
          <button className="ldr-galeria-nav ldr-galeria-nav--l" onClick={() => setSlide((s) => (s - 1 + fotos.length) % fotos.length)} aria-label="Foto anterior">‹</button>
          <button className="ldr-galeria-nav ldr-galeria-nav--r" onClick={() => setSlide((s) => (s + 1) % fotos.length)} aria-label="Próxima foto">›</button>
          <span className="ldr-galeria-cnt">{cur + 1} / {fotos.length}</span>
        </>
      )}
      <a className="ldr-galeria-link" href={`/imovel/${item.codigo}`} target="_blank" rel="noopener noreferrer">
        Ver todas as fotos →
      </a>
    </div>
  )
}

/* ── card de imóvel (top3) ──────────────────────────────── */
function ImovelCard({ item, rank, top3 }) {
  const razoes = useMemo(() => gerarRazoes(item, top3), [item, top3])
  return (
    <div className={`ldr-card ${item.melhorDeTodas ? 'ldr-card--melhor' : ''}`} id={`imovel-${item.codigo}`}>
      {item.melhorDeTodas && (
        <div className="ldr-card-crown">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M2 20l3-12 7 6 7-6 3 12H2z"/></svg>
          Melhor custo-benefício da seleção
        </div>
      )}
      <div className="ldr-card-inner">
        <div className="ldr-card-col-foto">
          <Galeria item={item}/>
          <ScoreRing score={item.score || 0}/>
        </div>
        <div className="ldr-card-col-info">
          <div className="ldr-card-header">
            <span className="ldr-card-rank">#{rank}</span>
            <div className="ldr-card-titulo">
              <span className="ldr-card-tipo">{item.tipo}</span>
              <span className="ldr-card-bairro">{item.bairro}</span>
            </div>
            <span className="ldr-card-cod">cód. {item.codigo}</span>
          </div>

          <div className="ldr-card-preco-row">
            <strong className="ldr-card-preco">{formatPreco(item.preco)}</strong>
            {item.temDesconto && item.pctDesconto >= 3 && (
              <span className="ldr-card-desc-tag">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                {item.pctDesconto}% desconto
              </span>
            )}
          </div>

          <SpecGrid item={item}/>
          <M2Bar m2={item.m2} m2Mediana={item.m2Mediana}/>

          {(item.aceitaFinanciamento || item.aceitaFgts || item.abaixoMercado) && (
            <div className="ldr-card-tags">
              {item.abaixoMercado && <span className="ldr-tag ldr-tag--verde">Abaixo do mercado</span>}
              {item.aceitaFinanciamento && <span className="ldr-tag ldr-tag--azul">Aceita financiamento</span>}
              {item.aceitaFgts && <span className="ldr-tag ldr-tag--azul">Aceita FGTS</span>}
            </div>
          )}

          {razoes.length > 0 && (
            <div className="ldr-razoes">
              <p className="ldr-razoes-titulo">Por que recomendo este imóvel</p>
              <ul className="ldr-razoes-list">
                {razoes.map((r, i) => (
                  <li key={i} className={`ldr-razao ldr-razao--${r.tag}`}>{r.txt}</li>
                ))}
              </ul>
            </div>
          )}

          <CustoCard item={item}/>

          <a className="ldr-card-link" href={`/imovel/${item.codigo}`} target="_blank" rel="noopener noreferrer">
            Ver imóvel completo
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
          </a>
        </div>
      </div>
    </div>
  )
}

/* ── comparativo com vencedores ─────────────────────────── */
const COMP_ROWS = [
  { label: 'Preço de venda',        key: 'preco',       fmt: (v) => v > 0 ? formatPreco(v) : '-',                        melhor: 'min' },
  { label: 'Área total',            key: 'area',        fmt: (v) => v > 0 ? `${v} m²` : '-',                             melhor: 'max' },
  { label: 'Valor do m²',           key: 'm2',          fmt: (v) => v > 0 ? formatPreco(Math.round(v)) : '-',             melhor: 'min' },
  { label: 'M² vs. mercado',        key: 'diffPct',     fmt: (v) => v != null ? (v > 0 ? `+${v}%` : `${v}%`) : '-',     melhor: 'min', isMkt: true },
  { label: 'Quartos',               key: 'quartos',     fmt: (v) => v > 0 ? String(v) : '-',                             melhor: 'max' },
  { label: 'Suítes',                key: 'suites',      fmt: (v) => v > 0 ? String(v) : '-',                             melhor: 'max' },
  { label: 'Vagas',                 key: 'vagas',       fmt: (v) => v > 0 ? String(v) : '-',                             melhor: 'max' },
  { label: 'Financiamento / FGTS',  key: 'aceitaFinanciamento', fmt: (v, x) => [v && 'Financiamento', x.aceitaFgts && 'FGTS'].filter(Boolean).join(' · ') || '-', melhor: 'bool' },
  { label: 'Custo total estimado',  key: 'preco',       fmt: (v) => v > 0 ? formatPreco(Math.round(v * 1.05)) : '-',     melhor: 'min', isCusto: true },
]

function Comparativo({ top3 }) {
  if (top3.length < 2) return null
  const getWinner = (row) => {
    const vals = top3.map((x) => ({ cod: x.codigo, val: x[row.key] }))
    const valid = vals.filter(({ val }) => val && val !== 0 && val !== false)
    if (valid.length < 2) return null
    if (row.melhor === 'bool') return vals.find((x) => x.val)?.cod
    if (row.melhor === 'min') return valid.reduce((a, b) => a.val < b.val ? a : b).cod
    if (row.melhor === 'max') return valid.reduce((a, b) => a.val > b.val ? a : b).cod
    return null
  }
  return (
    <div className="ldr-comp-wrap">
      <table className="ldr-comp-table">
        <thead>
          <tr>
            <th>Critério</th>
            {top3.map((x, i) => (
              <th key={x.codigo} className={x.melhorDeTodas ? 'ldr-comp-th--melhor' : ''}>
                <span className="ldr-comp-rank">#{i + 1}{x.melhorDeTodas ? ' ⭐' : ''}</span>
                <span className="ldr-comp-tipo">{x.tipo}</span>
                <span className="ldr-comp-bairro">{x.bairro}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMP_ROWS.map((row) => {
            const win = getWinner(row)
            return (
              <tr key={row.label}>
                <td className="ldr-comp-label">{row.label}</td>
                {top3.map((x) => {
                  const isWin = win === x.codigo
                  const val = row.fmt(x[row.key], x)
                  const isMktBad = row.isMkt && x.diffPct >= 10
                  return (
                    <td key={x.codigo} className={[
                      isWin ? 'ldr-comp-td--win' : '',
                      x.melhorDeTodas ? 'ldr-comp-td--melhor' : '',
                      isMktBad ? 'ldr-comp-td--warn' : '',
                    ].filter(Boolean).join(' ')}>
                      {val}
                      {isWin && <span className="ldr-comp-win-badge" aria-label="Melhor neste critério">✓</span>}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="ldr-comp-nota">✓ indica o melhor valor naquele critério. Custo total = preço + ITBI (2%) + cartório (3%).</p>
    </div>
  )
}

/* ── próximos passos ────────────────────────────────────── */
function ProximosPassos({ clienteNome }) {
  const nome = clienteNome ? clienteNome.split(' ')[0] : ''
  const waMsg = encodeURIComponent(`Olá, Vinícius! Recebi o laudo${nome ? ' para ' + nome : ''} e gostaria de agendar as visitas. Quando podemos?`)
  return (
    <div className="ldr-passos">
      <h3 className="ldr-passos-titulo">Próximos passos</h3>
      <div className="ldr-passos-grid">
        {[
          { n: '01', titulo: 'Agendar visitas', txt: 'Escolha os imóveis de interesse e agende as visitas - já organizamos o roteiro para você ver tudo em uma saída.' },
          { n: '02', titulo: 'Simular financiamento', txt: 'Se for financiar, fazemos a simulação comparativa entre bancos antes da visita, para você já chegar sabendo o que cabe.' },
          { n: '03', titulo: 'Fazer proposta', txt: 'Quando encontrar o certo, agimos rapidamente com proposta técnica para garantir a oportunidade.' },
        ].map(({ n, titulo, txt }) => (
          <div key={n} className="ldr-passo">
            <span className="ldr-passo-n">{n}</span>
            <div>
              <b className="ldr-passo-titulo">{titulo}</b>
              <p className="ldr-passo-txt">{txt}</p>
            </div>
          </div>
        ))}
      </div>
      <a
        className="ldr-passos-wa"
        href={`https://wa.me/5534991570494?text=${waMsg}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
        Falar com Vinícius e agendar visita
      </a>
    </div>
  )
}

/* ═══ PÁGINA PRINCIPAL ══════════════════════════════════════ */
export default function LaudoPage() {
  const { id } = useParams()
  const [laudo, setLaudo] = useState(null)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) { setErro('ID do laudo não encontrado.'); setLoading(false); return }
    fetch(`/api/laudo?id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error === 'expirado') setErro('Este laudo expirou e não está mais disponível.')
        else if (d.error === 'nao-encontrado') setErro('Laudo não encontrado. O link pode estar incorreto.')
        else if (d.error) setErro('Erro ao carregar o laudo.')
        else setLaudo(d)
      })
      .catch(() => setErro('Falha de conexão. Verifique sua internet.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <main className="ldr-pg ldr-pg--load">
      <div className="ldr-spinner"/>
      <p>Carregando laudo…</p>
    </main>
  )

  if (erro) return (
    <main className="ldr-pg ldr-pg--erro">
      <div className="ldr-erro-ico">📄</div>
      <h1>Laudo indisponível</h1>
      <p>{erro}</p>
      <a href="/imoveis" className="btn btn-gold">Ver imóveis disponíveis</a>
    </main>
  )

  const p    = laudo.perfil   || {}
  const m    = laudo.mercado  || {}
  const top3 = laudo.top3     || []
  const best = top3[0]
  const emissao   = new Date(laudo.criadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const expiracao = new Date(laudo.expiraEm).toLocaleDateString('pt-BR')

  const nec = [
    p.tipos?.length    && p.tipos.join(' ou '),
    p.bairros?.length  && (p.bairros.length <= 3 ? p.bairros.join(', ') : p.bairros.slice(0, 3).join(', ') + ` +${p.bairros.length - 3}`),
    p.quartosMin > 0   && `${p.quartosMin}+ quartos`,
    p.areaMin > 0      && `${p.areaMin} m² mín.`,
    p.precoMax > 0     && `até ${formatPreco(p.precoMax)}`,
  ].filter(Boolean).join(' · ')

  // economia total caso o melhor imóvel esteja abaixo do mercado
  const economiaMelhor = best && best.m2 && best.m2Mediana && best.area
    ? Math.max(0, Math.round((best.m2Mediana - best.m2) * best.area))
    : 0

  return (
    <main className="ldr-pg">
      <div className="ldr-container">

        {/* ── CABEÇALHO ──────────────────────────────────── */}
        <header className="ldr-header">
          <div className="ldr-header-top">
            <div className="ldr-header-marca">
              <img src="/logo.svg" alt="" className="ldr-logo" onError={(e) => { e.target.style.display = 'none' }}/>
              <div>
                <span className="ldr-marca-nome">Rotina Imobiliária</span>
                <span className="ldr-marca-sub">Vinícius Graton · Consultor</span>
              </div>
            </div>
            <button className="btn btn-gold ldr-print-btn no-print" onClick={() => window.print()}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              Salvar PDF
            </button>
          </div>
          <div className="ldr-header-body">
            <div className="ldr-header-tag">Laudo de Seleção Imobiliária · Exclusivo</div>
            <h1 className="ldr-titulo">
              {laudo.clienteNome ? (
                <>Seleção exclusiva para <em>{laudo.clienteNome}</em></>
              ) : 'Seleção Imobiliária Personalizada'}
            </h1>
            {nec && <p className="ldr-subtitulo">{nec}</p>}
          </div>
          <div className="ldr-header-meta">
            <span>Emitido em {emissao}</span>
            <span className="ldr-header-sep">·</span>
            <span>Válido até {expiracao}</span>
            <span className="ldr-header-sep">·</span>
            <span>{top3.length} imóvel{top3.length !== 1 ? 'is' : ''} analisado{top3.length !== 1 ? 's' : ''}</span>
          </div>
        </header>

        {/* ── SUMÁRIO EXECUTIVO ──────────────────────────── */}
        {top3.length > 0 && (
          <div className="ldr-sumario">
            <div className="ldr-sumario-item">
              <span className="ldr-sumario-num">{m.totalCompativel || top3.length}</span>
              <span className="ldr-sumario-label">imóveis compatíveis com seu perfil</span>
            </div>
            {m.m2Mediana > 0 && (
              <div className="ldr-sumario-item">
                <span className="ldr-sumario-num">{formatPreco(Math.round(m.m2Mediana))}</span>
                <span className="ldr-sumario-label">mediana do m² no mercado atual</span>
              </div>
            )}
            {best?.melhorDeTodas && (
              <div className="ldr-sumario-item ldr-sumario-item--destaque">
                <span className="ldr-sumario-num">{best.tipo}</span>
                <span className="ldr-sumario-label">melhor opção · {best.bairro}</span>
              </div>
            )}
            {economiaMelhor > 0 && (
              <div className="ldr-sumario-item ldr-sumario-item--eco">
                <span className="ldr-sumario-num">{formatPreco(economiaMelhor)}</span>
                <span className="ldr-sumario-label">economia estimada vs. mercado na melhor opção</span>
              </div>
            )}
          </div>
        )}

        {/* ── PERFIL DO CLIENTE ──────────────────────────── */}
        <section className="ldr-sec">
          <div className="ldr-sec-label">Perfil</div>
          <h2 className="ldr-sec-titulo">O que você está buscando</h2>
          <div className="ldr-perfil-grid">
            {p.finalidade && <div className="ldr-perfil-chip"><span>Finalidade</span><b>{p.finalidade}</b></div>}
            {p.precoMax > 0 && <div className="ldr-perfil-chip"><span>Orçamento máximo</span><b>{formatPreco(p.precoMax)}</b></div>}
            {p.precoMin > 0 && <div className="ldr-perfil-chip"><span>Preço mínimo</span><b>{formatPreco(p.precoMin)}</b></div>}
            {p.quartosMin > 0 && <div className="ldr-perfil-chip"><span>Quartos</span><b>{p.quartosMin}+</b></div>}
            {p.suitesMin > 0 && <div className="ldr-perfil-chip"><span>Suítes</span><b>{p.suitesMin}+</b></div>}
            {p.vagasMin > 0 && <div className="ldr-perfil-chip"><span>Vagas</span><b>{p.vagasMin}+</b></div>}
            {p.areaMin > 0 && <div className="ldr-perfil-chip"><span>Área mínima</span><b>{p.areaMin} m²</b></div>}
            {p.tipos?.length > 0 && <div className="ldr-perfil-chip"><span>Tipo</span><b>{p.tipos.join(' ou ')}</b></div>}
            {p.bairros?.length > 0 && <div className="ldr-perfil-chip ldr-perfil-chip--wide"><span>Bairros de interesse</span><b>{p.bairros.join(', ')}</b></div>}
            {p.nota && <div className="ldr-perfil-nota"><span>Contexto</span><em>{p.nota}</em></div>}
          </div>
        </section>

        {/* ── PANORAMA DO MERCADO ────────────────────────── */}
        {m.totalCompativel > 0 && (
          <section className="ldr-sec">
            <div className="ldr-sec-label">Mercado</div>
            <h2 className="ldr-sec-titulo">Panorama atual da oferta compatível</h2>
            <div className="ldr-mercado-grid">
              <div className="ldr-mercado-card">
                <span className="ldr-mercado-num">{m.totalCompativel}</span>
                <span className="ldr-mercado-desc">imóveis compatíveis com seu perfil na carteira ativa</span>
              </div>
              {m.precoMin > 0 && m.precoMax > 0 && (
                <div className="ldr-mercado-card">
                  <span className="ldr-mercado-num">{formatPreco(m.precoMin)}<br/><small>a</small> {formatPreco(m.precoMax)}</span>
                  <span className="ldr-mercado-desc">faixa de preços dos compatíveis</span>
                </div>
              )}
              {m.areaMin > 0 && m.areaMax > 0 && (
                <div className="ldr-mercado-card">
                  <span className="ldr-mercado-num">{m.areaMin}–{m.areaMax} m²</span>
                  <span className="ldr-mercado-desc">faixa de área disponível</span>
                </div>
              )}
              {m.m2Mediana > 0 && (
                <div className="ldr-mercado-card ldr-mercado-card--destaque">
                  <span className="ldr-mercado-num">{formatPreco(Math.round(m.m2Mediana))}/m²</span>
                  <span className="ldr-mercado-desc">mediana do m² · referência técnica desta análise</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── SPOTLIGHT #1 ───────────────────────────────── */}
        {best && (
          <section className="ldr-sec ldr-sec--spotlight">
            <div className="ldr-sec-label">Destaque</div>
            <h2 className="ldr-sec-titulo">A melhor opção para você</h2>
            <p className="ldr-sec-sub">Após analisar tecnicamente todos os imóveis compatíveis com seu perfil, esta se destacou com o melhor índice de custo-benefício.</p>
            <div className="ldr-spotlight">
              <Galeria item={best}/>
              <div className="ldr-spotlight-body">
                <div className="ldr-spotlight-header">
                  <ScoreRing score={best.score || 0}/>
                  <div>
                    <p className="ldr-spotlight-tipo">{best.tipo} · {best.bairro}</p>
                    <p className="ldr-spotlight-preco">{formatPreco(best.preco)}</p>
                    <p className="ldr-spotlight-cod">cód. {best.codigo}</p>
                  </div>
                </div>
                <SpecGrid item={best}/>
                <M2Bar m2={best.m2} m2Mediana={best.m2Mediana}/>
                <ul className="ldr-spotlight-razoes">
                  {gerarRazoes(best, top3).map((r, i) => (
                    <li key={i} className={`ldr-sraz ldr-sraz--${r.tag}`}>{r.txt}</li>
                  ))}
                </ul>
                <a className="ldr-card-link" href={`/imovel/${best.codigo}`} target="_blank" rel="noopener noreferrer">
                  Ver imóvel completo
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
                </a>
              </div>
            </div>
          </section>
        )}

        {/* ── TOP 3 COMPLETO ─────────────────────────────── */}
        {top3.length > 0 && (
          <section className="ldr-sec">
            <div className="ldr-sec-label">Análise completa</div>
            <h2 className="ldr-sec-titulo">Top 3 - Análise técnica detalhada</h2>
            <p className="ldr-sec-sub">Cada imóvel foi avaliado por m² vs. mercado, specs, oportunidade e custo total de aquisição.</p>
            <div className="ldr-cards-list">
              {top3.map((item, i) => <ImovelCard key={item.codigo} item={item} rank={i + 1} top3={top3}/>)}
            </div>
          </section>
        )}

        {/* ── COMPARATIVO ────────────────────────────────── */}
        {top3.length > 1 && (
          <section className="ldr-sec">
            <div className="ldr-sec-label">Comparativo</div>
            <h2 className="ldr-sec-titulo">Lado a lado - todos os critérios</h2>
            <Comparativo top3={top3}/>
          </section>
        )}

        {/* ── CONSIDERAÇÕES DO CONSULTOR ─────────────────── */}
        {laudo.obs && (
          <section className="ldr-sec">
            <div className="ldr-sec-label">Nota pessoal</div>
            <h2 className="ldr-sec-titulo">Considerações do consultor</h2>
            <blockquote className="ldr-obs">{laudo.obs}</blockquote>
          </section>
        )}

        {/* ── PRÓXIMOS PASSOS ────────────────────────────── */}
        <ProximosPassos clienteNome={laudo.clienteNome}/>

        {/* ── RODAPÉ ─────────────────────────────────────── */}
        <footer className="ldr-footer">
          <div className="ldr-footer-consult">
            <strong>Vinícius Graton</strong>
            <span>Consultor Imobiliário · Rotina Imobiliária · CRECI PJ 132</span>
            <span>(34) 99157-0494 · viniciusgraton.com.br</span>
          </div>
          <p className="ldr-footer-legal">
            Este laudo tem caráter informativo e foi preparado com base na carteira ativa da Rotina Imobiliária em {emissao}.
            Os valores de m² são estimativas baseadas em preços anunciados (não escrituras/ITBI), ajustados pelo fator oferta (~10%).
            Custos de ITBI e cartório são aproximações para Uberlândia/MG - confirme com contador ou Prefeitura.
            Documento válido até {expiracao}.
          </p>
        </footer>
      </div>
    </main>
  )
}
