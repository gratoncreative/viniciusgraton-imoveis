import { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useSEO } from '../useSEO'

// Transcrição de vídeo/áudio (Whisper) — 100% no navegador via @huggingface/transformers.
// Vídeo/áudio do tour → texto, legenda e descrição. Nada sai do dispositivo.

const MODELO = 'onnx-community/whisper-base'
const FALLBACK = 'Xenova/whisper-base'

// decodifica o arquivo e reamostra para 16 kHz mono (formato que o Whisper espera)
async function arquivoParaAudio16k(file) {
  const buf = await file.arrayBuffer()
  const AC = window.AudioContext || window.webkitAudioContext
  const ctx = new AC()
  let decoded
  try { decoded = await ctx.decodeAudioData(buf) }
  finally { ctx.close?.() }
  const off = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000)
  const src = off.createBufferSource()
  src.buffer = decoded
  src.connect(off.destination)
  src.start()
  const rendered = await off.startRendering()
  return { audio: rendered.getChannelData(0), duracao: decoded.duration }
}

// rascunhos a partir do texto transcrito (sem IA de texto — limpeza e formatação)
function montarDescricao(txt) {
  const limpo = txt.trim().replace(/\s+/g, ' ')
  const frases = limpo.split(/(?<=[.!?])\s+/).filter(Boolean)
  return frases.slice(0, 5).join(' ')
}
function montarLegenda(txt) {
  const limpo = txt.trim().replace(/\s+/g, ' ')
  const corte = limpo.length > 220 ? limpo.slice(0, 217).replace(/\s+\S*$/, '') + '…' : limpo
  return `${corte}\n\n📍 Uberlândia · Fale com o Vinícius Graton, consultor da Rotina Imobiliária.\n#imoveisuberlandia #uberlandia #imovel #rotinaimobiliaria`
}

function icone(p) {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={p} /></svg>
}

