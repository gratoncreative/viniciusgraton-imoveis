import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useSEO } from '../useSEO'
import { linkWhatsApp } from '../data'
import { IconArrow, IconWhats } from '../components/icons'
import { importRetry } from '../lazyRetry'
import '../styles/converter.css'
import '../styles/catalogo.css'

// comprime a imagem no navegador p/ enviar à IA (mantém legível p/ ler acabamentos)
function comprimir(file) {
  return new Promise((ok, falha) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const esc = Math.min(1, 1600 / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * esc)), h = Math.max(1, Math.round(img.height * esc))
      const c = document.createElement('canvas'); c.width = w; c.height = h
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
      ok(c.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => { URL.revokeObjectURL(url); falha(new Error('não consegui ler a imagem')) }
    img.src = url
  })
}

let _seq = 0

export default function LevantamentoFotos() {
  useSEO({
    title: 'Levantamento técnico de fotos por IA - acabamentos do imóvel',
    description: 'Envie as fotos do imóvel e a IA descreve cada uma: piso, revestimento, bancada/pedra, teto, esquadrias e estado de conservação. Baixe as fotos com a descrição. Ferramenta gratuita do Vinícius Graton.',
    path: '/ferramentas/levantamento-fotos',
  })

  const [itens, setItens] = useState([])
  const [rodando, setRodando] = useState(false)
  const [baixando, setBaixando] = useState(false)
  const [drag, setDrag] = useState(false)
  const inputRef = useRef(null)

  const patch = (id, campos) => setItens((prev) => prev.map((x) => (x.id === id ? { ...x, ...campos } : x)))

  const analisarUm = async (item) => {
    patch(item.id, { status: 'lendo' })
    try {
      const img = await comprimir(item.file)
      const r = await fetch('/api/analisar-foto', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ imagem: img }) })
      const j = await r.json()
      if (j.ok && j.resultado) patch(item.id, { status: 'ok', res: j.resultado })
      else patch(item.id, { status: 'erro', erro: j.msg || 'Não consegui ler essa foto.' })
    } catch { patch(item.id, { status: 'erro', erro: 'Falha de conexão. Tente de novo.' }) }
  }

  const processarFila = async (lista) => {
    if (!lista.length) return
    setRodando(true)
    const fila = [...lista]
    const worker = async () => { while (fila.length) { const it = fila.shift(); if (it) await analisarUm(it) } }
    await Promise.all(Array.from({ length: Math.min(3, fila.length) }, worker))
    setRodando(false)
  }

  const adicionar = (files) => {
    const novos = [...files].filter((f) => /^image\//.test(f.type)).map((f) => ({
      id: `f${++_seq}`, file: f, url: URL.createObjectURL(f), nome: f.name || `foto-${_seq}.jpg`, status: 'fila', res: null, erro: '',
    }))
    if (!novos.length) return
    setItens((prev) => [...prev, ...novos])
    processarFila(novos)
  }

  const onDrop = (e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files?.length) adicionar(e.dataTransfer.files) }
  const remover = (id) => setItens((prev) => prev.filter((x) => x.id !== id))
  const limpar = () => setItens([])

  const baixarLote = async () => {
    if (baixando || !itens.length) return
    setBaixando(true)
    try {
      const { default: JSZip } = await importRetry(() => import('jszip'))
      const zip = new JSZip()
      const L = ['LEVANTAMENTO TÉCNICO DAS FOTOS DO IMÓVEL', '']
      itens.forEach((it, k) => {
        const num = String(k + 1).padStart(2, '0')
        zip.file(`fotos/${num}-${it.nome}`, it.file)
        L.push(`FOTO ${num} - ${it.res?.ambiente || 'Ambiente não identificado'}`)
        if (it.res?.resumo) L.push(it.res.resumo)
        ;(it.res?.itens || []).forEach((i) => L.push(`  ${i.rotulo}: ${i.valor}`))
        if (it.res?.estado) L.push(`  Estado: ${it.res.estado}`)
        L.push('')
      })
      zip.file('levantamento.txt', L.join('\r\n'))
      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'levantamento-fotos.zip'
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch {}
    setBaixando(false)
  }

  const prontas = itens.filter((x) => x.status === 'ok').length

  return (
    <main className="pagina section--light det conv-pg">
      <div className="container">
        <div className="cat-head" style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 8px' }}>
          <span className="eyebrow" style={{ justifyContent: 'center' }}>Ferramenta gratuita</span>
          <h1 className="section-title">Levantamento técnico de <em>fotos</em></h1>
          <p className="section-sub" style={{ marginTop: 12 }}>
            Envie as fotos do imóvel e a IA <b>lê foto por foto</b> e descreve os acabamentos - <b>piso, revestimento, pedra/bancada, teto, esquadrias</b> e o estado de conservação. A descrição aparece no rodapé de cada foto, e você baixa tudo (individual ou em lote .zip).
          </p>
        </div>

        <div className="conv-painel" style={{ maxWidth: 980, margin: '0 auto' }}>
          <div className={`conv-drop ${drag ? 'on' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
            onClick={() => inputRef.current?.click()}>
            <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => { adicionar(e.target.files); e.target.value = '' }} />
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
            <b>Arraste as fotos do imóvel aqui ou clique pra escolher</b>
            <i>Pode mandar várias de uma vez · JPG · PNG · WEBP</i>
          </div>

          {itens.length > 0 && (
            <>
              <div className="conv-acoes" style={{ marginTop: 16, justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="painel-meta">{prontas}/{itens.length} foto(s) analisada(s){rodando ? ' · analisando…' : ''}</span>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button className="btn btn-gold" type="button" disabled={baixando || !prontas} onClick={baixarLote}>
                    {baixando ? 'Gerando .zip…' : '⬇ Baixar tudo (.zip + descrições)'}
                  </button>
                  <button className="conv-limpar" type="button" onClick={limpar}>Limpar</button>
                </div>
              </div>

              <div className="lev-grid">
                {itens.map((it) => (
                  <article className="lev-card" key={it.id}>
                    <div className="lev-card-img">
                      <img src={it.url} alt={it.res?.ambiente || it.nome} loading="lazy" />
                      {it.status === 'lendo' && <span className="lev-spin" aria-label="Analisando" />}
                      <a className="lev-baixar1" href={it.url} download={it.nome} title="Baixar esta foto" onClick={(e) => e.stopPropagation()}>⬇</a>
                      <button className="lev-rem" type="button" onClick={() => remover(it.id)} title="Remover" aria-label="Remover foto">×</button>
                    </div>
                    <div className="lev-card-body">
                      {it.status === 'ok' ? (
                        <>
                          <div className="lev-amb">{it.res.ambiente || 'Ambiente'} {it.res.estado && <span className="lev-estado">{it.res.estado}</span>}</div>
                          {it.res.resumo && <p className="lev-resumo">{it.res.resumo}</p>}
                          {(it.res.itens || []).length > 0 && (
                            <ul className="lev-itens">
                              {it.res.itens.map((i, n) => <li key={n}><b>{i.rotulo}:</b> {i.valor}</li>)}
                            </ul>
                          )}
                        </>
                      ) : it.status === 'erro' ? (
                        <p className="lev-erro">{it.erro}</p>
                      ) : (
                        <p className="lev-status">{it.status === 'lendo' ? 'Analisando os acabamentos…' : 'Na fila…'}</p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          <p className="conv-privacidade" style={{ marginTop: 18 }}>
            🔒 As fotos são usadas só pra essa leitura e não ficam salvas no servidor. A descrição é uma <b>análise de apoio</b> - confirme os materiais no imóvel.
          </p>
        </div>

        <div style={{ marginTop: 28, textAlign: 'center', display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link className="btn btn-ghost" to="/ferramentas">Outras ferramentas <IconArrow /></Link>
          <a className="btn btn-gold" href={linkWhatsApp('Olá Vinícius! Usei o levantamento de fotos no site e quero tirar uma dúvida.')} target="_blank" rel="noopener noreferrer"><IconWhats /> Falar pelo WhatsApp</a>
        </div>
      </div>
    </main>
  )
}
