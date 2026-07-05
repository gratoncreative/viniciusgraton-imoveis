import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CONFIG, formatPreco } from '../data'
import { registrarLead } from '../engajamento'
import { IconWhats, IconClose, IconLink, IconCheck, IconShare, IconFacebook, IconTelegram, IconInsta, IconTikTok } from './icons'
import '../styles/share.css'

// Modal de compartilhamento + captação de lead.
// Ao compartilhar (WhatsApp / copiar / nativo) dispara onShared (incrementa o contador).
// O formulário capta o lead (nome + WhatsApp) e abre a conversa direto com o Vinícius.
export default function ShareModal({ im, onClose, onShared }) {
  const [nome, setNome] = useState('')
  const [fone, setFone] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [legendaDe, setLegendaDe] = useState('')

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const url = `${window.location.origin}/imovel/${im.codigo}`
  const resumo = `${im.tipo} no ${im.bairro} - ${formatPreco(im.preco)}`
  const textoShare = `Olha esse imóvel que encontrei: ${resumo}. Veja: ${url}`

  const compartilharWhats = () => {
    onShared && onShared()
    window.open(`https://wa.me/?text=${encodeURIComponent(textoShare)}`, '_blank', 'noopener')
  }

  const compartilharNativo = async () => {
    if (!navigator.share) return compartilharWhats()
    try {
      await navigator.share({ title: resumo, text: `Olha esse imóvel: ${resumo}`, url })
      onShared && onShared()
    } catch { /* cancelado */ }
  }

  // redes com URL de compartilhamento que funciona pela web
  const abrirRede = (urlRede) => { onShared && onShared(); window.open(urlRede, '_blank', 'noopener') }
  const compartilharFacebook = () => abrirRede(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)
  const compartilharTelegram = () => abrirRede(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(resumo)}`)

  // Instagram e TikTok não aceitam link pré-preenchido pela web: copiamos a legenda
  // pronta (com o link) e abrimos o app — é só colar no story/post.
  const legenda = `${resumo}\n📍 ${im.bairro}, ${im.cidade} · Cód. ${im.codigo}\n${url}`
  const compartilharApp = (rede, appUrl) => {
    if (navigator.clipboard) navigator.clipboard.writeText(legenda).catch(() => {})
    setLegendaDe(rede)
    setTimeout(() => setLegendaDe(''), 3200)
    onShared && onShared()
    window.open(appUrl, '_blank', 'noopener')
  }

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      onShared && onShared()
      setTimeout(() => setCopiado(false), 2600)
    } catch { compartilharWhats() }
  }

  const enviarLead = (e) => {
    e.preventDefault()
    if (!nome.trim() || !fone.trim()) return
    registrarLead({ cod: im.codigo, nome: nome.trim(), fone: fone.trim(), bairro: im.bairro })
    setEnviado(true)
    const msg = `Olá Vinícius! Sou ${nome.trim()} e tenho interesse no imóvel cód. ${im.codigo} - ${resumo}. Meu WhatsApp é ${fone.trim()}. Pode me passar mais informações?`
    window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener')
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="modal-overlay modal-overlay--top"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="modal modal--share"
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Compartilhar imóvel"
        >
          <button className="modal-close" onClick={onClose} aria-label="Fechar"><IconClose width={22} height={22} /></button>

          <div className="modal-head">
            <span className="eyebrow"><IconShare width={15} height={15} /> Compartilhar</span>
            <h3>Mostre este imóvel pra quem importa</h3>
            <p>{resumo} · Cód. {im.codigo}</p>
          </div>

          <div className="share-opcoes">
            <button type="button" className="share-op share-op--whats" onClick={compartilharWhats}>
              <IconWhats width={22} height={22} />
              <span>Enviar no<br /><b>WhatsApp</b></span>
            </button>
            <button type="button" className="share-op share-op--insta" onClick={() => compartilharApp('insta', 'https://www.instagram.com/')}>
              {legendaDe === 'insta' ? <IconCheck width={22} height={22} /> : <IconInsta width={22} height={22} />}
              <span>{legendaDe === 'insta' ? 'Legenda copiada!' : <>Story/feed<br /><b>Instagram</b></>}</span>
            </button>
            <button type="button" className="share-op share-op--tiktok" onClick={() => compartilharApp('tiktok', 'https://www.tiktok.com/')}>
              {legendaDe === 'tiktok' ? <IconCheck width={22} height={22} /> : <IconTikTok width={22} height={22} />}
              <span>{legendaDe === 'tiktok' ? 'Legenda copiada!' : <>Postar no<br /><b>TikTok</b></>}</span>
            </button>
            <button type="button" className="share-op share-op--face" onClick={compartilharFacebook}>
              <IconFacebook width={22} height={22} />
              <span>Postar no<br /><b>Facebook</b></span>
            </button>
            <button type="button" className="share-op share-op--tg" onClick={compartilharTelegram}>
              <IconTelegram width={22} height={22} />
              <span>Enviar no<br /><b>Telegram</b></span>
            </button>
            <button type="button" className="share-op" onClick={copiarLink}>
              {copiado ? <IconCheck width={22} height={22} /> : <IconLink width={22} height={22} />}
              <span>{copiado ? 'Link copiado!' : <>Copiar<br /><b>o link</b></>}</span>
            </button>
            {typeof navigator !== 'undefined' && navigator.share && (
              <button type="button" className="share-op" onClick={compartilharNativo}>
                <IconShare width={22} height={22} />
                <span>Mais<br /><b>opções</b></span>
              </button>
            )}
          </div>
          {legendaDe && (
            <p className="share-dica-app">Legenda e link copiados - é só <b>colar</b> no seu {legendaDe === 'insta' ? 'story ou post do Instagram' : 'vídeo do TikTok'}. No celular, o botão <b>“Mais opções”</b> também abre o {legendaDe === 'insta' ? 'Instagram' : 'TikTok'} direto.</p>
          )}

          {!enviado ? (
            <form className="share-lead" onSubmit={enviarLead}>
              <p className="share-lead-titulo">Quer que eu te ajude com este imóvel?</p>
              <p className="share-lead-sub">Deixe seu nome e WhatsApp - eu te chamo com todos os detalhes, sem compromisso.</p>
              <div className="share-lead-row">
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                  aria-label="Seu nome"
                  required
                />
                <input
                  type="tel"
                  value={fone}
                  onChange={(e) => setFone(e.target.value)}
                  placeholder="Seu WhatsApp (com DDD)"
                  aria-label="Seu WhatsApp"
                  inputMode="tel"
                  required
                />
              </div>
              <button type="submit" className="btn btn-gold share-lead-btn">
                <IconWhats /> Quero falar com o Vinícius
              </button>
              <p className="share-lead-nota">Seus dados vão direto pro Vinícius. Sem spam.</p>
            </form>
          ) : (
            <div className="share-ok">
              <span className="share-ok-ico"><IconCheck width={26} height={26} /></span>
              <p><b>Tudo certo, {nome.trim().split(' ')[0]}!</b></p>
              <p>Abri o WhatsApp pra você. Se não abriu, é só chamar no {CONFIG.whatsapp.replace(/^55/, '')}.</p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
