import { useState, useRef, useEffect, useCallback } from 'react'
import { formatPreco, oportunidade } from '../data'

// ——— Estúdio de publicidade: gera artes profissionais do imóvel pra redes ———
// Vários estilos de design, aplica em todas as fotos, baixa individual ou em lote.
const fotoProxy = (url) => `/api/foto?u=${encodeURIComponent(url)}`
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
function carregarImagem(src) {
  return new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = src })
}
function coverDraw(ctx, img, x, y, w, h) {
  const ir = img.width / img.height, r = w / h
  let sw, sh, sx, sy
  if (ir > r) { sh = img.height; sw = sh * r; sx = (img.width - sw) / 2; sy = 0 }
  else { sw = img.width; sh = sw / r; sx = 0; sy = (img.height - sh) / 2 }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
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
const precoTxt = (im) => (im.preco > 0 ? formatPreco(im.preco) : 'Sob consulta')

function pillGold(ctx, x, y, txt, fs = 28, h = 54) {
  ctx.font = `700 ${fs}px Arial`
  const padX = h * 0.42, w = ctx.measureText(txt).width + padX * 2
  rr(ctx, x, y, w, h, h / 2); ctx.fillStyle = 'rgba(224,181,86,0.96)'; ctx.fill()
  ctx.fillStyle = '#1b1206'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'
  ctx.fillText(txt, x + padX, y + h / 2 + 1); ctx.textBaseline = 'alphabetic'
}
function eyebrowBadge(ctx, W, txt) {
  if (!txt) return
  const t = txt.toUpperCase(), fs = 30, h = 58
  ctx.font = `800 ${fs}px Arial`
  const padX = 26, w = ctx.measureText(t).width + padX * 2, x = W - 56 - w, y = 56
  rr(ctx, x, y, w, h, 12); ctx.fillStyle = '#b3261e'; ctx.fill()
  ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'
  ctx.fillText(t, x + padX, y + h / 2 + 1); ctx.textBaseline = 'alphabetic'
}

export const TEMPLATES = [
  { id: 'faixa', nome: 'Faixa moderna' },
  { id: 'classico', nome: 'Clássico' },
  { id: 'minimal', nome: 'Minimalista' },
  { id: 'editorial', nome: 'Revista' },
  { id: 'gradiente', nome: 'Gradiente' },
]

function tplClassico(ctx, W, H, im, eyebrow, formato) {
  const ini = formato === 'story' ? 0.34 : 0.40
  const g = ctx.createLinearGradient(0, H * ini, 0, H)
  g.addColorStop(0, 'rgba(8,11,18,0)'); g.addColorStop(0.5, 'rgba(8,11,18,0.72)'); g.addColorStop(1, 'rgba(8,11,18,0.97)')
  ctx.fillStyle = g; ctx.fillRect(0, H * ini, W, H * (1 - ini))
  ctx.strokeStyle = 'rgba(224,181,86,0.85)'; ctx.lineWidth = 6; ctx.strokeRect(26, 26, W - 52, H - 52)
  pillGold(ctx, 56, 56, (im.tipo || 'Imóvel').toUpperCase())
  eyebrowBadge(ctx, W, eyebrow)
  const pad = 64; let y = H - pad; ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(255,255,255,0.82)'; ctx.font = '500 30px Arial'
  ctx.fillText(`viniciusgraton.com.br   ·   Cód. ${im.codigo}`, pad, y); y -= 60
  ctx.fillStyle = '#ecc869'; ctx.font = '600 34px Arial'; ctx.fillText(specsLinha(im), pad, y); y -= 70
  ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = '500 42px Arial'; ctx.fillText(`${im.tipo} no ${im.bairro} · ${im.cidade}/${im.uf || 'MG'}`, pad, y); y -= 96
  ctx.fillStyle = '#fff'; ctx.font = '800 96px Arial'; ctx.fillText(precoTxt(im), pad, y); y -= 110
  ctx.fillStyle = '#ecc869'; ctx.font = '700 30px Arial'; ctx.fillText('VINÍCIUS GRATON  ·  CONSULTOR DE IMÓVEIS', pad, y)
}
function tplFaixa(ctx, W, H, im, eyebrow, formato) {
  const ph = Math.round(formato === 'story' ? H * 0.30 : H * 0.36), py = H - ph
  const g = ctx.createLinearGradient(0, py - 90, 0, py); g.addColorStop(0, 'rgba(10,12,18,0)'); g.addColorStop(1, 'rgba(10,12,18,0.97)')
  ctx.fillStyle = g; ctx.fillRect(0, py - 90, W, 90)
  ctx.fillStyle = 'rgba(10,12,18,0.97)'; ctx.fillRect(0, py, W, ph)
  ctx.fillStyle = '#e0b556'; ctx.fillRect(0, py, W, 7)
  pillGold(ctx, 56, 56, (im.tipo || 'Imóvel').toUpperCase()); eyebrowBadge(ctx, W, eyebrow)
  const pad = 64; let y = py + 64; ctx.textAlign = 'left'
  ctx.fillStyle = '#ecc869'; ctx.font = '700 28px Arial'; ctx.fillText('VINÍCIUS GRATON · CONSULTOR DE IMÓVEIS', pad, y); y += 64
  ctx.fillStyle = '#fff'; ctx.font = '800 92px Arial'; ctx.fillText(precoTxt(im), pad, y); y += 56
  ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = '500 38px Arial'; ctx.fillText(`${im.tipo} no ${im.bairro} · ${im.cidade}/${im.uf || 'MG'}`, pad, y); y += 50
  ctx.fillStyle = '#ecc869'; ctx.font = '600 32px Arial'; ctx.fillText(specsLinha(im), pad, y)
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '500 26px Arial'; ctx.textAlign = 'right'
  ctx.fillText(`Cód. ${im.codigo} · viniciusgraton.com.br`, W - pad, py + ph - 34); ctx.textAlign = 'left'
}
function tplMinimal(ctx, W, H, im, eyebrow) {
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.max(W, H) * 0.75)
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#fff'; ctx.font = '700 30px Arial'; ctx.textAlign = 'left'
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 12
  ctx.fillText('V I N Í C I U S   G R A T O N', 64, 92); ctx.shadowBlur = 0
  eyebrowBadge(ctx, W, eyebrow)
  const pad = 64, ch = 96
  ctx.font = '800 64px Arial'; const pw = ctx.measureText(precoTxt(im)).width
  rr(ctx, pad, H - pad - ch, pw + 64, ch, 16); ctx.fillStyle = 'rgba(224,181,86,0.96)'; ctx.fill()
  ctx.fillStyle = '#1b1206'; ctx.textBaseline = 'middle'; ctx.fillText(precoTxt(im), pad + 32, H - pad - ch / 2 + 2); ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#fff'; ctx.font = '500 36px Arial'; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 10
  ctx.fillText(`${im.tipo} no ${im.bairro} · ${specsLinha(im)}`, pad, H - pad - ch - 28); ctx.shadowBlur = 0
}
function tplEditorial(ctx, W, H, im, eyebrow) {
  const g = ctx.createLinearGradient(0, 0, W * 0.85, 0); g.addColorStop(0, 'rgba(8,10,16,0.92)'); g.addColorStop(1, 'rgba(8,10,16,0)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  const x = 80; ctx.fillStyle = '#e0b556'; ctx.fillRect(x, H * 0.36, 5, H * 0.4)
  ctx.textAlign = 'left'; ctx.fillStyle = '#ecc869'; ctx.font = '700 28px Georgia, serif'
  ctx.fillText('VINÍCIUS GRATON · CONSULTOR DE IMÓVEIS', x + 26, 96)
  eyebrowBadge(ctx, W, eyebrow)
  let y = H * 0.40 + 30; const x2 = x + 30
  ctx.fillStyle = '#fff'; ctx.font = 'italic 600 70px Georgia, serif'
  ctx.fillText(im.tipo || 'Imóvel', x2, y); y += 74
  ctx.fillText(`no ${im.bairro}`, x2, y); y += 90
  ctx.fillStyle = '#ecc869'; ctx.font = '700 78px Georgia, serif'; ctx.fillText(precoTxt(im), x2, y); y += 60
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = '400 34px Georgia, serif'; ctx.fillText(specsLinha(im), x2, y); y += 48
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '400 26px Georgia, serif'; ctx.fillText(`${im.cidade}/${im.uf || 'MG'} · Cód. ${im.codigo}`, x2, y)
}
function tplGradiente(ctx, W, H, im, eyebrow, formato) {
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, 'rgba(184,38,18,0.0)'); g.addColorStop(0.55, 'rgba(20,16,10,0.2)'); g.addColorStop(1, 'rgba(201,150,47,0.78)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  const bg = ctx.createLinearGradient(0, H * 0.55, 0, H); bg.addColorStop(0, 'rgba(8,10,16,0)'); bg.addColorStop(1, 'rgba(8,10,16,0.9)')
  ctx.fillStyle = bg; ctx.fillRect(0, H * 0.55, W, H * 0.45)
  pillGold(ctx, 56, 56, (im.tipo || 'Imóvel').toUpperCase()); eyebrowBadge(ctx, W, eyebrow)
  const pad = 64; let y = H - pad; ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = '700 30px Arial'; ctx.fillText('VINÍCIUS GRATON · viniciusgraton.com.br', pad, y); y -= 58
  ctx.fillStyle = '#fff'; ctx.font = '600 38px Arial'; ctx.fillText(specsLinha(im), pad, y); y -= 64
  ctx.fillStyle = '#fff'; ctx.font = '500 42px Arial'; ctx.fillText(`${im.tipo} no ${im.bairro}`, pad, y); y -= 100
  ctx.fillStyle = '#fff'; ctx.font = '900 104px Arial'; ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 18; ctx.fillText(precoTxt(im), pad, y); ctx.shadowBlur = 0
}

function desenhar(canvas, img, im, opts) {
  const { formato, template, eyebrow } = opts
  const W = 1080, H = formato === 'story' ? 1920 : 1080
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')
  coverDraw(ctx, img, 0, 0, W, H)
  const fn = { classico: tplClassico, faixa: tplFaixa, minimal: tplMinimal, editorial: tplEditorial, gradiente: tplGradiente }[template] || tplFaixa
  fn(ctx, W, H, im, eyebrow, formato)
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
    `💰 ${precoTxt(im)}`, '',
    specs.join('  ·  '),
    frases ? '\n' + frases : '', '',
    'Agende sua visita comigo, Vinícius Graton, consultor da Rotina Imobiliária. Te acompanho da primeira conversa à entrega das chaves. 🤝',
    '📲 WhatsApp (34) 99157-0494',
    `🔗 viniciusgraton.com.br/imovel/${im.codigo}`, '',
    `#imoveis #uberlandia #uberlandiamg ${tipoTag} ${bairroTag} #imoveisuberlandia #rotinaimobiliaria #consultordeimoveis #imoveldosonhos`,
  ].filter((l) => l !== undefined).join('\n')
}

