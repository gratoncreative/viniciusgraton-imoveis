import { useState, useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CONFIG, FILTRO, BAIRROS, SEG_PRESET } from '../data'
import { IconWhats, IconClose, IconArrow } from './icons'
import '../styles/catalogo.css'

const PILLS = ['1', '2', '3', '4+']
const PILLS0 = ['0', '1', '2', '3+']
const EMPTY = { tipo: '', finalidade: '', bairro: '', preco: '', quartos: '', suites: '', vagas: '', area: '', carac: [], fgts: false, nome: '', obs: '' }

export default function FiltroModal({ seg, onClose }) {
  const open = !!seg
  const preset = useMemo(() => (seg && SEG_PRESET[seg.id]) || {}, [seg])

  const [f, setF] = useState(EMPTY)

  // reinicia o formulário a cada abertura, aplicando o preset do card
  useEffect(() => {
    if (open) {
      setF({ ...EMPTY, tipo: preset.tipo || '', finalidade: preset.finalidade || '', fgts: !!preset.fgts })
    }
  }, [open, preset])

  // trava o scroll do fundo + fecha no Esc enquanto o modal está aberto
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const toggleCarac = (c) =>
    setF((s) => ({ ...s, carac: s.carac.includes(c) ? s.carac.filter((x) => x !== c) : [...s.carac, c] }))

  const enviar = (e) => {
    e.preventDefault()
    const L = ['Olá Vinícius! Quero ajuda para encontrar um imóvel com estas características:']
    if (seg?.titulo) L.push(`• Interesse: ${seg.titulo}`)
    if (f.tipo) L.push(`• Tipo: ${f.tipo}`)
    if (f.finalidade) L.push(`• Finalidade: ${f.finalidade}`)
    if (f.bairro) L.push(`• Região: ${f.bairro}`)
    if (f.preco) L.push(`• Faixa de preço: ${f.preco}`)
    if (f.quartos) L.push(`• Quartos: ${f.quartos}`)
    if (f.suites) L.push(`• Suítes: ${f.suites}`)
    if (f.vagas) L.push(`• Vagas de garagem: ${f.vagas}`)
    if (f.area) L.push(`• Área mínima: ${f.area} m²`)
    if (f.carac.length) L.push(`• Características: ${f.carac.join(', ')}`)
    if (f.fgts) L.push('• Pretendo usar FGTS / financiamento')
    if (f.nome) L.push(`• Meu nome: ${f.nome}`)
    if (f.obs) L.push(`• Observações: ${f.obs}`)
    const url = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(L.join('\n'))}`
    window.open(url, '_blank', 'noopener')
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="modal"
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Buscar imóvel"
          >
            <button className="modal-close" onClick={onClose} aria-label="Fechar"><IconClose width={22} height={22} /></button>

            <div className="modal-head">
              <span className="eyebrow">Vamos achar o seu</span>
              <h3>Me conta o que você procura</h3>
              <p>Quanto mais detalhes, mais certeira fica a minha curadoria pra você.</p>
            </div>

            <form className="filtro-form" onSubmit={enviar}>
              <div className="ff-row">
                <label className="ff-field">
                  <span>Tipo de imóvel</span>
                  <select value={f.tipo} onChange={(e) => set('tipo', e.target.value)}>
                    <option value="">Indiferente</option>
                    {FILTRO.tipos.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <label className="ff-field">
                  <span>Finalidade</span>
                  <select value={f.finalidade} onChange={(e) => set('finalidade', e.target.value)}>
                    <option value="">Tanto faz</option>
                    {FILTRO.finalidades.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
              </div>

              <div className="ff-row">
                <label className="ff-field">
                  <span>Região / bairro</span>
                  <select value={f.bairro} onChange={(e) => set('bairro', e.target.value)}>
                    <option value="">Qualquer região de Uberlândia</option>
                    {BAIRROS.map((b) => <option key={b.nome} value={b.nome}>{b.nome}</option>)}
                    <option value="Outra região">Outra região</option>
                  </select>
                </label>
                <label className="ff-field">
                  <span>Faixa de preço</span>
                  <select value={f.preco} onChange={(e) => set('preco', e.target.value)}>
                    <option value="">Selecionar</option>
                    {FILTRO.precos.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
              </div>

              <div className="ff-pills-grid">
                <div className="ff-pillset">
                  <span>Quartos</span>
                  <div className="ff-pills">
                    {PILLS.map((p) => (
                      <button type="button" key={p} className={f.quartos === p ? 'on' : ''} onClick={() => set('quartos', f.quartos === p ? '' : p)}>{p}</button>
                    ))}
                  </div>
                </div>
                <div className="ff-pillset">
                  <span>Suítes</span>
                  <div className="ff-pills">
                    {PILLS0.map((p) => (
                      <button type="button" key={p} className={f.suites === p ? 'on' : ''} onClick={() => set('suites', f.suites === p ? '' : p)}>{p}</button>
                    ))}
                  </div>
                </div>
                <div className="ff-pillset">
                  <span>Vagas</span>
                  <div className="ff-pills">
                    {PILLS0.map((p) => (
                      <button type="button" key={p} className={f.vagas === p ? 'on' : ''} onClick={() => set('vagas', f.vagas === p ? '' : p)}>{p}</button>
                    ))}
                  </div>
                </div>
                <label className="ff-field ff-area">
                  <span>Área mínima (m²)</span>
                  <input type="number" min="0" inputMode="numeric" value={f.area} onChange={(e) => set('area', e.target.value)} placeholder="ex: 80" />
                </label>
              </div>

              <div className="ff-block">
                <span>Características desejadas</span>
                <div className="ff-checks">
                  {FILTRO.caracteristicas.map((c) => (
                    <button type="button" key={c} className={`ff-chk ${f.carac.includes(c) ? 'on' : ''}`} onClick={() => toggleCarac(c)}>{c}</button>
                  ))}
                </div>
              </div>

              <label className="ff-toggle">
                <input type="checkbox" checked={f.fgts} onChange={(e) => set('fgts', e.target.checked)} />
                <span>Pretendo usar <b>FGTS / financiamento</b></span>
              </label>

              <div className="ff-row">
                <label className="ff-field">
                  <span>Seu nome <i>(opcional)</i></span>
                  <input type="text" value={f.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Como posso te chamar?" />
                </label>
                <label className="ff-field">
                  <span>Algo mais? <i>(opcional)</i></span>
                  <input type="text" value={f.obs} onChange={(e) => set('obs', e.target.value)} placeholder="Detalhe que importa pra você" />
                </label>
              </div>

              <button type="submit" className="btn btn-gold ff-submit">
                <IconWhats /> Enviar no WhatsApp <IconArrow />
              </button>
              <p className="ff-note">Sem cadastro. Seus filtros vão direto pro WhatsApp do Vinícius.</p>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
