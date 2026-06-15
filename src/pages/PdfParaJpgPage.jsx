import { useState, useRef, useCallback } from 'react'
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

function iconePdf(size = 28) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="9" y1="13" x2="15" y2="13"/>
      <line x1="9" y1="17" x2="15" y2="17"/>
    </svg>
  )
}

function iconeDownload(size = 16) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}

function iconeZip(size = 16) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  )
}

export default function PdfParaJpgPage() {
  useSEO({
    title: 'PDF para JPG | Ferramentas | Vinícius Graton',
    description: 'Converta cada página do seu PDF em JPG de alta definição, 100% no navegador — sem upload para servidor, gratuito.',
    path: '/ferramentas/pdf-para-jpg',
  })

  const [pages, setPages] = useState([])          // { url, name, width, height }
  const [progress, setProgress] = useState(0)      // 0-100
  const [converting, setConverting] = useState(false)
  const [dpi, setDpi] = useState(300)
  const [quality, setQuality] = useState(0.92)
  const [fileName, setFileName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [zippingAll, setZippingAll] = useState(false)
  const inputRef = useRef(null)

  const runConversion = useCallback(async (file) => {
    if (!file || file.type !== 'application/pdf') return

    // libera URLs anteriores
    pages.forEach(p => URL.revokeObjectURL(p.url))
    setPages([])
    setProgress(0)
    setFileName(file.name.replace(/\.pdf$/i, ''))
    setConverting(true)

    try {
      const buffer = await file.arrayBuffer()
      const pdf = await pdfjs.getDocument({ data: buffer }).promise
      const total = pdf.numPages
      const results = []
      const scale = dpi / 72

      for (let i = 1; i <= total; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        canvas.width  = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        const ctx = canvas.getContext('2d')

        await page.render({ canvasContext: ctx, viewport }).promise

        const blob = await new Promise(res =>
          canvas.toBlob(res, 'image/jpeg', quality)
        )

        results.push({
          url:    URL.createObjectURL(blob),
          name:   `pagina-${String(i).padStart(3, '0')}.jpg`,
          width:  canvas.width,
          height: canvas.height,
          blob,
        })

        // limpa memória GPU — crítico para PDFs grandes
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
    }
  }, [dpi, quality, pages])

  const handleFile = useCallback((file) => {
    runConversion(file)
  }, [runConversion])

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
          <span className="pdfjpg-nav-tag">PDF para JPG · gratuito · 100% no navegador</span>
        </div>
      </div>

      <div className="container pdfjpg-wrap">

        {/* ── cabeçalho ── */}
        <div className="pdfjpg-header">
          <div className="pdfjpg-header-icon">{iconePdf(32)}</div>
          <div>
            <h1 className="pdfjpg-titulo">PDF para JPG</h1>
            <p className="pdfjpg-sub">
              Converta cada página em imagem JPG de alta definição.
              Processamento 100% no seu navegador — nenhum arquivo é enviado a servidor.
            </p>
          </div>
        </div>

        {/* ── painel de opções + upload ── */}
        <div className="pdfjpg-main">

          {/* opções */}
          <div className="pdfjpg-opcoes">
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

            <div className="pdfjpg-opcoes-group">
              <span className="pdfjpg-opcoes-label">
                Qualidade JPEG — <b>{Math.round(quality * 100)}%</b>
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
          </div>

          {/* zona de upload */}
          {pages.length === 0 && !converting && (
            <div
              className={`pdfjpg-drop${isDragging ? ' pdfjpg-drop--over' : ''}`}
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
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
              <span className="pdfjpg-drop-hint">Apenas arquivos .pdf · sem limite de tamanho</span>
            </div>
          )}

          {/* progresso */}
          {converting && (
            <div className="pdfjpg-progress-wrap">
              <div className="pdfjpg-progress-info">
                <span>Convertendo{dpi === 600 ? ' (modo 600 DPI — pode demorar)' : ''}…</span>
                <span className="pdfjpg-progress-pct">{progress}%</span>
              </div>
              <div className="pdfjpg-progress-bar">
                <div className="pdfjpg-progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <p className="pdfjpg-progress-note">
                Aguarde — cada página é renderizada individualmente em alta definição.
              </p>
            </div>
          )}
        </div>

        {/* ── resultado ── */}
        {pages.length > 0 && (
          <div className="pdfjpg-result">
            <div className="pdfjpg-result-bar">
              <div className="pdfjpg-result-info">
                <span className="pdfjpg-result-count">{pages.length} página{pages.length !== 1 ? 's' : ''} convertida{pages.length !== 1 ? 's' : ''}</span>
                <span className="pdfjpg-result-dim">{pages[0].width} × {pages[0].height} px · {dpi} DPI · JPEG {Math.round(quality * 100)}%</span>
              </div>
              <div className="pdfjpg-result-actions">
                <button
                  className="btn btn-gold"
                  onClick={downloadAll}
                  disabled={zippingAll}
                >
                  {iconeZip(15)}
                  {zippingAll ? 'Gerando ZIP…' : `Baixar tudo em ZIP (${pages.length} jpgs)`}
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
                    <img src={p.url} alt={`Página ${i + 1}`} loading="lazy" />
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
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Seus arquivos nunca saem do seu dispositivo. Todo o processamento é feito localmente no navegador (Mozilla PDF.js + Canvas API).
        </div>

      </div>
    </main>
  )
}
