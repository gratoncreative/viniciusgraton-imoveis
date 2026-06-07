import { useState } from 'react'
import { linkWhatsApp } from '../data'
import { IconWhats, IconArrow } from './icons'

const PERIODOS = ['Manhã', 'Tarde', 'Noite']

// Agendamento de visita com dia + período (reduz fricção vs. texto livre).
// Monta a mensagem e abre o WhatsApp do Vinícius já com os dados.
export default function AgendarVisita({ im }) {
  const [aberto, setAberto] = useState(false)
  const [data, setData] = useState('')
  const [periodo, setPeriodo] = useState('Manhã')
  const hoje = new Date().toISOString().slice(0, 10)

  const confirmar = () => {
    const dataFmt = data ? data.split('-').reverse().join('/') : 'a combinar'
    const msg = `Olá Vinícius! Quero agendar uma visita ao imóvel cód. ${im.codigo} (${im.tipo} no ${im.bairro}). Preferência: ${dataFmt}, período da ${periodo.toLowerCase()}.`
    window.open(linkWhatsApp(msg), '_blank', 'noopener')
  }

  return (
    <div className="agendar">
      <button type="button" className="btn btn-ghost det-visita" onClick={() => setAberto((a) => !a)} aria-expanded={aberto}>
        Agendar uma visita <IconArrow style={{ transform: aberto ? 'rotate(90deg)' : 'none', transition: 'transform .25s' }} />
      </button>
      {aberto && (
        <div className="agendar-painel">
          <div className="agendar-row">
            <label className="agendar-campo">
              <span>Melhor dia</span>
              <input type="date" min={hoje} value={data} onChange={(e) => setData(e.target.value)} />
            </label>
            <label className="agendar-campo">
              <span>Período</span>
              <select value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
                {PERIODOS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
          </div>
          <button type="button" className="btn btn-gold agendar-confirmar" onClick={confirmar}>
            <IconWhats /> Confirmar no WhatsApp
          </button>
          <p className="agendar-nota">Eu confirmo o horário com você pelo WhatsApp. Visita presencial ou por vídeo.</p>
        </div>
      )}
    </div>
  )
}
