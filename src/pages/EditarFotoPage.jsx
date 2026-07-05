import { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSEO } from '../useSEO'
import '../styles/pdf-tools.css'

// Remover objeto / mobiliar ambiente (inpainting) via Cloudflare AI.
// O usuário pinta a área a editar; a IA refaz só essa parte.

const MAXLADO = 1024
const m8 = (n) => Math.max(8, Math.round(n / 8) * 8)

const MODOS = [
  { id: 'remover', nome: 'Remover objeto', dica: 'Pinte sobre o que quer apagar (placa, entulho, fio, móvel).',
    prompt: 'empty clean background, seamless, matching the surrounding wall floor and lighting, photorealistic, no object', strength: 1 },
  { id: 'mobiliar', nome: 'Mobiliar ambiente', dica: 'Pinte o piso/área vazia que quer mobiliar.',
    prompt: 'cozy realistic furnished living room with a sofa, rug, coffee table and plants, warm natural light, brazilian real estate interior, photorealistic, believable not too perfect', strength: 0.95 },
  { id: 'ceu', nome: 'Trocar o céu', dica: 'Pinte o céu da foto de fachada.',
    prompt: 'beautiful clear blue sky with soft clouds, golden hour, photorealistic', strength: 1 },
  { id: 'livre', nome: 'Comando livre', dica: 'Pinte a área e escreva o que deve aparecer.', prompt: '', strength: 1 },
]

function icone(children) {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
}

