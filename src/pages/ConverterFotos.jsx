import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useSEO } from '../useSEO'
import { IconArrow, IconWhats } from '../components/icons'
import { linkWhatsApp } from '../data'

// Conversor de fotos público — em lote, entre os principais formatos.
// Tudo roda no próprio navegador (as fotos não saem do aparelho do usuário).

const DESTINOS = [
  { id: 'jpg', mime: 'image/jpeg', ext: 'jpg', nome: 'JPG', lossy: true, desc: 'menor tamanho, ideal pra anúncio e e-mail' },
  { id: 'webp', mime: 'image/webp', ext: 'webp', nome: 'WebP', lossy: true, desc: 'qualidade alta com arquivo pequeno (web)' },
  { id: 'avif', mime: 'image/avif', ext: 'avif', nome: 'AVIF', lossy: true, desc: 'o mais leve com ótima qualidade (moderno)' },
  { id: 'png', mime: 'image/png', ext: 'png', nome: 'PNG', lossy: false, desc: 'sem perda, mantém transparência' },
  { id: 'webp-sl', mime: 'image/webp', ext: 'webp', nome: 'WebP sem perda', lossy: false, desc: 'WebP lossless — qualidade máxima, mais leve que PNG' },
  { id: 'jpg-max', mime: 'image/jpeg', ext: 'jpg', nome: 'JPG máxima qualidade', lossy: true, qualFix: 0.99, desc: 'JPEG em qualidade máxima — ideal para impressão' },
]
const ORIGENS = [
  { id: 'auto', nome: 'Detectar automaticamente', match: () => true },
  { id: 'jpg', nome: 'JPG / JPEG', match: (t) => /jpe?g/.test(t) },
  { id: 'png', nome: 'PNG', match: (t) => /png/.test(t) },
  { id: 'webp', nome: 'WebP', match: (t) => /webp/.test(t) },
  { id: 'avif', nome: 'AVIF', match: (t) => /avif/.test(t) },
  { id: 'heic', nome: 'HEIC / HEIF (iPhone)', match: (t) => /hei[cf]/.test(t) },
  { id: 'gif', nome: 'GIF', match: (t) => /gif/.test(t) },
  { id: 'bmp', nome: 'BMP', match: (t) => /bmp/.test(t) },
]

const fmtKB = (b) => (b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : (b / 1048576).toFixed(2) + ' MB')
const baseNome = (n) => n.replace(/\.[^.]+$/, '')

const ehHeic = (file) => /hei[cf]/.test((file.type || '').toLowerCase()) || /\.hei[cf]$/i.test(file.name || '')

function imgDeBlob(blob) {
  return new Promise((ok, falha) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); ok(img) }
    img.onerror = () => { URL.revokeObjectURL(url); falha(new Error('não foi possível ler')) }
    img.src = url
  })
}

async function decodificar(file) {
  // HEIC/HEIF (iPhone): nenhum navegador além do Safari decodifica nativamente.
  // Carrega o decodificador (libheif) SOB DEMANDA só quando aparece um HEIC.
  if (ehHeic(file)) {
    try {
      const { default: heic2any } = await import('heic2any')
      const out = await heic2any({ blob: file, toType: 'image/png' })
      const blob = Array.isArray(out) ? out[0] : out
      try { return await createImageBitmap(blob) } catch {}
      return await imgDeBlob(blob)
    } catch { /* se a lib falhar, tenta o caminho nativo (Safari já lê HEIC) */ }
  }
  // tenta o decodificador nativo (rápido); cai pra <img> se precisar
  try { return await createImageBitmap(file) } catch {}
  return await imgDeBlob(file)
}

