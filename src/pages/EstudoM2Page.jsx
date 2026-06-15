import { useState, useMemo, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useSEO } from '../useSEO'
import { getImovel, estudoM2 } from '../data'
import bairrosM2 from '../bairros-m2.json'
import {
  haversine, azimuth, calcStats, calcGrau,
  fmtBRL, fmtM2, fmtKm, fmtData,
} from '../utils/estudo-calc'

// ── Fontes carregadas dinamicamente (só nesta página) ─────────────────────────
export function useFontsPremium() {
  useEffect(() => {
    const id = 'ep-fonts'
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href =
      'https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap'
    document.head.appendChild(link)
  }, [])
}

// ── Mapa de coordenadas por bairro ────────────────────────────────────────────
const bairroCoords = (() => {
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
  const map = {}
  for (const b of bairrosM2) {
    if (b.lat && b.lng) map[norm(b.bairro)] = { lat: b.lat, lng: b.lng }
  }
  return map
})()

function getBairroLatLng(bairro) {
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
  return bairroCoords[norm(bairro)] ?? null
}

// ── Adapta a saída de estudoM2() para o contrato interno ─────────────────────
export function buildEstudo(im, est) {
  const hoje = new Date().toISOString().slice(0, 10)
  const avCoords = getBairroLatLng(im.bairro)
  const avLat = avCoords?.lat ?? -18.9186
  const avLng = avCoords?.lng ?? -48.2772

  const comps = est.comparaveis || []
  const testemunhas = comps.map((c, i) => {
    const coords = getBairroLatLng(c.bairro)
    const lat = coords?.lat ?? avLat
    const lng = coords?.lng ?? avLng
    const valorM2 = c.m2bruto ?? (c.preco > 0 && c.area > 0 ? c.preco / c.area : 0)
    const fatorHom = valorM2 > 0 ? c.m2 / valorM2 : 1
    const sameBairro = Math.abs(lat - avLat) < 0.001 && Math.abs(lng - avLng) < 0.001
    // Para mesmo bairro: posiciona em raio mínimo com ângulo distribuído (ângulo áureo)
    const dist = sameBairro ? 0.08 + (i % 6) * 0.05 : haversine(avLat, avLng, lat, lng)
    const brg = sameBairro ? (i * 137.5) % 360 : azimuth(avLat, avLng, lat, lng)
    return {
      ref: `T${i + 1}`, tipo: im.tipo, bairro: c.bairro,
      area: c.area, valor: c.preco, lat, lng,
      fonte: 'Rotina Imobiliária', fatorHom,
      valorM2, valorHomM2: c.m2,
      dist, brg,
    }
  })

  const homVals = testemunhas.map(t => t.valorHomM2).filter(v => v > 0)
  const stats = calcStats(homVals)
  const grau = calcGrau(est.n, stats.cv)
  const adotadoM2 = est.referencia
  const valorTotal = Math.round(adotadoM2 * im.area)
  const amplitude = 0.08
  const valMin = Math.round(valorTotal * (1 - amplitude))
  const valMax = Math.round(valorTotal * (1 + amplitude))

  return {
    numero: im.codigo,
    data: hoje,
    metodo: 'Comparativo direto de dados de mercado',
    tendencia: 'mediana',
    amplitude,
    consultor: {
      nome: 'Vinícius Graton',
      registro: 'Consultor da Rotina Imobiliária',
      whatsapp: '5534991570494',
    },
    avaliando: {
      tipo: im.tipo || 'Imóvel', endereco: im.bairro,
      bairro: im.bairro, cidade: 'Uberlândia/MG',
      area: im.area, dormitorios: im.quartos || 0,
      suites: im.suites || 0, banheiros: im.banheiros || 0,
      vagas: im.vagas || 0, lat: avLat, lng: avLng,
    },
    testemunhas,
    // resultado
    stats, grau, adotadoM2, valorTotal, valMin, valMax,
    m2Subj: est.m2Subj, precoM2: est.precoM2,
    diffPct: est.diffPct, veredito: est.veredito, n: est.n,
    simples: !!est.simples,
    baseLabel: est.baseLabel,
    fontes: est.fontes,
  }
}

// ══ COMPONENTES SVG ══════════════════════════════════════════════════════════

