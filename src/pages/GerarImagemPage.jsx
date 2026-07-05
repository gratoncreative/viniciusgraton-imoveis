import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useSEO } from '../useSEO'

// Geração de imagem para blog/redes via Cloudflare Workers AI (FLUX-1-schnell).
// Sem chave externa. Imagens ILUSTRATIVAS/decorativas — não são fotos reais do bairro.

const TIPOS = [
  { id: 'artigo', nome: 'Capa de artigo (blog)' },
  { id: 'bairro', nome: 'Post de bairro' },
  { id: 'lancamento', nome: 'Peça de lançamento' },
  { id: 'livre', nome: 'Prompt livre' },
]
const BAIRROS = ['Santa Mônica', 'Jardim Karaíba', 'Cidade Jardim', 'Tubalina', 'Granja Marileusa', 'Morada da Colina', 'Gávea', 'Vigilato Pereira']
const BASE_NEG = 'no text, no letters, no watermark, no logo, photographic, high quality, natural light'
const MOOD = 'sophisticated, warm, navy blue and champagne gold tones, real estate editorial'

function montarPrompt(tipo, tema, bairro) {
  const t = (tema || '').trim()
  if (tipo === 'artigo') return `Elegant editorial cover image for a real estate blog article about "${t || 'comprar imóvel em Uberlândia'}". Modern Brazilian architecture and interiors, ${MOOD}, ${BASE_NEG}.`
  if (tipo === 'bairro') return `Beautiful scenic view evoking an upscale residential neighborhood in a Brazilian city (${bairro}), tree-lined streets, modern houses and apartment buildings, golden hour, ${MOOD}, ${BASE_NEG}.${t ? ' ' + t : ''}`
  if (tipo === 'lancamento') return `Premium real estate launch promotional image: modern residential building exterior at dusk with warm lights and landscaping${t ? ', ' + t : ''}, ${MOOD}, ${BASE_NEG}.`
  return t || 'modern Brazilian real estate, sophisticated, photographic'
}

function icone(p) {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{p}</svg>
}

export default function GerarImagemPage() {
  useSEO({
    title: 'Gerar Imagem com IA para Blog e Redes - Imóveis Uberlândia',
    description: 'Crie capas de artigo, posts de bairro e peças de lançamento com IA. Imagens ilustrativas geradas na hora, no padrão da marca. Ferramenta de Vinícius Graton, consultor da Rotina Imobiliária.',
    path: '/ferramentas/gerar-imagem',
    noindex: true,
  })

  const [tipo, setTipo] = useState('artigo')
  const [tema, setTema] = useState('')
  const [bairro, setBairro] = useState(BAIRROS[0])
  const [estado, setEstado] = useState('idle') // idle | gerando | pronto | erro
  const [img, setImg] = useState('')
  const [erro, setErro] = useState('')

  const promptFinal = useMemo(() => montarPrompt(tipo, tema, bairro), [tipo, tema, bairro])

  const gerar = async () => {
    setEstado('gerando'); setErro(''); setImg('')
    try {
      const r = await fetch('/api/gerar-imagem', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptFinal }),
      })
      const d = await r.json()
      if (!d.ok) throw new Error(d.erro || 'Falha ao gerar.')
      setImg(d.image); setEstado('pronto')
    } catch (e) {
      setErro(e.message || 'Não foi possível gerar agora.'); setEstado('erro')
    }
  }

  const baixar = () => {
    const a = document.createElement('a')
    a.href = img
    a.download = `imagem-${tipo}-${Date.now()}.jpg`
    a.click()
  }

  return (
    <main className="pagina pdfjpg-pg">
      <div className="pdfjpg-nav">
        <div className="container pdfjpg-nav-inner">
          <Link to="/ferramentas" className="pdfjpg-back">{icone(<path d="M19 12H5M12 19l-7-7 7-7" />)} Ferramentas</Link>
          <span className="pdfjpg-nav-tag">Gerador de imagem · IA · blog e redes</span>
        </div>
      </div>

      <div className="container pdfjpg-wrap">
        <div className="pdfjpg-header">
          <div className="pdfjpg-header-icon">{icone(<><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></>)}</div>
          <div>
            <h1 className="pdfjpg-titulo">Gere imagens <span className="pdfjpg-titulo-hl">para seus posts</span></h1>
            <p className="pdfjpg-sub">Capas de artigo, posts de bairro e peças de lançamento criadas por IA, no padrão da marca. São imagens <strong>ilustrativas</strong> - não são fotos reais do imóvel ou do bairro.</p>
          </div>
        </div>

        <div className="pdfjpg-main">
          <div className="gi-form">
            <div className="gi-tipos">
              {TIPOS.map((t) => (
                <button key={t.id} type="button" className={`gi-tipo${tipo === t.id ? ' gi-tipo--on' : ''}`} onClick={() => setTipo(t.id)}>{t.nome}</button>
              ))}
            </div>

            {tipo === 'bairro' && (
              <label className="gi-campo"><span>Bairro</span>
                <select value={bairro} onChange={(e) => setBairro(e.target.value)} className="gi-select">
                  {BAIRROS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </label>
            )}

            <label className="gi-campo">
              <span>{tipo === 'livre' ? 'Descreva a imagem' : 'Tema / detalhe (opcional)'}</span>
              <textarea value={tema} onChange={(e) => setTema(e.target.value)} rows={3}
                placeholder={tipo === 'artigo' ? 'Ex.: financiamento pela Caixa, primeira casa'
                  : tipo === 'lancamento' ? 'Ex.: torre alto padrão com lazer completo'
                  : tipo === 'bairro' ? 'Ex.: clima de fim de tarde, famílias'
                  : 'Descreva o que você quer ver na imagem'} />
            </label>

            <button className="btn btn-gold gi-gerar" onClick={gerar} disabled={estado === 'gerando'}>
              {estado === 'gerando' ? 'Gerando…' : '✨ Gerar imagem'}
            </button>
            <p className="pdfjpg-progress-note" style={{ margin: 0 }}>A geração leva alguns segundos. A imagem sai quadrada, sem texto (a IA não escreve bem - adicione textos depois no Canva).</p>
          </div>

          {estado === 'gerando' && (
            <div className="pdfjpg-progress-wrap"><div className="pdfjpg-progress-bar pdfjpg-progress-bar--indet"><div className="pdfjpg-progress-fill" /></div><p className="pdfjpg-progress-note">Criando sua imagem com IA…</p></div>
          )}
          {estado === 'erro' && <p className="pdfjpg-progress-note" style={{ color: 'var(--terracotta)' }}>{erro}</p>}

          {estado === 'pronto' && img && (
            <div className="gi-result">
              <img src={img} alt="Imagem gerada por IA" className="gi-img" />
              <div className="gi-acoes">
                <button className="btn btn-gold" onClick={baixar}>⬇ Baixar imagem</button>
                <button className="btn btn-ghost" onClick={gerar}>↻ Gerar outra</button>
              </div>
            </div>
          )}
        </div>

        <div className="pdfjpg-privacy">
          {icone(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />)}
          Imagens geradas por IA (FLUX no Cloudflare). Use como arte ilustrativa de apoio - nunca como foto real de um imóvel ou bairro específico.
        </div>
      </div>
    </main>
  )
}
