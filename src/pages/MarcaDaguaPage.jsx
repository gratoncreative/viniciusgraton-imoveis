import { useState, useCallback } from 'react'
import PdfToolShell from '../components/PdfToolShell'
import ArquivoDrop from '../components/ArquivoDrop'
import { importRetry } from '../lazyRetry'
import '../styles/marca-dagua.css'

const CORES = [
  { v: 'cinza', l: 'Cinza', rgb: [0.5, 0.5, 0.5] },
  { v: 'navy', l: 'Azul-marinho', rgb: [0.11, 0.16, 0.27] },
  { v: 'vermelho', l: 'Vermelho', rgb: [0.92, 0.0, 0.16] },
]

const FAQ = [
  { q: 'É gratuito colocar marca d\'água no PDF?', a: 'Sim, 100% gratuito e ilimitado, sem cadastro e sem marca d\'água nossa por cima (só a sua).' },
  { q: 'O arquivo é enviado para algum servidor?', a: 'Não. A marca d\'água é aplicada no seu navegador, o arquivo não sai do seu dispositivo.' },
  { q: 'A marca aparece em todas as páginas?', a: 'Sim, o texto é aplicado em todas as páginas do documento.' },
  { q: 'Dá para deixar transparente?', a: 'Sim. Você controla a opacidade no controle deslizante, de bem suave a bem marcado.' },
  { q: 'Posso usar para proteger meu documento?', a: 'A marca d\'água ajuda a identificar a origem e desencorajar cópia. Para senha, use a ferramenta Proteger PDF (em breve).' },
]
const HOW = [
  { t: 'Abra o PDF', d: 'Arraste ou selecione o documento que quer marcar.' },
  { t: 'Escreva e ajuste', d: 'Digite o texto da marca, escolha o estilo (diagonal ou repetido), a cor, o tamanho e a opacidade.' },
  { t: 'Baixe marcado', d: 'Baixe o PDF com a marca d\'água aplicada em todas as páginas.' },
]
const BENEFITS = [
  { ico: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', t: 'Privacidade total', d: 'O arquivo não sai do seu dispositivo. Zero upload.' },
  { ico: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z', t: '100% gratuito', d: 'Sem assinatura, sem limite e sem cobrança.' },
  { ico: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z', t: 'Você controla', d: 'Texto, cor, tamanho, opacidade e estilo do seu jeito.' },
  { ico: 'M9 11l3 3 8-8M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11', t: 'Em todas as páginas', d: 'A marca é aplicada no documento inteiro de uma vez.' },
]

export default function MarcaDaguaPage() {
  const [file, setFile] = useState(null)
  const [pages, setPages] = useState(0)
  const [texto, setTexto] = useState('CONFIDENCIAL')
  const [estilo, setEstilo] = useState('diagonal') // diagonal | mosaico
  const [cor, setCor] = useState('cinza')
  const [tamanho, setTamanho] = useState(60)
  const [opacidade, setOpacidade] = useState(0.25)
  const [phase, setPhase] = useState('idle')
  const [result, setResult] = useState(null)

  const abrir = useCallback(async (f) => {
    if (!f || (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name))) return
    try {
      const { PDFDocument } = await importRetry(() => import('pdf-lib'))
      const doc = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true })
      setFile(f); setPages(doc.getPageCount()); setResult(null); setPhase('ready')
    } catch (e) { console.error(e); alert('Não consegui ler o PDF. Pode estar protegido por senha.') }
  }, [])

  const aplicar = useCallback(async () => {
    if (!file || !texto.trim()) return
    setPhase('processing'); setResult(null)
    try {
      const { PDFDocument, rgb, degrees, StandardFonts } = await importRetry(() => import('pdf-lib'))
      const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })
      const font = await doc.embedFont(StandardFonts.HelveticaBold)
      const c = (CORES.find((x) => x.v === cor) || CORES[0]).rgb
      const color = rgb(c[0], c[1], c[2])
      doc.getPages().forEach((p) => {
        const { width, height } = p.getSize()
        if (estilo === 'mosaico') {
          const fs = Math.max(14, tamanho * 0.5)
          const tw = font.widthOfTextAtSize(texto, fs)
          const stepX = tw + 70, stepY = 95
          for (let y = -20; y < height + stepY; y += stepY) {
            for (let x = -tw; x < width + stepX; x += stepX) {
              p.drawText(texto, { x, y, size: fs, font, color, opacity: opacidade * 0.85, rotate: degrees(35) })
            }
          }
        } else {
          const fs = tamanho
          const tw = font.widthOfTextAtSize(texto, fs)
          const ang = Math.PI / 4
          const dx = tw / 2, dy = fs * 0.35
          const ox = width / 2 - (Math.cos(ang) * dx - Math.sin(ang) * dy)
          const oy = height / 2 - (Math.sin(ang) * dx + Math.cos(ang) * dy)
          p.drawText(texto, { x: ox, y: oy, size: fs, font, color, opacity: opacidade, rotate: degrees(45) })
        }
      })
      const bytes = await doc.save()
      const blob = new Blob([bytes], { type: 'application/pdf' })
      setResult({ url: URL.createObjectURL(blob), size: blob.size })
      setPhase('done')
    } catch (e) { console.error(e); alert('Erro ao aplicar a marca d\'água.'); setPhase('ready') }
  }, [file, texto, estilo, cor, tamanho, opacidade])

  const baixar = () => { const a = document.createElement('a'); a.href = result.url; a.download = (file?.name || 'arquivo').replace(/\.pdf$/i, '') + '-marca.pdf'; a.click() }
  const reset = () => { setFile(null); setPages(0); setResult(null); setPhase('idle') }
  const fmtSize = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

  return (
    <PdfToolShell
      currentSlug="marca-dagua"
      seo={{
        title: 'Marca d\'água em PDF Grátis: Texto por Cima do PDF, Sem Upload',
        description: 'Coloque marca d\'água de texto em todas as páginas de um PDF, de graça e sem cadastro. Escolha cor, tamanho, opacidade e estilo. Processamento 100% no navegador, sem upload.',
        path: '/ferramentas/marca-dagua',
      }}
      tag="Marca d'água · 100% gratuito · sem upload"
      icon={<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>}
      titulo={<>Marca d'água <span className="pdfjpg-titulo-hl">no seu PDF</span></>}
      sub={<>Carimbe um texto em todas as páginas, com a cor e a transparência que quiser. Grátis, no seu navegador, sem upload.</>}
      chips={['100% Gratuito', 'Sem upload', 'Todas as páginas', 'Opacidade ajustável']}
      howSteps={HOW}
      benefits={BENEFITS}
      faqItems={FAQ}
      schema={{ name: 'Marca d\'água em PDF', description: 'Aplique marca d\'água de texto em um PDF, no navegador, sem upload.', featureList: ['100% gratuito, sem cadastro', 'Processamento local, sem upload', 'Cor, tamanho e opacidade ajustáveis', 'Estilo diagonal ou repetido', 'Em todas as páginas'] }}
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
                <span className="pdfjpg-opcoes-label">Texto da marca</span>
                <input type="text" className="pdfjpg-range-input" style={{ width: '100%', maxWidth: 360 }} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="ex.: CONFIDENCIAL" maxLength={40} />
              </div>
              <div className="pdfjpg-opcoes-group">
                <span className="pdfjpg-opcoes-label">Estilo</span>
                <div className="pdfjpg-dpi-row">
                  {[{ v: 'diagonal', l: 'Diagonal', s: 'centro, inclinado' }, { v: 'mosaico', l: 'Repetido', s: 'cobre a página' }].map((o) => (
                    <button key={o.v} type="button" className={`pdfjpg-dpi-btn${estilo === o.v ? ' pdfjpg-dpi-btn--ativo' : ''}`} onClick={() => setEstilo(o.v)}><strong>{o.l}</strong><span>{o.s}</span></button>
                  ))}
                </div>
              </div>
              <div className="pdfjpg-opcoes-group">
                <span className="pdfjpg-opcoes-label">Cor</span>
                <div className="pdfjpg-dpi-row">
                  {CORES.map((o) => (
                    <button key={o.v} type="button" className={`pdfjpg-dpi-btn${cor === o.v ? ' pdfjpg-dpi-btn--ativo' : ''}`} onClick={() => setCor(o.v)}><strong>{o.l}</strong></button>
                  ))}
                </div>
              </div>
              <div className="pdfjpg-opcoes-group" style={{ flexBasis: '100%' }}>
                <span className="pdfjpg-opcoes-label">Tamanho: <b>{tamanho}px</b></span>
                <input type="range" min="24" max="120" step="2" value={tamanho} onChange={(e) => setTamanho(+e.target.value)} className="pdfjpg-range" />
              </div>
              <div className="pdfjpg-opcoes-group" style={{ flexBasis: '100%' }}>
                <span className="pdfjpg-opcoes-label">Opacidade: <b>{Math.round(opacidade * 100)}%</b></span>
                <input type="range" min="0.05" max="0.8" step="0.05" value={opacidade} onChange={(e) => setOpacidade(+e.target.value)} className="pdfjpg-range" />
                <div className="pdfjpg-range-tips"><span>bem suave</span><span>bem marcado</span></div>
              </div>
            </div>

            {phase === 'processing' ? (
              <div className="pdfjpg-progress-wrap">
                <div className="pdfjpg-progress-info"><span>Aplicando a marca d'água…</span></div>
                <div className="pdfjpg-progress-bar"><div className="pdfjpg-progress-fill pdfjpg-progress-fill--indet" /></div>
              </div>
            ) : (
              <div className="pdftools-bar">
                <button className="btn btn-gold" onClick={aplicar} disabled={!texto.trim()}>Aplicar marca d'água →</button>
              </div>
            )}
          </>
        )}

        {phase === 'done' && result && (
          <div className="pdftools-result">
            <div className="pdftools-result-info">
              <strong>PDF com marca d'água pronto</strong>
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
