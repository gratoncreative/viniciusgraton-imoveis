import { useState, useMemo, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useSEO } from '../useSEO'
import CampoMoeda from '../components/CampoMoeda'
import { IconWhats, IconArrow } from '../components/icons'
import { BANCOS, PARAMS, simular, prazoMaxPorIdade } from '../financiamento'

const WA = '5534991570494'
const brl = (n) => (isFinite(n) ? n : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const brl2 = (n) => (isFinite(n) ? n : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const pct = (n, d = 2) => `${(isFinite(n) ? n : 0).toFixed(d).replace('.', ',')}%`

// Conta animada respeitando prefers-reduced-motion
function useContagem(alvo) {
  const [v, setV] = useState(alvo)
  const ref = useRef(alvo)
  useEffect(() => {
    const reduz = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduz) { setV(alvo); ref.current = alvo; return }
    const ini = ref.current
    const dif = alvo - ini
    if (Math.abs(dif) < 1) { setV(alvo); ref.current = alvo; return }
    let raf, t0
    const dur = 420
    const passo = (ts) => {
      if (!t0) t0 = ts
      const p = Math.min(1, (ts - t0) / dur)
      const e = 1 - Math.pow(1 - p, 3)
      setV(ini + dif * e)
      if (p < 1) raf = requestAnimationFrame(passo)
      else ref.current = alvo
    }
    raf = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(raf)
  }, [alvo])
  return v
}

function Campo({ label, valor, onChange, sufixo, step = '1', min = '0', max }) {
  return (
    <label className="calc-campo">
      <span>{label}</span>
      <div className="calc-input">
        <input type="number" inputMode="decimal" value={valor} step={step} min={min} max={max} onChange={(e) => onChange(e.target.value)} />
        {sufixo && <i className="calc-suf">{sufixo}</i>}
      </div>
    </label>
  )
}

// Medidor de comprometimento de renda (SVG leve) com marca nos 30%
function MedidorRenda({ comprometimento }) {
  const c = comprometimento == null ? null : comprometimento * 100
  const aprovavel = c != null && c <= PARAMS.comprometimentoMax * 100
  const preench = c == null ? 0 : Math.min(100, c)
  const cor = c == null ? '#5b626e' : aprovavel ? '#3F7A5E' : '#B04A37'
  return (
    <div className="simf-medidor">
      <div className="simf-medidor-topo">
        <span>Comprometimento da renda</span>
        <b style={{ color: cor }}>{c == null ? '-' : pct(c, 0)}</b>
      </div>
      <svg viewBox="0 0 100 10" className="simf-medidor-svg" preserveAspectRatio="none" aria-hidden="true">
        <rect x="0" y="3" width="100" height="4" rx="2" fill="rgba(10,14,22,0.10)" />
        <rect x="0" y="3" width={preench} height="4" rx="2" fill={cor} />
        <line x1="30" y1="1" x2="30" y2="9" stroke="rgba(10,14,22,0.45)" strokeWidth="0.6" strokeDasharray="1 1" />
      </svg>
      <div className="simf-medidor-base">
        <span>0%</span>
        <span className="simf-medidor-marca">limite usual 30%</span>
        <span>100%</span>
      </div>
      {c != null && (
        <p className={`simf-medidor-tag${aprovavel ? ' simf-medidor-tag--ok' : ' simf-medidor-tag--warn'}`}>
          {aprovavel
            ? 'Dentro do limite que os bancos costumam aceitar.'
            : 'Acima de 30% da renda - os bancos tendem a recusar. Aumente a entrada, o prazo ou a renda informada.'}
        </p>
      )}
    </div>
  )
}

export default function SimuladorFinanciamento() {
  useSEO({
    title: 'Simulador de Financiamento Imobiliário em Uberlândia',
    description: 'Simule a parcela, os juros, o custo de cartório, a renda necessária e compare SAC e Price. Entrada de 10% a 90%, taxas dos principais bancos. Grátis, com Vinícius Graton.',
    path: '/simulador-financiamento',
  })

  const [valor, setValor] = useState(500000)
  const [entradaPct, setEntradaPct] = useState(20)
  const [bancoId, setBancoId] = useState('caixa')
  const [taxaCustom, setTaxaCustom] = useState('11.19')
  const [anos, setAnos] = useState(30)
  const [sistema, setSistema] = useState('SAC')
  const [idade, setIdade] = useState(35)
  const [renda, setRenda] = useState(10000)
  const [modo, setModo] = useState('imovel')
  const [entradaReais, setEntradaReais] = useState(100000)
  const [financiarReais, setFinanciarReais] = useState(400000)
  // avançados
  const [itbiPct, setItbiPct] = useState('2')
  const [registroPct, setRegistroPct] = useState('1.1')
  const [avaliacao, setAvaliacao] = useState(1000)
  const [taxaAdm, setTaxaAdm] = useState(25)
  const [trAa, setTrAa] = useState('0')
  const [dfiMes, setDfiMes] = useState('0.0134')

  const banco = BANCOS.find((b) => b.id === bancoId) || BANCOS[0]
  const jurosAnual = (bancoId === 'custom' ? (parseFloat(String(taxaCustom).replace(',', '.')) || 0) : banco.taxa * 100) / 100
  // valor do imóvel e entrada conforme o modo escolhido (sei o valor do imóvel × tenho entrada + financiar)
  const valorImovel = modo === 'entrada' ? (Number(entradaReais) || 0) + (Number(financiarReais) || 0) : valor
  const entradaValor = modo === 'entrada' ? (Number(entradaReais) || 0) : Math.round(valor * (entradaPct / 100))
  const entradaPctEff = valorImovel > 0 ? (entradaValor / valorImovel) * 100 : 0
  // regra idade + prazo ≤ 80 anos e 6 meses limita o prazo máximo
  const prazoMaxIdade = prazoMaxPorIdade(idade)
  const prazoMeses = Math.min(PARAMS.prazoMaxMeses, prazoMaxIdade, Math.max(1, Math.round((Number(anos) || 0) * 12)))
  const prazoLimitadoPorIdade = prazoMaxIdade < PARAMS.prazoMaxMeses
  // a idade limita o prazo (regra 80 anos e 6 meses): puxa o campo de anos pra baixo automaticamente,
  // pra não ficar mostrando 35 anos enquanto o cálculo usa o teto menor.
  useEffect(() => {
    const maxAnos = Math.floor(prazoMaxIdade / 12)
    setAnos((a) => (a > maxAnos ? maxAnos : a))
  }, [prazoMaxIdade])

  const params = {
    valorImovel,
    entradaValor,
    jurosAnual,
    trAnual: (parseFloat(String(trAa).replace(',', '.')) || 0) / 100,
    prazoMeses,
    sistema,
    idade: Number(idade) || 35,
    renda: Number(renda) || 0,
    itbiPct: (parseFloat(String(itbiPct).replace(',', '.')) || 0) / 100,
    registroPct: (parseFloat(String(registroPct).replace(',', '.')) || 0) / 100,
    avaliacao: Number(avaliacao) || 0,
    taxaAdm: Number(taxaAdm) || 0,
    dfiMes: (parseFloat(String(dfiMes).replace(',', '.')) || 0) / 100,
  }

  const r = useMemo(() => simular(params), [JSON.stringify(params)])
  const rSac = useMemo(() => simular({ ...params, sistema: 'SAC' }), [JSON.stringify(params)])
  const rPrice = useMemo(() => simular({ ...params, sistema: 'Price' }), [JSON.stringify(params)])

  // sem contador animado no hero: a parcela mostra sempre o valor exato atual
  // (evita o "flicker" de valores transitórios durante o recálculo).
  const parcelaShow = r?.parcelaRef || 0
  const [verTabela, setVerTabela] = useState(false)

  const cotaMax = banco.cota * 100
  const entradaAbaixoMin = entradaPctEff < (100 - cotaMax)

  const waMsg = r
    ? `Olá Vinícius, fiz uma simulação no site. Imóvel de ${brl(valorImovel)}, entrada de ${brl(entradaValor)} e parcela aproximada de ${brl2(r.parcelaRef)} (${sistema}). Gostaria de ver imóveis nessa faixa.`
    : 'Olá Vinícius, gostaria de simular um financiamento e ver imóveis.'

  return (
    <main className="pagina simf-pg">
      {/* nav topo */}
      <div className="pdfjpg-nav">
        <div className="container pdfjpg-nav-inner">
          <Link to="/ferramentas" className="pdfjpg-back">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Ferramentas
          </Link>
          <span className="pdfjpg-nav-tag">Simulador de financiamento · taxas de maio/2026</span>
        </div>
      </div>

      <div className="container simf-wrap">
        <header className="simf-header">
          <h1 className="simf-titulo">Simulador de Financiamento Imobiliário</h1>
          <p className="simf-sub">
            Preencha o que você sabe e veja na hora a parcela, os juros, os custos de cartório, a renda necessária e a comparação entre <strong>SAC</strong> e <strong>Price</strong>. Taxas dos principais bancos, entrada de 10% a 90%.
          </p>
        </header>

        <div className="simf-grid">
          {/* ── COLUNA DE ENTRADAS ── */}
          <section className="simf-form" aria-label="Dados da simulação">
            <div className="simf-toggle simf-toggle--modo" role="tablist" aria-label="Como você quer simular">
              {[['imovel', 'Sei o valor do imóvel'], ['entrada', 'Tenho entrada + quanto financiar']].map(([m, lab]) => (
                <button key={m} role="tab" aria-selected={modo === m} className={`simf-toggle-btn${modo === m ? ' simf-toggle-btn--on' : ''}`} onClick={() => setModo(m)}>{lab}</button>
              ))}
            </div>

            {modo === 'imovel' ? (
              <>
                <CampoMoeda label="Valor do imóvel" valor={valor} onChange={setValor} />
                <input type="range" min="100000" max={PARAMS.tetoSFH} step="10000" value={Math.min(valor, PARAMS.tetoSFH)} onChange={(e) => setValor(+e.target.value)} className="simf-range" aria-label="Valor do imóvel" />
                <div className="simf-dupla">
                  <Campo label="Entrada" sufixo="%" valor={entradaPct} onChange={(v) => setEntradaPct(Math.min(90, Math.max(10, Number(v) || 0)))} step="1" min="10" max="90" />
                  <label className="calc-campo">
                    <span>Entrada em reais</span>
                    <div className="calc-input">
                      <input type="text" inputMode="numeric" value={brl(entradaValor)} onChange={(e) => {
                        const num = Number(String(e.target.value).replace(/\D/g, '')) || 0
                        setEntradaPct(valor > 0 ? Math.min(90, Math.max(10, Math.round((num / valor) * 100))) : 20)
                      }} />
                    </div>
                  </label>
                </div>
                <input type="range" min="10" max="90" step="1" value={entradaPct} onChange={(e) => setEntradaPct(+e.target.value)} className="simf-range" aria-label="Percentual de entrada" />
              </>
            ) : (
              <>
                <div className="simf-dupla">
                  <CampoMoeda label="Entrada que você tem" valor={entradaReais} onChange={setEntradaReais} />
                  <CampoMoeda label="Quanto quer financiar" valor={financiarReais} onChange={setFinanciarReais} />
                </div>
                <p className="calc-nota" style={{ margin: '2px 0 0' }}>Dá um imóvel de <b>{brl(valorImovel)}</b> - entrada de {pct(entradaPctEff, 0)} do valor.</p>
              </>
            )}
            {entradaAbaixoMin && <p className="simf-aviso">Para o {banco.nome}, a entrada mínima costuma ser {Math.round(100 - cotaMax)}% do imóvel (cota de até {Math.round(cotaMax)}%). Considere aumentar a entrada.</p>}

            <label className="calc-campo">
              <span>Banco / linha de crédito</span>
              <div className="calc-input">
                <select value={bancoId} onChange={(e) => setBancoId(e.target.value)} className="simf-select">
                  {BANCOS.map((b) => <option key={b.id} value={b.id}>{b.nome}{b.id !== 'custom' ? ` · ${pct(b.taxa * 100)} a.a.` : ''}</option>)}
                </select>
              </div>
            </label>
            {bancoId === 'custom' && <Campo label="Taxa personalizada" sufixo="% a.a." valor={taxaCustom} onChange={setTaxaCustom} step="0.01" />}

            <div className="simf-dupla">
              <Campo label="Prazo" sufixo="anos" valor={anos} onChange={(v) => setAnos(Math.min(35, Math.max(1, Number(v) || 0)))} min="1" max="35" />
              <label className="calc-campo">
                <span>Prazo em meses</span>
                <div className="calc-input">
                  <input type="number" value={prazoMeses} min="12" max={PARAMS.prazoMaxMeses} step="12" onChange={(e) => setAnos(Math.round((Number(e.target.value) || 12) / 12))} />
                  <i className="calc-suf">meses</i>
                </div>
              </label>
            </div>
            {prazoLimitadoPorIdade && <p className="simf-aviso">Pela regra idade + prazo (teto de 80 anos e 6 meses), com {idade} anos o prazo máximo cai para {Math.floor(prazoMaxIdade / 12)} anos - já apliquei esse limite.</p>}

            <div className="simf-toggle" role="tablist" aria-label="Sistema de amortização">
              {['SAC', 'Price'].map((s) => (
                <button key={s} role="tab" aria-selected={sistema === s} className={`simf-toggle-btn${sistema === s ? ' simf-toggle-btn--on' : ''}`} onClick={() => setSistema(s)}>
                  {s}
                  <em>{s === 'SAC' ? 'parcela decrescente' : 'parcela fixa'}</em>
                </button>
              ))}
            </div>

            <div className="simf-dupla">
              <Campo label="Idade do comprador" sufixo="anos" valor={idade} onChange={(v) => setIdade(Math.min(80, Math.max(18, Number(v) || 0)))} min="18" max="80" />
              <CampoMoeda label="Renda familiar bruta" valor={renda} onChange={setRenda} />
            </div>

            <details className="simf-avancado">
              <summary>Parâmetros avançados</summary>
              <div className="simf-avancado-grid">
                <Campo label="ITBI" sufixo="%" valor={itbiPct} onChange={setItbiPct} step="0.1" />
                <Campo label="Registro e cartório" sufixo="%" valor={registroPct} onChange={setRegistroPct} step="0.1" />
                <CampoMoeda label="Taxa de avaliação" valor={avaliacao} onChange={setAvaliacao} />
                <CampoMoeda label="Taxa de administração" valor={taxaAdm} onChange={setTaxaAdm} />
                <Campo label="TR estimada" sufixo="% a.a." valor={trAa} onChange={setTrAa} step="0.1" />
                <Campo label="Seguro DFI" sufixo="% a.m." valor={dfiMes} onChange={setDfiMes} step="0.001" />
              </div>
              <p className="calc-nota" style={{ margin: '8px 0 0' }}>Valores padrão de 2026 para Uberlândia. Edite conforme o seu caso. A TR entra com 0% por padrão.</p>
            </details>
          </section>

          {/* ── COLUNA DE RESULTADOS ── */}
          <section className="simf-result" aria-live="polite">
            <div className="simf-hero">
              <span className="simf-hero-label">{sistema === 'SAC' ? 'Primeira parcela (decrescente)' : 'Parcela fixa mensal'}</span>
              <strong className="simf-hero-valor">{brl2(parcelaShow)}</strong>
              <span className="simf-hero-sub">já com seguros (MIP + DFI) e taxa de administração</span>
            </div>

            <div className="simf-mini">
              <div><span>Valor financiado</span><b>{brl(r?.pv || 0)}</b></div>
              <div><span>Taxa mensal efetiva</span><b>{pct((r?.i || 0) * 100, 4)}</b></div>
            </div>
            {r?.cetAnual != null && (
              <p className="simf-renda-min simf-cet">CET - Custo Efetivo Total.. <b>{pct(r.cetAnual * 100)} a.a.</b> <span>(juros + seguros MIP/DFI + taxas - é o custo real do crédito, acima da taxa de juros)</span></p>
            )}

            <MedidorRenda comprometimento={r?.comprometimento} />
            {r && (
              <p className="simf-renda-min">Renda mínima sugerida.. <b>{brl(r.rendaMinima)}</b> <span>(parcela de referência ÷ 30%)</span></p>
            )}

            <div className="simf-bloco">
              <h3 className="simf-bloco-tit">Resumo do financiamento</h3>
              <ul className="simf-lista">
                <li><span>Valor do imóvel</span><b>{brl(valorImovel)}</b></li>
                <li><span>Entrada ({pct(entradaPctEff, 0)})</span><b>{brl(entradaValor)}</b></li>
                <li><span>Valor financiado</span><b>{brl(r?.pv || 0)}</b></li>
                <li><span>Total de juros</span><b>{brl(r?.totJuros || 0)}</b></li>
                <li><span>Seguros + taxas</span><b>{brl((r?.totSeguros || 0) + (r?.totAdm || 0))}</b></li>
                <li><span>ITBI + registro</span><b>{brl((r?.itbi || 0) + (r?.registro || 0))}</b></li>
                <li><span>Avaliação</span><b>{brl(r?.avaliacao || 0)}</b></li>
                <li className="simf-lista-total"><span>Custo total estimado</span><b>{brl(r?.custoTotal || 0)}</b></li>
              </ul>
              <p className="calc-nota" style={{ margin: '6px 0 0' }}>Custos iniciais na assinatura (fora da parcela).. {brl(r?.custosIniciais || 0)} (entrada + ITBI + registro + avaliação).</p>
            </div>

            {/* comparativo SAC x Price */}
            {rSac && rPrice && (
              <div className="simf-bloco">
                <h3 className="simf-bloco-tit">SAC × Price</h3>
                <table className="simf-tab-comp">
                  <thead>
                    <tr><th></th><th>SAC</th><th>Price</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Primeira parcela</td><td>{brl2(rSac.primeiraParcela)}</td><td>{brl2(rPrice.primeiraParcela)}</td></tr>
                    <tr><td>Última parcela</td><td>{brl2(rSac.ultimaParcela)}</td><td>{brl2(rPrice.ultimaParcela)}</td></tr>
                    <tr><td>Total de juros</td><td>{brl(rSac.totJuros)}</td><td>{brl(rPrice.totJuros)}</td></tr>
                    <tr><td>Total pago</td><td>{brl(rSac.totalPago)}</td><td>{brl(rPrice.totalPago)}</td></tr>
                  </tbody>
                </table>
                <p className="calc-nota" style={{ margin: '6px 0 0' }}>No SAC a parcela começa maior e cai; no total costuma pagar menos juros. No Price a parcela é fixa do começo ao fim.</p>
              </div>
            )}

            {/* tabela de amortização */}
            {r && (
              <div className="simf-bloco">
                <button className="simf-tab-toggle" onClick={() => setVerTabela((v) => !v)} aria-expanded={verTabela}>
                  {verTabela ? 'Ocultar' : 'Ver'} tabela de amortização ({r.n} parcelas)
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: verTabela ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}><path d="M6 9l6 6 6-6"/></svg>
                </button>
                {verTabela && (
                  <div className="simf-tab-wrap">
                    <table className="simf-tab-amort">
                      <thead>
                        <tr><th>Mês</th><th>Parcela</th><th>Juros</th><th>Amort.</th><th>Seguros</th><th>Saldo</th></tr>
                      </thead>
                      <tbody>
                        {r.linhas.map((l) => (
                          <tr key={l.t}>
                            <td>{l.t}</td>
                            <td>{brl2(l.parcela)}</td>
                            <td>{brl2(l.juros)}</td>
                            <td>{brl2(l.amort)}</td>
                            <td>{brl2(l.mip + l.dfi + l.adm)}</td>
                            <td>{brl(l.saldo)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* CTA */}
            <div className="simf-ctas">
              <a className="btn btn-gold simf-cta-wa" href={`https://wa.me/${WA}?text=${encodeURIComponent(waMsg)}`} target="_blank" rel="noopener noreferrer">
                <IconWhats width={18} height={18} /> Falar com o Vinícius
              </a>
              <Link className="btn btn-ghost" to="/imoveis">
                Ver imóveis nessa faixa <IconArrow width={14} height={14} />
              </Link>
            </div>
          </section>
        </div>

        {/* rodapé legal */}
        <p className="simf-legal">
          Os valores são estimativas para orientação. O CET (Custo Efetivo Total) real inclui tarifas, seguros e a correção pela TR, e as taxas estão sujeitas à análise de crédito, ao relacionamento bancário e ao perfil do comprador. Taxas de referência de maio de 2026.
        </p>
        <p className="simf-assina">
          Vinícius Graton, consultor da Rotina Imobiliária · CRECI PJ 132 · WhatsApp (34) 99157-0494
        </p>
      </div>
    </main>
  )
}
