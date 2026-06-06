import { useState, useEffect } from 'react'
import { IconHeart, IconShare } from './icons'
import {
  seedLikes, seedShares, jaCurtiu, lerEngajamento, alternarCurtida, registrarShare,
} from '../engajamento'
import ShareModal from './ShareModal'

// Barra de curtir + compartilhar com contadores reais e persistentes.
// variante: 'card' (compacto, sobre a foto) | 'detalhe' (em linha, na página do imóvel)
export default function Engajamento({ im, variante = 'card' }) {
  const cod = im.codigo
  const [likes, setLikes] = useState(() => seedLikes(cod))
  const [shares, setShares] = useState(() => seedShares(cod))
  const [curtido, setCurtido] = useState(() => jaCurtiu(cod))
  const [pulso, setPulso] = useState(false)
  const [aberto, setAberto] = useState(false)

  // busca os números reais (compartilhados entre visitantes) quando disponíveis
  useEffect(() => {
    let vivo = true
    lerEngajamento(cod).then((d) => {
      if (!vivo || !d) return
      setLikes(d.likes)
      setShares(d.shares)
    })
    return () => { vivo = false }
  }, [cod])

  const onCurtir = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const novo = !curtido
    setCurtido(novo)
    setLikes((l) => Math.max(0, l + (novo ? 1 : -1)))
    if (novo) { setPulso(true); setTimeout(() => setPulso(false), 450) }
    alternarCurtida(cod, novo).then((d) => {
      if (d) { setLikes(d.likes); setShares(d.shares) }
    })
  }

  const onCompartilhar = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setAberto(true)
  }

  // disparado quando o visitante efetivamente compartilha (WhatsApp / copiar / nativo)
  const aoCompartilhar = () => {
    setShares((s) => s + 1)
    registrarShare(cod).then((d) => {
      if (d) { setLikes(d.likes); setShares(d.shares) }
    })
  }

  return (
    <>
      <div className={`engaj engaj--${variante}`} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={`engaj-btn engaj-like${curtido ? ' is-on' : ''}${pulso ? ' is-pulso' : ''}`}
          onClick={onCurtir}
          aria-pressed={curtido}
          aria-label={curtido ? 'Remover curtida' : 'Curtir este imóvel'}
          title={curtido ? 'Você curtiu' : 'Curtir'}
        >
          <IconHeart filled={curtido} width={18} height={18} />
          <span>{likes}</span>
        </button>
        <button
          type="button"
          className="engaj-btn engaj-share"
          onClick={onCompartilhar}
          aria-label="Compartilhar este imóvel"
          title="Compartilhar"
        >
          <IconShare width={18} height={18} />
          <span>{shares}</span>
        </button>
      </div>
      {aberto && <ShareModal im={im} onClose={() => setAberto(false)} onShared={aoCompartilhar} />}
    </>
  )
}
