import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import CardImovel from '../components/CardImovel'
import { IMOVEIS } from '../data'
import { useSEO } from '../useSEO'
import { IconArrow, IconPin } from '../components/icons'

export default function Mapa() {
  useSEO({ title: 'Imóveis no mapa de Uberlândia', description: 'Explore os imóveis à venda por região no mapa de Uberlândia. Escolha o bairro e veja as opções com o consultor Vinícius Graton.', path: '/mapa' })

  const porBairro = useMemo(() => {
    const m = {}
    for (const im of IMOVEIS) { if (im.bairro) (m[im.bairro] = m[im.bairro] || []).push(im) }
    return Object.entries(m).sort((a, b) => b[1].length - a[1].length)
  }, [])
  const [bairro, setBairro] = useState(porBairro[0]?.[0] || '')
  const lista = porBairro.find(([b]) => b === bairro)?.[1] || []
  const q = encodeURIComponent(`bairro ${bairro}, Uberlândia, Minas Gerais, Brasil`)

  return (
    <main className="pagina section--light det mapa-pg">
      <div className="container">
        <Reveal>
          <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 10px' }}>
            <span className="eyebrow" style={{ justifyContent: 'center' }}>Busca por mapa</span>
            <h1 className="section-title">Imóveis no <em>mapa de Uberlândia</em></h1>
            <p className="section-sub" style={{ marginTop: 14 }}>Escolha a região e veja no mapa onde ficam os imóveis. Por privacidade, mostro a localização por bairro — o endereço exato eu passo no atendimento.</p>
          </div>
        </Reveal>

        <div className="mapa-bairros">
          {porBairro.map(([b, ims]) => (
            <button key={b} className={`condo-chip ${bairro === b ? 'on' : ''}`} onClick={() => setBairro(b)}><IconPin width={13} height={13} /> {b} <i>({ims.length})</i></button>
          ))}
        </div>

        <div className="mapa-frame">
          <iframe title={`Mapa de ${bairro}`} src={`https://maps.google.com/maps?q=${q}&z=14&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        </div>

        <h2 className="det-rel-titulo" style={{ marginTop: 36 }}>{lista.length} {lista.length === 1 ? 'imóvel' : 'imóveis'} em {bairro}</h2>
        <div className="im-grid" style={{ perspective: '1400px' }}>
          {lista.map((im) => <CardImovel key={im.codigo} im={im} />)}
        </div>

        <div style={{ marginTop: 36, textAlign: 'center' }}>
          <Link className="btn btn-ghost" to="/imoveis">Ver catálogo completo <IconArrow /></Link>
        </div>
      </div>
    </main>
  )
}
