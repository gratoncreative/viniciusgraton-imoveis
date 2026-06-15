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
  { q: 'Qual DPI escolher para impressão?', a: '300 DPI é o padrão da indústria para impressão de qualidade. Use 150 DPI para imagens digitais (e-mail, redes sociais) e 600 DPI para materiais gráficos de altíssima precisão como cartazes e banners.' },
  { q: 'Consigo converter um PDF com senha?', a: 'Não. Arquivos protegidos por senha não podem ser processados. Você precisará remover a proteção antes de converter.' },
  { q: 'Qual a diferença entre JPG, PNG e WebP?', a: 'JPG comprime bem e é universalmente compatível. PNG preserva qualidade sem perda e suporta fundo transparente. WebP oferece ótimo equilíbrio entre qualidade e tamanho de arquivo, mas pode não abrir em sistemas muito antigos.' },
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

export default function PdfParaJpgPage() {
  useSEO({
    title: 'Converter PDF para JPG Grátis Online — Sem Upload, Alta Resolução',
    description: 'Converta PDF para JPG, PNG ou WebP de graça e sem cadastro. Processamento 100% no seu navegador — seu arquivo nunca sai do dispositivo. Múltiplas páginas, até 600 DPI, sem marca d\'água.',
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
      description: 'Converta PDF para JPG, PNG ou WebP gratuitamente no navegador. Sem upload de arquivos, sem cadastro, sem limite de páginas, sem marca d\'água.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
      featureList: [
        '100% gratuito, sem cadastro',
        'Processamento local — sem upload de arquivos',
        'Suporte a múltiplas páginas sem limite',
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

  const [pages, setPages] = useState([])
  const [progress, setProgress] = useState(0)
  const [converting, setConverting] = useState(false)
  const [dpi, setDpi] = useState(300)
  const [format, setFormat] = useState('jpg')
  const [quality, setQuality] = useState(0.92)
  const [fileName, setFileName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [zippingAll, setZippingAll] = useState(false)
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const inputRef = useRef(null)

  const currentFmt = FORMAT_OPTIONS.find(f => f.value === format) || FORMAT_OPTIONS[0]

  const runConversion = useCallback(async (file) => {
    if (!file || file.type !== 'application/pdf') return

    pages.forEach(p => URL.revokeObjectURL(p.url))
    setPages([])
    setProgress(0)
    setTotalPages(0)
    setCurrentPage(0)
    setFileName(file.name.replace(/\.pdf$/i, ''))
    setConverting(true)

    try {
      const buffer = await file.arrayBuffer()
      const pdf = await pdfjs.getDocument({ data: buffer }).promise
      const total = pdf.numPages
      setTotalPages(total)
      const results = []
      const scale = dpi / 72
      const fmtOpt = FORMAT_OPTIONS.find(f => f.value === format) || FORMAT_OPTIONS[0]

      for (let i = 1; i <= total; i++) {
        setCurrentPage(i)
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        canvas.width  = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        const ctx = canvas.getContext('2d')
        await page.render({ canvasContext: ctx, viewport }).promise

        // Gerar miniatura com data URL ANTES de limpar o canvas — evita previews quebradas
        const thumbW = Math.min(canvas.width, 400)
        const thumbH = Math.round((thumbW / canvas.width) * canvas.height)
        const thumbCanvas = document.createElement('canvas')
        thumbCanvas.width = thumbW
        thumbCanvas.height = thumbH
        thumbCanvas.getContext('2d').drawImage(canvas, 0, 0, thumbW, thumbH)
        const thumbUrl = thumbCanvas.toDataURL('image/jpeg', 0.75)
        thumbCanvas.width = 0; thumbCanvas.height = 0

        const blob = await new Promise(res =>
          canvas.toBlob(res, fmtOpt.mime, fmtOpt.hasQuality ? quality : undefined)
        )

        results.push({
          url:      URL.createObjectURL(blob),
          thumbUrl,
          name:     `pagina-${String(i).padStart(3, '0')}.${fmtOpt.value}`,
          width:    canvas.width,
          height:   canvas.height,
          blob,
        })

        // Libera memória GPU — crítico para PDFs grandes
        canvas.width  = 0
        canvas.height = 0
        page.cleanup()

        setProgress(Math.round((i / total) * 100))
      }

      setPages(results)
    } catch (err) {
      alert('Erro ao converter o PDF. Verifique se o arquivo não está protegido por senha.')
      console.error(err)
    } finally {
      setConverting(false)
      setCurrentPage(0)
      setTotalPages(0)
    }
  }, [dpi, quality, format, pages])

  const handleFile = useCallback((file) => runConversion(file), [runConversion])
  const handleInput = (e) => handleFile(e.target.files?.[0])
  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file?.type === 'application/pdf') handleFile(file)
  }

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
      for (const p of pages) {
        zip.file(`${fileName || 'pdf'}_${p.name}`, p.blob)
      }
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

  const reset = () => {
    pages.forEach(p => URL.revokeObjectURL(p.url))
    setPages([])
    setProgress(0)
    setFileName('')
    if (inputRef.current) inputRef.current.value = ''
  }

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
            <h1 className="pdfjpg-titulo">Converter PDF para JPG — Grátis</h1>
            <p className="pdfjpg-sub">
              Converta cada página em imagem de alta definição — JPG, PNG ou WebP.<br />
              Processamento 100% no seu navegador, sem enviar nenhum arquivo a servidor.
            </p>
            <div className="pdfjpg-trust-chips">
              <span className="pdfjpg-trust-chip pdfjpg-trust-chip--free">{iconeTag(13)} 100% Gratuito</span>
              <span className="pdfjpg-trust-chip">{iconeShield(12)} Sem upload</span>
              <span className="pdfjpg-trust-chip">Sem cadastro</span>
              <span className="pdfjpg-trust-chip">Sem marca d'água</span>
              <span className="pdfjpg-trust-chip">Sem limite de páginas</span>
            </div>
          </div>
        </div>

        {/* ── painel de opções + upload ── */}
        <div className="pdfjpg-main">

          {/* opções */}
          <div className="pdfjpg-opcoes">
            {/* Resolução */}
            <div className="pdfjpg-opcoes-group">
              <span className="pdfjpg-opcoes-label">Resolução</span>
              <div className="pdfjpg-dpi-row">
                {DPI_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    type="button"
                    className={`pdfjpg-dpi-btn${dpi === o.value ? ' pdfjpg-dpi-btn--ativo' : ''}`}
                    onClick={() => setDpi(o.value)}
                    disabled={converting}
                  >
                    <strong>{o.label}</strong>
                    <span>{o.sub}</span>
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
                    disabled={converting}
                  >
                    <strong>{o.label}</strong>
                    <span>{o.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Qualidade — apenas para JPG e WebP */}
            {currentFmt.hasQuality && (
              <div className="pdfjpg-opcoes-group" style={{ flexBasis: '100%' }}>
                <span className="pdfjpg-opcoes-label">
                  Qualidade {currentFmt.label} — <b>{Math.round(quality * 100)}%</b>
                </span>
                <input
                  type="range" min="0.7" max="1" step="0.01"
                  value={quality}
                  onChange={e => setQuality(+e.target.value)}
                  disabled={converting}
                  className="pdfjpg-range"
                />
                <div className="pdfjpg-range-tips">
                  <span>70% (arquivo menor)</span>
                  <span>100% (máxima qualidade)</span>
                </div>
              </div>
            )}
          </div>

          {/* zona de upload */}
          {pages.length === 0 && !converting && (
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
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleInput}
                style={{ display: 'none' }}
              />
              <div className="pdfjpg-drop-icon">{iconePdf(48)}</div>
              <p className="pdfjpg-drop-titulo">Arraste o PDF aqui</p>
              <p className="pdfjpg-drop-sub">ou clique para selecionar o arquivo</p>
              <span className="pdfjpg-drop-hint">Apenas arquivos .pdf · sem limite de tamanho ou páginas</span>
            </div>
          )}

          {/* progresso */}
          {converting && (
            <div className="pdfjpg-progress-wrap">
              <div className="pdfjpg-progress-info">
                <span>
                  {totalPages > 0
                    ? `Convertendo página ${currentPage} de ${totalPages}${dpi === 600 ? ' (600 DPI — pode demorar)' : ''}…`
                    : 'Carregando PDF…'}
                </span>
                <span className="pdfjpg-progress-pct">{progress}%</span>
              </div>
              <div className="pdfjpg-progress-bar">
                <div className="pdfjpg-progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <p className="pdfjpg-progress-note">
                Cada página é renderizada individualmente em alta definição.
              </p>
            </div>
          )}
        </div>

        {/* ── resultado ── */}
        {pages.length > 0 && (
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
                <button
                  className="btn btn-gold"
                  onClick={downloadAll}
                  disabled={zippingAll}
                >
                  {iconeZip(15)}
                  {zippingAll ? 'Gerando ZIP…' : `Baixar tudo em ZIP (${pages.length} imagens)`}
                </button>
                <button className="btn btn-ghost" onClick={reset}>
                  Novo PDF
                </button>
              </div>
            </div>

            <div className="pdfjpg-grid">
              {pages.map((p, i) => (
                <div key={i} className="pdfjpg-card">
                  <div className="pdfjpg-card-thumb">
                    <img
                      src={p.thumbUrl}
                      alt={`Página ${i + 1} convertida para ${currentFmt.label}`}
                    />
                  </div>
                  <div className="pdfjpg-card-footer">
                    <span className="pdfjpg-card-label">Página {i + 1}</span>
                    <button
                      className="pdfjpg-card-dl btn btn-ghost"
                      onClick={() => downloadOne(p)}
                    >
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
              <h3>Escolha resolução e formato</h3>
              <p>150 DPI para digital, 300 DPI para impressão, 600 DPI para máxima qualidade. Selecione JPG, PNG ou WebP como formato de saída.</p>
            </div>
            <div className="pdfjpg-how-step">
              <span className="pdfjpg-how-num">3</span>
              <h3>Baixe as imagens</h3>
              <p>Cada página do PDF se torna uma imagem separada. Baixe individualmente ou todas de uma vez em um arquivo ZIP.</p>
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
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </span>
              <h3>Sem limite de uso</h3>
              <p>Converta quantas páginas e quantos PDFs quiser, a qualquer momento.</p>
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
