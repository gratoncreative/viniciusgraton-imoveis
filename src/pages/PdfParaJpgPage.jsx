import { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import * as pdfjs from 'pdfjs-dist'
import JSZip from 'jszip'
import { useSEO } from '../useSEO'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

const DPI_OPTIONS = [
  { value: 150, label: '150 DPI', sub: 'web / compartilhar' },
  { value: 300, label: '300 DPI', sub: 'impressão (recomendado)' },
  { value: 600, label: '600 DPI', sub: 'altíssima definição' },
]

const FORMAT_OPTIONS = [
  { value: 'jpg', label: 'JPG', sub: 'foto / comprimido', mime: 'image/jpeg', hasQuality: true },
  { value: 'png', label: 'PNG', sub: 'sem perda / transparência', mime: 'image/png', hasQuality: false },
  { value: 'webp', label: 'WebP', sub: 'moderno / menor arquivo', mime: 'image/webp', hasQuality: true },
]

const FAQ_ITEMS = [
  { q: 'É realmente gratuito converter PDF para JPG?', a: 'Sim, 100% gratuito e sem limite de uso. Não há plano pago, assinatura ou marca d\'água nas imagens geradas. Nunca haverá.' },
  { q: 'Meus arquivos são enviados para algum servidor?', a: 'Não. Todo o processamento é feito localmente no seu navegador usando PDF.js e Canvas API. Nenhum byte do seu arquivo sai do seu dispositivo — garantido.' },
  { q: 'Posso converter só algumas páginas do PDF?', a: 'Sim. Depois de carregar o arquivo, mostramos uma prévia de todas as páginas. Você marca exatamente quais quer exportar — clicando nas miniaturas ou digitando um intervalo como "1, 3, 5-8". Só as páginas selecionadas são convertidas.' },
  { q: 'Qual DPI escolher para impressão?', a: '300 DPI é o padrão da indústria para impressão de qualidade. Use 150 DPI para imagens digitais (e-mail, redes sociais) e 600 DPI para materiais gráficos de altíssima precisão como cartazes e banners.' },
  { q: 'Consigo converter um PDF com senha?', a: 'Não. Arquivos protegidos por senha não podem ser processados. Você precisará remover a proteção antes de converter.' },
  { q: 'Qual a diferença entre JPG, PNG e WebP?', a: 'JPG comprime bem e é universalmente compatível. PNG preserva qualidade sem perda e suporta fundo transparente. WebP oferece ótimo equilíbrio entre qualidade e tamanho de arquivo, mas pode não abrir em sistemas muito antigos.' },
  { q: 'Como baixo todas as páginas de uma vez?', a: 'Ao final da conversão, clique em "Baixar tudo em ZIP" e todas as imagens vêm num único arquivo compactado. Você também pode baixar cada página individualmente.' },
  { q: 'Funciona no celular?', a: 'Sim! A ferramenta funciona em qualquer dispositivo com um navegador moderno — Android, iPhone, iPad, PC ou Mac. Não precisa instalar nada.' },
]

function iconePdf(size = 28) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>
}
function iconeDownload(size = 16) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
}
function iconeZip(size = 16) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
}
function iconeShield(size = 14) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
}
function iconeTag(size = 13) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
}
function iconeCheck(size = 13) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
}

