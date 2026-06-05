import { useState } from 'react'
import { Link } from 'react-router-dom'
import Reveal from './Reveal'
import { CONFIG, linkWhatsApp, WA } from '../data'
import { IconWhats, IconPhone, IconMail, IconPin, IconInsta, IconArrow } from './icons'

function fmtPhone(w) {
  const n = w.replace(/\D/g, '')
  const local = n.startsWith('55') ? n.slice(2) : n
  if (local.length < 10) return w
  const ddd = local.slice(0, 2)
  const rest = local.slice(2)
  return `(${ddd}) ${rest.slice(0, rest.length - 4)}-${rest.slice(-4)}`
}

const OBJETIVOS = ['Comprar pra morar', 'Investir', 'Meu primeiro imóvel', 'Vender / avaliar', 'Ainda estou pesquisando']

const encode = (data) =>
  Object.keys(data)
    .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(data[k]))
    .join('&')

export default function Contato() {
  const [form, setForm] = useState({ nome: '', telefone: '', objetivo: OBJETIVOS[0], detalhes: '' })
  const [enviado, setEnviado] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const enviar = (e) => {
    e.preventDefault()
    // 1) salva o lead no Netlify Forms (painel + e-mail). Em dev pode falhar — seguimos mesmo assim.
    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: encode({ 'form-name': 'contato', ...form }),
    }).catch(() => {})

    // 2) abre o WhatsApp já com a mensagem pronta
    const linhas = [
      `Olá Vinícius! Me chamo ${form.nome || '(sem nome)'}.`,
      `Objetivo: ${form.objetivo}.`,
      form.detalhes ? `Detalhes: ${form.detalhes}` : '',
      form.telefone ? `Meu telefone: ${form.telefone}` : '',
    ].filter(Boolean)
    window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(linhas.join('\n'))}`, '_blank', 'noopener')

    setEnviado(true)
  }

  return (
    <section id="contato">
      <div className="container">
        <Reveal>
          <div className="cta-wrap">
            <div className="cta-grid">
              <div>
                <span className="eyebrow">Vamos conversar</span>
                <h2>Pronto pra encontrar <span className="text-gold">o imóvel certo?</span></h2>
                <p>
                  Me conta o que você procura. Em poucos minutos eu já consigo direcionar as melhores
                  opções pra você, sem compromisso e sem enrolação.
                </p>

                <div className="contact-list">
                  <a className="contact-row" href={linkWhatsApp(WA.contato)} target="_blank" rel="noopener">
                    <span className="ci"><IconWhats width={20} height={20} /></span>
                    <span><b>WhatsApp</b><span>{fmtPhone(CONFIG.whatsapp)}</span></span>
                  </a>
                  <a className="contact-row" href={`mailto:${CONFIG.email}`}>
                    <span className="ci"><IconMail width={20} height={20} /></span>
                    <span><b>E-mail</b><span>{CONFIG.email}</span></span>
                  </a>
                  <a className="contact-row" href={CONFIG.instagram} target="_blank" rel="noopener">
                    <span className="ci"><IconInsta width={20} height={20} /></span>
                    <span><b>Instagram</b><span>@viniciusgraton.imoveis</span></span>
                  </a>
                  <div className="contact-row">
                    <span className="ci"><IconPin width={20} height={20} /></span>
                    <span><b>Atendimento</b><span>{CONFIG.cidade} e região</span></span>
                  </div>
                </div>
              </div>

              {enviado ? (
                <div className="lead-form lead-ok">
                  <span className="lead-ok-ico"><IconWhats width={30} height={30} /></span>
                  <h3>Recebido! 🎉</h3>
                  <p>Seu contato foi registrado e eu já abri o WhatsApp pra gente conversar. Se não abriu, é só me chamar direto.</p>
                  <a className="btn btn-gold" href={linkWhatsApp(WA.contato)} target="_blank" rel="noopener">
                    <IconWhats /> Falar no WhatsApp
                  </a>
                </div>
              ) : (
              <form
                className="lead-form"
                name="contato"
                method="POST"
                data-netlify="true"
                netlify-honeypot="bot-field"
                onSubmit={enviar}
              >
                <input type="hidden" name="form-name" value="contato" />
                <p hidden><label>Não preencha: <input name="bot-field" onChange={() => {}} /></label></p>
                <h3>Fale comigo agora</h3>
                <label>
                  <span>Seu nome</span>
                  <input type="text" name="nome" value={form.nome} onChange={set('nome')} placeholder="Como posso te chamar?" required />
                </label>
                <label>
                  <span>WhatsApp / telefone <i>(opcional)</i></span>
                  <input type="tel" name="telefone" value={form.telefone} onChange={set('telefone')} placeholder="(34) 9____-____" />
                </label>
                <label>
                  <span>O que você procura?</span>
                  <select name="objetivo" value={form.objetivo} onChange={set('objetivo')}>
                    {OBJETIVOS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </label>
                <label>
                  <span>Detalhes <i>(opcional)</i></span>
                  <textarea name="detalhes" rows="2" value={form.detalhes} onChange={set('detalhes')} placeholder="Bairro, faixa de valor, nº de quartos..." />
                </label>
                <label className="lead-consent">
                  <input type="checkbox" required />
                  <span>Concordo em ser contatado e com o tratamento dos meus dados conforme a <Link to="/privacidade" target="_blank">Política de Privacidade</Link>.</span>
                </label>
                <button type="submit" className="btn btn-gold lead-submit">
                  <IconWhats /> Quero falar com o Vinícius <IconArrow />
                </button>
                <p className="lead-note">Seu contato é registrado com segurança e você já fala comigo no WhatsApp. Sem spam.</p>
              </form>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
