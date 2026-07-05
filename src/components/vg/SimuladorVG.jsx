import { useState } from 'react'
import { linkWhatsApp } from '../../data'

const fmt = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR')

export default function SimuladorVG() {
  const [valor, setValor] = useState(650000)
  const [entradaPct, setEntradaPct] = useState(20)
  const [prazoAnos, setPrazoAnos] = useState(30)
  const [jurosAa, setJurosAa] = useState(10.5)

  const entrada = (valor * entradaPct) / 100
  const pv = valor - entrada
  const i = Math.pow(1 + jurosAa / 100, 1 / 12) - 1
  const n = prazoAnos * 12
  const parcela = pv * i / (1 - Math.pow(1 + i, -n))
  const renda = parcela / 0.3

  const waSim = linkWhatsApp(
    `Olá Vinícius! Simulei no site: imóvel de ${fmt(valor)} com ${entradaPct}% de entrada em ${prazoAnos} anos. Pode me ajudar com uma simulação real?`
  )

  return (
    <section id="simulador" className="vgx-sim vgx-reveal">
      <div className="vgx-sim-card">
        <div className="vgx-sim-left">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="vgx-kicker vgx-kicker--golddark">06 · Simulador de financiamento</span>
            <h2>Descubra quanto cabe no seu bolso</h2>
          </div>

          <label className="vgx-sim-field">
            <span><span>Valor do imóvel</span><strong>{fmt(valor)}</strong></span>
            <input type="range" min="200000" max="3000000" step="10000" value={valor} onChange={(e) => setValor(+e.target.value)} />
          </label>
          <label className="vgx-sim-field">
            <span><span>Entrada</span><strong>{entradaPct}% · {fmt(entrada)}</strong></span>
            <input type="range" min="10" max="80" step="5" value={entradaPct} onChange={(e) => setEntradaPct(+e.target.value)} />
          </label>
          <label className="vgx-sim-field">
            <span><span>Prazo</span><strong>{prazoAnos} anos</strong></span>
            <input type="range" min="5" max="35" step="1" value={prazoAnos} onChange={(e) => setPrazoAnos(+e.target.value)} />
          </label>
          <label className="vgx-sim-field">
            <span><span>Juros ao ano</span><strong>{jurosAa.toLocaleString('pt-BR')}% a.a.</strong></span>
            <input type="range" min="8" max="14" step="0.25" value={jurosAa} onChange={(e) => setJurosAa(+e.target.value)} />
          </label>
        </div>

        <div className="vgx-sim-right">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="vgx-sim-parcela-l">Parcela estimada (Price)</span>
            <span className="vgx-sim-parcela-v">{fmt(parcela)}</span>
            <span className="vgx-sim-parcela-s">por mês, durante {prazoAnos} anos</span>
          </div>
          <div className="vgx-sim-rule" />
          <div className="vgx-sim-grid">
            <div className="vgx-sim-metric"><span>Entrada</span><b>{fmt(entrada)}</b></div>
            <div className="vgx-sim-metric"><span>Valor financiado</span><b>{fmt(pv)}</b></div>
            <div className="vgx-sim-metric vgx-sim-metric--wide"><span>Renda familiar sugerida</span><b>{fmt(renda)}</b></div>
          </div>
          <a href={waSim} target="_blank" rel="noopener noreferrer" className="vgx-btn-red" style={{ textAlign: 'center' }}>
            Quero uma simulação real no banco
          </a>
          <span className="vgx-sim-disc">Valores aproximados, sistema Price, sem seguros e taxas. A simulação oficial depende de análise de crédito no banco.</span>
        </div>
      </div>
    </section>
  )
}
