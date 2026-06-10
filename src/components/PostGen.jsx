import { useState, useRef, useEffect, useCallback } from 'react'
import { formatPreco } from '../data'

// ——— Gerador de post pra redes sociais (uso do Vinícius, no painel) ———
// Carrega um imóvel pelo código, monta a arte (foto + preço + specs + marca)
// num <canvas> e gera a legenda pronta com hashtags. Sem depender de API da
// Meta/TikTok: é só baixar a imagem e colar a legenda.

const fotoProxy = (url) => `/api/foto?u=${encodeURIComponent(url)}`

function carregarImagem(src) {
  return new Promise((res, rej) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => res(img)
    img.onerror = rej
    img.src = src
  })
}

// desenha a imagem cobrindo todo o retângulo (object-fit: cover)
function coverDraw(ctx, img, x, y, w, h) {
  const ir = img.width / img.height
  const r = w / h
  let sw, sh, sx, sy
  if (ir > r) { sh = img.height; sw = sh * r; sx = (img.width - sw) / 2; sy = 0 }
  else { sw = img.width; sh = sw / r; sx = 0; sy = (img.height - sh) / 2 }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

function pill(ctx, x, y, txt, padX = 26, h = 56) {
  ctx.font = '700 28px Arial'
  const w = ctx.measureText(txt).width + padX * 2
  const r = h / 2
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
  ctx.fillStyle = 'rgba(224,181,86,0.95)'; ctx.fill()
  ctx.fillStyle = '#1b1206'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'
  ctx.fillText(txt, x + padX, y + h / 2 + 1)
  ctx.textBaseline = 'alphabetic'
}

const plural = (n, s, p) => (n > 1 ? p : s)

function specsLinha(im) {
  const it = []
  if (im.quartos > 0) it.push(`${im.quartos} ${plural(im.quartos, 'quarto', 'quartos')}`)
  if (im.suites > 0) it.push(`${im.suites} ${plural(im.suites, 'suíte', 'suítes')}`)
  if (im.banheiros > 0) it.push(`${im.banheiros} ${plural(im.banheiros, 'banheiro', 'banheiros')}`)
  if (im.vagas > 0) it.push(`${im.vagas} ${plural(im.vagas, 'vaga', 'vagas')}`)
  if (im.area > 0) it.push(`${im.area} m²`)
  return it.join('   ·   ')
}

function desenhar(canvas, img, im, formato) {
  const W = 1080
  const H = formato === 'story' ? 1920 : 1080
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')
  coverDraw(ctx, img, 0, 0, W, H)

  // escurecimento de baixo pra cima (legibilidade)
  const ini = formato === 'story' ? 0.34 : 0.40
  const g = ctx.createLinearGradient(0, H * ini, 0, H)
  g.addColorStop(0, 'rgba(8,11,18,0)')
  g.addColorStop(0.5, 'rgba(8,11,18,0.72)')
  g.addColorStop(1, 'rgba(8,11,18,0.97)')
  ctx.fillStyle = g
  ctx.fillRect(0, H * ini, W, H * (1 - ini))

  // moldura dourada
  ctx.strokeStyle = 'rgba(224,181,86,0.85)'; ctx.lineWidth = 6
  ctx.strokeRect(26, 26, W - 52, H - 52)

  // pill do tipo (topo-esquerda)
  pill(ctx, 56, 56, (im.tipo || 'Imóvel').toUpperCase())

  // bloco inferior (desenhado de baixo pra cima)
  const pad = 64
  let y = H - pad
  ctx.textAlign = 'left'

  ctx.fillStyle = 'rgba(255,255,255,0.82)'; ctx.font = '500 30px Arial'
  ctx.fillText(`viniciusgraton.com.br   ·   Cód. ${im.codigo}`, pad, y)
  y -= 60

  ctx.fillStyle = '#ecc869'; ctx.font = '600 34px Arial'
  ctx.fillText(specsLinha(im), pad, y)
  y -= 70

  ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = '500 42px Arial'
  ctx.fillText(`${im.tipo} no ${im.bairro} · ${im.cidade}/${im.uf || 'MG'}`, pad, y)
  y -= 96

  ctx.fillStyle = '#ffffff'; ctx.font = '800 100px Arial'
  ctx.fillText(formatPreco(im.preco), pad, y)
  y -= 116

  ctx.fillStyle = '#ecc869'; ctx.font = '700 30px Arial'
  ctx.fillText('VINÍCIUS GRATON  ·  CONSULTOR DE IMÓVEIS', pad, y)
}

function montarLegenda(im) {
  const specs = []
  if (im.quartos > 0) specs.push(`🛏 ${im.quartos} ${plural(im.quartos, 'quarto', 'quartos')}`)
  if (im.suites > 0) specs.push(`✨ ${im.suites} ${plural(im.suites, 'suíte', 'suítes')}`)
  if (im.banheiros > 0) specs.push(`🚿 ${im.banheiros} ${plural(im.banheiros, 'banheiro', 'banheiros')}`)
  if (im.vagas > 0) specs.push(`🚗 ${im.vagas} ${plural(im.vagas, 'vaga', 'vagas')}`)
  if (im.area > 0) specs.push(`📐 ${im.area} m²`)

  const desc = (im.descricao || '').replace(/\s+/g, ' ').trim()
  const frases = (desc.match(/[^.!?]+[.!?]+/g) || [desc]).slice(0, 2).join(' ').trim()

  const bairroTag = '#' + String(im.bairro || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')
  const tipoTag = /apart/i.test(im.tipo) ? '#apartamentoavenda' : /casa/i.test(im.tipo) ? '#casaavenda' : /lote|terreno/i.test(im.tipo) ? '#terrenoavenda' : '#imovelavenda'

  return [
    `🏡 ${im.tipo} no ${im.bairro} — ${im.cidade}/${im.uf || 'MG'}`,
    `💰 ${formatPreco(im.preco)}`,
    '',
    specs.join('  ·  '),
    frases ? '\n' + frases : '',
    '',
    'Agende sua visita comigo, Vinícius Graton, consultor da Rotina Imobiliária. Te acompanho da primeira conversa à entrega das chaves. 🤝',
    `📲 WhatsApp (34) 99157-0494`,
    `🔗 viniciusgraton.com.br/imovel/${im.codigo}`,
    '',
    `#imoveis #uberlandia #uberlandiamg ${tipoTag} ${bairroTag} #imoveisuberlandia #rotinaimobiliaria #consultordeimoveis #imoveldosonhos`,
  ].filter((l) => l !== undefined).join('\n')
}

export default function PostGen() {
  const [cod, setCod] = useState('')
  const [im, setIm] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [fotoIdx, setFotoIdx] = useState(0)
  const [formato, setFormato] = useState('feed')
  const [legenda, setLegenda] = useState('')
  const [copiado, setCopiado] = useState(false)
  const canvasRef = useRef(null)

  const buscar = async (e) => {
    e && e.preventDefault()
    const c = cod.replace(/\D/g, '')
    if (!c) return
    setCarregando(true); setErro(''); setIm(null)
    try {
      const r = await fetch(`/api/rotina-imovel?codigo=${c}`)
      const j = await r.json()
      if (!j || !j.imovel) { setErro(j && j.erro ? j.erro : 'Imóvel não encontrado.'); return }
      setIm(j.imovel); setFotoIdx(0); setLegenda(montarLegenda(j.imovel))
    } catch {
      setErro('Não consegui buscar agora. Tente de novo.')
    } finally {
      setCarregando(false)
    }
  }

  const redesenhar = useCallback(async () => {
    if (!im || !canvasRef.current) return
    const fotos = im.fotos && im.fotos.length ? im.fotos : (im.foto ? [im.foto] : [])
    const url = fotos[fotoIdx] || fotos[0]
    if (!url) return
    try {
      const img = await carregarImagem(fotoProxy(url))
      desenhar(canvasRef.current, img, im, formato)
    } catch { setErro('Não consegui carregar essa foto. Tente outra.') }
  }, [im, fotoIdx, formato])

  useEffect(() => { redesenhar() }, [redesenhar])

  const baixar = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) return
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `post-imovel-${im.codigo}-${formato}.png`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 3000)
    }, 'image/png')
  }

  const copiarLegenda = async () => {
    try { await navigator.clipboard.writeText(legenda); setCopiado(true); setTimeout(() => setCopiado(false), 2000) } catch {}
  }

  const fotos = im ? (im.fotos && im.fotos.length ? im.fotos : (im.foto ? [im.foto] : [])) : []

  return (
    <div className="postgen">
      <div className="postgen-intro">
        <h3>Gerar post pra redes</h3>
        <p className="section-sub" style={{ margin: '6px 0 0' }}>
          Digite o código do imóvel. Eu monto a arte (foto + preço + dados + sua marca) e a legenda com hashtags. É só baixar a imagem e postar no Instagram, stories ou TikTok.
        </p>
      </div>

      <form className="postgen-busca" onSubmit={buscar}>
        <input
          type="text" inputMode="numeric" value={cod}
          onChange={(e) => setCod(e.target.value)}
          placeholder="Código do imóvel (ex.: 84330)"
          aria-label="Código do imóvel"
        />
        <button type="submit" className="admin-btn admin-btn--ok" disabled={carregando}>{carregando ? 'Buscando…' : 'Carregar'}</button>
      </form>
      {erro && <p className="lead-erro">{erro}</p>}

      {im && (
        <div className="postgen-edit">
          <div className="postgen-preview">
            <canvas ref={canvasRef} className={`postgen-canvas postgen-canvas--${formato}`} />
          </div>

          <div className="postgen-controles">
            <div className="postgen-formato">
              <button type="button" className={`fp-pill ${formato === 'feed' ? 'on' : ''}`} onClick={() => setFormato('feed')}>Feed (1:1)</button>
              <button type="button" className={`fp-pill ${formato === 'story' ? 'on' : ''}`} onClick={() => setFormato('story')}>Story (9:16)</button>
            </div>

            {fotos.length > 1 && (
              <div className="postgen-fotos">
                {fotos.slice(0, 12).map((f, i) => (
                  <button type="button" key={i} className={`postgen-foto ${i === fotoIdx ? 'on' : ''}`} onClick={() => setFotoIdx(i)}>
                    <img src={f} alt={`foto ${i + 1}`} loading="lazy" />
                  </button>
                ))}
              </div>
            )}

            <button type="button" className="btn btn-gold" onClick={baixar}>⬇ Baixar imagem</button>

            <label className="postgen-legenda-lbl">Legenda (editável)</label>
            <textarea className="postgen-legenda" rows="12" value={legenda} onChange={(e) => setLegenda(e.target.value)} />
            <button type="button" className="admin-btn" onClick={copiarLegenda}>{copiado ? '✓ Legenda copiada' : 'Copiar legenda'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
