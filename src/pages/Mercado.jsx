import { useState, useEffect, useMemo } from 'react'
import { useSEO } from '../useSEO'

const fmt = (n) => 'R$ ' + Number(n).toLocaleString('pt-BR')
const fmtK = (n) => n >= 1000 ? `R$ ${Math.round(n / 1000)}k` : fmt(n)

const slug = (nome) => nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-')

function GraficoBairros({ linhas }) {
  const top = useMemo(() =>
    [...linhas].filter(l => l.mediana_m2 > 0).sort((a, b) => b.mediana_m2 - a.mediana_m2).slice(0, 20)
  , [linhas])
  const max = top[0]?.mediana_m2 || 1
  const cor = (i, total) => {
    const t = i / Math.max(total - 1, 1)
    const h = Math.round(215 - t * 180)
    const s = Math.round(65 + t * 20)
    const l = Math.round(50 - t * 8)
    return `hsl(${h},${s}%,${l}%)`
  }
  if (!top.length) return null
  return (
    <div className="mercado-chart">
      <div className="mercado-chart-hd">
        <div>
          <h2 className="mercado-chart-titulo">Mapa de calor - R$/m² por bairro</h2>
          <p className="mercado-chart-sub">Top 20 bairros mais valorizados por metro quadrado</p>
        </div>
      </div>
      <div className="mercado-chart-lista">
        {top.map((l, i) => (
          <a key={l.nome} className="mercado-chart-row" href={`/imoveis/uberlandia/${slug(l.nome)}`}>
            <span className="mercado-chart-pos">{i + 1}</span>
            <span className="mercado-chart-nome">{l.nome}</span>
            <div className="mercado-chart-bwrap">
              <div className="mercado-chart-barra" style={{ width: `${(l.mediana_m2 / max) * 100}%`, background: cor(i, top.length) }} />
            </div>
            <span className="mercado-chart-val">{fmtK(l.mediana_m2)}/m²</span>
          </a>
        ))}
      </div>
    </div>
  )
}

const COLS = [
  { key: 'nome',          label: 'Bairro',          numeric: false },
  { key: 'count',         label: 'Qtd',             numeric: true  },
  { key: 'mediana_preco', label: 'Mediana preço',   numeric: true  },
  { key: 'mediana_area',  label: 'Mediana m²',      numeric: true  },
  { key: 'mediana_m2',    label: 'R$/m²',           numeric: true  },
  { key: 'faixa',         label: 'Faixa de preços', numeric: false },
]

