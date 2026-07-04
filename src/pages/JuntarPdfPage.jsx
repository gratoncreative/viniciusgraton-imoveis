import { useState, useCallback } from 'react'
import PdfToolShell from '../components/PdfToolShell'
import ArquivoDrop from '../components/ArquivoDrop'
import { importRetry } from '../lazyRetry'

const FAQ = [
  { q: 'É gratuito juntar PDFs?', a: 'Sim, 100% gratuito e sem limite de arquivos ou páginas. Sem cadastro, sem plano pago e sem marca d\'água no resultado.' },
  { q: 'Meus PDFs são enviados para algum servidor?', a: 'Não. A junção acontece inteiramente no seu navegador. Os arquivos não saem do seu dispositivo, é privado por natureza.' },
  { q: 'A qualidade é mantida?', a: 'Sim. Diferente de ferramentas que transformam tudo em imagem, aqui as páginas são copiadas como estão, mantendo texto selecionável, qualidade e tamanho originais.' },
  { q: 'Posso escolher a ordem dos arquivos?', a: 'Sim. Depois de adicionar, use as setas para reordenar. A ordem da lista é a ordem das páginas no PDF final.' },
  { q: 'Quantos PDFs posso juntar de uma vez?', a: 'Quantos quiser. O limite é a memória do seu dispositivo, não uma regra nossa.' },
  { q: 'Funciona com PDF protegido por senha?', a: 'PDFs com senha de abertura não podem ser lidos. Remova a senha antes. PDFs apenas com restrição de edição costumam funcionar normalmente.' },
]
const HOW = [
  { t: 'Adicione os PDFs', d: 'Arraste vários arquivos PDF ou clique para selecionar. Pode adicionar mais a qualquer momento.' },
  { t: 'Coloque na ordem', d: 'Use as setas para reordenar os arquivos do jeito que o documento final deve ficar.' },
  { t: 'Baixe o PDF único', d: 'Clique em juntar e baixe um único PDF com todas as páginas, na ordem que você definiu.' },
]
const BENEFITS = [
  { ico: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', t: 'Privacidade total', d: 'Os arquivos não saem do seu dispositivo. Zero upload.' },
  { ico: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z', t: '100% gratuito', d: 'Sem assinatura, sem limite e sem marca d\'água.' },
  { ico: 'M20 6 9 17l-5-5', t: 'Sem perda de qualidade', d: 'Mantém o texto selecionável e a resolução original. Nada é rasterizado.' },
  { ico: 'M5 2h14v20l-7-4-7 4z', t: 'Você controla a ordem', d: 'Reordene os arquivos antes de juntar, do jeito certo.' },
]

let _id = 0

export default function JuntarPdfPage() {
  const [items, setItems] = useState([]) // { id, name, file, pages }
  const [phase, setPhase] = useState('idle')
  const [carregando, setCarregando] = useState(false)
  const [result, setResult] = useState(null)

  const addFiles = useCallback(async (files) => {
    const pdfs = files.filter((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name))
    if (!pdfs.length) return
    setCarregando(true)
    const { PDFDocument } = await importRetry(() => import('pdf-lib'))
    const novos = []
    for (const f of pdfs) {
      try {
        const bytes = await f.arrayBuffer()
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
        novos.push({ id: ++_id, name: f.name, file: f, pages: doc.getPageCount() })
      } catch (e) { console.error('falha ao ler PDF', f.name, e); alert(`Não consegui ler "${f.name}". Pode estar protegido por senha ou corrompido.`) }
    }
    setCarregando(false)
    if (novos.length) { setItems((prev) => [...prev, ...novos]); setResult(null) }
  }, [])

  const mover = (i, dir) => setItems((prev) => {
    const a = [...prev], j = i + dir
    if (j < 0 || j >= a.length) return prev
    ;[a[i], a[j]] = [a[j], a[i]]
    return a
  })
  const remover = (id) => setItems((prev) => prev.filter((x) => x.id !== id))
  const limpar = () => { setItems([]); setResult(null); setPhase('idle') }

  const juntar = useCallback(async () => {
    if (items.length < 1) return
    setPhase('processing'); setResult(null)
    try {
      const { PDFDocument } = await importRetry(() => import('pdf-lib'))
      const merged = await PDFDocument.create()
      for (const it of items) {
        const bytes = await it.file.arrayBuffer()
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true })
        const copiadas = await merged.copyPages(src, src.getPageIndices())
        copiadas.forEach((p) => merged.addPage(p))
      }
      const out = await merged.save()
      const blob = new Blob([out], { type: 'application/pdf' })
      setResult({ url: URL.createObjectURL(blob), size: blob.size, pages: merged.getPageCount() })
      setPhase('done')
    } catch (e) {
      console.error(e); alert('Erro ao juntar os PDFs.'); setPhase('idle')
    }
  }, [items])

  const baixar = () => { const a = document.createElement('a'); a.href = result.url; a.download = 'juntado.pdf'; a.click() }
  const fmtSize = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)
  const totalPaginas = items.reduce((s, it) => s + (it.pages || 0), 0)

  return (
    <PdfToolShell
      currentSlug="juntar-pdf"
      seo={{
        title: 'Juntar PDF Grátis: Unir Vários PDFs em Um Só, Sem Upload',
        description: 'Junte e una vários arquivos PDF em um único documento, de graça e sem cadastro. Reordene os arquivos, mantenha a qualidade original. Processamento 100% no navegador, seus arquivos não saem do dispositivo.',
        path: '/ferramentas/juntar-pdf',
      }}
      tag="Juntar PDF · 100% gratuito · sem upload"
      icon={<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" /></svg>}
      titulo={<>Vários PDFs viram <span className="pdfjpg-titulo-hl">um só</span></>}
      sub={<>Una quantos arquivos PDF quiser em um único documento, na ordem que precisar. <strong>Sem perder qualidade</strong>, grátis e sem marca d'água.</>}
      chips={['100% Gratuito', 'Sem upload', 'Sem perda de qualidade', "Sem marca d'água", 'Ordem livre']}
      howSteps={HOW}
      benefits={BENEFITS}
      faqItems={FAQ}
      schema={{ name: 'Juntar PDF (unir PDFs)', description: 'Una vários PDFs em um só, no navegador, sem upload e sem perda de qualidade.', featureList: ['100% gratuito, sem cadastro', 'Processamento local, sem upload', 'Mantém texto e qualidade originais', 'Reordenação dos arquivos', 'Sem limite de arquivos', 'Sem marca d\'água'] }}
    >
      <div className="pdfjpg-main">
        {items.length === 0 ? (
          <ArquivoDrop
            accept=".pdf,application/pdf"
            multiple
            onFiles={addFiles}
            titulo={carregando ? 'Lendo PDFs…' : 'Arraste os PDFs aqui'}
            sub="ou clique para selecionar os arquivos"
            hint="Vários arquivos .pdf · sem limite"
          />
        ) : (
          <>
            <div className="pdftools-list">
              {items.map((it, i) => (
                <div key={it.id} className="pdftools-item">
                  <span className="pdftools-item-num">{i + 1}</span>
                  <span className="pdftools-item-ico"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg></span>
                  <span className="pdftools-item-name">{it.name}<small>{it.pages} página{it.pages !== 1 ? 's' : ''}</small></span>
                  <div className="pdftools-item-acts">
                    <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Mover para cima">↑</button>
                    <button type="button" onClick={() => mover(i, 1)} disabled={i === items.length - 1} aria-label="Mover para baixo">↓</button>
                    <button type="button" onClick={() => remover(it.id)} aria-label="Remover" className="pdftools-item-del">✕</button>
                  </div>
                </div>
              ))}
            </div>

            {phase === 'processing' ? (
              <div className="pdfjpg-progress-wrap">
                <div className="pdfjpg-progress-info"><span>Juntando os PDFs…</span></div>
                <div className="pdfjpg-progress-bar"><div className="pdfjpg-progress-fill pdfjpg-progress-fill--indet" /></div>
              </div>
            ) : result ? (
              <div className="pdftools-result">
                <div className="pdftools-result-info">
                  <strong>PDF unido pronto</strong>
                  <span>{result.pages} páginas · {fmtSize(result.size)}</span>
                </div>
                <div className="pdftools-result-acts">
                  <button className="btn btn-gold" onClick={baixar}>Baixar PDF</button>
                  <button className="btn btn-ghost" onClick={limpar}>Juntar outros</button>
                </div>
              </div>
            ) : (
              <div className="pdftools-bar">
                <ArquivoDrop accept=".pdf,application/pdf" multiple onFiles={addFiles} titulo="+ Adicionar mais PDFs" sub="arraste ou clique" />
                <div className="pdftools-bar-acts">
                  <span className="pdftools-bar-tot">{items.length} arquivos · {totalPaginas} páginas</span>
                  <button className="btn btn-ghost" onClick={limpar}>Limpar tudo</button>
                  <button className="btn btn-gold" onClick={juntar} disabled={items.length < 1}>Juntar PDFs →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PdfToolShell>
  )
}
