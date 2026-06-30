import { useState, useCallback } from 'react'
import PdfToolShell from '../components/PdfToolShell'
import ArquivoDrop from '../components/ArquivoDrop'

const POSICOES = [
  { v: 'bottom-center', l: 'Rodapé centro' },
  { v: 'bottom-right', l: 'Rodapé direita' },
  { v: 'bottom-left', l: 'Rodapé esquerda' },
  { v: 'top-right', l: 'Topo direita' },
]
const FORMATOS = [
  { v: 'n', l: '1', ex: '1' },
  { v: 'n_de_N', l: '1 de N', ex: '1 de 12' },
  { v: 'pagina_n', l: 'Página 1', ex: 'Página 1' },
]

const FAQ = [
  { q: 'É gratuito numerar as páginas?', a: 'Sim, 100% gratuito e ilimitado, sem cadastro e sem marca d\'água.' },
  { q: 'O arquivo vai para algum servidor?', a: 'Não. A numeração é feita no seu navegador, o arquivo não sai do seu dispositivo.' },
  { q: 'Posso escolher onde os números aparecem?', a: 'Sim. Você escolhe o canto (rodapé ou topo, centro, direita ou esquerda) e o formato.' },
  { q: 'Dá para começar de um número diferente de 1?', a: 'No momento a numeração começa em 1 e segue a ordem das páginas do arquivo.' },
  { q: 'A qualidade é mantida?', a: 'Sim. Apenas o número é desenhado em cada página; o conteúdo original é preservado.' },
]
const HOW = [
  { t: 'Abra o PDF', d: 'Arraste ou selecione o documento que precisa numerar.' },
  { t: 'Escolha posição e formato', d: 'Defina onde os números ficam e como aparecem (1, 1 de N, ou Página 1).' },
  { t: 'Baixe numerado', d: 'Baixe o PDF com todas as páginas numeradas.' },
]
const BENEFITS = [
  { ico: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', t: 'Privacidade total', d: 'O arquivo não sai do seu dispositivo. Zero upload.' },
  { ico: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z', t: '100% gratuito', d: 'Sem assinatura, sem limite e sem marca d\'água.' },
  { ico: 'M4 6h16M4 12h16M4 18h10', t: 'Você escolhe o estilo', d: 'Canto, formato e tamanho do número do seu jeito.' },
  { ico: 'M20 6 9 17l-5-5', t: 'Sem perda', d: 'Mantém o conteúdo e a qualidade original.' },
]

export default function NumerosPaginaPage() {
  const [file, setFile] = useState(null)
  const [pages, setPages] = useState(0)
  const [posicao, setPosicao] = useState('bottom-center')
  const [formato, setFormato] = useState('n')
  const [tamanho, setTamanho] = useState(11)
  const [phase, setPhase] = useState('idle')
  const [result, setResult] = useState(null)

  const abrir = useCallback(async (f) => {
    if (!f || (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name))) return
    try {
      const { PDFDocument } = await import('pdf-lib')
      const doc = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true })
      setFile(f); setPages(doc.getPageCount()); setResult(null); setPhase('ready')
    } catch (e) { console.error(e); alert('Não consegui ler o PDF. Pode estar protegido por senha.') }
  }, [])

  const numerar = useCallback(async () => {
    if (!file) return
    setPhase('processing'); setResult(null)
    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib')
      const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })
      const font = await doc.embedFont(StandardFonts.Helvetica)
      const total = doc.getPageCount()
      const margin = 26
      doc.getPages().forEach((p, i) => {
        const { width, height } = p.getSize()
        const n = i + 1
        const txt = formato === 'n_de_N' ? `${n} de ${total}` : formato === 'pagina_n' ? `Página ${n}` : `${n}`
        const tw = font.widthOfTextAtSize(txt, tamanho)
        const y = posicao.startsWith('top') ? height - margin - tamanho : margin
        let x
        if (posicao.endsWith('left')) x = margin
        else if (posicao.endsWith('right')) x = width - margin - tw
        else x = width / 2 - tw / 2
        p.drawText(txt, { x, y, size: tamanho, font, color: rgb(0.11, 0.16, 0.27) })
      })
      const bytes = await doc.save()
      const blob = new Blob([bytes], { type: 'application/pdf' })
      setResult({ url: URL.createObjectURL(blob), size: blob.size })
      setPhase('done')
    } catch (e) { console.error(e); alert('Erro ao numerar o PDF.'); setPhase('ready') }
  }, [file, posicao, formato, tamanho])

  const baixar = () => { const a = document.createElement('a'); a.href = result.url; a.download = (file?.name || 'arquivo').replace(/\.pdf$/i, '') + '-numerado.pdf'; a.click() }
  const reset = () => { setFile(null); setPages(0); setResult(null); setPhase('idle') }
  const fmtSize = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

  return (
    <PdfToolShell
      currentSlug="numeros-pagina"
      seo={{
        title: 'Números de Página no PDF Grátis: Numerar Páginas, Sem Upload',
        description: 'Adicione números de página a um PDF de graça e sem cadastro. Escolha a posição e o formato (1, 1 de N, Página 1). Processamento 100% no navegador, seu arquivo não sai do dispositivo.',
        path: '/ferramentas/numeros-pagina',
      }}
      tag="Números de página · 100% gratuito · sem upload"
      icon={<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><text x="9" y="19" fontSize="7" fill="currentColor" stroke="none">12</text></svg>}
      titulo={<>Numere as <span className="pdfjpg-titulo-hl">páginas do PDF</span></>}
      sub={<>Adicione a numeração no canto que preferir, no formato que precisar. Grátis, no seu navegador, sem upload.</>}
      chips={['100% Gratuito', 'Sem upload', 'Posição e formato', "Sem marca d'água"]}
      howSteps={HOW}
      benefits={BENEFITS}
      faqItems={FAQ}
      schema={{ name: 'Números de página no PDF', description: 'Adicione numeração às páginas de um PDF, no navegador, sem upload.', featureList: ['100% gratuito, sem cadastro', 'Processamento local, sem upload', 'Posição configurável', 'Formatos 1, 1 de N e Página 1', 'Sem marca d\'água'] }}
    >
      <div className="pdfjpg-main">
        {phase === 'idle' && (
          <ArquivoDrop accept=".pdf,application/pdf" onFiles={(f) => abrir(f[0])} titulo="Arraste o PDF aqui" sub="ou clique para selecionar o arquivo" hint="Apenas .pdf" />
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
                <span className="pdfjpg-opcoes-label">Posição</span>
                <div className="pdfjpg-dpi-row">
                  {POSICOES.map((o) => (
                    <button key={o.v} type="button" className={`pdfjpg-dpi-btn${posicao === o.v ? ' pdfjpg-dpi-btn--ativo' : ''}`} onClick={() => setPosicao(o.v)}><strong>{o.l}</strong></button>
                  ))}
                </div>
              </div>
              <div className="pdfjpg-opcoes-group">
                <span className="pdfjpg-opcoes-label">Formato</span>
                <div className="pdfjpg-dpi-row">
                  {FORMATOS.map((o) => (
                    <button key={o.v} type="button" className={`pdfjpg-dpi-btn${formato === o.v ? ' pdfjpg-dpi-btn--ativo' : ''}`} onClick={() => setFormato(o.v)}><strong>{o.l}</strong><span>{o.ex}</span></button>
                  ))}
                </div>
              </div>
              <div className="pdfjpg-opcoes-group" style={{ flexBasis: '100%' }}>
                <span className="pdfjpg-opcoes-label">Tamanho: <b>{tamanho}px</b></span>
                <input type="range" min="8" max="18" step="1" value={tamanho} onChange={(e) => setTamanho(+e.target.value)} className="pdfjpg-range" />
              </div>
            </div>

            {phase === 'processing' ? (
              <div className="pdfjpg-progress-wrap">
                <div className="pdfjpg-progress-info"><span>Numerando as páginas…</span></div>
                <div className="pdfjpg-progress-bar"><div className="pdfjpg-progress-fill pdfjpg-progress-fill--indet" /></div>
              </div>
            ) : (
              <div className="pdftools-bar">
                <button className="btn btn-gold" onClick={numerar}>Numerar páginas →</button>
              </div>
            )}
          </>
        )}

        {phase === 'done' && result && (
          <div className="pdftools-result">
            <div className="pdftools-result-info">
              <strong>PDF numerado pronto</strong>
              <span>{pages} página{pages !== 1 ? 's' : ''} · {fmtSize(result.size)}</span>
            </div>
            <div className="pdftools-result-acts">
              <button className="btn btn-gold" onClick={baixar}>Baixar PDF</button>
              <button className="btn btn-ghost" onClick={() => setPhase('ready')}>Ajustar</button>
              <button className="btn btn-ghost" onClick={reset}>Novo PDF</button>
            </div>
          </div>
        )}
      </div>
    </PdfToolShell>
  )
}
