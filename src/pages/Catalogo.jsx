import { useState, useMemo } from 'react'
import Reveal from '../components/Reveal'
import CardImovel from '../components/CardImovel'
import { IMOVEIS, TIPOS_IMOVEL, BAIRROS_IMOVEL, FAIXAS_PRECO, linkWhatsApp, WA } from '../data'
import { IconWhats } from '../components/icons'

const EMPTY = { q: '', tipo: '', bairro: '', faixa: -1, quartos: 0, vagas: 0, ordem: 'recentes' }

export default function Catalogo() {
  const [f, setF] = useState(EMPTY)
  const up = (k, v) => setF((s) => ({ ...s, [k]: v }))

  const lista = useMemo(() => {
    let r = IMOVEIS.filter((im) => {
      if (f.tipo && im.tipo !== f.tipo) return false
      if (f.bairro && im.bairro !== f.bairro) return false
      if (f.quartos && (im.quartos || 0) < f.quartos) return false
      if (f.vagas && (im.vagas || 0) < f.vagas) return false
      if (f.faixa >= 0) {
        const faixa = FAIXAS_PRECO[f.faixa]
        if (im.preco < faixa.min || im.preco >= faixa.max) return false
      }
      if (f.q) {
        const alvo = `${im.tipo} ${im.bairro} ${im.codigo} ${im.cidade}`.toLowerCase()
        if (!alvo.includes(f.q.toLowerCase())) return false
      }
      return true
    })
    if (f.ordem === 'menor') r = [...r].sort((a, b) => a.preco - b.preco)
    if (f.ordem === 'maior') r = [...r].sort((a, b) => b.preco - a.preco)
    return r
  }, [f])

  const limpar = () => setF(EMPTY)
  const ativos = f.tipo || f.bairro || f.faixa >= 0 || f.quartos || f.vagas || f.q

  return (
    <main className="section--light catalogo">
      <div className="container">
        <Reveal>
          <div className="cat-head">
            <span className="eyebrow">Vitrine de imóveis · Uberlândia</span>
            <h1 className="section-title">Imóveis à <em>venda</em></h1>
            <p className="section-sub" style={{ marginTop: 12 }}>
              Selecionados da minha carteira. Use os filtros para encontrar o que combina com você.
            </p>
          </div>
        </Reveal>

        {/* Filtros */}
        <div className="cat-filtros">
          <input
            className="cat-busca"
            type="search"
            placeholder="Buscar por bairro, tipo ou código…"
            value={f.q}
            onChange={(e) => up('q', e.target.value)}
          />
          <select value={f.tipo} onChange={(e) => up('tipo', e.target.value)}>
            <option value="">Todos os tipos</option>
            {TIPOS_IMOVEL.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={f.bairro} onChange={(e) => up('bairro', e.target.value)}>
            <option value="">Todos os bairros</option>
            {BAIRROS_IMOVEL.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={f.faixa} onChange={(e) => up('faixa', parseInt(e.target.value, 10))}>
            <option value={-1}>Qualquer preço</option>
            {FAIXAS_PRECO.map((p, i) => <option key={i} value={i}>{p.label}</option>)}
          </select>
          <select value={f.quartos} onChange={(e) => up('quartos', parseInt(e.target.value, 10))}>
            <option value={0}>Quartos</option>
            {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}+ quartos</option>)}
          </select>
          <select value={f.vagas} onChange={(e) => up('vagas', parseInt(e.target.value, 10))}>
            <option value={0}>Vagas</option>
            {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}+ vagas</option>)}
          </select>
          <select value={f.ordem} onChange={(e) => up('ordem', e.target.value)}>
            <option value="recentes">Mais recentes</option>
            <option value="menor">Menor preço</option>
            <option value="maior">Maior preço</option>
          </select>
          {ativos ? <button className="cat-limpar" onClick={limpar}>Limpar filtros</button> : null}
        </div>

        <p className="cat-count">{lista.length} {lista.length === 1 ? 'imóvel encontrado' : 'imóveis encontrados'}</p>

        {lista.length ? (
          <div className="im-grid" style={{ perspective: '1400px' }}>
            {lista.map((im, i) => (
              <Reveal key={im.codigo} delay={(i % 3) * 0.06}>
                <CardImovel im={im} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="cat-vazio">
            <p>Não encontrei imóveis com esses filtros.</p>
            <a className="btn btn-gold" href={linkWhatsApp(WA.imoveis)} target="_blank" rel="noopener">
              <IconWhats /> Me conta o que você procura
            </a>
          </div>
        )}

        <div className="cat-cta">
          <h3>Não achou o imóvel ideal?</h3>
          <p>Tenho acesso a muito mais opções. Me conta o que você procura que eu faço a curadoria pra você.</p>
          <a className="btn btn-gold" href={linkWhatsApp(WA.imoveis)} target="_blank" rel="noopener">
            <IconWhats /> Falar com o Vinícius
          </a>
        </div>
      </div>
    </main>
  )
}
