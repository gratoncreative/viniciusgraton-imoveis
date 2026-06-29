import { useState, useRef, useCallback } from 'react'
import * as pdfjs from 'pdfjs-dist'
import PdfToolShell from '../components/PdfToolShell'
import ArquivoDrop from '../components/ArquivoDrop'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

const FAQ = [
  { q: 'É gratuito dividir um PDF?', a: 'Sim, 100% gratuito e ilimitado, sem cadastro e sem marca d\'água nos arquivos gerados.' },
  { q: 'Meu PDF é enviado para algum servidor?', a: 'Não. Tudo é feito no seu navegador. O arquivo não sai do seu dispositivo.' },
  { q: 'Qual a diferença entre extrair e separar?', a: '"Extrair" gera um único PDF só com as páginas que você escolheu. "Separar" gera um PDF para cada página, entregues juntos em um ZIP.' },
  { q: 'Como seleciono as páginas?', a: 'Clique nas miniaturas para marcar ou desmarcar, ou digite um intervalo como "1, 3, 5-8" no campo de páginas.' },
  { q: 'A qualidade é mantida?', a: 'Sim. As páginas são copiadas exatamente como estão, com texto selecionável e resolução original. Nada é transformado em imagem.' },
  { q: 'Funciona com PDF protegido por senha?', a: 'PDFs com senha de abertura não podem ser lidos. Remova a senha antes de dividir.' },
]
const HOW = [
  { t: 'Abra o PDF', d: 'Arraste ou selecione o arquivo. Mostramos uma prévia de todas as páginas.' },
  { t: 'Escolha as páginas', d: 'Clique nas miniaturas ou digite o intervalo. Decida extrair em um PDF ou separar em vários.' },
  { t: 'Baixe o resultado', d: 'Baixe o PDF extraído ou o ZIP com cada página separada, mantendo a qualidade.' },
]
const BENEFITS = [
  { ico: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', t: 'Privacidade total', d: 'O arquivo não sai do seu dispositivo. Zero upload.' },
  { ico: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z', t: '100% gratuito', d: 'Sem assinatura, sem limite e sem marca d\'água.' },
  { ico: 'M20 6 9 17l-5-5', t: 'Sem perda de qualidade', d: 'Páginas copiadas como estão, com texto selecionável.' },
  { ico: 'M9 11l3 3 8-8M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11', t: 'Você escolhe tudo', d: 'Prévia visual, seleção por clique ou por intervalo.' },
]

// "1, 3, 5-8" → Set{1,3,5,6,7,8}
function parseRange(text, total) {
  const set = new Set()
  for (const raw of text.split(',')) {
    const p = raw.trim()
    if (!p) continue
    const m = p.match(/^(\d+)\s*-\s*(\d+)$/)
    if (m) { let a = +m[1], b = +m[2]; if (a > b)[a, b] = [b, a]; for (let i = a; i <= b; i++) if (i >= 1 && i <= total) set.add(i) }
    else if (/^\d+$/.test(p)) { const n = +p; if (n >= 1 && n <= total) set.add(n) }
  }
  return set
}
function compactRange(set, total) {
  const nums = [...set].sort((a, b) => a - b)
  if (!nums.length) return ''
  if (nums.length === total) return `1-${total}`
  const parts = []; let start = nums[0], prev = nums[0]
  for (let i = 1; i <= nums.length; i++) {
    if (nums[i] === prev + 1) { prev = nums[i]; continue }
    parts.push(start === prev ? `${start}` : `${start}-${prev}`); start = nums[i]; prev = nums[i]
  }
  return parts.join(', ')
}

export default function DividirPdfPage() {
  const [phase, setPhase] = useState('idle') // idle | loading | ready | processing | done
  const [previews, setPreviews] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [rangeText, setRangeText] = useState('')
  const [modo, setModo] = useState('extrair') // extrair | separar
  const [loadProgress, setLoadProgress] = useState(0)
  const [result, setResult] = useState(null)
  const fileRef = useRef(null)
  const total = previews.length

  const carregarPdf = useCallback(async (file) => {
    if (!file || (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name))) return
    fileRef.current = file
    setPreviews([]); setSelected(new Set()); setResult(null); setLoadProgress(0); setPhase('loading')
    try {
      const buffer = await file.arrayBuffer()
      const pdf = await pdfjs.getDocument({ data: buffer }).promise
      const tot = pdf.numPages
      const prev = []
      for (let i = 1; i <= tot; i++) {
        const page = await pdf.getPage(i)
        const vp1 = page.getViewport({ scale: 1 })
        const scale = Math.min(180 / vp1.width, 1.5)
        const vp = page.getViewport({ scale })
        const canvas = document.createElement('canvas')
        canvas.width = Math.floor(vp.width); canvas.height = Math.floor(vp.height)
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise
        prev.push({ page: i, thumb: canvas.toDataURL('image/jpeg', 0.7) })
        canvas.width = 0; canvas.height = 0; page.cleanup()
        setLoadProgress(Math.round((i / tot) * 100))
      }
      try { pdf.destroy() } catch { /* noop */ }
      setPreviews(prev)
      setSelected(new Set(prev.map((p) => p.page)))
      setRangeText(`1-${tot}`)
      setPhase('ready')
    } catch (e) {
      console.error(e); alert('Erro ao ler o PDF. Verifique se não está protegido por senha.'); setPhase('idle')
    }
  }, [])

  const aplicar = (novo) => { setSelected(novo); setRangeText(compactRange(novo, total)) }
  const toggle = (n) => { const s = new Set(selected); s.has(n) ? s.delete(n) : s.add(n); aplicar(s) }
  const onRange = (t) => { setRangeText(t); setSelected(parseRange(t, total)) }

  const processar = useCallback(async () => {
    const idx = [...selected].sort((a, b) => a - b).map((n) => n - 1)
    if (!idx.length || !fileRef.current) return
    setPhase('processing'); setResult(null)
    try {
      const buf = await fileRef.current.arrayBuffer()
      const { PDFDocument } = await import('pdf-lib')
      const src = await PDFDocument.load(buf, { ignoreEncryption: true })
      if (modo === 'extrair') {
        const out = await PDFDocument.create()
        const pages = await out.copyPages(src, idx)
        pages.forEach((p) => out.addPage(p))
        const bytes = await out.save()
        const blob = new Blob([bytes], { type: 'application/pdf' })
        setResult({ url: URL.createObjectURL(blob), name: 'extraido.pdf', size: blob.size, count: idx.length, zip: false })
      } else {
        const JSZip = (await import('jszip')).default
        const zip = new JSZip()
        for (const i of idx) {
          const out = await PDFDocument.create()
          const [pg] = await out.copyPages(src, [i])
          out.addPage(pg)
          const bytes = await out.save()
          zip.file(`pagina-${String(i + 1).padStart(3, '0')}.pdf`, bytes)
        }
        const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 3 } })
        setResult({ url: URL.createObjectURL(blob), name: 'paginas-separadas.zip', size: blob.size, count: idx.length, zip: true })
      }
      setPhase('done')
    } catch (e) {
      console.error(e); alert('Erro ao dividir o PDF.'); setPhase('ready')
    }
  }, [selected, modo])

  const baixar = () => { const a = document.createElement('a'); a.href = result.url; a.download = result.name; a.click() }
  const reset = () => { setPreviews([]); setSelected(new Set()); setResult(null); fileRef.current = null; setPhase('idle') }
  const fmtSize = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

  return (
    <PdfToolShell
      currentSlug="dividir-pdf"
      seo={{
        title: 'Dividir PDF Grátis: Separar e Extrair Páginas, Sem Upload',
        description: 'Divida um PDF: extraia páginas específicas em um novo arquivo ou separe cada página em PDFs individuais. Grátis, sem cadastro e sem marca d\'água. Processamento 100% no navegador.',
        path: '/ferramentas/dividir-pdf',
      }}
      tag="Dividir PDF · 100% gratuito · sem upload"
      icon={<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9.5" y1="11" x2="9.5" y2="19" strokeDasharray="2 2" /></svg>}
      titulo={<>Separe ou <span className="pdfjpg-titulo-hl">extraia páginas</span> do seu PDF</>}
      sub={<>Escolha as páginas e gere <strong>um novo PDF</strong> só com elas, ou separe cada uma em arquivos individuais. Grátis, sem perder qualidade.</>}
      chips={['100% Gratuito', 'Sem upload', 'Prévia das páginas', "Sem marca d'água"]}
      howSteps={HOW}
      benefits={BENEFITS}
      faqItems={FAQ}
      schema={{ name: 'Dividir PDF (separar e extrair páginas)', description: 'Extraia ou separe páginas de um PDF no navegador, sem upload e sem perda de qualidade.', featureList: ['100% gratuito, sem cadastro', 'Processamento local, sem upload', 'Prévia visual das páginas', 'Extrair em um PDF ou separar em vários', 'Mantém a qualidade original', 'Sem marca d\'água'] }}
    >
      <div className="pdfjpg-main">
        {phase === 'idle' && (
          <ArquivoDrop accept=".pdf,application/pdf" onFiles={(f) => carregarPdf(f[0])} titulo="Arraste o PDF aqui" sub="ou clique para selecionar o arquivo" hint="Apenas .pdf · sem limite de páginas" />
        )}

        {phase === 'loading' && (
          <div className="pdfjpg-progress-wrap">
            <div className="pdfjpg-progress-info"><span>Lendo o PDF e gerando prévias…</span><span className="pdfjpg-progress-pct">{loadProgress}%</span></div>
            <div className="pdfjpg-progress-bar"><div className="pdfjpg-progress-fill" style={{ width: `${loadProgress}%` }} /></div>
          </div>
        )}

        {(phase === 'ready' || phase === 'processing') && (
          <>
            <div className="pdfjpg-opcoes">
              <div className="pdfjpg-opcoes-group">
                <span className="pdfjpg-opcoes-label">O que fazer</span>
                <div className="pdfjpg-dpi-row">
                  {[{ v: 'extrair', l: 'Extrair em 1 PDF', s: 'só as páginas escolhidas' }, { v: 'separar', l: 'Separar em vários', s: 'um PDF por página (ZIP)' }].map((o) => (
                    <button key={o.v} type="button" className={`pdfjpg-dpi-btn${modo === o.v ? ' pdfjpg-dpi-btn--ativo' : ''}`} onClick={() => setModo(o.v)}>
                      <strong>{o.l}</strong><span>{o.s}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pdfjpg-sel">
              <div className="pdfjpg-sel-bar">
                <div className="pdfjpg-sel-info">
                  <strong>{selected.size}</strong> de {total} página{total !== 1 ? 's' : ''}
                  <div className="pdfjpg-sel-range">
                    <label htmlFor="div-range">Páginas:</label>
                    <input id="div-range" type="text" className="pdfjpg-range-input" value={rangeText} onChange={(e) => onRange(e.target.value)} placeholder="ex.: 1, 3, 5-8" />
                  </div>
                </div>
                <div className="pdfjpg-sel-actions">
                  <button className="btn btn-ghost" onClick={() => aplicar(new Set(previews.map((p) => p.page)))}>Todas</button>
                  <button className="btn btn-ghost" onClick={() => aplicar(new Set())}>Limpar</button>
                  <button className="btn btn-gold" onClick={processar} disabled={selected.size === 0 || phase === 'processing'}>
                    {phase === 'processing' ? 'Processando…' : (modo === 'extrair' ? `Extrair ${selected.size} →` : `Separar ${selected.size} →`)}
                  </button>
                </div>
              </div>
              <div className="pdfjpg-preview-grid">
                {previews.map((p) => {
                  const on = selected.has(p.page)
                  return (
                    <button key={p.page} type="button" className={`pdfjpg-preview-card${on ? ' pdfjpg-preview-card--on' : ''}`} onClick={() => toggle(p.page)} aria-pressed={on}>
                      <span className={`pdfjpg-preview-check${on ? ' pdfjpg-preview-check--on' : ''}`}>{on && <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}</span>
                      <img src={p.thumb} alt={`Página ${p.page}`} />
                      <span className="pdfjpg-preview-num">{p.page}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {phase === 'done' && result && (
          <div className="pdftools-result">
            <div className="pdftools-result-info">
              <strong>{result.zip ? 'Páginas separadas' : 'PDF extraído'}</strong>
              <span>{result.count} página{result.count !== 1 ? 's' : ''} · {fmtSize(result.size)}{result.zip ? ' · ZIP' : ''}</span>
            </div>
            <div className="pdftools-result-acts">
              <button className="btn btn-gold" onClick={baixar}>Baixar {result.zip ? 'ZIP' : 'PDF'}</button>
              <button className="btn btn-ghost" onClick={() => setPhase('ready')}>Escolher outras páginas</button>
              <button className="btn btn-ghost" onClick={reset}>Novo PDF</button>
            </div>
          </div>
        )}
      </div>
    </PdfToolShell>
  )
}
