import { useState } from 'react'
import { CONFIG } from '../data'
import { registrarLead } from '../engajamento'
import { formatBRL } from '../extenso'
import CampoMoeda from './CampoMoeda'
import { IconWhats, IconArrow } from './icons'

// Lead qualificado de condomínio: cliente diz o perfil (quartos, suítes, vagas,
// terreno/casa, orçamento) e o Vinícius faz a curadoria e o levantamento de
// terrenos/imóveis disponíveis no condomínio escolhido.
export default function CondominioLead({ condominio = '' }) {
  const [f, setF] = useState({ nome: '', fone: '', quartos: '', suites: '', vagas: '', perfil: '', orcamento: 0 })
  const [enviado, setEnviado] = useState(false)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const setOrcamento = (v) => setF((s) => ({ ...s, orcamento: v }))

  const enviar = (e) => {
    e.preventDefault()
    if (!f.nome.trim() || !f.fone.trim()) return
    const partes = [
      f.quartos && `${f.quartos} quartos`,
      f.suites && `${f.suites} suíte(s)`,
      f.vagas && `${f.vagas} vaga(s)`,
      f.perfil && f.perfil,
      f.orcamento > 0 && `orçamento de ${formatBRL(f.orcamento)}`,
    ].filter(Boolean)
    const perfilTxt = partes.length ? partes.join(', ') : 'meu perfil'
    const onde = condominio ? `no ${condominio}` : 'em um condomínio fechado de Uberlândia'
    registrarLead({ cod: `condominio:${condominio || 'geral'}`, nome: f.nome.trim(), fone: f.fone.trim(), bairro: `${condominio || 'condomínio'} — ${perfilTxt}` })
    setEnviado(true)
    const msg = `Olá Vinícius! Sou ${f.nome.trim()} e quero morar ${onde}. Procuro: ${perfilTxt}. Pode fazer a curadoria e o levantamento dos terrenos/imóveis disponíveis pra mim? Meu WhatsApp é ${f.fone.trim()}.`
    window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener')
  }

  if (enviado) {
    return (
      <div className="aviseme aviseme--ok condo-lead">
        <span className="aviseme-ico"><IconWhats width={26} height={26} /></span>
        <div>
          <h3>Perfeito, {f.nome.trim().split(' ')[0]}!</h3>
          <p>Já vou levantar os terrenos e imóveis disponíveis {condominio ? `no ${condominio}` : 'no perfil que você pediu'} e te chamo no WhatsApp com a curadoria.</p>
        </div>
      </div>
    )
  }

  return (
    <form className="aviseme condo-lead" onSubmit={enviar}>
      <div className="aviseme-txt">
        <span className="eyebrow">Quero morar aqui</span>
        <h3>{condominio ? `Tenho interesse no ${condominio}` : 'Quer morar em condomínio fechado?'}</h3>
        <p>Me conta o seu perfil que eu faço a curadoria e levanto os terrenos e imóveis disponíveis {condominio ? `no ${condominio}` : 'no condomínio ideal pra você'} — sem custo e sem compromisso.</p>
      </div>
      <div className="aviseme-form">
        <div className="aviseme-row">
          <input type="text" value={f.nome} onChange={set('nome')} placeholder="Seu nome" aria-label="Seu nome" required />
          <input type="tel" value={f.fone} onChange={set('fone')} placeholder="Seu WhatsApp (com DDD)" aria-label="Seu WhatsApp" inputMode="tel" required />
        </div>
        <div className="condo-lead-selects">
          <select value={f.quartos} onChange={set('quartos')} aria-label="Quartos">
            <option value="">Quartos</option>
            <option value="2+">2+ quartos</option>
            <option value="3+">3+ quartos</option>
            <option value="4+">4+ quartos</option>
          </select>
          <select value={f.suites} onChange={set('suites')} aria-label="Suítes">
            <option value="">Suítes</option>
            <option value="1+">1+ suíte</option>
            <option value="2+">2+ suítes</option>
            <option value="3+">3+ suítes</option>
          </select>
          <select value={f.vagas} onChange={set('vagas')} aria-label="Vagas de garagem">
            <option value="">Vagas</option>
            <option value="2+">2+ vagas</option>
            <option value="3+">3+ vagas</option>
            <option value="4+">4+ vagas</option>
          </select>
          <select value={f.perfil} onChange={set('perfil')} aria-label="Terreno ou casa">
            <option value="">Terreno ou casa?</option>
            <option value="terreno para construir">Terreno para construir</option>
            <option value="casa pronta">Casa pronta</option>
            <option value="tanto faz">Tanto faz</option>
          </select>
        </div>
        <CampoMoeda valor={f.orcamento} onChange={setOrcamento} placeholder="Orçamento aproximado (opcional)" />
        <button type="submit" className="btn btn-gold aviseme-btn">
          <IconWhats /> Quero a curadoria do Vinícius <IconArrow />
        </button>
      </div>
    </form>
  )
}