// Animação viva durante a conversão: um PDF sendo "escaneado" por um feixe dourado
// que se move, e as páginas saltando como imagens à direita. Tudo em CSS (confiável).
function ConversaoAnim() {
  return (
    <div className="pdfjpg-anim" aria-hidden="true">
      <svg viewBox="0 0 220 130" width="220" height="130" fill="none">
        <g className="pdfjpg-anim-doc">
          <rect x="14" y="20" width="64" height="84" rx="6" fill="rgba(255,255,255,0.05)" stroke="rgba(201,168,76,0.4)" strokeWidth="1.5"/>
          <path d="M62 20 v14 h14" fill="none" stroke="rgba(201,168,76,0.4)" strokeWidth="1.5" strokeLinejoin="round"/>
          <line x1="24" y1="46" x2="58" y2="46" stroke="rgba(241,237,228,0.28)" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="24" y1="56" x2="68" y2="56" stroke="rgba(241,237,228,0.22)" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="24" y1="66" x2="62" y2="66" stroke="rgba(241,237,228,0.22)" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="24" y1="76" x2="68" y2="76" stroke="rgba(241,237,228,0.16)" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="24" y1="86" x2="52" y2="86" stroke="rgba(241,237,228,0.16)" strokeWidth="2.5" strokeLinecap="round"/>
          <g className="pdfjpg-anim-beam">
            <rect x="14" y="18" width="64" height="4" rx="2" fill="var(--gold-2)"/>
            <rect x="14" y="18" width="64" height="22" fill="url(#beamGrad)"/>
          </g>
        </g>
        <g className="pdfjpg-anim-flow">
          <path d="M92 62 h26" stroke="var(--gold-2)" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 5"/>
          <path d="M114 56 l8 6 l-8 6" fill="none" stroke="var(--gold-2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </g>
        {[0, 1, 2].map(i => (
          <g key={i} className={`pdfjpg-anim-tile pdfjpg-anim-tile--${i + 1}`}>
            <rect x="142" y={30 + i * 26} width="58" height="20" rx="4" fill="rgba(201,168,76,0.1)" stroke="rgba(201,168,76,0.45)" strokeWidth="1.3"/>
            <circle cx={154} cy={37 + i * 26} r="2.6" fill="var(--gold-1)"/>
            <path d={`M147 ${46 + i * 26} l7 -7 l5 5 l6 -8 l8 10 z`} fill="rgba(201,168,76,0.5)"/>
          </g>
        ))}
        <defs>
          <linearGradient id="beamGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(201,168,76,0.45)"/>
            <stop offset="1" stopColor="rgba(201,168,76,0)"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

// "1, 3, 5-8" → Set{1,3,5,6,7,8} (limitado ao total de páginas)
function parseRange(text, total) {
  const set = new Set()
  for (const raw of text.split(',')) {
    const p = raw.trim()
    if (!p) continue
    const m = p.match(/^(\d+)\s*-\s*(\d+)$/)
    if (m) {
      let a = +m[1], b = +m[2]
      if (a > b) [a, b] = [b, a]
      for (let i = a; i <= b; i++) if (i >= 1 && i <= total) set.add(i)
    } else if (/^\d+$/.test(p)) {
      const n = +p
      if (n >= 1 && n <= total) set.add(n)
    }
  }
  return set
}

// Set{1,3,5,6,7,8} → "1, 3, 5-8"
function compactRange(set, total) {
  const nums = [...set].sort((a, b) => a - b)
  if (nums.length === 0) return ''
  if (nums.length === total) return `1-${total}`
  const parts = []
  let start = nums[0], prev = nums[0]
  for (let i = 1; i <= nums.length; i++) {
    if (nums[i] === prev + 1) { prev = nums[i]; continue }
    parts.push(start === prev ? `${start}` : `${start}-${prev}`)
    start = nums[i]; prev = nums[i]
  }
  return parts.join(', ')
}

export default function PdfParaJpgPage() {
  useSEO({
    title: 'Converter PDF para JPG Grátis Online — Sem Upload, Alta Resolução',
    description: 'Converta PDF para JPG, PNG ou WebP de graça e sem cadastro. Escolha quais páginas exportar com pré-visualização. Processamento 100% no navegador — seu arquivo nunca sai do dispositivo. Até 600 DPI, sem marca d\'água.',
    path: '/ferramentas/pdf-para-jpg',
  })

  useEffect(() => {
    const appSchema = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Conversor PDF para JPG Gratuito',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web',
      browserRequirements: 'Requires JavaScript. Works on Chrome, Firefox, Safari, Edge.',
      url: 'https://viniciusgraton.com.br/ferramentas/pdf-para-jpg',
      description: 'Converta PDF para JPG, PNG ou WebP gratuitamente no navegador. Pré-visualização e seleção de páginas, sem upload de arquivos, sem cadastro, sem limite de páginas, sem marca d\'água.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
      featureList: [
        '100% gratuito, sem cadastro',
        'Processamento local — sem upload de arquivos',
        'Pré-visualização e seleção de páginas',
        'Resolução configurável: 150, 300 ou 600 DPI',
        'Formatos JPG, PNG e WebP',
        'Download individual ou em ZIP',
        'Funciona em qualquer dispositivo',
      ],
    }
    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ_ITEMS.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    }
    const inject = (id, data) => {
      let el = document.head.querySelector(`#${id}`)
      if (!el) { el = document.createElement('script'); el.type = 'application/ld+json'; el.id = id; document.head.appendChild(el) }
      el.textContent = JSON.stringify(data)
    }
    inject('schema-pdfjpg', appSchema)
    inject('schema-pdfjpg-faq', faqSchema)
    return () => {
      document.head.querySelector('#schema-pdfjpg')?.remove()
      document.head.querySelector('#schema-pdfjpg-faq')?.remove()
    }
  }, [])

  // máquina de estados: idle → loading → preview → converting → done
  const [phase, setPhase] = useState('idle')
  const [previews, setPreviews] = useState([])      // [{ page, thumb, ptW, ptH }]
  const [selected, setSelected] = useState(new Set())
  const [rangeText, setRangeText] = useState('')
  const [loadProgress, setLoadProgress] = useState(0)

  const [pages, setPages] = useState([])
  const [progress, setProgress] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)

  const [dpi, setDpi] = useState(300)
  const [format, setFormat] = useState('jpg')
  const [quality, setQuality] = useState(0.92)
  const [fileName, setFileName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [zippingAll, setZippingAll] = useState(false)

  const inputRef = useRef(null)
  const pdfRef = useRef(null)       // documento pdfjs carregado (reusado na conversão)
  const cancelRef = useRef(false)   // sinaliza cancelamento da conversão

  const currentFmt = FORMAT_OPTIONS.find(f => f.value === format) || FORMAT_OPTIONS[0]
  const total = previews.length
  const pageDims = previews[0] ? { w: previews[0].ptW, h: previews[0].ptH } : null
  const pxFor = (d) => pageDims ? `${Math.round(pageDims.w * d / 72)} × ${Math.round(pageDims.h * d / 72)} px` : null

  // ── 1) carregar PDF e gerar prévias de baixa resolução ──
  const carregarPdf = useCallback(async (file) => {
    if (!file || file.type !== 'application/pdf') return
    pages.forEach(p => URL.revokeObjectURL(p.url))
    setPages([])
    setPreviews([])
    setSelected(new Set())
    setLoadProgress(0)
    setFileName(file.name.replace(/\.pdf$/i, ''))
    setPhase('loading')

    try {
      const buffer = await file.arrayBuffer()
      const pdf = await pdfjs.getDocument({ data: buffer }).promise
      pdfRef.current = pdf
      const tot = pdf.numPages
      const prev = []

      for (let i = 1; i <= tot; i++) {
        const page = await pdf.getPage(i)
        const vp1 = page.getViewport({ scale: 1 })
        const scale = Math.min(220 / vp1.width, 1.5)
        const vp = page.getViewport({ scale })
        const canvas = document.createElement('canvas')
        canvas.width = Math.floor(vp.width)
        canvas.height = Math.floor(vp.height)
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise
        prev.push({ page: i, thumb: canvas.toDataURL('image/jpeg', 0.72), ptW: vp1.width, ptH: vp1.height })
        canvas.width = 0; canvas.height = 0
        page.cleanup()
        setLoadProgress(Math.round((i / tot) * 100))
      }

      setPreviews(prev)
      setSelected(new Set(prev.map(p => p.page)))   // tudo selecionado por padrão
      setRangeText(`1-${tot}`)
      setPhase('preview')
    } catch (err) {
      alert('Erro ao ler o PDF. Verifique se o arquivo não está protegido por senha ou corrompido.')
      console.error(err)
      setPhase('idle')
    }
  }, [pages])

  // ── seleção de páginas ──
  const aplicarSelecao = (novo) => {
    setSelected(novo)
    setRangeText(compactRange(novo, total))
  }
  const togglePagina = (n) => {
    const novo = new Set(selected)
    novo.has(n) ? novo.delete(n) : novo.add(n)
    aplicarSelecao(novo)
  }
  const selecionarTodas = () => aplicarSelecao(new Set(previews.map(p => p.page)))
  const limparSelecao = () => aplicarSelecao(new Set())
  const onRangeChange = (txt) => {
    setRangeText(txt)
    setSelected(parseRange(txt, total))
  }

  // ── 2) converter apenas as páginas selecionadas, em alta ──
  const converterSelecionadas = useCallback(async () => {
    const alvo = [...selected].sort((a, b) => a - b)
    if (alvo.length === 0 || !pdfRef.current) return
    cancelRef.current = false
    pages.forEach(p => URL.revokeObjectURL(p.url))
    setPages([])
    setProgress(0)
    setCurrentPage(0)
    setPhase('converting')

    try {
      const pdf = pdfRef.current
      const scale = dpi / 72
      const fmt = currentFmt
      const results = []

      for (let idx = 0; idx < alvo.length; idx++) {
        if (cancelRef.current) break
        const num = alvo[idx]
        setCurrentPage(idx + 1)
        const page = await pdf.getPage(num)
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise

        // miniatura (data URL) gerada antes de limpar o canvas — preview nunca quebra
        const tw = Math.min(canvas.width, 400)
        const th = Math.round((tw / canvas.width) * canvas.height)
        const tc = document.createElement('canvas')
        tc.width = tw; tc.height = th
        tc.getContext('2d').drawImage(canvas, 0, 0, tw, th)
        const thumbUrl = tc.toDataURL('image/jpeg', 0.75)
        tc.width = 0; tc.height = 0

        const blob = await new Promise(res =>
          canvas.toBlob(res, fmt.mime, fmt.hasQuality ? quality : undefined)
        )

        results.push({
          url: URL.createObjectURL(blob),
          thumbUrl,
          name: `pagina-${String(num).padStart(3, '0')}.${fmt.value}`,
          width: canvas.width,
          height: canvas.height,
          blob,
        })

        canvas.width = 0; canvas.height = 0
        page.cleanup()
        setProgress(Math.round(((idx + 1) / alvo.length) * 100))
      }

      setPages(results)
      // se cancelou sem nenhum resultado, volta pra prévia
      setPhase(results.length > 0 ? 'done' : 'preview')
    } catch (err) {
      alert('Erro ao converter as páginas selecionadas.')
      console.error(err)
      setPhase('preview')
    } finally {
      setCurrentPage(0)
    }
  }, [selected, dpi, quality, currentFmt, pages])

  const cancelarConversao = () => { cancelRef.current = true }

  // ── entrada de arquivo ──
  const handleInput = (e) => carregarPdf(e.target.files?.[0])
  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file?.type === 'application/pdf') carregarPdf(file)
  }

  // ── downloads ──
  const downloadOne = (p) => {
    const a = document.createElement('a')
    a.href = p.url
    a.download = `${fileName || 'pdf'}_${p.name}`
    a.click()
  }
  const downloadAll = async () => {
    setZippingAll(true)
    try {
      const zip = new JSZip()
      for (const p of pages) zip.file(`${fileName || 'pdf'}_${p.name}`, p.blob)
      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 3 } })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(zipBlob)
      a.download = `${fileName || 'pdf'}_paginas.zip`
      a.click()
      URL.revokeObjectURL(a.href)
    } finally {
      setZippingAll(false)
    }
  }

  const voltarParaPreview = () => {
    pages.forEach(p => URL.revokeObjectURL(p.url))
    setPages([])
    setPhase('preview')
  }
  const reset = () => {
    pages.forEach(p => URL.revokeObjectURL(p.url))
    try { pdfRef.current?.destroy() } catch { /* noop */ }
    pdfRef.current = null
    setPages([])
    setPreviews([])
    setSelected(new Set())
    setRangeText('')
    setFileName('')
    setPhase('idle')
    if (inputRef.current) inputRef.current.value = ''
  }

  const mostraOpcoes = phase === 'idle' || phase === 'preview'

  return (
    <main className="pagina pdfjpg-pg">
      {/* ── nav topo ── */}
      <div className="pdfjpg-nav">
        <div className="container pdfjpg-nav-inner">
          <Link to="/ferramentas" className="pdfjpg-back">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Ferramentas
          </Link>
          <span className="pdfjpg-nav-tag">PDF para JPG · 100% gratuito · sem upload</span>
        </div>
      </div>

      <div className="container pdfjpg-wrap">

        {/* ── cabeçalho ── */}
        <div className="pdfjpg-header">
          <div className="pdfjpg-header-icon">{iconePdf(32)}</div>
          <div>
            <h1 className="pdfjpg-titulo">
              Seu PDF vira <span className="pdfjpg-titulo-hl">imagem nítida</span><br className="pdfjpg-titulo-br" /> em segundos
            </h1>
            <p className="pdfjpg-sub">
              Converta cada página em <strong>JPG, PNG ou WebP</strong> de alta definição — direto no seu navegador, sem enviar nada a servidor. <strong>PDF para JPG grátis</strong>, ilimitado e sem marca d'água.
            </p>
            <div className="pdfjpg-trust-chips">
              <span className="pdfjpg-trust-chip pdfjpg-trust-chip--free">{iconeTag(13)} 100% Gratuito</span>
              <span className="pdfjpg-trust-chip">{iconeShield(12)} Sem upload</span>
              <span className="pdfjpg-trust-chip">Sem cadastro</span>
              <span className="pdfjpg-trust-chip">Sem marca d'água</span>
              <span className="pdfjpg-trust-chip">Escolha as páginas</span>
            </div>
          </div>
        </div>

        {/* ── painel de opções + upload ── */}
        <div className="pdfjpg-main">

          {/* opções (idle/preview) */}
          {mostraOpcoes && (
            <div className="pdfjpg-opcoes">
              {/* Resolução */}
              <div className="pdfjpg-opcoes-group">
                <span className="pdfjpg-opcoes-label">
                  Resolução
                  <span className="pdfjpg-help" tabIndex={0} role="img" aria-label="O que é DPI? DPI (pontos por polegada) define a nitidez da imagem: quanto maior, mais detalhada e mais pesada." data-tip="DPI = pontos por polegada. Quanto maior, mais nítida e detalhada a imagem — e maior o arquivo.">?</span>
                </span>
                <div className="pdfjpg-dpi-row">
                  {DPI_OPTIONS.map(o => (
                    <button
                      key={o.value}
                      type="button"
                      className={`pdfjpg-dpi-btn${dpi === o.value ? ' pdfjpg-dpi-btn--ativo' : ''}`}
                      onClick={() => setDpi(o.value)}
                    >
                      <strong>{o.label}</strong>
                      <span>{pageDims ? pxFor(o.value) : o.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Formato */}
              <div className="pdfjpg-opcoes-group">
                <span className="pdfjpg-opcoes-label">Formato de saída</span>
                <div className="pdfjpg-dpi-row">
                  {FORMAT_OPTIONS.map(o => (
                    <button
                      key={o.value}
                      type="button"
                      className={`pdfjpg-dpi-btn${format === o.value ? ' pdfjpg-dpi-btn--ativo' : ''}`}
                      onClick={() => setFormat(o.value)}
                    >
                      <strong>{o.label}</strong>
                      <span>{o.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Qualidade — só JPG e WebP */}
              {currentFmt.hasQuality && (
                <div className="pdfjpg-opcoes-group" style={{ flexBasis: '100%' }}>
                  <span className="pdfjpg-opcoes-label">
                    Qualidade {currentFmt.label} — <b>{Math.round(quality * 100)}%</b>
                  </span>
                  <input
                    type="range" min="0.7" max="1" step="0.01"
                    value={quality}
                    onChange={e => setQuality(+e.target.value)}
                    className="pdfjpg-range"
                  />
                  <div className="pdfjpg-range-tips">
                    <span>70% (arquivo menor)</span>
                    <span>100% (máxima qualidade)</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* zona de upload (idle) */}
          {phase === 'idle' && (
            <div
              className={`pdfjpg-drop${isDragging ? ' pdfjpg-drop--over' : ''}`}
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
            >
              <input ref={inputRef} type="file" accept=".pdf,application/pdf" onChange={handleInput} style={{ display: 'none' }} />
              <div className="pdfjpg-drop-icon">{iconePdf(48)}</div>
              <p className="pdfjpg-drop-titulo">Arraste o PDF aqui</p>
              <p className="pdfjpg-drop-sub">ou clique para selecionar o arquivo</p>
              <span className="pdfjpg-drop-hint">Apenas arquivos .pdf · sem limite de tamanho ou páginas</span>
            </div>
          )}

          {/* carregando prévias (loading) */}
          {phase === 'loading' && (
            <div className="pdfjpg-progress-wrap">
              <div className="pdfjpg-progress-info">
                <span>Lendo o PDF e gerando prévias das páginas…</span>
                <span className="pdfjpg-progress-pct">{loadProgress}%</span>
              </div>
              <div className="pdfjpg-progress-bar">
                <div className="pdfjpg-progress-fill" style={{ width: `${loadProgress}%` }} />
              </div>
            </div>
          )}

          {/* seleção de páginas (preview) */}
          {phase === 'preview' && (
            <div className="pdfjpg-sel">
              <div className="pdfjpg-sel-bar">
                <div className="pdfjpg-sel-info">
                  <strong>{selected.size}</strong> de {total} página{total !== 1 ? 's' : ''} selecionada{selected.size !== 1 ? 's' : ''}
                  <div className="pdfjpg-sel-range">
                    <label htmlFor="pdfjpg-range">Páginas:</label>
                    <input
                      id="pdfjpg-range"
                      type="text"
                      className="pdfjpg-range-input"
                      value={rangeText}
                      onChange={e => onRangeChange(e.target.value)}
                      placeholder="ex.: 1, 3, 5-8"
                      aria-label="Intervalo de páginas a converter"
                    />
                  </div>
                </div>
                <div className="pdfjpg-sel-actions">
                  <button className="btn btn-ghost" onClick={selecionarTodas}>Todas</button>
                  <button className="btn btn-ghost" onClick={limparSelecao}>Limpar</button>
                  <button className="btn btn-gold" onClick={converterSelecionadas} disabled={selected.size === 0}>
                    Converter {selected.size} página{selected.size !== 1 ? 's' : ''} →
                  </button>
                </div>
              </div>

              <div className="pdfjpg-preview-grid">
                {previews.map(p => {
                  const on = selected.has(p.page)
                  return (
                    <button
                      key={p.page}
                      type="button"
                      className={`pdfjpg-preview-card${on ? ' pdfjpg-preview-card--on' : ''}`}
                      onClick={() => togglePagina(p.page)}
                      aria-pressed={on}
                      aria-label={`Página ${p.page}${on ? ' selecionada' : ''}`}
                    >
                      <span className={`pdfjpg-preview-check${on ? ' pdfjpg-preview-check--on' : ''}`}>
                        {on && iconeCheck(12)}
                      </span>
                      <img src={p.thumb} alt={`Prévia da página ${p.page}`} />
                      <span className="pdfjpg-preview-num">{p.page}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* convertendo (converting) */}
          {phase === 'converting' && (
            <div className="pdfjpg-progress-wrap">
              <ConversaoAnim />
              <div className="pdfjpg-progress-info">
                <span>Convertendo página {currentPage} de {selected.size}{dpi === 600 ? ' (600 DPI — pode demorar)' : ''}…</span>
                <span className="pdfjpg-progress-pct">{progress}%</span>
              </div>
              <div className="pdfjpg-progress-bar">
                <div className="pdfjpg-progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="pdfjpg-progress-foot">
                <p className="pdfjpg-progress-note">Cada página é renderizada em alta definição no seu dispositivo.</p>
                <button className="btn btn-ghost pdfjpg-btn-cancel" onClick={cancelarConversao}>Cancelar</button>
              </div>
            </div>
          )}
        </div>

        {/* ── resultado (done) ── */}
        {phase === 'done' && pages.length > 0 && (
          <div className="pdfjpg-result">
            <div className="pdfjpg-result-bar">
              <div className="pdfjpg-result-info">
                <span className="pdfjpg-result-count">
                  {pages.length} página{pages.length !== 1 ? 's' : ''} convertida{pages.length !== 1 ? 's' : ''} em {currentFmt.label}
                </span>
                <span className="pdfjpg-result-dim">
                  {pages[0].width} × {pages[0].height} px · {dpi} DPI
                  {currentFmt.hasQuality ? ` · qualidade ${Math.round(quality * 100)}%` : ' · sem perda'}
                </span>
              </div>
              <div className="pdfjpg-result-actions">
                <button className="btn btn-gold" onClick={downloadAll} disabled={zippingAll}>
                  {iconeZip(15)}
                  {zippingAll ? 'Gerando ZIP…' : `Baixar tudo em ZIP (${pages.length} imagens)`}
                </button>
                <button className="btn btn-ghost" onClick={voltarParaPreview}>Escolher outras páginas</button>
                <button className="btn btn-ghost" onClick={reset}>Novo PDF</button>
              </div>
            </div>

            <div className="pdfjpg-grid">
              {pages.map((p, i) => (
                <div key={i} className="pdfjpg-card">
                  <div className="pdfjpg-card-thumb">
                    <img src={p.thumbUrl} alt={`Página convertida para ${currentFmt.label}`} />
                  </div>
                  <div className="pdfjpg-card-footer">
                    <span className="pdfjpg-card-label">{p.name.replace(/\.\w+$/, '').replace('pagina-', 'Pág. ')}</span>
                    <button className="pdfjpg-card-dl btn btn-ghost" onClick={() => downloadOne(p)}>
                      {iconeDownload(13)} Baixar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── nota de privacidade ── */}
        <div className="pdfjpg-privacy">
          {iconeShield(14)}
          Seus arquivos nunca saem do seu dispositivo. Todo o processamento é feito localmente no navegador (PDF.js + Canvas API). Não temos servidor para receber uploads — é matematicamente impossível.
        </div>

        {/* ── Como funciona ── */}
        <section className="pdfjpg-how">
          <h2 className="pdfjpg-section-title">Como converter PDF para JPG</h2>
          <div className="pdfjpg-how-steps">
            <div className="pdfjpg-how-step">
              <span className="pdfjpg-how-num">1</span>
              <h3>Selecione o PDF</h3>
              <p>Arraste o arquivo para a área acima ou clique para abrir o seletor. Qualquer PDF funciona — sem limite de tamanho ou número de páginas.</p>
            </div>
            <div className="pdfjpg-how-step">
              <span className="pdfjpg-how-num">2</span>
              <h3>Escolha as páginas e o formato</h3>
              <p>Veja a prévia de todas as páginas e marque quais quer exportar. Defina a resolução (150–600 DPI) e o formato: JPG, PNG ou WebP.</p>
            </div>
            <div className="pdfjpg-how-step">
              <span className="pdfjpg-how-num">3</span>
              <h3>Baixe as imagens</h3>
              <p>Cada página vira uma imagem separada. Baixe individualmente ou todas de uma vez em um arquivo ZIP.</p>
            </div>
          </div>
        </section>

        {/* ── Por que usar ── */}
        <section className="pdfjpg-benefits">
          <h2 className="pdfjpg-section-title">Por que usar esta ferramenta</h2>
          <div className="pdfjpg-benefits-grid">
            <div className="pdfjpg-benefit">
              <span className="pdfjpg-benefit-ico">{iconeShield(20)}</span>
              <h3>Privacidade total</h3>
              <p>Seu arquivo nunca sai do dispositivo. Zero upload, zero risco, zero rastreamento.</p>
            </div>
            <div className="pdfjpg-benefit">
              <span className="pdfjpg-benefit-ico">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
              </span>
              <h3>100% gratuito</h3>
              <p>Sem plano pago, sem assinatura, sem marca d'água. Sempre gratuito, sem exceção.</p>
            </div>
            <div className="pdfjpg-benefit">
              <span className="pdfjpg-benefit-ico">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </span>
              <h3>Alta resolução</h3>
              <p>Até 600 DPI — qualidade profissional para impressão e design gráfico.</p>
            </div>
            <div className="pdfjpg-benefit">
              <span className="pdfjpg-benefit-ico">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              </span>
              <h3>Você escolhe as páginas</h3>
              <p>Pré-visualize e converta só os trechos que precisa — uma página ou o documento inteiro.</p>
            </div>
            <div className="pdfjpg-benefit">
              <span className="pdfjpg-benefit-ico">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </span>
              <h3>Múltiplos formatos</h3>
              <p>Exporte em JPG, PNG ou WebP conforme a necessidade de cada projeto.</p>
            </div>
            <div className="pdfjpg-benefit">
              <span className="pdfjpg-benefit-ico">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
              </span>
              <h3>Qualquer dispositivo</h3>
              <p>Funciona no PC, Mac, celular e tablet com qualquer navegador moderno.</p>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="pdfjpg-faq">
          <h2 className="pdfjpg-section-title">Perguntas frequentes</h2>
          <div className="pdfjpg-faq-list">
            {FAQ_ITEMS.map((item, i) => (
              <details key={i} className="pdfjpg-faq-item">
                <summary className="pdfjpg-faq-q">{item.q}</summary>
                <p className="pdfjpg-faq-a">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

      </div>
    </main>
  )
}
