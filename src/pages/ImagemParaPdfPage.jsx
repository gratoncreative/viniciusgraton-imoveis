import { useState, useCallback } from 'react'
import PdfToolShell from '../components/PdfToolShell'
import ArquivoDrop from '../components/ArquivoDrop'

const A4 = { w: 210, h: 297 } // mm
const pxToMm = (px) => (px * 25.4) / 96

const FAQ = [
  { q: 'É gratuito juntar imagens em um PDF?', a: 'Sim, 100% gratuito e ilimitado. Sem cadastro, sem plano pago, sem marca d\'água no PDF gerado.' },
  { q: 'Minhas fotos são enviadas para algum servidor?', a: 'Não. Tudo acontece dentro do seu navegador. As imagens não saem do seu dispositivo, então é privado e seguro por natureza.' },
  { q: 'Funciona com foto de iPhone (HEIC)?', a: 'Sim. Se você subir uma foto HEIC do iPhone, ela é convertida automaticamente no seu próprio aparelho antes de entrar no PDF.' },
  { q: 'Posso escolher a ordem das imagens?', a: 'Sim. Depois de adicionar, use as setas para reordenar cada imagem. A ordem da lista é a ordem das páginas no PDF.' },
  { q: 'Cada imagem vira uma página A4 ou do tamanho da foto?', a: 'Você escolhe. "A4" coloca cada imagem centralizada numa página A4 (ótimo para imprimir). "Tamanho da imagem" cria a página exatamente do tamanho da foto, sem bordas.' },
  { q: 'Quais formatos de imagem são aceitos?', a: 'JPG, PNG, WebP, GIF e HEIC (iPhone). Você pode misturar formatos diferentes no mesmo PDF.' },
]
const HOW = [
  { t: 'Adicione as imagens', d: 'Arraste suas fotos ou clique para selecionar. Pode adicionar várias de uma vez, em qualquer formato.' },
  { t: 'Ordene e ajuste', d: 'Coloque as imagens na ordem que quiser e escolha o tamanho da página, a orientação e a margem.' },
  { t: 'Baixe o PDF', d: 'Clique em gerar e baixe um único PDF com todas as imagens, pronto para enviar ou imprimir.' },
]
const BENEFITS = [
  { ico: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', t: 'Privacidade total', d: 'As fotos não saem do seu dispositivo. Zero upload, zero risco.' },
  { ico: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z', t: '100% gratuito', d: 'Sem assinatura, sem limite e sem marca d\'água. Sempre.' },
  { ico: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', t: 'Pronto para imprimir', d: 'Páginas A4 centralizadas, ideais para documentos e contratos.' },
  { ico: 'M5 2h14v20l-7-4-7 4z', t: 'Você controla a ordem', d: 'Reordene as imagens e defina exatamente como o PDF fica.' },
]

function carregarImagem(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}
// HEIC (iPhone) → JPEG, convertido no próprio navegador
async function normalizar(file) {
  const ehHeic = /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)
  if (!ehHeic) return file
  const heic2any = (await import('heic2any')).default
  const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 })
  const blob = Array.isArray(out) ? out[0] : out
  return new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' })
}

let _id = 0