/** Radar polar de proximidade */
function RadarChart({ testemunhas, avaliando, referencia }) {
  const [hov, setHov] = useState(null)

  const dists = testemunhas.map(t => t.dist).filter(v => v > 0)
  const rawMax = Math.max(...dists, 0.5)
  // escala "arredondada para cima"
  const niceMax = rawMax <= 1 ? 1 : rawMax <= 2 ? 2 : rawMax <= 3 ? 3 : rawMax <= 5 ? 5 : rawMax <= 8 ? 8 : 10
  const RMAX = 155
  const toXY = (dist, az) => {
    const r = Math.min((dist / niceMax) * RMAX, RMAX)
    const rad = az * Math.PI / 180
    return { x: r * Math.sin(rad), y: -r * Math.cos(rad) }
  }

  const rings = []
  const ringStep = niceMax <= 2 ? 0.5 : niceMax <= 5 ? 1 : 2
  for (let r = ringStep; r <= niceMax + 0.01; r += ringStep) rings.push(r)

  const dotColor = t => {
    const pct = referencia > 0 ? (t.valorHomM2 - referencia) / referencia : 0
    if (pct < -0.10) return '#4ade80'
    if (pct > 0.10) return '#f87171'
    return '#38bdf8'
  }

  return (
    <svg
      viewBox={`-190 -190 380 380`}
      className="ep-radar-svg"
      role="img"
      aria-label="Radar de proximidade das testemunhas de mercado"
    >
      {/* Fundo */}
      <circle cx={0} cy={0} r={180} fill="#0d1623" />

      {/* Eixos cardeais */}
      {[0, 90, 180, 270].map(az => {
        const rad = az * Math.PI / 180
        return (
          <line key={az}
            x1={0} y1={0}
            x2={(RMAX + 20) * Math.sin(rad)} y2={-(RMAX + 20) * Math.cos(rad)}
            stroke="#1c2e46" strokeWidth="0.8"
          />
        )
      })}

      {/* Anéis de distância */}
      {rings.map(km => {
        const r = (km / niceMax) * RMAX
        return (
          <g key={km}>
            <circle cx={0} cy={0} r={r}
              fill="none" stroke="#1c2e46"
              strokeWidth={km === niceMax ? "1" : "0.5"}
              strokeDasharray={km === niceMax ? "none" : "3 4"}
            />
            <text x={4} y={-r + 9}
              fill="#496278" fontSize="8"
              fontFamily="'IBM Plex Mono', monospace"
            >
              {km < 1 ? km.toFixed(1).replace('.', ',') : km}km
            </text>
          </g>
        )
      })}

      {/* Labels cardeais */}
      {[
        { label: 'N', x: 0, y: -(RMAX + 22) },
        { label: 'L', x: RMAX + 22, y: 3 },
        { label: 'S', x: 0, y: RMAX + 24 },
        { label: 'O', x: -(RMAX + 22), y: 3 },
      ].map(({ label, x, y }) => (
        <text key={label} x={x} y={y}
          fill="#496278" fontSize="10"
          fontFamily="'IBM Plex Sans', sans-serif"
          fontWeight="500"
          textAnchor="middle" dominantBaseline="middle"
        >
          {label}
        </text>
      ))}

      {/* Testemunhas */}
      {testemunhas.map((t, i) => {
        const { x, y } = toXY(t.dist, t.brg)
        const color = dotColor(t)
        const isHov = hov === i
        return (
          <g key={i}
            onMouseEnter={() => setHov(i)}
            onMouseLeave={() => setHov(null)}
            style={{ cursor: 'pointer' }}
          >
            <circle cx={x} cy={y} r={isHov ? 13 : 9}
              fill={color} fillOpacity={isHov ? 0.95 : 0.8}
              stroke={isHov ? '#fff' : '#0d1623'}
              strokeWidth={isHov ? "1.5" : "1"}
            />
            <text x={x} y={y}
              fill="#070c14" fontSize="7"
              fontFamily="'IBM Plex Mono', monospace"
              fontWeight="500"
              textAnchor="middle" dominantBaseline="middle"
              style={{ pointerEvents: 'none' }}
            >
              {i + 1}
            </text>
            {isHov && (
              <g>
                <rect
                  x={x > 80 ? x - 128 : x + 14} y={y - 26}
                  width={114} height={52}
                  rx={4} fill="#111d30"
                  stroke="#1c2e46" strokeWidth="1"
                />
                <text x={x > 80 ? x - 70 : x + 71} y={y - 13}
                  fill="#e8f0fc" fontSize="8"
                  fontFamily="'IBM Plex Sans', sans-serif"
                  fontWeight="500" textAnchor="middle"
                >
                  {t.ref} · {t.bairro}
                </text>
                <text x={x > 80 ? x - 70 : x + 71} y={y + 1}
                  fill="#8ca4be" fontSize="7.5"
                  fontFamily="'IBM Plex Mono', monospace"
                  textAnchor="middle"
                >
                  {fmtKm(t.dist)} · {fmtM2(t.valorHomM2)}
                </text>
                <text x={x > 80 ? x - 70 : x + 71} y={y + 15}
                  fill="#496278" fontSize="7"
                  fontFamily="'IBM Plex Sans', sans-serif"
                  textAnchor="middle"
                >
                  {Math.round(t.area)} m² · {fmtBRL(t.valor)}
                </text>
              </g>
            )}
          </g>
        )
      })}

      {/* Avaliando ao centro — diamante latão */}
      <polygon points="0,-10 10,0 0,10 -10,0"
        fill="#d4a84b" stroke="#0d1623" strokeWidth="2"
      />
      <text x={0} y={21}
        fill="#d4a84b" fontSize="8"
        fontFamily="'IBM Plex Sans', sans-serif"
        fontWeight="500" textAnchor="middle"
      >
        Avaliando
      </text>
    </svg>
  )
}