export default function EditarFotoPage() {
  useSEO({
    title: 'Editar Foto de Imóvel com IA - Remover Objeto e Mobiliar',
    description: 'Remova objetos, mobilie ambientes vazios (virtual staging) e troque o céu de fotos de imóveis com IA. Ferramenta de Vinícius Graton, consultor da Rotina Imobiliária.',
    path: '/ferramentas/editar-foto',
    noindex: true,
  })

  const [modo, setModo] = useState('remover')
  const [tema, setTema] = useState('')
  const [dim, setDim] = useState(null)        // {w,h}
  const [pincel, setPincel] = useState(48)
  const [temMascara, setTemMascara] = useState(false)
  const [estado, setEstado] = useState('idle') // idle | editando | pronto | erro
  const [resultado, setResultado] = useState('')
  const [erro, setErro] = useState('')

  const baseRef = useRef(null)    // canvas com a foto (envio)
  const maskRef = useRef(null)    // canvas da máscara (preto/branco)
  const overlayRef = useRef(null) // canvas visível (foto + pincel vermelho)
  const imgRef = useRef(null)
  const pintando = useRef(false)
  const inputRef = useRef(null)
  const modoAtual = MODOS.find((m) => m.id === modo)

  const carregar = useCallback((file) => {
    if (!file) return
    const fr = new FileReader()
    fr.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const esc = Math.min(1, MAXLADO / Math.max(img.width, img.height))
        const w = m8(img.width * esc), h = m8(img.height * esc)
        imgRef.current = img
        setDim({ w, h })
        setResultado(''); setEstado('idle'); setTemMascara(false)
      }
      img.src = e.target.result
    }
    fr.readAsDataURL(file)
  }, [])

  // (re)desenha base, máscara e overlay quando a dimensão muda
  useEffect(() => {
    if (!dim || !imgRef.current) return
    const { w, h } = dim
    for (const ref of [baseRef, maskRef, overlayRef]) {
      if (ref.current) { ref.current.width = w; ref.current.height = h }
    }
    baseRef.current.getContext('2d').drawImage(imgRef.current, 0, 0, w, h)
    maskRef.current.getContext('2d').clearRect(0, 0, w, h) // máscara transparente; pinta branco só na área
    redesenhar()
  }, [dim])

  const redesenhar = () => {
    const ov = overlayRef.current, base = baseRef.current, mask = maskRef.current
    if (!ov || !base) return
    const ctx = ov.getContext('2d')
    ctx.clearRect(0, 0, ov.width, ov.height)
    ctx.drawImage(base, 0, 0)
    // tinta vermelha SÓ onde foi pintado (máscara = branco sobre transparente)
    const tmp = document.createElement('canvas'); tmp.width = ov.width; tmp.height = ov.height
    const t = tmp.getContext('2d')
    t.drawImage(mask, 0, 0)
    t.globalCompositeOperation = 'source-in'
    t.fillStyle = '#B04A37'; t.fillRect(0, 0, tmp.width, tmp.height)
    ctx.globalAlpha = 0.5
    ctx.drawImage(tmp, 0, 0)
    ctx.globalAlpha = 1
  }

  const posRel = (ev) => {
    const r = overlayRef.current.getBoundingClientRect()
    const x = ((ev.touches?.[0]?.clientX ?? ev.clientX) - r.left) * (overlayRef.current.width / r.width)
    const y = ((ev.touches?.[0]?.clientY ?? ev.clientY) - r.top) * (overlayRef.current.height / r.height)
    return { x, y }
  }
  const pintar = (ev) => {
    if (!pintando.current || !maskRef.current) return
    ev.preventDefault()
    const { x, y } = posRel(ev)
    const mc = maskRef.current.getContext('2d')
    mc.fillStyle = '#fff'
    mc.beginPath(); mc.arc(x, y, pincel / 2, 0, Math.PI * 2); mc.fill()
    setTemMascara(true)
    redesenhar()
  }
  const inicioPintura = (ev) => { pintando.current = true; pintar(ev) }
  const fimPintura = () => { pintando.current = false }
  const limparMascara = () => {
    if (!maskRef.current) return
    const mc = maskRef.current.getContext('2d')
    mc.clearRect(0, 0, maskRef.current.width, maskRef.current.height)
    setTemMascara(false); redesenhar()
  }

  const editar = async () => {
    if (!temMascara) { setErro('Pinte a área que você quer editar.'); setEstado('erro'); return }
    const prompt = modo === 'livre' ? tema.trim() : `${modoAtual.prompt}${tema.trim() ? ', ' + tema.trim() : ''}`
    if (!prompt) { setErro('Escreva o que deve aparecer na área pintada.'); setEstado('erro'); return }
    setEstado('editando'); setErro(''); setResultado('')
    try {
      const image = baseRef.current.toDataURL('image/png')
      // máscara p/ a IA.. fundo PRETO (manter) + branco (refazer) — compõe a máscara transparente sobre preto
      const mcanvas = document.createElement('canvas'); mcanvas.width = baseRef.current.width; mcanvas.height = baseRef.current.height
      const mx = mcanvas.getContext('2d'); mx.fillStyle = '#000'; mx.fillRect(0, 0, mcanvas.width, mcanvas.height); mx.drawImage(maskRef.current, 0, 0)
      const mask = mcanvas.toDataURL('image/png')
      const r = await fetch('/api/editar-imagem', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, mask, prompt, strength: modoAtual.strength }),
      })
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.erro || 'Falha ao editar.') }
      const blob = await r.blob()
      setResultado(URL.createObjectURL(blob)); setEstado('pronto')
    } catch (e) {
      setErro(e.message || 'Não foi possível editar agora.'); setEstado('erro')
    }
  }

  const baixar = () => { const a = document.createElement('a'); a.href = resultado; a.download = `foto-editada-${Date.now()}.png`; a.click() }
  const reset = () => { setDim(null); imgRef.current = null; setResultado(''); setEstado('idle'); setTemMascara(false); if (inputRef.current) inputRef.current.value = '' }

  return (
    <main className="pagina pdfjpg-pg">
      <div className="pdfjpg-nav">
        <div className="container pdfjpg-nav-inner">
          <Link to="/ferramentas" className="pdfjpg-back">{icone(<path d="M19 12H5M12 19l-7-7 7-7" />)} Ferramentas</Link>
          <span className="pdfjpg-nav-tag">Editar foto · IA · remover e mobiliar</span>
        </div>
      </div>

      <div className="container pdfjpg-wrap">
        <div className="pdfjpg-header">
          <div className="pdfjpg-header-icon">{icone(<><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" /></>)}</div>
          <div>
            <h1 className="pdfjpg-titulo">Edite a foto <span className="pdfjpg-titulo-hl">com IA</span></h1>
            <p className="pdfjpg-sub">Pinte uma área e a IA refaz só ela.. <strong>remover</strong> um objeto, <strong>mobiliar</strong> um ambiente vazio (virtual staging) ou <strong>trocar o céu</strong>. Use com bom senso - staging deve parecer crível, não perfeito demais.</p>
          </div>
        </div>

        <div className="pdfjpg-main">
          {!dim && (
            <div className="pdfjpg-drop" onClick={() => inputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}>
              <input ref={inputRef} type="file" accept="image/*" onChange={(e) => carregar(e.target.files?.[0])} style={{ display: 'none' }} />
              <div className="pdfjpg-drop-icon">{icone(<><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></>)}</div>
              <p className="pdfjpg-drop-titulo">Selecionar foto</p>
              <p className="pdfjpg-drop-sub">JPG ou PNG · a foto vai para a IA da Cloudflare processar</p>
            </div>
          )}

          {dim && (
            <div className="ef-edit">
              <div className="ef-tipos">
                {MODOS.map((m) => (
                  <button key={m.id} type="button" className={`gi-tipo${modo === m.id ? ' gi-tipo--on' : ''}`} onClick={() => setModo(m.id)}>{m.nome}</button>
                ))}
              </div>
              <p className="pdfjpg-progress-note" style={{ margin: 0 }}>{modoAtual.dica}</p>

              <div className="ef-canvas-wrap">
                <canvas ref={baseRef} style={{ display: 'none' }} />
                <canvas ref={maskRef} style={{ display: 'none' }} />
                <canvas ref={overlayRef} className="ef-canvas"
                  onMouseDown={inicioPintura} onMouseMove={pintar} onMouseUp={fimPintura} onMouseLeave={fimPintura}
                  onTouchStart={inicioPintura} onTouchMove={pintar} onTouchEnd={fimPintura} />
              </div>

              <div className="ef-controles">
                <label className="ef-pincel"><span>Pincel</span>
                  <input type="range" min="12" max="120" value={pincel} onChange={(e) => setPincel(+e.target.value)} />
                </label>
                <button className="btn btn-ghost" onClick={limparMascara}>Limpar área</button>
                <button className="btn btn-ghost" onClick={reset}>Trocar foto</button>
              </div>

              {(modo === 'livre' || modo === 'mobiliar') && (
                <label className="gi-campo">
                  <span>{modo === 'livre' ? 'O que deve aparecer na área pintada?' : 'Detalhe do ambiente (opcional)'}</span>
                  <textarea value={tema} onChange={(e) => setTema(e.target.value)} rows={2}
                    placeholder={modo === 'livre' ? 'Ex.: uma planta grande no canto' : 'Ex.: estilo escandinavo, tons claros'} />
                </label>
              )}

              <button className="btn btn-gold gi-gerar" onClick={editar} disabled={estado === 'editando'}>
                {estado === 'editando' ? 'Editando…' : '✨ Aplicar edição'}
              </button>

              {estado === 'editando' && (
                <div className="pdfjpg-progress-wrap"><div className="pdfjpg-progress-bar pdfjpg-progress-bar--indet"><div className="pdfjpg-progress-fill" /></div><p className="pdfjpg-progress-note">A IA está refazendo a área pintada…</p></div>
              )}
              {estado === 'erro' && <p className="pdfjpg-progress-note" style={{ color: 'var(--terracotta)' }}>{erro}</p>}

              {estado === 'pronto' && resultado && (
                <div className="gi-result">
                  <img src={resultado} alt="Foto editada por IA" className="gi-img" />
                  <div className="gi-acoes">
                    <button className="btn btn-gold" onClick={baixar}>⬇ Baixar foto editada</button>
                    <button className="btn btn-ghost" onClick={() => setEstado('idle')}>Editar mais</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="pdfjpg-privacy">
          {icone(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />)}
          A edição usa a IA da Cloudflare - a foto é enviada para processamento (não fica no dispositivo, diferente das outras ferramentas). Resolução de saída limitada pela IA; para staging de alto padrão, fale comigo.
        </div>
      </div>
    </main>
  )
}
