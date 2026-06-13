import { useState, useEffect } from 'react'
import Reveal from './Reveal'
import CardImovel from './CardImovel'

// Lê /novidades.json (gerado no sync diário) e mostra "Chegaram agora" + "Baixaram de preço".
export default function Novidades() {
  const [nov, setNov] = useState(null)
  useEffect(() => {
    let vivo = true
    fetch('/novidades.json').then((r) => (r.ok ? r.json() : null)).then((d) => { if (vivo) setNov(d) }).catch(() => {})
    return () => { vivo = false }
  }, [])

  const novos = (nov && nov.novos) || []
  const baixaram = (nov && nov.baixaram) || []
  if (!novos.length && !baixaram.length) return null

  const diaLabel = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })

  const Bloco = ({ eyebrow, titulo, em, sub, itens, top, overlayOnPhoto }) => {
    const slice = itens.slice(0, 6)
    const n = slice.length
    const usaLinha = n <= 2
    const mostraHeader = !overlayOnPhoto || !usaLinha
    return (
      <>
        {mostraHeader && (
          <Reveal>
            <div className="cat-head" style={{ textAlign: 'center', maxWidth: 660, margin: `${top ? 56 : 0}px auto 30px` }}>
              <span className="eyebrow" style={{ justifyContent: 'center' }}>{eyebrow}</span>
              <h2 className="section-title">{titulo} <em>{em}</em></h2>
              <p className="section-sub" style={{ marginTop: 12 }}>{sub}</p>
            </div>
          </Reveal>
        )}
        {usaLinha ? (
          <div className={`nov-destaque${n === 1 ? ' nov-destaque--1' : ''}`}>
            {slice.map((im, i) => (
              <Reveal key={im.codigo} delay={i * 0.08}>
                <CardImovel im={im} variante="linha" overlayLabel={overlayOnPhoto && i === 0 ? { eyebrow, titulo, em } : undefined} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="im-grid" style={{ perspective: '1400px' }}>
            {slice.map((im, i) => (
              <Reveal key={im.codigo} delay={(i % 3) * 0.08}><CardImovel im={im} /></Reveal>
            ))}
          </div>
        )}
      </>
    )
  }

  return (
    <section className="section--light">
      <div className="container">
        {baixaram.length > 0 && (() => {
          const datas = [...new Set(baixaram.slice(0,6).map(im => im.baixouEm).filter(Boolean))]
          const subBaixaram = datas.length === 1
            ? `Preço reduzido em ${new Date(datas[0]).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}. Oportunidade boa não espera — corre comigo.`
            : 'Imóveis que tiveram o preço reduzido recentemente. Oportunidade boa não espera — corre comigo.'
          return (
            <Bloco eyebrow="Oportunidade real" titulo="Baixaram de" em="preço" itens={baixaram} sub={subBaixaram} overlayOnPhoto />
          )
        })()}
        {novos.length > 0 && (
          <Bloco eyebrow="Atualizado hoje" titulo="Chegaram em" em={diaLabel} itens={novos} top={baixaram.length > 0}
            sub="Imóveis que acabaram de entrar na carteira da Rotina — com o meu atendimento pessoal." />
        )}
      </div>
    </section>
  )
}