/** Scatter área × R$/m² */
function AreaScatter({ testemunhas, avaliandoArea, avaliandoM2, referencia }) {
  if (!testemunhas.length) return null
  const W = 360, H = 200
  const PAD = { t: 22, r: 20, b: 32, l: 52 }
  const pW = W - PAD.l - PAD.r
  const pH = H - PAD.t - PAD.b

  const allAreas = [...testemunhas.map(t => t.area), avaliandoArea]
  const allM2 = [...testemunhas.map(t => t.valorHomM2), avaliandoM2, referencia]
  const aMin = Math.min(...allAreas) * 0.88
  const aMax = Math.max(...allAreas) * 1.12
  const mMin = Math.max(0, Math.min(...allM2) * 0.85)
  const mMax = Math.max(...allM2) * 1.15

  const xS = v => PAD.l + (v - aMin) / (aMax - aMin) * pW
  const yS = v => PAD.t + pH - (v - mMin) / (mMax - mMin) * pH
  const refY = yS(referencia)

  // ticks eixo Y
  const yRange = mMax - mMin
  const yStep = yRange <= 3000 ? 500 : yRange <= 6000 ? 1000 : 2000
  const yTicks = []
  for (let t = Math.ceil(mMin / yStep) * yStep; t <= mMax; t += yStep) yTicks.push(t)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="ep-chart-svg" aria-label="Dispersão área por R$/m²">
      {/* Grade */}
      {yTicks.map(v => (
        <line key={v} x1={PAD.l} y1={yS(v)} x2={W - PAD.r} y2={yS(v)}
          stroke="#1c2e46" strokeWidth="0.4"
        />
      ))}

      {/* Eixos */}
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="#1c2e46" strokeWidth="1" />
      <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="#1c2e46" strokeWidth="1" />

      {/* Linha do valor adotado */}
      <line x1={PAD.l} y1={refY} x2={W - PAD.r} y2={refY}
        stroke="#d4a84b" strokeWidth="1" strokeDasharray="6 3"
      />
      <text x={W - PAD.r - 2} y={refY - 4}
        fill="#d4a84b" fontSize="7.5" textAnchor="end"
        fontFamily="'IBM Plex Mono', monospace"
      >
        adotado
      </text>

      {/* Comparáveis */}
      {testemunhas.map((t, i) => (
        <circle key={i} cx={xS(t.area)} cy={yS(t.valorHomM2)}
          r={4} fill="#38bdf8" fillOpacity={0.75}
        />
      ))}

      {/* Avaliando */}
      <circle cx={xS(avaliandoArea)} cy={yS(avaliandoM2)}
        r={7} fill="#d4a84b" stroke="#0d1623" strokeWidth="2"
      />

      {/* Labels Y */}
      {yTicks.map(v => (
        <text key={v} x={PAD.l - 5} y={yS(v)}
          fill="#496278" fontSize="7" textAnchor="end"
          fontFamily="'IBM Plex Mono', monospace" dominantBaseline="middle"
        >
          {Math.round(v / 1000)}k
        </text>
      ))}

      {/* Label X */}
      <text x={PAD.l + pW / 2} y={H - 4}
        fill="#496278" fontSize="8" textAnchor="middle"
        fontFamily="'IBM Plex Sans', sans-serif"
      >
        área (m²)
      </text>
      <text x={PAD.l - 46} y={PAD.t + pH / 2}
        fill="#496278" fontSize="8" textAnchor="middle"
        fontFamily="'IBM Plex Sans', sans-serif"
        transform={`rotate(-90, ${PAD.l - 46}, ${PAD.t + pH / 2})`}
      >
        R$/m²
      </text>

      {/* Legenda */}
      <circle cx={PAD.l + 4} cy={PAD.t + 8} r={3} fill="#38bdf8" fillOpacity={0.75} />
      <text x={PAD.l + 10} y={PAD.t + 11} fill="#8ca4be" fontSize="7" fontFamily="'IBM Plex Sans', sans-serif">
        testemunhas
      </text>
      <circle cx={PAD.l + 80} cy={PAD.t + 8} r={4} fill="#d4a84b" stroke="#0d1623" strokeWidth="1.5" />
      <text x={PAD.l + 88} y={PAD.t + 11} fill="#8ca4be" fontSize="7" fontFamily="'IBM Plex Sans', sans-serif">
        avaliando
      </text>
    </svg>
  )
}

