import { useState } from 'react'
import { CONFIG } from '../data'
import { registrarLead } from '../engajamento'
import { IconWhats, IconArrow } from './icons'

// "Avise-me": o visitante deixa o que procura + WhatsApp; vira lead (KV) e
// abre a conversa com o Vinícius. Reaproveita o backend de leads (/api/eng).
export default function AviseMe({ contexto = '' }) {
  const [nome, setNome] = useState('')
  const [fone, setFone] = useState('')
  const [oque, setOque] = useState('')
  const [enviado, setEnviado] = useState(false)

  const enviar = (e) => {
    e.preventDefault()
    if (!nome.trim() || !fone.trim()) return
    const criterio = oque.trim() || contexto || 'imóveis novos'
    registrarLead({ cod: 'avise-me', nome: nome.trim(), fone: fone.trim(), bairro: criterio })
    setEnviado(true)
    const msg = `Olá Vinícius! Sou ${nome.trim()}. Quero ser avisado quando entrar um imóvel assim: ${criterio}. Meu WhatsApp é ${fone.trim()}.`
    window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener')
  }

  if (enviado) {
    return (
      <div className="aviseme aviseme--ok">
        <span className="aviseme-ico"><IconWhats width={26} height={26} /></span>
        <div>
          <h3>Combinado, {nome.trim().split(' ')[0]}!</h3>
          <p>Vou te avisar assim que entrar um imóvel com esse perfil. Já abri o WhatsApp pra gente se falar.</p>
        </div>
      </div>
    )
  }

  return (
    <form className="aviseme" onSubmit={enviar}>
      <div className="aviseme-txt">
        <span className="eyebrow">Avise-me</span>
        <h3>Não achou agora? Eu te aviso quando entrar.</h3>
        <p>Me diz o que você procura{contexto ? ` em ${contexto}` : ''} e deixe seu WhatsApp. Quando surgir algo com a sua cara, eu te chamo primeiro - sem spam.</p>
      </div>
      <div className="aviseme-form">
        <div className="aviseme-row">
          <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" aria-label="Seu nome" required />
          <input type="tel" value={fone} onChange={(e) => setFone(e.target.value)} placeholder="Seu WhatsApp (com DDD)" aria-label="Seu WhatsApp" inputMode="tel" required />
        </div>
        <input type="text" value={oque} onChange={(e) => setOque(e.target.value)} placeholder={contexto ? `Ex.: 3 quartos em ${contexto}` : 'O que você procura? (bairro, tipo, faixa de preço)'} aria-label="O que você procura" />
        <button type="submit" className="btn btn-gold aviseme-btn">
          <IconWhats /> Quero ser avisado <IconArrow />
        </button>
      </div>
    </form>
  )
}
