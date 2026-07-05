import { useState } from 'react'
import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import { IMOVEIS, fotosDe, formatPreco, formatArea, linkWhatsApp } from '../data'
import { onImgError } from '../img'
import { useSEO } from '../useSEO'
import { IconArrow, IconClose, IconWhats } from '../components/icons'
import '../styles/catalogo.css'
import '../styles/condominio.css'
import '../styles/comparar.css'

const rs = (n) => (n > 0 ? n : 0)
const precoM2 = (im) => (im.preco > 0 && im.area > 0 ? im.preco / im.area : 0)

const LINHAS = [
  ['Preço', (im) => formatPreco(im.preco)],
  ['Bairro', (im) => im.bairro || '-'],
  ['Tipo', (im) => im.tipo || '-'],
  ['Área', (im) => (im.area ? formatArea(im.area) : '-')],
  ['Quartos', (im) => rs(im.quartos) || '-'],
  ['Suítes', (im) => rs(im.suites) || '-'],
  ['Vagas', (im) => rs(im.vagas) || '-'],
  ['Preço por m²', (im) => (precoM2(im) ? formatPreco(Math.round(precoM2(im))) : '-')],
]

export default function Comparar() {
  useSEO({ title: 'Comparar imóveis lado a lado - Uberlândia', description: 'Compare imóveis de Uberlândia lado a lado: preço, área, quartos, vagas e preço por m². Ferramenta gratuita do consultor Vinícius Graton.', path: '/comparar' })
  const [sel, setSel] = useState([])
  const toggle = (cod) => setSel((s) => s.includes(cod) ? s.filter((x) => x !== cod) : (s.length >= 4 ? s : [...s, cod]))
  const escolhidos = sel.map((c) => IMOVEIS.find((i) => i.codigo === c)).filter(Boolean)
  const msgRecomenda = `Olá Vinícius! Estou comparando estes imóveis e queria a sua opinião sobre qual vale mais a pena pra mim:\n${escolhidos.map((im) => `• ${im.tipo} no ${im.bairro} - ${formatPreco(im.preco)} (cód. ${im.codigo})`).join('\n')}`

  return (
    <main className="pagina section--light det comparar-pg">
      <div className="container">
        <Reveal>
          <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 10px' }}>
            <span className="eyebrow" style={{ justifyContent: 'center' }}>Comparador</span>
            <h1 className="section-title">Compare imóveis <em>lado a lado</em></h1>
            <p className="section-sub" style={{ marginTop: 14 }}>Selecione até 4 imóveis e veja tudo numa tabela - preço, área, quartos, vagas e preço por m². Decida com clareza.</p>
          </div>
        </Reveal>

        {escolhidos.length >= 2 && (
          <>
          <div className="cmp-scroll" style={{ marginBottom: 18 }}>
            <table className="cmp-table comparar-table">
              <thead><tr><th></th>{escolhidos.map((im) => (
                <th key={im.codigo}>
                  <span className="comparar-th">
                    <img src={fotosDe(im)[0]} alt={im.tipo} onError={onImgError} referrerPolicy="no-referrer" />
                    <b>{im.tipo} · {im.bairro}</b>
                  </span>
                </th>))}</tr></thead>
              <tbody>
                {LINHAS.map(([rot, fn]) => <tr key={rot}><td className="cmp-rot">{rot}</td>{escolhidos.map((im) => <td key={im.codigo}>{fn(im)}</td>)}</tr>)}
                <tr><td className="cmp-rot"></td>{escolhidos.map((im) => <td key={im.codigo}><Link className="btn btn-gold cmp-ver" to={`/imovel/${im.codigo}`}>Ver <IconArrow width={13} height={13} /></Link></td>)}</tr>
              </tbody>
            </table>
          </div>
          <div className="comparar-cta">
            <p>Em dúvida entre {escolhidos.length === 2 ? 'os dois' : `esses ${escolhidos.length}`}? Eu analiso seu momento e te digo qual faz mais sentido.</p>
            <a className="btn btn-gold" href={linkWhatsApp(msgRecomenda)} target="_blank" rel="noopener noreferrer">
              <IconWhats width={18} height={18} /> Qual você recomenda, Vinícius?
            </a>
          </div>
          </>
        )}

        <p className="cat-count">{sel.length}/4 selecionados {sel.length > 0 && <button className="condo-limpar" onClick={() => setSel([])}>limpar</button>}</p>
        <div className="comparar-grid">
          {IMOVEIS.map((im) => (
            <button key={im.codigo} className={`comparar-mini ${sel.includes(im.codigo) ? 'on' : ''}`} onClick={() => toggle(im.codigo)} aria-pressed={sel.includes(im.codigo)}>
              <span className="comparar-mini-capa"><img src={fotosDe(im)[0]} alt={im.tipo} loading="lazy" onError={onImgError} referrerPolicy="no-referrer" />{sel.includes(im.codigo) && <span className="comparar-check">✓</span>}</span>
              <span className="comparar-mini-b">{formatPreco(im.preco)}</span>
              <span className="comparar-mini-s">{im.tipo} · {im.bairro}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}