export default function Mercado() {
  useSEO({
    title: 'Mercado imobiliário em Uberlândia - preços por bairro',
    description: 'Veja a mediana de preço e preço por m² em 120 bairros de Uberlândia. Dados reais do catálogo da Rotina Imobiliária.',
    path: '/mercado',
  })

  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState(false)
  const [busca, setBusca] = useState('')
  const [ord, setOrd] = useState({ col: 'count', dir: 'desc' })

  useEffect(() => {
    fetch('/mercado-stats.json')
      .then(r => r.json())
      .then(setDados)
      .catch(() => setErro(true))
  }, [])

  const linhas = useMemo(() => {
    if (!dados) return []
    return Object.entries(dados.bairros).map(([nome, b]) => ({
      nome,
      count: b.count,
      mediana_preco: b.mediana_preco,
      mediana_area: b.mediana_area,
      mediana_m2: b.mediana_m2,
      min_preco: b.min_preco,
      max_preco: b.max_preco,
      faixa: `${fmt(b.min_preco)} – ${fmt(b.max_preco)}`,
    }))
  }, [dados])

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return q ? linhas.filter(l => l.nome.toLowerCase().includes(q)) : linhas
  }, [linhas, busca])

  const ordenadas = useMemo(() => {
    const { col, dir } = ord
    return [...filtradas].sort((a, b) => {
      const va = a[col]
      const vb = b[col]
      if (typeof va === 'number' && typeof vb === 'number') {
        return dir === 'asc' ? va - vb : vb - va
      }
      return dir === 'asc' ? String(va).localeCompare(String(vb), 'pt-BR') : String(vb).localeCompare(String(va), 'pt-BR')
    })
  }, [filtradas, ord])

  const clicarCol = (key) => {
    setOrd(o => ({ col: key, dir: o.col === key && o.dir === 'desc' ? 'asc' : 'desc' }))
  }

  const stats = useMemo(() => {
    if (!dados) return null
    const precos = linhas.map(l => l.mediana_preco).filter(Boolean).sort((a, b) => a - b)
    const m2s = linhas.map(l => l.mediana_m2).filter(Boolean).sort((a, b) => a - b)
    const mid = arr => arr[Math.floor(arr.length / 2)] || 0
    return {
      total: dados.total,
      bairros: linhas.length,
      medianaPreco: mid(precos),
      medianaM2: mid(m2s),
    }
  }, [dados, linhas])

  const dataAtual = dados?.geradoEm
    ? new Date(dados.geradoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null

  return (
    <main className="pagina section--light mercado-pg">
      <div className="container">
        <span className="eyebrow">Inteligência de mercado</span>
        <h1 className="section-title">Mercado imobiliário<br /><em>em Uberlândia</em></h1>
        <p className="section-sub" style={{ marginTop: 12, marginBottom: 32 }}>
          Preços medianos e variação por bairro, com base no catálogo ativo da Rotina Imobiliária.
        </p>

        {erro && <p style={{ color: 'var(--text-mute)' }}>Não foi possível carregar os dados. Tente novamente.</p>}

        {stats && (
          <div className="mercado-stats">
            <div className="mercado-stat">
              <div className="mercado-stat-num">{stats.total.toLocaleString('pt-BR')}</div>
              <div className="mercado-stat-rot">Imóveis disponíveis</div>
            </div>
            <div className="mercado-stat">
              <div className="mercado-stat-num">{stats.bairros}</div>
              <div className="mercado-stat-rot">Bairros cobertos</div>
            </div>
            <div className="mercado-stat">
              <div className="mercado-stat-num" style={{ fontSize: '1.35rem' }}>{fmt(stats.medianaPreco)}</div>
              <div className="mercado-stat-rot">Mediana de preço</div>
            </div>
            <div className="mercado-stat">
              <div className="mercado-stat-num" style={{ fontSize: '1.35rem' }}>{fmt(stats.medianaM2)}<small style={{ fontSize: '0.9rem' }}>/m²</small></div>
              <div className="mercado-stat-rot">Mediana R$/m²</div>
            </div>
          </div>
        )}

        {linhas.length > 0 && <GraficoBairros linhas={linhas} />}

        {dados && (
          <>
            <input
              className="mercado-busca"
              type="search"
              placeholder="Filtrar bairro…"
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />

            <div className="mercado-table-wrap">
              <table className="mercado-table">
                <thead>
                  <tr>
                    {COLS.map(c => (
                      <th
                        key={c.key}
                        className={ord.col === c.key ? 'ativo' : ''}
                        onClick={() => clicarCol(c.key)}
                      >
                        {c.label} {ord.col === c.key ? (ord.dir === 'asc' ? '↑' : '↓') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ordenadas.map(l => (
                    <tr key={l.nome}>
                      <td>
                        <a
                          className="mercado-bairro-link"
                          href={`/imoveis/uberlandia/${l.nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-')}`}
                        >
                          {l.nome}
                        </a>
                      </td>
                      <td>{l.count}</td>
                      <td>{l.mediana_preco ? fmt(l.mediana_preco) : '-'}</td>
                      <td>{l.mediana_area ? `${l.mediana_area} m²` : '-'}</td>
                      <td>{l.mediana_m2 ? fmt(l.mediana_m2) : '-'}</td>
                      <td><span className="mercado-faixa">{l.faixa}</span></td>
                    </tr>
                  ))}
                  {ordenadas.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-mute)', padding: '20px 0' }}>Nenhum bairro encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <p className="mercado-nota">
              Dados do catálogo ativo da Rotina Imobiliária - Uberlândia/MG.
              {dataAtual && <> Última atualização: {dataAtual}.</>}
            </p>
          </>
        )}

        {!dados && !erro && (
          <p style={{ color: 'var(--text-mute)', padding: '40px 0', textAlign: 'center' }}>Carregando dados…</p>
        )}
      </div>
    </main>
  )
}
