import { useState, useCallback } from 'react'
import PdfToolShell from '../components/PdfToolShell'
import ArquivoDrop from '../components/ArquivoDrop'
import { importRetry } from '../lazyRetry'

const FAQ = [
  { q: 'É gratuito rodar um PDF?', a: 'Sim, 100% gratuito e ilimitado, sem cadastro e sem marca d\'água.' },
  { q: 'O arquivo é enviado para algum servidor?', a: 'Não. A rotação é feita no seu navegador, o arquivo não sai do seu dispositivo.' },
  { q: 'A rotação fica salva no arquivo?', a: 'Sim. O PDF baixado já vem com as páginas giradas de forma permanente, abre certo em qualquer leitor.' },
  { q: 'Gira todas as páginas?', a: 'Sim, o giro escolhido é aplicado a todas as páginas do documento, somando à rotação que já existir.' },
  { q: 'A qualidade é mantida?', a: 'Totalmente. Apenas a orientação muda; o conteúdo é preservado, com texto selecionável.' },
]
const HOW = [
  { t: 'Abra o PDF', d: 'Arraste ou selecione o arquivo que está com as páginas tortas ou deitadas.' },
  { t: 'Escolha o giro', d: 'Gire 90° para a direita, 180° (de cabeça para baixo) ou 90° para a esquerda.' },
  { t: 'Baixe corrigido', d: 'Baixe o PDF já com as páginas na orientação certa, pronto para ler ou imprimir.' },
]
const BENEFITS = [
  { ico: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', t: 'Privacidade total', d: 'O arquivo não sai do seu dispositivo. Zero upload.' },
  { ico: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z', t: '100% gratuito', d: 'Sem assinatura, sem limite e sem marca d\'água.' },
  { ico: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15', t: 'Permanente', d: 'A rotação fica gravada no arquivo, abre certo em qualquer leitor.' },
  { ico: 'M20 6 9 17l-5-5', t: 'Sem perda', d: 'Mantém o texto selecionável e a qualidade original.' },
]

const ANGULOS = [
  { v: 90, l: '90° à direita', d: 'M23 4v6h-6M20.49 15a9 9 0 1 1-2.12-9.36L23 10' },
  { v: 180, l: '180° (inverter)', d: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15' },
  { v: 270, l: '90° à esquerda', d: 'M1 4v6h6M3.51 15a9 9 0 1 0 2.13-9.36L1 10' },
]

export default function RodarPdfPage() {
  const [file, setFile] = useState(null)
  const [pages, setPages] = useState(0)
  const [angulo, setAngulo] = useState(90)
  const [phase, setPhase] = useState('idle') // idle | ready | processing | done
  const [result, setResult] = useState(null)

  const abrir = useCallback(async (f) => {
    if (!f || (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name))) return
    try {
      const { PDFDocument } = await importRetry(() => import('pdf-lib'))
      const doc = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true })
      setFile(f); setPages(doc.getPageCount()); setResult(null); setPhase('ready')
    } catch (e) { console.error(e); alert('Não consegui ler o PDF. Pode estar protegido por senha.') }
  }, [])

  const rodar = useCallback(async () => {
    if (!file) return
    setPhase('processing'); setResult(null)
    try {
      const { PDFDocument, degrees } = await importRetry(() => import('pdf-lib'))
      const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })
      doc.getPages().forEach((p) => { const a = (p.getRotation().angle + angulo) % 360; p.setRotation(degrees(a)) })
      const bytes = await doc.save()
      const blob = new Blob([bytes], { type: 'application/pdf' })
      setResult({ url: URL.createObjectURL(blob), size: blob.size })
      setPhase('done')
    } catch (e) { console.error(e); alert('Erro ao rodar o PDF.'); setPhase('ready') }
  }, [file, angulo])

  const baixar = () => { const a = document.createElement('a'); a.href = result.url; a.download = (file?.name || 'arquivo').replace(/\.pdf$/i, '') + '-rodado.pdf'; a.click() }
  const reset = () => { setFile(null); setPages(0); setResult(null); setPhase('idle') }
  const fmtSize = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

  return (
    <PdfToolShell
      currentSlug="rodar-pdf"
      seo={{
        title: 'Rodar PDF Grátis: Girar Páginas do PDF, Sem Upload',
        description: 'Gire as páginas de um PDF (90°, 180° ou 270°) de graça e sem cadastro. A rotação fica salva no arquivo. Processamento 100% no navegador, seu arquivo não sai do dispositivo.',
        path: '/ferramentas/rodar-pdf',
      }}
      tag="Rodar PDF · 100% gratuito · sem upload"
      icon={<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>}
      titulo={<>Endireite as páginas <span className="pdfjpg-titulo-hl">do seu PDF</span></>}
      sub={<>Gire o PDF inteiro em segundos e <strong>salve na orientação certa</strong>. Grátis, no seu navegador, sem marca d'água.</>}
      chips={['100% Gratuito', 'Sem upload', 'Rotação permanente', "Sem marca d'água"]}
      howSteps={HOW}
      benefits={BENEFITS}
      faqItems={FAQ}
      schema={{ name: 'Rodar PDF (girar páginas)', description: 'Gire as páginas de um PDF no navegador, sem upload e sem perda de qualidade.', featureList: ['100% gratuito, sem cadastro', 'Processamento local, sem upload', 'Giro de 90, 180 ou 270 graus', 'Rotação salva no arquivo', 'Sem marca d\'água'] }}
    >
      <div className="pdfjpg-main">
        {phase === 'idle' && (
          <ArquivoDrop accept=".pdf,application/pdf" onFiles={(f) => abrir(f[0])} titulo="Arraste o PDF aqui" sub="ou clique para selecionar o arquivo" hint="Apenas .pdf · sem limite de páginas" />
        )}

        {(phase === 'ready' || phase === 'processing') && (
          <>
            <div className="pdftools-fileline">
              <span className="pdftools-item-ico"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg></span>
              <span className="pdftools-item-name">{file?.name}<small>{pages} página{pages !== 1 ? 's' : ''}</small></span>
              <button className="btn btn-ghost" onClick={reset}>Trocar</button>
            </div>

            <div className="pdfjpg-opcoes">
              <div className="pdfjpg-opcoes-group" style={{ flexBasis: '100%' }}>
                <span className="pdfjpg-opcoes-label">Como girar</span>
                <div className="pdfjpg-dpi-row">
                  {ANGULOS.map((o) => (
                    <button key={o.v} type="button" className={`pdfjpg-dpi-btn${angulo === o.v ? ' pdfjpg-dpi-btn--ativo' : ''}`} onClick={() => setAngulo(o.v)}>
                      <strong>{o.l}</strong>
                      <span><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={o.d} /></svg></span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {phase === 'processing' ? (
              <div className="pdfjpg-progress-wrap">
                <div className="pdfjpg-progress-info"><span>Girando as páginas…</span></div>
                <div className="pdfjpg-progress-bar"><div className="pdfjpg-progress-fill pdfjpg-progress-fill--indet" /></div>
              </div>
            ) : (
              <div className="pdftools-bar">
                <button className="btn btn-gold" onClick={rodar}>Rodar PDF →</button>
              </div>
            )}
          </>
        )}

        {phase === 'done' && result && (
          <div className="pdftools-result">
            <div className="pdftools-result-info">
              <strong>PDF girado pronto</strong>
              <span>{pages} página{pages !== 1 ? 's' : ''} · {fmtSize(result.size)}</span>
            </div>
            <div className="pdftools-result-acts">
              <button className="btn btn-gold" onClick={baixar}>Baixar PDF</button>
              <button className="btn btn-ghost" onClick={reset}>Rodar outro</button>
            </div>
          </div>
        )}
      </div>
    </PdfToolShell>
  )
}