const EYEBROWS = ['', 'OPORTUNIDADE', 'NOVO', 'EXCLUSIVO', 'LANÇAMENTO', 'BAIXOU O PREÇO', 'AGENDE JÁ']

export default function PostGen() {
  const [cod, setCod] = useState('')
  const [im, setIm] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [fotoIdx, setFotoIdx] = useState(0)
  const [sel, setSel] = useState(new Set())
  const [formato, setFormato] = useState('feed')
  const [template, setTemplate] = useState('faixa')
  const [eyebrow, setEyebrow] = useState('')
  const [legenda, setLegenda] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [baixando, setBaixando] = useState('')
  const canvasRef = useRef(null)

  const fotos = im ? (im.fotos && im.fotos.length ? im.fotos : (im.foto ? [im.foto] : [])) : []
  const opts = { formato, template, eyebrow }

  const buscar = async (e) => {
    e && e.preventDefault()
    const c = cod.replace(/\D/g, ''); if (!c) return
    setCarregando(true); setErro(''); setIm(null)
    try {
      const r = await fetch(`/api/rotina-imovel?codigo=${c}`)
      const j = await r.json()
      if (!j || !j.imovel) { setErro(j && j.erro ? j.erro : 'Imóvel não encontrado.'); return }
      const imv = j.imovel
      setIm(imv); setFotoIdx(0)
      const fs = imv.fotos && imv.fotos.length ? imv.fotos : (imv.foto ? [imv.foto] : [])
      setSel(new Set(fs.map((_, i) => i))) // todas selecionadas
      setLegenda(montarLegenda(imv))
      const op = oportunidade(imv)
      setEyebrow(op.abaixoMercado ? 'OPORTUNIDADE' : '')
    } catch { setErro('Não consegui buscar agora. Tente de novo.') } finally { setCarregando(false) }
  }

  const redesenhar = useCallback(async () => {
    if (!im || !canvasRef.current) return
    const url = fotos[fotoIdx] || fotos[0]; if (!url) return
    try { const img = await carregarImagem(fotoProxy(url)); desenhar(canvasRef.current, img, im, opts) }
    catch { setErro('Não consegui carregar essa foto. Tente outra.') }
  }, [im, fotoIdx, formato, template, eyebrow])
  useEffect(() => { redesenhar() }, [redesenhar])

  const toggleSel = (i) => setSel((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n })
  const todas = () => setSel(new Set(fotos.map((_, i) => i)))
  const nenhuma = () => setSel(new Set())

  const baixarCanvasEl = (canvas, nome) => new Promise((res) => {
    canvas.toBlob((b) => {
      if (!b) return res()
      const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nome + '.png'
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); res()
    }, 'image/png')
  })
  const gerarFoto = async (url) => { const img = await carregarImagem(fotoProxy(url)); const c = document.createElement('canvas'); desenhar(c, img, im, opts); return c }

  const baixarUma = async () => {
    setBaixando('uma')
    try { const c = await gerarFoto(fotos[fotoIdx]); await baixarCanvasEl(c, `post-${im.codigo}-${formato}`) } catch {}
    setBaixando('')
  }
  const baixarSelecionadas = async () => {
    const idxs = [...sel].sort((a, b) => a - b); if (!idxs.length) return
    setBaixando('lote')
    for (let k = 0; k < idxs.length; k++) {
      setBaixando(`lote ${k + 1}/${idxs.length}`)
      try { const c = await gerarFoto(fotos[idxs[k]]); await baixarCanvasEl(c, `post-${im.codigo}-${String(k + 1).padStart(2, '0')}-${formato}`); await esperar(350) } catch {}
    }
    setBaixando('')
  }

  const copiarLegenda = async () => { try { await navigator.clipboard.writeText(legenda); setCopiado(true); setTimeout(() => setCopiado(false), 2000) } catch {} }

  return (
    <div className="postgen">
      <div className="postgen-intro">
        <h3>📣 Estúdio de publicidade</h3>
        <p className="section-sub" style={{ margin: '6px 0 0' }}>
          Digite o código. Eu carrego todas as fotos, aplico o estilo de design escolhido em massa e você baixa as que quiser (uma ou todas) + a legenda pronta.
        </p>
      </div>

      <form className="postgen-busca" onSubmit={buscar}>
        <input type="text" inputMode="numeric" value={cod} onChange={(e) => setCod(e.target.value)} placeholder="Código do imóvel (ex.: 84330)" aria-label="Código do imóvel" />
        <button type="submit" className="admin-btn admin-btn--ok" disabled={carregando}>{carregando ? 'Buscando…' : 'Carregar'}</button>
      </form>
      {erro && <p className="lead-erro">{erro}</p>}

      {im && (
        <div className="postgen-edit">
          <div className="postgen-preview">
            <canvas ref={canvasRef} className={`postgen-canvas postgen-canvas--${formato}`} />
          </div>

          <div className="postgen-controles">
            <div className="pg-bloco">
              <span className="pg-lbl">Estilo de design</span>
              <div className="mf-filtros">
                {TEMPLATES.map((t) => <button key={t.id} type="button" className={`mf-filtro ${template === t.id ? 'on' : ''}`} onClick={() => setTemplate(t.id)}>{t.nome}</button>)}
              </div>
            </div>

            <div className="pg-bloco pg-bloco-row">
              <div>
                <span className="pg-lbl">Formato</span>
                <div className="postgen-formato">
                  <button type="button" className={`fp-pill ${formato === 'feed' ? 'on' : ''}`} onClick={() => setFormato('feed')}>Feed 1:1</button>
                  <button type="button" className={`fp-pill ${formato === 'story' ? 'on' : ''}`} onClick={() => setFormato('story')}>Story 9:16</button>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <span className="pg-lbl">Selo (chamada)</span>
                <select className="pg-select" value={eyebrow} onChange={(e) => setEyebrow(e.target.value)}>
                  {EYEBROWS.map((s) => <option key={s} value={s}>{s || 'Sem selo'}</option>)}
                </select>
              </div>
            </div>

            {fotos.length > 0 && (
              <div className="pg-bloco">
                <span className="pg-lbl">Fotos ({sel.size} selecionadas) <button type="button" className="pg-mini" onClick={todas}>Todas</button> <button type="button" className="pg-mini" onClick={nenhuma}>Limpar</button></span>
                <div className="postgen-fotos">
                  {fotos.slice(0, 30).map((f, i) => (
                    <div key={i} className={`pg-foto ${i === fotoIdx ? 'on' : ''} ${sel.has(i) ? 'sel' : ''}`}>
                      <img src={f} alt={`foto ${i + 1}`} loading="lazy" onClick={() => setFotoIdx(i)} />
                      <button type="button" className="pg-foto-check" onClick={() => toggleSel(i)} title={sel.has(i) ? 'Tirar da seleção' : 'Selecionar'}>{sel.has(i) ? '✓' : '+'}</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pg-bloco-acoes">
              <button type="button" className="admin-btn" onClick={baixarUma} disabled={!!baixando}>{baixando === 'uma' ? 'Gerando…' : '⬇ Baixar esta'}</button>
              <button type="button" className="btn btn-gold" onClick={baixarSelecionadas} disabled={!!baixando || !sel.size}>{baixando.startsWith('lote') ? `Baixando ${baixando.replace('lote', '').trim()}…` : `⬇ Baixar selecionadas (${sel.size})`}</button>
            </div>

            <label className="postgen-legenda-lbl">Legenda (editável)</label>
            <textarea className="postgen-legenda" rows="10" value={legenda} onChange={(e) => setLegenda(e.target.value)} />
            <button type="button" className="admin-btn" onClick={copiarLegenda}>{copiado ? '✓ Legenda copiada' : 'Copiar legenda'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
