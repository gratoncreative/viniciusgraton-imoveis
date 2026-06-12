import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { formatPreco, CONFIG } from '../data'

const ITBI_PCT = 0.02
const CARTORIO_PCT = 0.03

function CustoTotal({ preco }) {
  if (!preco) return null
  const itbi = Math.round(preco * ITBI_PCT)
  const cart = Math.round(preco * CARTORIO_PCT)
  return (
    <div className="laudo-custos-row">
      <span>Imóvel</span><span>{formatPreco(preco)}</span>
      <span>ITBI (~2%)</span><span>{formatPreco(itbi)}</span>
      <span>Cartório (~3%)</span><span>{formatPreco(cart)}</span>
      <span className="laudo-custo-total">Total estimado</span><span className="laudo-custo-total">{formatPreco(preco + itbi + cart)}</span>
    </div>
  )
}

function M2Badge({ m2, m2Mediana, diffPct, abaixoMercado }) {
  if (!m2 || !m2Mediana) return null
  const tag = diffPct <= -10 ? 'abaixo' : diffPct >= 10 ? 'acima' : 'ok'
  const label = tag === 'abaixo' ? `${Math.abs(diffPct)}% abaixo do mercado ✓` : tag === 'acima' ? `${diffPct}% acima do mercado` : 'preço dentro do mercado'
  return <span className={`laudo-m2-badge laudo-m2-badge--${tag}`}>{formatPreco(Math.round(m2))}/m² · {label}</span>
}

function ImovelCard({ item, rank }) {
  const fotos = (item.fotos && item.fotos.length > 0) ? item.fotos : item.img ? [item.img] : []
  const [slide, setSlide] = useState(0)
  const foto = fotos[Math.min(slide, fotos.length - 1)] || ''
  const specs = [
    item.quartos > 0 && `${item.quartos} quarto${item.quartos > 1 ? 's' : ''}`,
    item.suites > 0 && `${item.suites} suíte${item.suites > 1 ? 's' : ''}`,
    item.banheiros > 0 && `${item.banheiros} banheiro${item.banheiros > 1 ? 's' : ''}`,
    item.vagas > 0 && `${item.vagas} vaga${item.vagas > 1 ? 's' : ''}`,
    item.area > 0 && `${item.area} m²`,
    item.andar > 0 && `${item.andar}º andar`,
  ].filter(Boolean)

  return (
    <div className={`laudo-imovel-card ${item.melhorDeTodas ? 'laudo-imovel-card--melhor' : ''}`}>
      {item.melhorDeTodas && <div className="laudo-melhor-badge">⭐ Melhor custo-benefício</div>}
      <div className="laudo-rank-num">#{rank}</div>
      {foto && (
        <div className="laudo-foto-wrap">
          <img src={foto} alt={`${item.tipo} ${item.bairro}`} className="laudo-foto" />
          {fotos.length > 1 && (
            <div className="laudo-foto-nav">
              <button onClick={() => setSlide(s => (s - 1 + fotos.length) % fotos.length)}>‹</button>
              <span>{Math.min(slide, fotos.length - 1) + 1}/{fotos.length}</span>
              <button onClick={() => setSlide(s => (s + 1) % fotos.length)}>›</button>
            </div>
          )}
        </div>
      )}
      <div className="laudo-imovel-body">
        <div className="laudo-imovel-header">
          <span className="laudo-tipo">{item.tipo}</span>
          <span className="laudo-bairro">{item.bairro}</span>
          <span className="laudo-cod">cód. {item.codigo}</span>
        </div>
        <div className="laudo-preco-row">
          <strong className="laudo-preco">{formatPreco(item.preco)}</strong>
          {item.temDesconto && item.precoAnterior > 0 && (
            <span className="laudo-desconto-tag">{item.pctDesconto}% de desconto</span>
          )}
        </div>
        {specs.length > 0 && (
          <div className="laudo-specs">
            {specs.map((s) => <span key={s} className="laudo-spec">{s}</span>)}
          </div>
        )}
        <M2Badge m2={item.m2} m2Mediana={item.m2Mediana} diffPct={item.diffPct} abaixoMercado={item.abaixoMercado} />
        <div className="laudo-flags">
          {item.aceitaFinanciamento && <span className="laudo-flag">✓ Aceita financiamento</span>}
          {item.aceitaFgts && <span className="laudo-flag">✓ Aceita FGTS</span>}
          {item.abaixoMercado && <span className="laudo-flag laudo-flag--destaque">✓ Abaixo do mercado</span>}
        </div>
        {item.descricao && <p className="laudo-desc">{item.descricao.slice(0, 300)}{item.descricao.length > 300 ? '…' : ''}</p>}
        <div className="laudo-custo-wrap">
          <p className="laudo-custo-titulo">Custo estimado de aquisição</p>
          <CustoTotal preco={item.preco} />
          <p className="laudo-custo-obs">ITBI: ~2% · Cartório (escritura + registro): ~3% · Avaliação bancária: ~R$ 3.500 (se financiado)</p>
        </div>
        <a className="laudo-ver-link" href={`/imovel/${item.codigo}`} target="_blank" rel="noopener noreferrer">Ver imóvel completo →</a>
      </div>
    </div>
  )
}