export default function ConverterFotos() {
  useSEO({
    title: 'Conversor de fotos online — JPG, PNG, WebP, AVIF e mais, em lote',
    description: 'Converta várias fotos de uma vez entre os 6 principais formatos — JPG, PNG, WebP, AVIF, WebP lossless e JPG máxima — direto no navegador, sem instalar nada e sem enviar suas imagens pra lugar nenhum.',
    path: '/ferramentas/converter',
  })

  const [itens, setItens] = useState([]) // {id, file, url, status, outBlob, outUrl, outSize, erro}
  const [origem, setOrigem] = useState('auto')
  const [destino, setDestino] = useState('webp')
  const [qualidade, setQualidade] = useState(0.9)
  const [larguraMax, setLarguraMax] = useState('')
  const [convertendo, setConvertendo] = useState(false)
  const [avifOk, setAvifOk] = useState(true)
  const [drag, setDrag] = useState(false)
  const inputRef = useRef(null)
  const contador = useRef(0)

  useEffect(() => {
    // testa se o navegador codifica AVIF; se não, desabilita a opção
    let vivo = true
    const c = document.createElement('canvas'); c.width = c.height = 2
    c.toBlob((b) => { if (vivo) setAvifOk(!!b && b.type === 'image/avif') }, 'image/avif')
    return () => { vivo = false }
  }, [])

  const dest = DESTINOS.find((d) => d.id === destino) || DESTINOS[1]

  const adicionar = useCallback((files) => {
    const lista = [...files].filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|avif|gif|bmp|hei[cf])$/i.test(f.name))
    if (!lista.length) return
    const novos = lista.map((f) => ({ id: ++contador.current, file: f, url: '', status: 'pronto', outBlob: null, outUrl: null, outSize: 0, erro: '' }))
    setItens((s) => [...s, ...novos])
    novos.forEach((item) => {
      if (ehHeic(item.file)) return // HEIC não renderiza em <img>; a prévia aparece após converter
      const reader = new FileReader()
      reader.onload = (ev) => setItens((s) => s.map((it) => it.id === item.id ? { ...it, url: ev.target.result } : it))
      reader.readAsDataURL(item.file)
    })
    // auto-detecta formato de origem: se todas as novas fotos têm o mesmo tipo, seleciona
    const tipos = lista.map((f) => (f.type + ' ' + f.name).toLowerCase())
    const detectado = ORIGENS.slice(1).find((o) => tipos.every((t) => o.match(t)))
    if (detectado) setOrigem(detectado.id)
    else setOrigem('auto')
  }, [])

  const onInput = (e) => { adicionar(e.target.files); e.target.value = '' }
  const onDrop = (e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files?.length) adicionar(e.dataTransfer.files) }
  const remover = (id) => setItens((s) => s.filter((it) => it.id !== id))
  const limpar = () => setItens([])

  const filtrados = () => {
    const reg = ORIGENS.find((o) => o.id === origem) || ORIGENS[0]
    return itens.filter((it) => reg.match((it.file.type || '') + ' ' + it.file.name.toLowerCase()))
  }

  async function converterUm(it) {
    const img = await decodificar(it.file)
    let w = img.width, h = img.height
    const lm = parseInt(larguraMax, 10)
    if (lm && lm > 0 && w > lm) { h = Math.round((h * lm) / w); w = lm }
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')
    // JPG/AVIF não têm transparência: fundo branco evita preto onde era transparente
    if (dest.mime === 'image/jpeg' || dest.mime === 'image/avif') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h) }
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, w, h)
    if (img.close) img.close()
    const blob = await new Promise((ok) => canvas.toBlob(ok, dest.mime, dest.lossy ? (dest.qualFix ?? qualidade) : undefined))
    if (!blob) throw new Error('falha ao gerar')
    return blob
  }

  async function converterTudo() {
    const alvo = filtrados().filter((it) => it.status !== 'ok')
    if (!alvo.length) return
    setConvertendo(true)
    for (const it of alvo) {
      setItens((s) => s.map((x) => (x.id === it.id ? { ...x, status: 'processando', erro: '' } : x)))
      try {
        const blob = await converterUm(it)
        const outUrl = URL.createObjectURL(blob)
        setItens((s) => s.map((x) => (x.id === it.id ? { ...x, status: 'ok', outBlob: blob, outUrl, outSize: blob.size } : x)))
      } catch (e) {
        setItens((s) => s.map((x) => (x.id === it.id ? { ...x, status: 'erro', erro: 'Não foi possível converter (formato não suportado pelo navegador — ex.: HEIC fora do Safari).' } : x)))
      }
      await new Promise((r) => setTimeout(r, 0)) // deixa a UI respirar
    }
    setConvertendo(false)
  }

  function baixarUm(it) {
    if (!it.outBlob) return
    const a = document.createElement('a')
    a.href = it.outUrl
    a.download = `${baseNome(it.file.name)}.${dest.ext}`
    a.click()
  }

  async function baixarZip() {
    const prontos = itens.filter((it) => it.status === 'ok' && it.outBlob)
    if (!prontos.length) return
    if (prontos.length === 1) return baixarUm(prontos[0])
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    const usados = {}
    for (const it of prontos) {
      let nome = `${baseNome(it.file.name)}.${dest.ext}`
      if (usados[nome]) nome = `${baseNome(it.file.name)}-${usados[nome]++}.${dest.ext}`
      else usados[nome] = 1
      zip.file(nome, it.outBlob)
    }
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `fotos-convertidas-${dest.ext}.zip`; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  }

  async function baixarTodosIndividual() {
    const prontos = itens.filter((it) => it.status === 'ok' && it.outBlob)
    if (!prontos.length) return
    for (let i = 0; i < prontos.length; i++) {
      await new Promise((res) => setTimeout(res, i === 0 ? 0 : 220))
      baixarUm(prontos[i])
    }
  }

  const prontos = itens.filter((it) => it.status === 'ok')
  const totalOrig = prontos.reduce((s, it) => s + it.file.size, 0)
  const totalNovo = prontos.reduce((s, it) => s + it.outSize, 0)
  const economia = totalOrig > 0 ? Math.round((1 - totalNovo / totalOrig) * 100) : 0
  const vaConverter = filtrados().filter((it) => it.status !== 'ok').length

  return (
    <main className="pagina section--light det conv-pg">
      <div className="container">
        <div className="cat-head" style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 8px' }}>
          <span className="eyebrow" style={{ justifyContent: 'center' }}>Ferramenta gratuita</span>
          <h1 className="section-title">Conversor de <em>fotos</em></h1>
          <p className="section-sub" style={{ marginTop: 12 }}>
            Suba quantas fotos quiser, escolha o formato de destino e baixe tudo de uma vez.
            As imagens são convertidas no próprio navegador — <b>não saem do seu aparelho</b>.
          </p>
        </div>

        <div className="conv-painel">
          {/* área de upload */}
          <div
            className={`conv-drop ${drag ? 'on' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept="image/*,.heic,.heif" multiple onChange={onInput} hidden />
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
            <b>Arraste as fotos aqui ou clique pra escolher</b>
            <i>JPG · PNG · WebP · AVIF · GIF · BMP · HEIC — quantas você quiser</i>
          </div>

          {/* controles origem -> destino */}
          <div className="conv-controles">
            <label className="conv-campo">
              <span>De (origem)</span>
              <select value={origem} onChange={(e) => setOrigem(e.target.value)}>
                {ORIGENS.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
            </label>
            <div className="conv-seta"><IconArrow width={20} height={20} /></div>
            <label className="conv-campo">
              <span>Para (destino)</span>
              <select value={destino} onChange={(e) => setDestino(e.target.value)}>
                {DESTINOS.map((d) => <option key={d.id} value={d.id} disabled={d.id === 'avif' && !avifOk}>{d.nome}{d.id === 'avif' && !avifOk ? ' (indisponível neste navegador)' : ''}</option>)}
              </select>
            </label>
          </div>
          <p className="conv-dica">{dest.nome} — {dest.desc}.</p>

          {/* opções avançadas */}
          <div className="conv-opcoes">
            {dest.lossy && !dest.qualFix && (
              <label className="conv-range">
                <span>Qualidade <b>{Math.round(qualidade * 100)}%</b></span>
                <input type="range" min="0.4" max="1" step="0.05" value={qualidade} onChange={(e) => setQualidade(+e.target.value)} />
              </label>
            )}
            <label className="conv-campo conv-campo--mini">
              <span>Largura máx. (opcional)</span>
              <input type="number" inputMode="numeric" min="0" placeholder="ex.: 1920 px" value={larguraMax} onChange={(e) => setLarguraMax(e.target.value)} />
            </label>
          </div>

          {/* ações */}
          <div className="conv-acoes">
            <button className="btn btn-gold" type="button" disabled={!vaConverter || convertendo} onClick={converterTudo}>
              {convertendo ? 'Convertendo…' : `Converter ${vaConverter || ''} foto${vaConverter === 1 ? '' : 's'}`.trim()}
            </button>
            {prontos.length > 1 && (
              <>
                <button className="btn btn-ghost" type="button" onClick={baixarZip}>
                  Baixar tudo (ZIP)
                </button>
                <button className="btn btn-ghost" type="button" onClick={baixarTodosIndividual}>
                  Baixar separados
                </button>
              </>
            )}
            {prontos.length === 1 && (
              <button className="btn btn-ghost" type="button" onClick={() => baixarUm(prontos[0])}>
                Baixar foto
              </button>
            )}
            {itens.length > 0 && <button className="conv-limpar" type="button" onClick={limpar}>Limpar</button>}
          </div>

          {prontos.length > 1 && (
            <p className="conv-resumo">
              {prontos.length} foto(s) convertida(s) · {fmtKB(totalOrig)} → <b>{fmtKB(totalNovo)}</b>
              {economia > 0 && <span className="conv-eco"> −{economia}%</span>}
            </p>
          )}
        </div>

        {/* lista de fotos */}
        {itens.length > 0 && (
          <div className="conv-grid">
            {itens.map((it) => (
              <div key={it.id} className={`conv-item conv-item--${it.status}`}>
                <button className="conv-x" type="button" onClick={() => remover(it.id)} aria-label="Remover">×</button>
                <div className="conv-thumb">
                  {(it.outUrl || it.url)
                    ? <img src={it.outUrl || it.url} alt={it.file.name} />
                    : <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, color: '#8a909c', fontSize: '.82rem', letterSpacing: '.04em' }}>HEIC</span>}
                </div>
                <div className="conv-meta">
                  <b title={it.file.name}>{it.file.name}</b>
                  {it.status === 'ok' ? (
                    <i>{fmtKB(it.file.size)} → <strong>{fmtKB(it.outSize)}</strong> · {dest.nome}</i>
                  ) : it.status === 'erro' ? (
                    <i className="conv-erro">{it.erro}</i>
                  ) : it.status === 'processando' ? (
                    <i>Convertendo…</i>
                  ) : (
                    <i>{fmtKB(it.file.size)}</i>
                  )}
                </div>
                {it.status === 'ok' && (
                  <button className="conv-baixar" type="button" onClick={() => baixarUm(it)} aria-label="Baixar">
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="conv-privacidade">
          🔒 Suas fotos não são enviadas pra nenhum servidor — a conversão acontece 100% no seu navegador.
        </p>

        <div style={{ marginTop: 28, textAlign: 'center', display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link className="btn btn-ghost" to="/ferramentas">Outras ferramentas <IconArrow /></Link>
          <a className="btn btn-gold" href={linkWhatsApp('Olá! Usei o conversor de fotos no site e tenho uma dúvida.')} target="_blank" rel="noopener noreferrer"><IconWhats /> Falar pelo WhatsApp</a>
        </div>
      </div>
    </main>
  )
}