export default function TranscreverPage() {
  useSEO({
    title: 'Transcrever Vídeo e Áudio em Texto — Grátis, no Navegador',
    description: 'Transforme tours em vídeo e áudios em texto, legenda e descrição de anúncio. Transcrição em português com IA, 100% no seu navegador — nada é enviado a servidor. Grátis.',
    path: '/ferramentas/transcrever',
  })

  const [fase, setFase] = useState('idle') // idle | carregando | decodificando | transcrevendo | pronto | erro
  const [prog, setProg] = useState(0)
  const [msg, setMsg] = useState('')
  const [texto, setTexto] = useState('')
  const [nome, setNome] = useState('')
  const [copiado, setCopiado] = useState('')
  const transcriberRef = useRef(null)
  const inputRef = useRef(null)

  const carregarModelo = useCallback(async () => {
    if (transcriberRef.current) return transcriberRef.current
    const { pipeline, env } = await import('@huggingface/transformers')
    env.allowLocalModels = false
    env.allowRemoteModels = true
    env.useBrowserCache = true
    const tarefa = 'automatic-speech-recognition'
    let t
    for (const mod of [MODELO, FALLBACK]) {
      try { t = await pipeline(tarefa, mod, { device: 'webgpu', progress_callback: cbProg }); break }
      catch { try { t = await pipeline(tarefa, mod, { progress_callback: cbProg }); break } catch { /* tenta o próximo */ } }
    }
    if (!t) throw new Error('Não foi possível carregar o modelo de transcrição.')
    transcriberRef.current = t
    return t
  }, [])

  const cbProg = (d) => {
    if (d?.status === 'progress' && d.total) setProg(Math.round((d.loaded / d.total) * 100))
  }

  const transcrever = useCallback(async (file) => {
    if (!file) return
    setNome(file.name.replace(/\.[^.]+$/, ''))
    setTexto(''); setProg(0)
    try {
      setFase('carregando'); setMsg('Baixando o modelo de IA (só na 1ª vez)…')
      const transcriber = await carregarModelo()

      setFase('decodificando'); setMsg('Extraindo o áudio do arquivo…')
      const { audio } = await arquivoParaAudio16k(file)

      setFase('transcrevendo'); setMsg('Transcrevendo em português…'); setProg(0)
      const out = await transcriber(audio, {
        language: 'portuguese', task: 'transcribe',
        chunk_length_s: 30, stride_length_s: 5,
      })
      setTexto((out?.text || '').trim())
      setFase('pronto'); setMsg('')
    } catch (e) {
      console.error(e)
      setMsg(e?.message?.includes('decodeAudio') || e?.name === 'EncodingError'
        ? 'Não consegui ler o áudio desse arquivo. Tente MP3/WAV/M4A, ou converta o vídeo para MP4.'
        : 'Erro ao transcrever. Tente um arquivo menor ou outro formato.')
      setFase('erro')
    }
  }, [carregarModelo])

  const onFile = (e) => { const f = e.target.files?.[0]; if (f) transcrever(f) }
  const copiar = async (chave, valor) => {
    try { await navigator.clipboard.writeText(valor); setCopiado(chave); setTimeout(() => setCopiado(''), 2000) } catch { /* noop */ }
  }
  const reset = () => { setFase('idle'); setTexto(''); setMsg(''); setProg(0); if (inputRef.current) inputRef.current.value = '' }

  const processando = fase === 'carregando' || fase === 'decodificando' || fase === 'transcrevendo'

  return (
    <main className="pagina pdfjpg-pg">
      <div className="pdfjpg-nav">
        <div className="container pdfjpg-nav-inner">
          <Link to="/ferramentas" className="pdfjpg-back">
            {icone('M19 12H5M12 19l-7-7 7-7')} Ferramentas
          </Link>
          <span className="pdfjpg-nav-tag">Transcrição · 100% no navegador · grátis</span>
        </div>
      </div>

      <div className="container pdfjpg-wrap">
        <div className="pdfjpg-header">
          <div className="pdfjpg-header-icon">{icone('M9 18V5l12-2v13M9 9l12-2M6 18a3 3 0 1 0 0 .01M18 16a3 3 0 1 0 0 .01')}</div>
          <div>
            <h1 className="pdfjpg-titulo">Transcreva seu <span className="pdfjpg-titulo-hl">tour em texto</span></h1>
            <p className="pdfjpg-sub">
              Suba o <strong>vídeo do tour</strong> ou um <strong>áudio</strong> e receba a transcrição em português, mais um rascunho de <strong>legenda</strong> e <strong>descrição</strong>. Tudo no seu navegador — nada é enviado a servidor. Ótimo para SEO local.
            </p>
          </div>
        </div>

        <div className="pdfjpg-main">
          {fase === 'idle' && (
            <div className="pdfjpg-drop" onClick={() => inputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}>
              <input ref={inputRef} type="file" accept="video/*,audio/*" onChange={onFile} style={{ display: 'none' }} />
              <div className="pdfjpg-drop-icon">{icone('M9 18V5l12-2v13M9 9l12-2')}</div>
              <p className="pdfjpg-drop-titulo">Selecionar vídeo ou áudio</p>
              <p className="pdfjpg-drop-sub">MP4, MOV, MP3, WAV, M4A…</p>
              <span className="pdfjpg-drop-hint">Processado no seu dispositivo · a 1ª vez baixa o modelo (~150 MB)</span>
            </div>
          )}

          {processando && (
            <div className="pdfjpg-progress-wrap">
              <div className="pdfjpg-progress-info">
                <span>{msg}</span>
                {(fase === 'carregando') && prog > 0 && <span className="pdfjpg-progress-pct">{prog}%</span>}
              </div>
              {(fase === 'carregando') && (
                <div className="pdfjpg-progress-bar"><div className="pdfjpg-progress-fill" style={{ width: `${prog}%` }} /></div>
              )}
              {fase === 'transcrevendo' && <div className="pdfjpg-progress-bar pdfjpg-progress-bar--indet"><div className="pdfjpg-progress-fill" /></div>}
              <p className="pdfjpg-progress-note">Vídeos longos levam mais tempo. Pode deixar a aba aberta.</p>
            </div>
          )}

          {fase === 'erro' && (
            <div className="pdfjpg-progress-wrap">
              <p className="pdfjpg-progress-note" style={{ color: 'var(--terracotta)' }}>{msg}</p>
              <button className="btn btn-ghost" onClick={reset} style={{ alignSelf: 'flex-start' }}>Tentar outro arquivo</button>
            </div>
          )}
        </div>

        {fase === 'pronto' && (
          <div className="transc-result">
            <Bloco titulo="Transcrição completa" valor={texto} chave="txt" copiado={copiado} onCopiar={copiar} />
            <Bloco titulo="Descrição para anúncio (rascunho)" valor={montarDescricao(texto)} chave="desc" copiado={copiado} onCopiar={copiar} />
            <Bloco titulo="Legenda para Reels / post (rascunho)" valor={montarLegenda(texto)} chave="leg" copiado={copiado} onCopiar={copiar} />
            <button className="btn btn-ghost" onClick={reset}>Transcrever outro arquivo</button>
          </div>
        )}

        <div className="pdfjpg-privacy">
          {icone('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z')}
          A transcrição é feita localmente no seu navegador (Whisper via @huggingface/transformers). O áudio não sai do seu dispositivo.
        </div>
      </div>
    </main>
  )
}

function Bloco({ titulo, valor, chave, copiado, onCopiar }) {
  if (!valor) return null
  return (
    <div className="transc-bloco">
      <div className="transc-bloco-head">
        <h3>{titulo}</h3>
        <button className="btn btn-ghost transc-copiar" onClick={() => onCopiar(chave, valor)}>
          {copiado === chave ? 'Copiado!' : 'Copiar'}
        </button>
      </div>
      <textarea className="transc-texto" value={valor} readOnly rows={Math.min(14, Math.max(3, Math.ceil(valor.length / 70)))} />
    </div>
  )
}