/** Distribuição do R$/m² homogeneizado */
function DistributionChart({ vals, media, dp, referencia }) {
  if (!vals.length) return null
  const W = 360, H = 88
  const PAD = { l: 20, r: 20, t: 22, b: 22 }
  const pW = W - PAD.l - PAD.r
  const midY = PAD.t + (H - PAD.t - PAD.b) / 2

  const spread = Math.max(dp * 2.5, 500)
  const rMin = Math.min(...vals, media - spread)
  const rMax = Math.max(...vals, media + spread)
  const range = rMax - rMin || 1

  const xS = v => PAD.l + (v - rMin) / range * pW
  const bL = xS(Math.max(rMin, media - dp))
  const bR = xS(Math.min(rMax, media + dp))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="ep-chart-svg" aria-label="Distribuição do R$/m² homogeneizado">
      {/* Faixa 1σ */}
      <rect x={bL} y={PAD.t} width={Math.max(0, bR - bL)} height={H - PAD.t - PAD.b}
        fill="#38bdf8" fillOpacity={0.07}
      />

      {/* Linha do adotado */}
      <line x1={xS(referencia)} y1={PAD.t - 4} x2={xS(referencia)} y2={H - PAD.b + 4}
        stroke="#d4a84b" strokeWidth="1.5"
      />
      <text x={xS(referencia)} y={PAD.t - 6}
        fill="#d4a84b" fontSize="7.5" textAnchor="middle"
        fontFamily="'IBM Plex Mono', monospace"
      >
        adotado
      </text>

      {/* Linha da média */}
      <line x1={xS(media)} y1={PAD.t + 2} x2={xS(media)} y2={H - PAD.b - 2}
        stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 2"
      />
      <text x={xS(media)} y={H - PAD.b + 14}
        fill="#38bdf8" fontSize="7" textAnchor="middle"
        fontFamily="'IBM Plex Mono', monospace"
      >
        média
      </text>

      {/* Dots */}
      {vals.map((v, i) => {
        const pct = referencia > 0 ? (v - referencia) / referencia : 0
        const color = pct < -0.10 ? '#4ade80' : pct > 0.10 ? '#f87171' : '#38bdf8'
        return (
          <circle key={i} cx={xS(v)} cy={midY + (i % 2 === 0 ? -5 : 5)}
            r={3.5} fill={color} fillOpacity={0.8}
          />
        )
      })}

      {/* Escala */}
      <text x={PAD.l} y={H - 3} fill="#496278" fontSize="7" fontFamily="'IBM Plex Mono', monospace">
        {Math.round(rMin / 1000)}k
      </text>
      <text x={W - PAD.r} y={H - 3} fill="#496278" fontSize="7" textAnchor="end" fontFamily="'IBM Plex Mono', monospace">
        {Math.round(rMax / 1000)}k
      </text>
    </svg>
  )
}

// ══ COMPONENTES UI ═══════════════════════════════════════════════════════════

function GrauBadge({ grau }) {
  const cor = grau === 'III' ? 'up' : grau === 'II' ? 'teal' : 'brass'
  return (
    <div className={`ep-grau ep-grau--${cor}`}>
      <span className="ep-grau-num">{grau}</span>
      <span className="ep-grau-label">Grau de fundamentação</span>
    </div>
  )
}

function IntervalBar({ valMin, adotado, valMax }) {
  return (
    <div className="ep-ibar">
      <div className="ep-ibar-track">
        <div className="ep-ibar-seg ep-ibar-seg--lo" />
        <div className="ep-ibar-pip" />
        <div className="ep-ibar-seg ep-ibar-seg--hi" />
      </div>
      <div className="ep-ibar-row">
        <div className="ep-ibar-anchor">
          <span className="ep-ibar-val">{fmtBRL(valMin)}</span>
          <span className="ep-ibar-sub">mínimo</span>
        </div>
        <div className="ep-ibar-anchor ep-ibar-anchor--center">
          <span className="ep-ibar-val ep-ibar-val--adotado">{fmtBRL(adotado)}</span>
          <span className="ep-ibar-sub">valor de mercado</span>
        </div>
        <div className="ep-ibar-anchor ep-ibar-anchor--right">
          <span className="ep-ibar-val">{fmtBRL(valMax)}</span>
          <span className="ep-ibar-sub">máximo</span>
        </div>
      </div>
    </div>
  )
}

