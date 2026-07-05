import { useState, useEffect, useRef } from 'react'
import { salvarConta, estaLogado } from '../conta'
import { registrarLead } from '../engajamento'
import { linkWhatsApp } from '../data'
import { IconWhats } from './icons'

const soNum = (s) => String(s || '').replace(/\D/g, '')
// valida celular brasileiro: 11 dígitos, DDD 11–99, 9º dígito = 9 (móvel)
const foneValido = (s) => { const d = soNum(s); return d.length === 11 && +d.slice(0, 2) >= 11 && d[2] === '9' }
const emailValido = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s).trim())
const mascaraFone = (s) => {
  const d = soNum(s).slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

// Modal de cadastro rápido — abre via evento global 'vg-abrir-cadastro'.
// Ao cadastrar, salvarConta dispara 'vg-conta' e TODOS os preços do site são liberados de uma vez.
export default function CadastroGate() {
  const [aberto, setAberto] = useState(false)
  const [pronto, setPronto] = useState(false)
  const [f, setF] = useState({ nome: '', fone: '', email: '' })
  const [erro, setErro] = useState('')
  const nomeRef = useRef(null)

  useEffect(() => {
    const abrir = () => {
      if (estaLogado()) return
      setErro(''); setPronto(false); setAberto(true)
    }
    window.addEventListener('vg-abrir-cadastro', abrir)
    return () => window.removeEventListener('vg-abrir-cadastro', abrir)
  }, [])

  useEffect(() => {
    if (!aberto) return
    const onKey = (e) => { if (e.key === 'Escape') setAberto(false) }
    document.addEventListener('keydown', onKey)
    const t = setTimeout(() => nomeRef.current && nomeRef.current.focus(), 80)
    return () => { document.removeEventListener('keydown', onKey); clearTimeout(t) }
  }, [aberto])

  if (!aberto) return null

  const enviar = (e) => {
    e.preventDefault()
    const nome = f.nome.trim()
    if (nome.length < 2) { setErro('Como posso te chamar?'); return }
    if (!foneValido(f.fone)) { setErro('Digite um WhatsApp válido - DDD + 9 dígitos. Ex.: (34) 99999-9999'); return }
    if (f.email.trim() && !emailValido(f.email)) { setErro('Esse e-mail parece incompleto. Confira ou deixe em branco.'); return }
    salvarConta({ nome, fone: f.fone.trim(), email: f.email.trim(), objetivo: 'Comprar' })
    try { registrarLead({ cod: 'ver-preco', nome, fone: f.fone.trim(), email: f.email.trim(), origem: 'Liberar preços' }) } catch {}
    setPronto(true)
  }

  return (
    <div className="cg-overlay" onClick={() => setAberto(false)} role="dialog" aria-modal="true" aria-label="Cadastro para ver os preços">
      <div className="cg-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="cg-x" onClick={() => setAberto(false)} aria-label="Fechar">×</button>

        {pronto ? (
          <div className="cg-ok">
            <div className="cg-ok-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            </div>
            <h3>Preços liberados!</h3>
            <p>Agora você vê o valor de todos os imóveis do site, agora e nas próximas visitas.</p>
            <a className="cg-btn cg-ok-wa" href={linkWhatsApp(`Oi Vinícius! Sou ${f.nome.trim() || 'um cliente'}, liberei os preços no seu site e quero começar a busca pelo meu imóvel.`)} target="_blank" rel="noopener noreferrer" onClick={() => setAberto(false)}>
              <IconWhats width={18} height={18} /> Confirmar meu WhatsApp e falar com o Vinícius
            </a>
            <button type="button" className="cg-ok-fechar" onClick={() => setAberto(false)}>Continuar vendo os imóveis</button>
            <p className="cg-nota" style={{ marginTop: 10 }}>A confirmação é opcional - seus preços já estão liberados. Falar comigo só agiliza a sua busca.</p>
          </div>
        ) : (
          <>
            <span className="cg-tag">Acesso liberado na hora</span>
            <h3 className="cg-titulo">Veja o preço de todos os imóveis</h3>
            <p className="cg-sub">Faça seu cadastro gratuito e os valores aparecem automaticamente em todo o site, agora e nas próximas visitas.</p>

            <form className="cg-form" onSubmit={enviar} noValidate>
              <label className="cg-campo">
                <span>Nome</span>
                <input ref={nomeRef} type="text" value={f.nome} placeholder="Seu nome"
                  onChange={(e) => setF({ ...f, nome: e.target.value })} autoComplete="name" />
              </label>
              <label className="cg-campo">
                <span>WhatsApp</span>
                <input type="tel" value={f.fone} placeholder="(34) 99999-9999" inputMode="numeric"
                  onChange={(e) => setF({ ...f, fone: mascaraFone(e.target.value) })} autoComplete="tel" />
              </label>
              <label className="cg-campo">
                <span>E-mail <em>(opcional)</em></span>
                <input type="email" value={f.email} placeholder="voce@email.com"
                  onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" />
              </label>

              {erro && <p className="cg-erro">{erro}</p>}

              <button type="submit" className="cg-btn">Liberar os preços</button>
              <p className="cg-nota">Sem custo. Seus dados ficam só com o Vinícius para te ajudar na busca - nunca compartilhados.</p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
