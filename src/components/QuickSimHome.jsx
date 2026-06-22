import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Reveal from './Reveal'
import { IconArrow, IconWhats } from './icons'
import { BANCOS, simular } from '../financiamento'

// Simulador de financiamento em destaque na home — versão compacta (quick-sim).
// Estimativa rápida com o motor real (SAC, seguros MIP/DFI, taxa adm, CET);
// a simulação completa fica em /simulador-financiamento.
const WA = '5534991570494'
const brl = (n) => (isFinite(n) ? n : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const brl2 = (n) => (isFinite(n) ? n : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const pct = (n) => `${(isFinite(n) ? n : 0).toFixed(2).replace('.', ',')}%`
const caixa = BANCOS.find((b) => b.id === 'caixa') || BANCOS[0]

export default function QuickSimHome() {
  const [valor, setValor] = useState(500000)
  const [entradaPct, setEntradaPct] = useState(20)
  const [anos, setAnos] = useState(30)

  const entradaValor = Math.round((valor * entradaPct) / 100)
  const r = useMemo(() => simular({
    valorImovel: valor, entradaValor, jurosAnual: caixa.taxa,
    prazoMeses: anos * 12, sistema: 'SAC', idade: 35, renda: 0,
  }), [valor, entradaValor, anos])

  const waMsg = r
    ? `Olá Vinícius! Simulei no site: imóvel de ${brl(valor)}, entrada de ${brl(entradaValor)} e parcela aproximada de ${brl2(r.parcelaRef)}. Gostaria de ver imóveis nessa faixa.`
    : 'Olá Vinícius! Gostaria de simular um financiamento e ver imóveis.'

  return (
    <section id="simular" className="section--light quicksim">
      <div className="container">
        <div className="sec-head">
          <Reveal>
            <div>
              <span className="eyebrow">Ferramenta nº 1 · grátis</span>
              <h2 className="section-title">Simule seu <em>financiamento</em></h2>
              <p className="section-sub" style={{ marginTop: 14, maxWidth: 580 }}>
                Veja na hora a parcela, o <strong>CET</strong> (custo efetivo total) e a renda necessária — já com os seguros e as taxas que os bancos cobram de verdade. Depois é só falar comigo.
              </p>
            </div>
          </Reveal>
        </div>

        <Reveal>
          <div className="quicksim-card">
            <div className="quicksim-campos">
              <label className="quicksim-campo">
                <span>Valor do imóvel <b>{brl(valor)}</b></span>
                <input type="range" min="150000" max="1500000" step="10000" value={valor} onChange={(e) => setValor(+e.target.value)} aria-label="Valor do imóvel" />
              </label>
              <label className="quicksim-campo">
                <span>Entrada <b>{entradaPct}% · {brl(entradaValor)}</b></span>
                <input type="range" min="10" max="80" step="1" value={entradaPct} onChange={(e) => setEntradaPct(+e.target.value)} aria-label="Entrada" />
              </label>
              <label className="quicksim-campo">
                <span>Prazo <b>{anos} anos</b></span>
                <input type="range" min="5" max="35" step="1" value={anos} onChange={(e) => setAnos(+e.target.value)} aria-label="Prazo" />
              </label>
            </div>

            <div className="quicksim-result">
              <span className="quicksim-label">1ª parcela · SAC · Caixa {pct(caixa.taxa * 100)} a.a.</span>
              <strong className="quicksim-parcela">{r ? brl2(r.parcelaRef) : '—'}</strong>
              <div className="quicksim-mini">
                <div><span>Financiado</span><b>{brl(r?.pv || 0)}</b></div>
                <div><span>CET</span><b>{r?.cetAnual != null ? pct(r.cetAnual * 100) : '—'}</b></div>
                <div><span>Renda mín.</span><b>{brl(r?.rendaMinima || 0)}</b></div>
              </div>
              <div className="quicksim-ctas">
                <Link className="btn btn-gold" to="/simulador-financiamento">Simulação completa <IconArrow width={14} height={14} /></Link>
                <a className="btn quicksim-wa" href={`https://wa.me/${WA}?text=${encodeURIComponent(waMsg)}`} target="_blank" rel="noopener noreferrer"><IconWhats width={16} height={16} /> Falar comigo</a>
              </div>
            </div>
          </div>
        </Reveal>

        <p className="quicksim-nota">
          Estimativa com seguros (MIP + DFI), taxa de administração e CET. Taxas de referência de 2026; o valor final depende da análise de crédito de cada banco.
        </p>
      </div>
    </section>
  )
}