export default function LaudoPage() {
  const { id } = useParams()
  const [laudo, setLaudo] = useState(null)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) { setErro('ID do laudo não encontrado.'); setLoading(false); return }
    fetch(`/api/laudo?id=${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error === 'expirado') setErro('Este laudo expirou e não está mais disponível.')
        else if (d.error === 'nao-encontrado') setErro('Laudo não encontrado. O link pode estar incorreto.')
        else if (d.error) setErro('Erro ao carregar o laudo. Tente novamente.')
        else setLaudo(d)
      })
      .catch(() => setErro('Falha de conexão. Verifique sua internet e tente novamente.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <main className="laudo-pg laudo-pg--load">
      <div className="laudo-spinner" />
      <p>Carregando laudo…</p>
    </main>
  )

  if (erro) return (
    <main className="laudo-pg laudo-pg--erro">
      <div className="laudo-erro-icon">📄</div>
      <h1>Laudo indisponível</h1>
      <p>{erro}</p>
      <a href="/imoveis" className="btn btn-gold">Ver imóveis disponíveis</a>
    </main>
  )

  const p = laudo.perfil || {}
  const m = laudo.mercado || {}
  const top3 = laudo.top3 || []
  const emissao = new Date(laudo.criadoEm).toLocaleDateString('pt-BR')
  const expiracao = new Date(laudo.expiraEm).toLocaleDateString('pt-BR')

  const nec = [
    p.tipos?.length > 0 && p.tipos.join(' ou '),
    p.bairros?.length > 0 && (p.bairros.length <= 3 ? p.bairros.join(', ') : p.bairros.slice(0, 3).join(', ') + ` +${p.bairros.length - 3}`),
    p.quartosMin > 0 && `${p.quartosMin}+ quartos`,
    p.areaMin > 0 && `${p.areaMin} m² mínimo`,
    p.precoMax > 0 && `até ${formatPreco(p.precoMax)}`,
  ].filter(Boolean).join(' · ')

  return (
    <main className="laudo-pg">
      <div className="container laudo-container">

        <header className="laudo-header">
          <div className="laudo-header-logo">
            <img src="/logo.svg" alt="Rotina Imobiliária" className="laudo-logo" onError={(e) => { e.target.style.display = 'none' }} />
            <div className="laudo-header-info">
              <span className="laudo-marca">Rotina Imobiliária · Vinícius Graton</span>
              <span className="laudo-meta">Emitido em {emissao} · válido até {expiracao}</span>
            </div>
          </div>
          <div className="laudo-titulo-wrap">
            <h1 className="laudo-titulo">Laudo de Seleção Imobiliária</h1>
            {laudo.clienteNome && <p className="laudo-subtitulo">Preparado exclusivamente para <strong>{laudo.clienteNome}</strong></p>}
          </div>
          <button className="btn btn-gold laudo-print-btn no-print" onClick={() => window.print()}>
            ⬇ Salvar / Imprimir PDF
          </button>
        </header>

        {/* Perfil do cliente */}
        <section className="laudo-sec">
          <h2 className="laudo-sec-titulo">Perfil e preferências</h2>
          <div className="laudo-perfil-grid">
            <div className="laudo-perfil-item"><span>Finalidade</span><b>{p.finalidade || '—'}</b></div>
            {nec && <div className="laudo-perfil-item laudo-perfil-item--full"><span>O que procura</span><b>{nec}</b></div>}
            {p.precoMin > 0 && <div className="laudo-perfil-item"><span>Preço mínimo</span><b>{formatPreco(p.precoMin)}</b></div>}
            {p.precoMax > 0 && <div className="laudo-perfil-item"><span>Orçamento máximo</span><b>{formatPreco(p.precoMax)}</b></div>}
            {p.quartosMin > 0 && <div className="laudo-perfil-item"><span>Quartos</span><b>{p.quartosMin}+</b></div>}
            {p.suitesMin > 0 && <div className="laudo-perfil-item"><span>Suítes</span><b>{p.suitesMin}+</b></div>}
            {p.vagasMin > 0 && <div className="laudo-perfil-item"><span>Vagas</span><b>{p.vagasMin}+</b></div>}
            {p.areaMin > 0 && <div className="laudo-perfil-item"><span>Área mínima</span><b>{p.areaMin} m²</b></div>}
            {p.nota && <div className="laudo-perfil-item laudo-perfil-item--full laudo-perfil-nota"><span>Contexto adicional</span><i>{p.nota}</i></div>}
          </div>
        </section>

        {/* Panorama do mercado */}
        {m.totalCompativel > 0 && (
          <section className="laudo-sec">
            <h2 className="laudo-sec-titulo">Panorama do mercado</h2>
            <div className="laudo-mercado-grid">
              <div className="laudo-mercado-item">
                <span className="laudo-mercado-num">{m.totalCompativel}</span>
                <span>imóveis compatíveis com seu perfil atualmente</span>
              </div>
              {m.precoMin > 0 && m.precoMax > 0 && (
                <div className="laudo-mercado-item">
                  <span className="laudo-mercado-num">{formatPreco(m.precoMin)}<br/>a {formatPreco(m.precoMax)}</span>
                  <span>faixa de preços dos compatíveis</span>
                </div>
              )}
              {m.areaMin > 0 && m.areaMax > 0 && (
                <div className="laudo-mercado-item">
                  <span className="laudo-mercado-num">{m.areaMin}–{m.areaMax} m²</span>
                  <span>faixa de área disponível</span>
                </div>
              )}
              {m.m2Mediana > 0 && (
                <div className="laudo-mercado-item">
                  <span className="laudo-mercado-num">{formatPreco(Math.round(m.m2Mediana))}/m²</span>
                  <span>valor mediano do m² nessa faixa</span>
                </div>
              )}
            </div>
            <p className="laudo-mercado-nota">Dados extraídos da carteira ativa da Rotina Imobiliária + {CONFIG?.cidade || 'Uberlândia'}. Atualizado na data de emissão.</p>
          </section>
        )}

        {/* TOP 3 */}
        {top3.length > 0 && (
          <section className="laudo-sec">
            <h2 className="laudo-sec-titulo">Top 3 — Melhores opções para você</h2>
            <p className="laudo-sec-sub">Seleção técnica por custo-benefício: m² abaixo do mercado, specs acima da média e área de interesse comprovada.</p>
            <div className="laudo-top3-grid">
              {top3.map((item, i) => <ImovelCard key={item.codigo} item={item} rank={i + 1} />)}
            </div>
          </section>
        )}

        {/* Comparativo */}
        {top3.length > 1 && (
          <section className="laudo-sec laudo-sec--comparativo">
            <h2 className="laudo-sec-titulo">Comparativo lado a lado</h2>
            <div className="laudo-comparativo-table-wrap">
              <table className="laudo-comparativo-table">
                <thead>
                  <tr>
                    <th>Critério</th>
                    {top3.map((item, i) => (
                      <th key={item.codigo} className={item.melhorDeTodas ? 'laudo-comp-melhor' : ''}>
                        #{i + 1}{item.melhorDeTodas ? ' ⭐' : ''}<br />
                        <small>{item.tipo} · {item.bairro}</small>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Preço</td>{top3.map((x) => <td key={x.codigo}>{formatPreco(x.preco)}</td>)}</tr>
                  <tr><td>Área</td>{top3.map((x) => <td key={x.codigo}>{x.area > 0 ? `${x.area} m²` : '—'}</td>)}</tr>
                  <tr><td>Valor do m²</td>{top3.map((x) => <td key={x.codigo}>{x.m2 > 0 ? formatPreco(Math.round(x.m2)) : '—'}</td>)}</tr>
                  <tr><td>M² vs. mercado</td>{top3.map((x) => <td key={x.codigo} className={x.diffPct <= -10 ? 'laudo-td-bom' : x.diffPct >= 10 ? 'laudo-td-alto' : ''}>{x.m2Mediana > 0 ? (x.diffPct > 0 ? `+${x.diffPct}%` : `${x.diffPct}%`) : '—'}</td>)}</tr>
                  <tr><td>Quartos</td>{top3.map((x) => <td key={x.codigo}>{x.quartos > 0 ? x.quartos : '—'}</td>)}</tr>
                  <tr><td>Suítes</td>{top3.map((x) => <td key={x.codigo}>{x.suites > 0 ? x.suites : '—'}</td>)}</tr>
                  <tr><td>Vagas</td>{top3.map((x) => <td key={x.codigo}>{x.vagas > 0 ? x.vagas : '—'}</td>)}</tr>
                  <tr><td>Financiamento</td>{top3.map((x) => <td key={x.codigo}>{x.aceitaFinanciamento ? '✓ Sim' : '—'}</td>)}</tr>
                  <tr><td>FGTS</td>{top3.map((x) => <td key={x.codigo}>{x.aceitaFgts ? '✓ Sim' : '—'}</td>)}</tr>
                  <tr><td>Custo total est.</td>{top3.map((x) => <td key={x.codigo}>{x.preco > 0 ? formatPreco(Math.round(x.preco * 1.05)) : '—'}</td>)}</tr>
                </tbody>
              </table>
            </div>
            <p className="laudo-comp-nota">Custo total estimado = preço + ITBI (2%) + cartório (3%). Valores reais podem variar.</p>
          </section>
        )}

        {/* Considerações */}
        {laudo.obs && (
          <section className="laudo-sec">
            <h2 className="laudo-sec-titulo">Considerações do consultor</h2>
            <div className="laudo-obs">{laudo.obs}</div>
          </section>
        )}

        {/* Rodapé */}
        <footer className="laudo-footer">
          <div className="laudo-footer-consult">
            <strong>Vinícius Graton</strong>
            <span>Consultor · Rotina Imobiliária · CRECI PJ 132</span>
            <span>(34) 99157-0494 · viniciusgraton.com.br</span>
          </div>
          <div className="laudo-footer-legal">
            <p>Este laudo tem caráter informativo e foi elaborado com base nos dados da carteira ativa da Rotina Imobiliária na data de emissão. Os valores de m² são estimativas baseadas em preços anunciados (não escrituras/ITBI). Os custos de aquisição estimados (ITBI, cartório) são aproximações — consulte um contador ou a Prefeitura para valores exatos. Válido até {expiracao}.</p>
          </div>
        </footer>
      </div>
    </main>
  )
}