export default function ImagemParaPdfPage() {
  const [items, setItems] = useState([])
  const [phase, setPhase] = useState('idle') // idle | processing | done
  const [tamanho, setTamanho] = useState('a4') // a4 | auto
  const [orientacao, setOrientacao] = useState('auto') // auto | retrato | paisagem
  const [margem, setMargem] = useState(10)
  const [qualidade, setQualidade] = useState(0.9)
  const [progress, setProgress] = useState(0)
  const [carregando, setCarregando] = useState(false)
  const [result, setResult] = useState(null) // { url, size }

  const addFiles = useCallback(async (files) => {
    const imgs = files.filter((f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(f.name))
    if (!imgs.length) return
    setCarregando(true)
    const novos = []
    for (const f of imgs) {
      try {
        const file = await normalizar(f)
        const url = URL.createObjectURL(file)
        const img = await carregarImagem(url)
        novos.push({ id: ++_id, url, name: f.name, w: img.naturalWidth, h: img.naturalHeight })
      } catch (e) { console.error('falha ao ler imagem', f.name, e) }
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
  const remover = (id) => setItems((prev) => {
    const it = prev.find((x) => x.id === id)
    if (it) URL.revokeObjectURL(it.url)
    return prev.filter((x) => x.id !== id)
  })
  const limpar = () => {
    items.forEach((it) => URL.revokeObjectURL(it.url))
    setItems([]); setResult(null); setPhase('idle')
  }

  const gerar = useCallback(async () => {
    if (!items.length) return
    setPhase('processing'); setProgress(0); setResult(null)
    try {
      const { jsPDF } = await import('jspdf')
      let doc
      for (let i = 0; i < items.length; i++) {
        const it = items[i]
        const canvas = document.createElement('canvas')
        canvas.width = it.w; canvas.height = it.h
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, it.w, it.h)
        const img = await carregarImagem(it.url)
        ctx.drawImage(img, 0, 0, it.w, it.h)
        const dataUrl = canvas.toDataURL('image/jpeg', qualidade)
        canvas.width = 0; canvas.height = 0

        let pageW, pageH, drawW, drawH, x, y
        if (tamanho === 'auto') {
          drawW = pxToMm(it.w); drawH = pxToMm(it.h)
          pageW = drawW + 2 * margem; pageH = drawH + 2 * margem
          x = margem; y = margem
        } else {
          const land = orientacao === 'auto' ? it.w >= it.h : orientacao === 'paisagem'
          pageW = land ? A4.h : A4.w
          pageH = land ? A4.w : A4.h
          const imgWmm = pxToMm(it.w), imgHmm = pxToMm(it.h)
          const ratio = Math.min((pageW - 2 * margem) / imgWmm, (pageH - 2 * margem) / imgHmm)
          drawW = imgWmm * ratio; drawH = imgHmm * ratio
          x = (pageW - drawW) / 2; y = (pageH - drawH) / 2
        }
        const ori = pageW >= pageH ? 'landscape' : 'portrait'
        if (i === 0) doc = new jsPDF({ orientation: ori, unit: 'mm', format: [pageW, pageH], compress: true })
        else doc.addPage([pageW, pageH], ori)
        doc.addImage(dataUrl, 'JPEG', x, y, drawW, drawH)
        setProgress(Math.round(((i + 1) / items.length) * 100))
        await new Promise((r) => setTimeout(r, 0))
      }
      const blob = doc.output('blob')
      setResult({ url: URL.createObjectURL(blob), size: blob.size })
      setPhase('done')
    } catch (e) {
      console.error(e); alert('Erro ao gerar o PDF. Tente com menos imagens ou imagens menores.'); setPhase('idle')
    }
  }, [items, tamanho, orientacao, margem, qualidade])

  const baixar = () => {
    const a = document.createElement('a')
    a.href = result.url; a.download = 'imagens.pdf'; a.click()
  }
  const fmtSize = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

  return (
    <PdfToolShell
      currentSlug="imagem-para-pdf"
      seo={{
        title: 'Imagem para PDF Grátis: JPG, PNG e foto do celular em PDF',
        description: 'Junte várias imagens (JPG, PNG, WebP e HEIC do iPhone) em um único PDF, de graça e sem cadastro. Reordene as páginas, escolha A4 ou tamanho da foto. Processamento 100% no navegador, sem upload.',
        path: '/ferramentas/imagem-para-pdf',
      }}
      tag="Imagem para PDF · 100% gratuito · sem upload"
      icon={<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>}
      titulo={<>Suas fotos viram <span className="pdfjpg-titulo-hl">um PDF</span> em segundos</>}
      sub={<>Junte <strong>JPG, PNG, WebP</strong> e até <strong>HEIC do iPhone</strong> em um único PDF, na ordem que quiser. Grátis, ilimitado e sem marca d'água.</>}
      chips={['100% Gratuito', 'Sem upload', 'Aceita HEIC', "Sem marca d'água", 'Reordena páginas']}
      howSteps={HOW}
      benefits={BENEFITS}
      faqItems={FAQ}
      schema={{ name: 'Conversor de Imagem para PDF', description: 'Junte imagens JPG, PNG, WebP e HEIC em um único PDF, no navegador, sem upload.', featureList: ['100% gratuito, sem cadastro', 'Processamento local, sem upload', 'Aceita JPG, PNG, WebP, GIF e HEIC', 'Reordenação de páginas', 'Página A4 ou do tamanho da imagem', 'Sem marca d\'água'] }}
    >
      <div className="pdfjpg-main">
        {items.length === 0 ? (
          <ArquivoDrop
            accept="image/*,.heic,.heif"
            multiple
            onFiles={addFiles}
            icon={<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>}
            titulo={carregando ? 'Lendo imagens…' : 'Arraste as imagens aqui'}
            sub="ou clique para selecionar as fotos"
            hint="JPG, PNG, WebP, GIF e HEIC · pode misturar formatos"
          />
        ) : (
          <>
            {/* opções */}
            <div className="pdfjpg-opcoes">
              <div className="pdfjpg-opcoes-group">
                <span className="pdfjpg-opcoes-label">Tamanho da página</span>
                <div className="pdfjpg-dpi-row">
                  {[{ v: 'a4', l: 'A4', s: 'imprimir / padrão' }, { v: 'auto', l: 'Tamanho da imagem', s: 'sem bordas' }].map((o) => (
                    <button key={o.v} type="button" className={`pdfjpg-dpi-btn${tamanho === o.v ? ' pdfjpg-dpi-btn--ativo' : ''}`} onClick={() => setTamanho(o.v)}>
                      <strong>{o.l}</strong><span>{o.s}</span>
                    </button>
                  ))}
                </div>
              </div>
              {tamanho === 'a4' && (
                <div className="pdfjpg-opcoes-group">
                  <span className="pdfjpg-opcoes-label">Orientação</span>
                  <div className="pdfjpg-dpi-row">
                    {[{ v: 'auto', l: 'Automática', s: 'pela foto' }, { v: 'retrato', l: 'Retrato', s: 'em pé' }, { v: 'paisagem', l: 'Paisagem', s: 'deitado' }].map((o) => (
                      <button key={o.v} type="button" className={`pdfjpg-dpi-btn${orientacao === o.v ? ' pdfjpg-dpi-btn--ativo' : ''}`} onClick={() => setOrientacao(o.v)}>
                        <strong>{o.l}</strong><span>{o.s}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="pdfjpg-opcoes-group" style={{ flexBasis: '100%' }}>
                <span className="pdfjpg-opcoes-label">Margem branca: <b>{margem} mm</b></span>
                <input type="range" min="0" max="25" step="1" value={margem} onChange={(e) => setMargem(+e.target.value)} className="pdfjpg-range" />
              </div>
              <div className="pdfjpg-opcoes-group" style={{ flexBasis: '100%' }}>
                <span className="pdfjpg-opcoes-label">Qualidade das imagens: <b>{Math.round(qualidade * 100)}%</b></span>
                <input type="range" min="0.5" max="1" step="0.05" value={qualidade} onChange={(e) => setQualidade(+e.target.value)} className="pdfjpg-range" />
                <div className="pdfjpg-range-tips"><span>menor arquivo</span><span>máxima qualidade</span></div>
              </div>
            </div>

            {/* lista reordenável */}
            <div className="pdftools-list">
              {items.map((it, i) => (
                <div key={it.id} className="pdftools-item">
                  <span className="pdftools-item-num">{i + 1}</span>
                  <img src={it.url} alt={it.name} className="pdftools-item-thumb" />
                  <span className="pdftools-item-name">{it.name}</span>
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
                <div className="pdfjpg-progress-info"><span>Montando o PDF…</span><span className="pdfjpg-progress-pct">{progress}%</span></div>
                <div className="pdfjpg-progress-bar"><div className="pdfjpg-progress-fill" style={{ width: `${progress}%` }} /></div>
              </div>
            ) : result ? (
              <div className="pdftools-result">
                <div className="pdftools-result-info">
                  <strong>PDF pronto</strong>
                  <span>{items.length} página{items.length !== 1 ? 's' : ''} · {fmtSize(result.size)}</span>
                </div>
                <div className="pdftools-result-acts">
                  <button className="btn btn-gold" onClick={baixar}>Baixar PDF</button>
                  <button className="btn btn-ghost" onClick={gerar}>Gerar de novo</button>
                </div>
              </div>
            ) : (
              <div className="pdftools-bar">
                <ArquivoDrop accept="image/*,.heic,.heif" multiple onFiles={addFiles} titulo="+ Adicionar mais imagens" sub="arraste ou clique" />
                <div className="pdftools-bar-acts">
                  <button className="btn btn-ghost" onClick={limpar}>Limpar tudo</button>
                  <button className="btn btn-gold" onClick={gerar} disabled={!items.length}>Gerar PDF ({items.length}) →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PdfToolShell>
  )
}