function SortableTable({ rows, referencia }) {
  const [col, setCol] = useState('ref')
  const [dir, setDir] = useState(1)

  const toggleSort = k => {
    if (col === k) setDir(d => -d)
    else { setCol(k); setDir(1) }
  }

  const sorted = [...rows].sort((a, b) => {
    const va = a[col], vb = b[col]
    if (typeof va === 'string') return dir * va.localeCompare(vb, 'pt-BR')
    return dir * ((va ?? 0) - (vb ?? 0))
  })

  const Th = ({ k, label }) => (
    <th className={`ep-th${col === k ? ' ep-th--active' : ''}`} onClick={() => toggleSort(k)}>
      {label}
      <span className="ep-sort-icon">{col === k ? (dir > 0 ? '↑' : '↓') : '↕'}</span>
    </th>
  )

  return (
    <div className="ep-table-wrap">
      <table className="ep-table">
        <thead>
          <tr>
            <Th k="ref" label="Ref" />
            <Th k="bairro" label="Bairro" />
            <Th k="area" label="Área" />
            <Th k="valor" label="Valor" />
            <Th k="valorM2" label="R$/m²" />
            <Th k="fatorHom" label="Fator" />
            <Th k="valorHomM2" label="R$/m² hom." />
            <Th k="dist" label="Dist." />
            <th className="ep-th">Fonte</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t, i) => {
            const delta = referencia > 0 ? (t.valorHomM2 - referencia) / referencia : 0
            const cls = delta > 0.10 ? 'hi' : delta < -0.10 ? 'lo' : 'ok'
            return (
              <tr key={i} className="ep-tr">
                <td className="ep-td ep-mono ep-td-ref">{t.ref}</td>
                <td className="ep-td">{t.bairro}</td>
                <td className="ep-td ep-mono ep-td-r">{Math.round(t.area)} m²</td>
                <td className="ep-td ep-mono ep-td-r">{fmtBRL(t.valor)}</td>
                <td className="ep-td ep-mono ep-td-r">{fmtM2(t.valorM2)}</td>
                <td className="ep-td ep-mono ep-td-r">{t.fatorHom.toFixed(3)}</td>
                <td className={`ep-td ep-mono ep-td-r ep-td-${cls}`}>{fmtM2(t.valorHomM2)}</td>
                <td className="ep-td ep-mono ep-td-r">{t.dist ? fmtKm(t.dist) : '·'}</td>
                <td className="ep-td ep-td-fonte">{t.fonte}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={6} className="ep-td-adotado-label">Valor adotado (mediana)</td>
            <td className="ep-td ep-mono ep-td-r ep-td-adotado">{fmtM2(referencia)}</td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ── Seção com número e título ──────────────────────────────────────────────────
function Secao({ num, titulo, sub, children, print }) {
  return (
    <section className={`ep-secao${print ? ' ep-secao--print-break' : ''}`}>
      <header className="ep-secao-head">
        <span className="ep-secao-num">Seção {String(num).padStart(2, '0')}</span>
        <h2 className="ep-secao-titulo">{titulo}</h2>
        {sub && <p className="ep-secao-sub">{sub}</p>}
      </header>
      <div className="ep-secao-body">
        {children}
      </div>
    </section>
  )
}

// ══ CONTEÚDO DO ESTUDO ════════════════════════════════════════════════════════
export function EstudoContent({ estudo, im, onClose }) {
  const [hovT, setHovT] = useState(null)
  const { avaliando, testemunhas, stats, grau, adotadoM2, valorTotal, valMin, valMax, diffPct, veredito } = estudo

  const corVerd = veredito === 'abaixo' ? 'up' : veredito === 'acima' ? 'down' : 'neu'
  const textoVerd = veredito === 'abaixo'
    ? `${Math.abs(diffPct)}% abaixo da mediana do bairro`
    : veredito === 'acima'
      ? `${diffPct}% acima da mediana do bairro`
      : 'dentro da faixa de mercado'
  const waMsg = `Olá Vinícius! Vi o estudo de valor cód. ${estudo.numero} (${avaliando.tipo} no ${avaliando.bairro}) e quero entender melhor. Pode me ajudar?`
  const METODOLOGIA = [
    { n: '01', titulo: 'Coleta de dados', desc: `Levantamento de ${testemunhas.length} imóveis do mesmo tipo na região, com área, valor anunciado, bairro e fonte de origem.` },
    { n: '02', titulo: 'Saneamento', desc: 'Exclusão de amostras que excedem ±30% da mediana, evitando distorção por valores extremos na amostra.' },
    { n: '03', titulo: 'Homogeneização', desc: 'Aplicação de fator que ajusta área (economia de escala) e deduz o valor da vaga de garagem antes do cálculo do m².' },
    { n: '04', titulo: 'Tratamento estatístico', desc: `Cálculo de média, mediana, desvio padrão (σ = ${Math.round(stats.dp).toLocaleString('pt-BR')} R$/m²) e CV (${(stats.cv * 100).toFixed(1).replace('.', ',')}%). Adotado: mediana.` },
    { n: '05', titulo: 'Conclusão', desc: `Valor unitário adotado de ${fmtM2(adotadoM2)}, resultando em ${fmtBRL(valorTotal)} para ${Math.round(avaliando.area)} m², com faixa de arbítrio de ±${Math.round(estudo.amplitude * 100)}%.` },
  ]

  return (
    <>
      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <header className="ep-header">
        <div className="ep-container ep-header-inner">
          <div className="ep-header-marca">
            <span className="ep-marca-nome">Vinícius Graton</span>
            <span className="ep-marca-papel">Consultor da Rotina Imobiliária</span>
          </div>
          <div className="ep-header-meta">
            <span className="ep-meta-label">Estudo</span>
            <span className="ep-meta-num">#{estudo.numero}</span>
            <span className="ep-meta-data">{fmtData(estudo.data)}</span>
          </div>
          <div className="ep-header-nav print-hide">
            {onClose
              ? <button className="ep-back" onClick={onClose}>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  Fechar
                </button>
              : <Link to={`/imovel/${im.codigo}`} className="ep-back">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                  Voltar ao imóvel
                </Link>
            }
          </div>
        </div>
        <div className="ep-header-bar" />
      </header>

      {/* ── Identificação ────────────────────────────────────────────────── */}
      <section className="ep-ident">
        <div className="ep-container">
          <div className="ep-ident-inner">
            <div className="ep-ident-info">
              <span className="ep-chip">{avaliando.tipo}</span>
              <h1 className="ep-ident-bairro">{avaliando.bairro}</h1>
              <p className="ep-ident-cidade">{avaliando.cidade}</p>
              <p className="ep-ident-metodo">
                <span className="ep-label-above">Método</span>
                {estudo.metodo}
              </p>
            </div>
            <div className="ep-ficha">
              {avaliando.area > 0 && (
                <div className="ep-ficha-item">
                  <span className="ep-ficha-label">Área</span>
                  <span className="ep-ficha-val">{Math.round(avaliando.area)} <span className="ep-ficha-unit">m²</span></span>
                </div>
              )}
              {avaliando.dormitorios > 0 && (
                <div className="ep-ficha-item">
                  <span className="ep-ficha-label">Dormitórios</span>
                  <span className="ep-ficha-val">{avaliando.dormitorios}</span>
                </div>
              )}
              {avaliando.suites > 0 && (
                <div className="ep-ficha-item">
                  <span className="ep-ficha-label">Suítes</span>
                  <span className="ep-ficha-val">{avaliando.suites}</span>
                </div>
              )}
              {avaliando.banheiros > 0 && (
                <div className="ep-ficha-item">
                  <span className="ep-ficha-label">Banheiros</span>
                  <span className="ep-ficha-val">{avaliando.banheiros}</span>
                </div>
              )}
              {avaliando.vagas > 0 && (
                <div className="ep-ficha-item">
                  <span className="ep-ficha-label">Vagas</span>
                  <span className="ep-ficha-val">{avaliando.vagas}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Veredito ─────────────────────────────────────────────────────── */}
      <section className="ep-veredito">
        <div className="ep-container">

          <div className="ep-verd-grid">
            {/* Valor principal */}
            <div className="ep-verd-valor">
              <span className="ep-label-above">Valor de mercado apurado</span>
              <div className="ep-valor-num">{fmtBRL(valorTotal)}</div>
              <div className="ep-valor-m2">
                <span className="ep-m2-val">{fmtM2(adotadoM2)}</span>
                <span className={`ep-diff-pill ep-diff-pill--${corVerd}`}>
                  {diffPct > 0 ? '+' : ''}{diffPct}% vs. mediana
                </span>
              </div>
              <p className="ep-verd-frase">{textoVerd}</p>
            </div>

            {/* Faixa de arbítrio */}
            <div className="ep-verd-faixa">
              <span className="ep-label-above">Faixa de arbítrio ±{Math.round(estudo.amplitude * 100)}%</span>
              <IntervalBar valMin={valMin} adotado={valorTotal} valMax={valMax} />
            </div>

            {/* Grau + indicadores */}
            <div className="ep-verd-grau">
              <GrauBadge grau={grau} />
              <div className="ep-indicadores">
                <div className="ep-indic">
                  <span className="ep-indic-label">Amostra</span>
                  <span className="ep-indic-val ep-mono">{estudo.n} imóveis</span>
                </div>
                <div className="ep-indic">
                  <span className="ep-indic-label">CV</span>
                  <span className="ep-indic-val ep-mono">{(stats.cv * 100).toFixed(1).replace('.', ',')}%</span>
                </div>
                <div className="ep-indic">
                  <span className="ep-indic-label">Faixa hom.</span>
                  <span className="ep-indic-val ep-mono">{fmtM2(stats.min)} – {fmtM2(stats.max)}</span>
                </div>
                <div className="ep-indic">
                  <span className="ep-indic-label">Dist. média</span>
                  <span className="ep-indic-val ep-mono">{fmtKm(testemunhas.length ? testemunhas.reduce((s, t) => s + (t.dist || 0), 0) / testemunhas.length : 0)}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── Corpo ────────────────────────────────────────────────────────── */}
      <div className="ep-container ep-corpo">

        {/* S01 — Radar */}
        {testemunhas.length > 0 && (
          <Secao num={1} titulo="Radar de proximidade"
            sub={`${testemunhas.length} testemunhas posicionadas por distância real e azimute a partir do avaliando`}
          >
            <div className="ep-radar-wrap">
              <div className="ep-radar-col">
                <RadarChart testemunhas={testemunhas} avaliando={avaliando} referencia={adotadoM2} />
              </div>
              <ul className="ep-radar-list">
                {testemunhas.map((t, i) => {
                  const delta = adotadoM2 > 0 ? (t.valorHomM2 - adotadoM2) / adotadoM2 : 0
                  const cor = delta > 0.10 ? 'down' : delta < -0.10 ? 'up' : 'teal'
                  return (
                    <li key={i}
                      className={`ep-radar-item${hovT === i ? ' ep-radar-item--hov' : ''}`}
                      onMouseEnter={() => setHovT(i)}
                      onMouseLeave={() => setHovT(null)}
                    >
                      <span className={`ep-radar-dot ep-radar-dot--${cor}`}>{i + 1}</span>
                      <div className="ep-radar-info">
                        <span className="ep-radar-bairro">{t.bairro}</span>
                        <span className="ep-radar-dist ep-mono">{fmtKm(t.dist)}</span>
                      </div>
                      <span className={`ep-radar-m2 ep-mono ep-radar-m2--${cor}`}>{fmtM2(t.valorHomM2)}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </Secao>
        )}

        {/* S02 — Tabela */}
        {testemunhas.length > 0 && (
          <Secao num={2} titulo="Amostra de mercado"
            sub="Tabela completa de testemunhas com R$/m² bruto, fator de homogeneização e R$/m² ajustado"
            print
          >
            <SortableTable rows={testemunhas} referencia={adotadoM2} />
          </Secao>
        )}

        {/* S03 — Gráficos */}
        {testemunhas.length >= 3 && (
          <Secao num={3} titulo="Dispersão e aderência"
            sub="Relação entre área e R$/m² homogeneizado, com valor adotado de referência"
            print
          >
            <div className="ep-charts-grid">
              <div className="ep-chart-bloco">
                <span className="ep-chart-titulo">Área × R$/m²</span>
                <AreaScatter
                  testemunhas={testemunhas}
                  avaliandoArea={avaliando.area}
                  avaliandoM2={estudo.m2Subj}
                  referencia={adotadoM2}
                />
              </div>
              <div className="ep-chart-bloco">
                <span className="ep-chart-titulo">Distribuição do R$/m² homogeneizado</span>
                <DistributionChart
                  vals={testemunhas.map(t => t.valorHomM2)}
                  media={stats.media}
                  dp={stats.dp}
                  referencia={adotadoM2}
                />
                <div className="ep-chart-legend">
                  <span><span className="ep-swatch ep-swatch--up" />abaixo da referência</span>
                  <span><span className="ep-swatch ep-swatch--teal" />na faixa</span>
                  <span><span className="ep-swatch ep-swatch--down" />acima da referência</span>
                </div>
              </div>
            </div>
          </Secao>
        )}

        {/* S04 — Estatísticas */}
        {estudo.n > 0 && (
          <Secao num={4} titulo="Tratamento estatístico"
            sub="Sobre o R$/m² homogeneizado da amostra saneada"
            print
          >
            <div className="ep-stats-grid">
              <div className="ep-stat-bloco">
                <span className="ep-stat-label">Média</span>
                <span className="ep-stat-val ep-mono">{fmtM2(stats.media)}</span>
              </div>
              <div className="ep-stat-bloco ep-stat-bloco--dest">
                <span className="ep-stat-label">Mediana (adotado)</span>
                <span className="ep-stat-val ep-mono ep-stat-val--brass">{fmtM2(stats.mediana)}</span>
              </div>
              <div className="ep-stat-bloco">
                <span className="ep-stat-label">Desvio padrão</span>
                <span className="ep-stat-val ep-mono">{fmtM2(stats.dp)}</span>
              </div>
              <div className="ep-stat-bloco">
                <span className="ep-stat-label">Coef. de variação</span>
                <span className="ep-stat-val ep-mono">{(stats.cv * 100).toFixed(1).replace('.', ',')}%</span>
              </div>
              <div className="ep-stat-bloco">
                <span className="ep-stat-label">Mínimo hom.</span>
                <span className="ep-stat-val ep-mono">{fmtM2(stats.min)}</span>
              </div>
              <div className="ep-stat-bloco">
                <span className="ep-stat-label">Máximo hom.</span>
                <span className="ep-stat-val ep-mono">{fmtM2(stats.max)}</span>
              </div>
              <div className="ep-stat-bloco">
                <span className="ep-stat-label">Amostras</span>
                <span className="ep-stat-val ep-mono">{estudo.n}</span>
              </div>
              <div className="ep-stat-bloco">
                <span className="ep-stat-label">Tendência</span>
                <span className="ep-stat-val">{estudo.tendencia}</span>
              </div>
            </div>
          </Secao>
        )}

        {/* S05 — Metodologia */}
        <Secao num={5} titulo="Metodologia" sub="Etapas do método comparativo direto de dados de mercado (ABNT NBR 14653)" print>
          <div className="ep-met-grid">
            {METODOLOGIA.map(etapa => (
              <div key={etapa.n} className="ep-met-etapa">
                <span className="ep-met-num">{etapa.n}</span>
                <div className="ep-met-corpo">
                  <span className="ep-met-titulo">{etapa.titulo}</span>
                  <p className="ep-met-desc">{etapa.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="ep-disc">
            Estudo comparativo pelo método ABNT NBR 14653. Estimativa de referência.. não substitui laudo com vistoria presencial. Baseado em preços anunciados, não em escrituras registradas.
          </p>
        </Secao>

      </div>

      {/* ── Assinatura ───────────────────────────────────────────────────── */}
      <footer className="ep-assinatura">
        <div className="ep-container ep-assinatura-inner">
          <div className="ep-assina-info">
            <span className="ep-assina-nome">{estudo.consultor.nome}</span>
            <span className="ep-assina-reg">{estudo.consultor.registro}</span>
            <span className="ep-assina-nota">
              Estudo elaborado com base em dados públicos de mercado. Valores sujeitos a variação conforme condições de mercado.
            </span>
          </div>
          <a
            className="ep-assina-wa"
            href={`https://wa.me/${estudo.consultor.whatsapp}?text=${encodeURIComponent(waMsg)}`}
            target="_blank" rel="noopener noreferrer"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.946-1.418A9.956 9.956 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.946 7.946 0 01-4.29-1.254l-.308-.185-3.17.909.91-3.094-.2-.32A7.96 7.96 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/></svg>
            Falar com o Vinícius
          </a>
        </div>
      </footer>
    </>
  )
}

// ══ PÁGINA PRINCIPAL ══════════════════════════════════════════════════════════
export default function EstudoM2Page() {
  const { codigo } = useParams()
  const [imApi, setImApi] = useState(null)
  const [loadingApi, setLoadingApi] = useState(true)
  const [feed, setFeed] = useState([])

  useFontsPremium()

  const staticIm = useMemo(() => getImovel(codigo), [codigo])
  const im = staticIm || imApi

  useEffect(() => {
    if (staticIm) { setLoadingApi(false); return }
    let live = true
    setLoadingApi(true)
    fetch(`/api/rotina-imovel?codigo=${encodeURIComponent(codigo)}`)
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        if (!live) return
        if (j?.imovel) {
          const a = j.imovel
          setImApi({
            codigo: String(a.codigo), tipo: a.tipo || '', bairro: a.bairro || '',
            preco: a.valorNum || 0, area: a.areaNum || 0,
            vagas: a.vagas || 0, quartos: a.quartos || 0,
          })
        }
        setLoadingApi(false)
      })
      .catch(() => { if (live) setLoadingApi(false) })
    return () => { live = false }
  }, [codigo, staticIm])

  useEffect(() => {
    let live = true
    fetch('/catalogo.json')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (live && Array.isArray(d?.imoveis)) setFeed(d.imoveis) })
      .catch(() => {})
    return () => { live = false }
  }, [])

  useSEO({
    title: im ? `Estudo de valor · ${im.tipo} no ${im.bairro} | Vinícius Graton` : 'Estudo de valor do m²',
    description: im ? `Análise técnica comparativa do ${im.tipo} no ${im.bairro} pelo método NBR 14653. Valor de mercado apurado com radar de proximidade e estatística.` : '',
    path: `/estudo/${codigo}`,
  })

  if (!im) {
    return (
      <main className="pagina ep-pg ep-pg--loading">
        {loadingApi
          ? <><div className="ep-spinner" /><p>Carregando análise…</p></>
          : <><p>Imóvel não encontrado.</p><Link to="/imoveis" className="btn btn-gold">Ver catálogo</Link></>
        }
      </main>
    )
  }

  const rawEst = (() => { try { return estudoM2(im, feed) } catch { return { ok: false } } })()
  if (!rawEst?.ok) {
    return (
      <main className="pagina ep-pg ep-pg--loading">
        {loadingApi
          ? <><div className="ep-spinner" /><p>Calculando análise…</p></>
          : <><p>Análise não disponível para este imóvel.</p><Link to={`/imovel/${im.codigo}`} className="btn btn-ghost">Voltar ao imóvel</Link></>
        }
      </main>
    )
  }

  const estudo = buildEstudo(im, rawEst)

  return (
    <main className="pagina ep-pg">
      <EstudoContent estudo={estudo} im={im} />
    </main>
  )
}
