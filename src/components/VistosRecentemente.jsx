import { useState, useEffect, useMemo } from 'react'
import CardImovel from './CardImovel'
import { IMOVEIS } from '../data'
import { getVistos } from '../vistos'

// Faixa "Visto recentemente" — mostra os últimos imóveis que o visitante abriu
// (histórico local). Aparece só se houver pelo menos 2. Resolve os códigos
// contra os curados (IMOVEIS) + o espelho completo (catalogo.json).
export default function VistosRecentemente({ excluir, titulo = 'Visto recentemente' }) {
  const [vistos, setVistos] = useState(() => getVistos())
  const [feed, setFeed] = useState([])

  useEffect(() => {
    const ler = () => setVistos(getVistos())
    window.addEventListener('vg-vistos', ler)
    window.addEventListener('storage', ler)
    return () => { window.removeEventListener('vg-vistos', ler); window.removeEventListener('storage', ler) }
  }, [])

  useEffect(() => {
    let vivo = true
    fetch('/catalogo.json').then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivo && d && Array.isArray(d.imoveis)) setFeed(d.imoveis) })
      .catch(() => {})
    return () => { vivo = false }
  }, [])

  const mapa = useMemo(() => {
    const m = new Map()
    for (const im of feed) m.set(String(im.codigo), im)
    for (const im of IMOVEIS) { const c = String(im.codigo); m.set(c, m.has(c) ? { ...m.get(c), ...im } : im) }
    return m
  }, [feed])

  const itens = useMemo(
    () => vistos.filter((c) => String(c) !== String(excluir)).map((c) => mapa.get(String(c))).filter(Boolean),
    [vistos, mapa, excluir]
  )

  if (itens.length < 2) return null

  return (
    <section className="vistos">
      <div className="container">
        <div className="vistos-head">
          <span className="eyebrow">Continue de onde parou</span>
          <h2 className="vistos-tit">{titulo}</h2>
        </div>
        <div className="vistos-row" data-lenis-prevent>
          {itens.map((im) => (
            <div className="vistos-card" key={im.codigo}><CardImovel im={im} /></div>
          ))}
        </div>
      </div>
    </section>
  )
}
