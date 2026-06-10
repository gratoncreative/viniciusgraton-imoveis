import { useState, useEffect, useRef } from 'react'

// Ouvir o artigo (acessibilidade) — usa a síntese de voz do navegador (grátis, pt-BR).
const limpa = (t) => String(t || '').replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

function textoDoPost(p) {
  const partes = [p.titulo, p.resumo]
  for (const b of (p.conteudo || [])) {
    if (b.txt) partes.push(limpa(b.txt))
    if (b.itens) partes.push(b.itens.map(limpa).join('. '))
    if (b.linhas) b.linhas.forEach((ln) => partes.push(ln.map(limpa).join(', ')))
    if (b.perguntas) b.perguntas.forEach((q) => partes.push(limpa(q.q) + '. ' + limpa(q.a)))
  }
  return partes.filter(Boolean).join('. ')
}

export default function OuvirPost({ post }) {
  const [estado, setEstado] = useState('parado') // parado | tocando | pausado
  const [ok, setOk] = useState(true)
  const uttRef = useRef(null)

  useEffect(() => {
    setOk(typeof window !== 'undefined' && 'speechSynthesis' in window)
    return () => { try { window.speechSynthesis.cancel() } catch { /* ok */ } }
  }, [])
  useEffect(() => { try { window.speechSynthesis.cancel() } catch { /* ok */ } setEstado('parado') }, [post?.slug])

  const tocar = () => {
    const synth = window.speechSynthesis
    if (estado === 'tocando') { synth.pause(); setEstado('pausado'); return }
    if (estado === 'pausado') { synth.resume(); setEstado('tocando'); return }
    synth.cancel()
    const u = new SpeechSynthesisUtterance(textoDoPost(post))
    u.lang = 'pt-BR'; u.rate = 1; u.pitch = 1
    const vs = synth.getVoices() || []
    const voz = vs.find((v) => /pt[-_]?BR/i.test(v.lang)) || vs.find((v) => /^pt/i.test(v.lang))
    if (voz) u.voice = voz
    u.onend = () => setEstado('parado'); u.onerror = () => setEstado('parado')
    uttRef.current = u; synth.speak(u); setEstado('tocando')
  }
  const parar = () => { try { window.speechSynthesis.cancel() } catch { /* ok */ } setEstado('parado') }

  if (!ok) return null
  return (
    <div className="ouvir-post">
      <button type="button" className="ouvir-btn" onClick={tocar} aria-label="Ouvir o artigo">
        {estado === 'tocando' ? '⏸ Pausar leitura' : estado === 'pausado' ? '▶ Continuar' : '🔊 Ouvir este artigo'}
      </button>
      {estado !== 'parado' && <button type="button" className="ouvir-btn ouvir-btn--mini" onClick={parar} aria-label="Parar">⏹</button>}
    </div>
  )
}
