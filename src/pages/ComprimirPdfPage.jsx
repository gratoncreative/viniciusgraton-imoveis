import { useState, useRef, useCallback } from 'react'
import * as pdfjs from 'pdfjs-dist'
import PdfToolShell from '../components/PdfToolShell'
import ArquivoDrop from '../components/ArquivoDrop'
import { importRetry } from '../lazyRetry'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

const PRESETS = [
  { v: 'alta', l: 'Alta qualidade', s: 'reduz pouco, quase igual', dpi: 150, q: 0.82 },
  { v: 'media', l: 'Recomendada', s: 'ótimo equilíbrio', dpi: 120, q: 0.68 },
  { v: 'maxima', l: 'Máxima compressão', s: 'menor arquivo', dpi: 96, q: 0.5 },
]

const FAQ = [
  { q: 'É gratuito comprimir PDF?', a: 'Sim, 100% gratuito e ilimitado, sem cadastro e sem marca d\'água.' },
  { q: 'Meu PDF é enviado para algum servidor?', a: 'Não. A compressão acontece no seu navegador. O arquivo não sai do seu dispositivo.' },
  { q: 'Como a compressão funciona?', a: 'Cada página é re-renderizada como imagem otimizada e remontada num novo PDF. Por isso reduz bastante PDFs pesados de fotos e documentos digitalizados.' },
  { q: 'O texto continua selecionável depois?', a: 'Não. Como as páginas viram imagem, o texto deixa de ser selecionável. É o trade-off de toda compressão por imagem. Para contratos digitalizados e anúncios isso não atrapalha.' },
  { q: 'E se o meu PDF não diminuir?', a: 'Pode acontecer com PDFs que já são só texto otimizado (eles já são leves). Nesse caso avisamos e você fica com o original.' },
  { q: 'Tem limite de tamanho?', a: 'Não impomos limite. PDFs muito grandes dependem da memória do seu aparelho, mas a maioria dos documentos comprime rápido.' },
]
const HOW = [
  { t: 'Abra o PDF', d: 'Arraste ou selecione o arquivo que está pesado demais para enviar.' },
  { t: 'Escolha o nível', d: 'Selecione entre alta qualidade, recomendada ou máxima compressão.' },
  { t: 'Baixe menor', d: 'Veja quanto reduziu e baixe o PDF leve, pronto para WhatsApp, e-mail ou portal.' },
]
const BENEFITS = [
  { ico: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', t: 'Privacidade total', d: 'O arquivo não sai do seu dispositivo. Zero upload.' },
  { ico: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z', t: '100% gratuito', d: 'Sem assinatura, sem limite e sem marca d\'água.' },
  { ico: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3', t: 'Cabe no anexo', d: 'Reduz o suficiente para enviar por e-mail, WhatsApp e portais.' },
  { ico: 'M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0M12 7v5l3 3', t: 'Rápido e local', d: 'Comprime em segundos, direto no navegador.' },
]

export default function ComprimirPdfPage() {
  const [phase, setPhase] = useState('idle') // idle | ready | processing | done
  const [info, setInfo] = useState(null) // { name, size, pages }
  const [preset, setPreset] = useState('media')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const fileRef = useRef(null)

  const abrir = useCallback(async (file) => {
    if (!file || (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name))) return
    fileRef.current = file
    setResult(null); setPhase('ready'); setInfo({ name: file.name, size: file.size, pages: 0 })
    try {
      const buf = await file.arrayBuffer()
      const pdf = await pdfjs.getDocument({ data: buf }).promise
      setInfo({ name: file.name, size: file.size, pages: pdf.numPages })
      try { pdf.destroy() } catch { /* noop */ }
    } catch (e) { console.error(e); alert('Erro ao ler o PDF. Pode estar protegido por senha.'); setPhase('idle') }
  }, [])

  const comprimir = useCallback(async () => {
    if (!fileRef.current) return
    const p = PRESETS.find((x) => x.v === preset)
    setPhase('processing'); setProgress(0); setResult(null)
    try {
      const { jsPDF } = await importRetry(() => import('jspdf'))
      const buf = await fileRef.current.arrayBuffer()
      const pdf = await pdfjs.getDocument({ data: buf }).promise
      const tot = pdf.numPages
      const scale = p.dpi / 72
      let doc
      for (let i = 1; i <= tot; i++) {
        const page = await pdf.getPage(i)
        const vp1 = page.getViewport({ scale: 1 })
        const vp = page.getViewport({ scale })
        const canvas = document.createElement('canvas')
        canvas.width = Math.floor(vp.width); canvas.height = Math.floor(vp.height)
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
        await page.render({ canvasContext: ctx, viewport: vp }).promise
        const dataUrl = canvas.toDataURL('image/jpeg', p.q)
        canvas.width = 0; canvas.height = 0; page.cleanup()
        const wpt = vp1.width, hpt = vp1.height
        const ori = wpt >= hpt ? 'landscape' : 'portrait'
        if (i === 1) doc = new jsPDF({ orientation: ori, unit: 'pt', format: [wpt, hpt], compress: true })
        else doc.addPage([wpt, hpt], ori)
        doc.addImage(dataUrl, 'JPEG', 0, 0, wpt, hpt)
        setProgress(Math.round((i / tot) * 100))
        await new Promise((r) => setTimeout(r, 0))
      }
      try { pdf.destroy() } catch { /* noop */ }
      const blob = doc.output('blob')
      const orig = fileRef.current.size
      const reducao = Math.round((1 - blob.size / orig) * 100)
      setResult({ url: URL.createObjectURL(blob), size: blob.size, orig, reducao, piorou: blob.size >= orig })
      setPhase('done')
    } catch (e) {
      console.error(e); alert('Erro ao comprimir o PDF.'); setPhase('ready')
    }
  }, [preset])

  const baixar = () => { const a = document.createElement('a'); a.href = result.url; a.download = (info?.name || 'arquivo').replace(/\.pdf$/i, '') + '-comprimido.pdf'; a.click() }
  const reset = () => { fileRef.current = null; setInfo(null); setResult(null); setPhase('idle') }
  const fmtSize = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

  return (
    <PdfToolShell
      currentSlug="comprimir-pdf"
      seo={{
        title: 'Comprimir PDF Grátis: Reduzir Tamanho do PDF, Sem Upload',
        description: 'Reduza o tamanho de um PDF pesado para enviar por e-mail, WhatsApp ou portal. Grátis, sem cadastro e sem marca d\'água. Processamento 100% no navegador, seu arquivo não sai do dispositivo.',
        path: '/ferramentas/comprimir-pdf',
      }}
      tag="Comprimir PDF · 100% gratuito · sem upload"
      icon={<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M9 15l3-3 3 3M12 12v5" /></svg>}
      titulo={<>Deixe seu PDF <span className="pdfjpg-titulo-hl">leve</span> para enviar</>}
      sub={<>Reduza o tamanho de PDFs pesados para caber no <strong>e-mail, WhatsApp ou portal</strong>. Grátis, no seu navegador, sem marca d'água.</>}
      chips={['100% Gratuito', 'Sem upload', '3 níveis', "Sem marca d'água"]}
      howSteps={HOW}
      benefits={BENEFITS}
      faqItems={FAQ}
      schema={{ name: 'Comprimir PDF (reduzir tamanho)', description: 'Reduza o tamanho de um PDF no navegador, sem upload e sem marca d\'água.', featureList: ['100% gratuito, sem cadastro', 'Processamento local, sem upload', '3 níveis de compressão', 'Comparativo de tamanho antes e depois', 'Sem marca d\'água'] }}
    >
      <div className="pdfjpg-main">
        {phase === 'idle' && (
          <ArquivoDrop accept=".pdf,application/pdf" onFiles={(f) => abrir(f[0])} titulo="Arraste o PDF aqui" sub="ou clique para selecionar o arquivo" hint="Apenas .pdf · sem limite de tamanho" />
        )}

        {(phase === 'ready' || phase === 'processing') && info && (
          <>
            <div className="pdftools-fileline">
              <span className="pdftools-item-ico"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg></span>
              <span className="pdftools-item-name">{info.name}<small>{info.pages ? `${info.pages} páginas · ` : ''}{fmtSize(info.size)}</small></span>
              <button className="btn btn-ghost" onClick={reset}>Trocar</button>
            </div>

            <div className="pdfjpg-opcoes">
              <div className="pdfjpg-opcoes-group" style={{ flexBasis: '100%' }}>
                <span className="pdfjpg-opcoes-label">Nível de compressão</span>
                <div className="pdfjpg-dpi-row">
                  {PRESETS.map((o) => (
                    <button key={o.v} type="button" className={`pdfjpg-dpi-btn${preset === o.v ? ' pdfjpg-dpi-btn--ativo' : ''}`} onClick={() => setPreset(o.v)}>
                      <strong>{o.l}</strong><span>{o.s}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {phase === 'processing' ? (
              <div className="pdfjpg-progress-wrap">
                <div className="pdfjpg-progress-info"><span>Comprimindo página a página…</span><span className="pdfjpg-progress-pct">{progress}%</span></div>
                <div className="pdfjpg-progress-bar"><div className="pdfjpg-progress-fill" style={{ width: `${progress}%` }} /></div>
              </div>
            ) : (
              <div className="pdftools-bar">
                <p className="pdftools-nota">A compressão transforma as páginas em imagem (o texto deixa de ser selecionável). Ideal para documentos digitalizados e anúncios pesados.</p>
                <button className="btn btn-gold" onClick={comprimir}>Comprimir PDF →</button>
              </div>
            )}
          </>
        )}

        {phase === 'done' && result && (
          <div className="pdftools-result">
            {result.piorou ? (
              <div className="pdftools-result-info">
                <strong>Esse PDF já estava otimizado</strong>
                <span>A compressão por imagem não reduziu (de {fmtSize(result.orig)} para {fmtSize(result.size)}). Fique com o original.</span>
              </div>
            ) : (
              <div className="pdftools-result-info">
                <strong className="pdftools-reduc">− {result.reducao}% menor</strong>
                <span>De {fmtSize(result.orig)} para <b>{fmtSize(result.size)}</b></span>
              </div>
            )}
            <div className="pdftools-result-acts">
              {!result.piorou && <button className="btn btn-gold" onClick={baixar}>Baixar PDF comprimido</button>}
              <button className="btn btn-ghost" onClick={() => setPhase('ready')}>Tentar outro nível</button>
              <button className="btn btn-ghost" onClick={reset}>Novo PDF</button>
            </div>
          </div>
        )}
      </div>
    </PdfToolShell>
  )
}
