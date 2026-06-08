import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import CardImovel from './CardImovel'
import { filtrarParaCliente, TIPOS_IMOVEL, BAIRROS_IMOVEL, linkWhatsApp, formatPreco } from '../data'

const FAIXAS = [
  { label: 'Até R$ 300 mil', min: 0, max: 300000 },
  { label: 'R$ 300 a 500 mil', min: 300000, max: 500000 },
  { label: 'R$ 500 a 800 mil', min: 500000, max: 800000 },
  { label: 'R$ 800 mil a 1,2 mi', min: 800000, max: 1200000 },
  { label: 'Acima de R$ 1,2 mi', min: 1200000, max: 0 },
  { label: 'Tanto faz', min: 0, max: 0 },
]

const STEPS = [
  { key: 'finalidade', bot: 'Vamos achar seu imóvel juntos! Primeiro.. você quer comprar, alugar ou investir?', tipo: 'single', opcoes: ['Comprar', 'Alugar', 'Investir'] },
  { key: 'tipos', bot: 'Perfeito. Que tipo de imóvel você procura? Pode marcar mais de um.', tipo: 'multi', opcoes: TIPOS_IMOVEL },
  { key: 'bairros', bot: 'Tem bairro ou região de preferência? Se tanto faz, é só seguir.', tipo: 'bairros', opcoes: BAIRROS_IMOVEL },
  { key: 'faixa', bot: 'Qual faixa de valor faz mais sentido pra você?', tipo: 'faixa' },
  { key: 'quartos', bot: 'Quantos quartos, no mínimo?', tipo: 'quartos' },
  { key: 'prazo', bot: 'E pra quando você pensa em resolver isso?', tipo: 'single', opcoes: ['Esse mês', 'Em 2 a 6 meses', 'Só pesquisando'] },
  { key: 'nome', bot: 'Quase lá! Como você gosta de ser chamado(a)?', tipo: 'texto' },
  { key: 'whatsapp', bot: 'Por último.. me passa seu WhatsApp que eu organizo sua seleção e te mando, combinado?', tipo: 'tel' },
]

export default function ChatBusca() {
  const [step, setStep] = useState(0)
  const [ans, setAns] = useState({ finalidade: '', tipos: [], bairros: [], faixa: null, quartosMin: 0, prazo: '', nome: '', whatsapp: '' })
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(null) // { token, nome }
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState(false)
  const fimRef = useRef(null)

  const prefs = useMemo(() => ({
    tipos: ans.tipos, bairros: ans.bairros,
    precoMin: ans.faixa?.min || 0, precoMax: ans.faixa?.max || 0,
    quartosMin: ans.quartosMin || 0,
  }), [ans])

  const matches = useMemo(() => filtrarParaCliente(prefs), [prefs])
  const mostraContador = step >= 1 && !enviado

  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [step, enviado])

  const avancar = () => setStep((s) => Math.min(s + 1, STEPS.length - 1))
  const escolher = (key, val) => { setAns((a) => ({ ...a, [key]: val })); setTimeout(avancar, 160) }
  const toggle = (key, val) => setAns((a) => { const set = new Set(a[key] || []); set.has(val) ? set.delete(val) : set.add(val); return { ...a, [key]: [...set] } })

  const enviar = async () => {
    const wa = (ans.whatsapp || '').replace(/\D/g, '')
    if (wa.length < 10) { setErro('Coloca o WhatsApp com DDD, por favor (ex: 34 99999-9999).'); return }
    setErro(''); setEnviando(true)
    const sugeridos = matches.slice(0, 9).map((x) => String(x.im.codigo))
    try {
      const r = await fetch('/api/buscar', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          finalidade: ans.finalidade, tipos: ans.tipos, bairros: ans.bairros,
          precoMin: prefs.precoMin, precoMax: prefs.precoMax, quartosMin: prefs.quartosMin,
          prazo: ans.prazo, nome: ans.nome, whatsapp: ans.whatsapp, sugeridos, site: '',
        }),
      })
      const j = await r.json()
      if (!r.ok || j.error) { setErro(j.msg || 'Algo deu errado. Me chama no WhatsApp que eu te atendo na hora.'); setEnviando(false); return }
      setEnviado({ token: j.token || '', nome: (ans.nome || '').trim().split(' ')[0] })
    } catch {
      setErro('Sem conexão agora. Me chama no WhatsApp que eu te atendo na hora.')
    }
    setEnviando(false)
  }

  // ——— resumo das respostas (bolhas do usuário) ———
  const resumo = (k) => {
    if (k === 'tipos') return ans.tipos.length ? ans.tipos.join(', ') : 'Qualquer tipo'
    if (k === 'bairros') return ans.bairros.length ? ans.bairros.join(', ') : 'Tanto faz o bairro'
    if (k === 'faixa') return ans.faixa ? ans.faixa.label : ''
    if (k === 'quartos') return ans.quartosMin ? `${ans.quartosMin}+ quartos` : 'Tanto faz'
    if (k === 'nome') return ans.nome || 'Prefiro não dizer'
    if (k === 'whatsapp') return ans.whatsapp
    return ans[k]
  }
  const respondido = (i) => {
    const k = STEPS[i].key
    if (k === 'finalidade' || k === 'prazo') return !!ans[k]
    if (k === 'tipos' || k === 'bairros') return i < step // multi: só conta como respondido depois de avançar
    if (k === 'faixa') return !!ans.faixa
    if (k === 'quartos') return i < step
    if (k === 'nome') return i < step
    return false
  }

  // ——— TELA DE SUCESSO ———
  if (enviado) {
    const top = matches.slice(0, 6)
    const link = enviado.token ? `${window.location.origin}/cliente/${enviado.token}` : ''
    const waVinicius = linkWhatsApp(`Olá Vinícius! Fiz a busca no site${enviado.nome ? ' (' + enviado.nome + ')' : ''} e quero ver minha seleção${link ? ': ' + link : ''}.`)
    return (
      <motion.div className="cb-sucesso" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <div className="cb-sucesso-topo">
          <span className="cb-sucesso-ok">✓</span>
          <h2>{enviado.nome ? `Prontinho, ${enviado.nome}!` : 'Prontinho!'}</h2>
          <p>{top.length > 0 ? `Separei ${matches.length} ${matches.length === 1 ? 'imóvel' : 'imóveis'} com a sua cara. Já te mando os melhores aqui embaixo.` : 'Recebi tudo! No momento não achei um match exato, mas tenho acesso a muito mais na base e vou garimpar pra você.'}</p>
          {link && <p className="cb-sucesso-link-aviso">Sua seleção fica <b>salva nesse link</b> — você pode curtir e descartar imóveis quando quiser, que eu vou afinando pra você.</p>}
        </div>

        {link && (
          <div className="cb-link-box">
            <input readOnly value={link} onFocus={(e) => e.target.select()} />
            <button type="button" className="admin-btn" onClick={() => { navigator.clipboard?.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 1500) }}>{copiado ? '✓ copiado' : 'Copiar'}</button>
            <a className="btn btn-gold" href={link}>Abrir minha seleção</a>
          </div>
        )}

        {top.length > 0 && (
          <div className="cb-sucesso-grid">
            {top.map((x) => <CardImovel key={x.im.codigo} im={x.im} />)}
          </div>
        )}

        <div className="cb-sucesso-wa">
          <p>O Vinícius já recebeu seu contato e vai te chamar. Quer adiantar?</p>
          <a className="btn btn-gold" href={waVinicius} target="_blank" rel="noopener">Falar com o Vinícius no WhatsApp</a>
        </div>
      </motion.div>
    )
  }

  // ——— CHAT ———
  const atual = STEPS[step]
  return (
    <div className="chat-busca">
      <div className="cb-transcript">
        {STEPS.slice(0, step + 1).map((s, i) => (
          <div key={s.key}>
            <div className="cb-msg bot">
              <span className="cb-avatar"><img src="/vinicius-graton.jpg" alt="Vinícius" /></span>
              <div className="cb-bubble">{s.bot}</div>
            </div>
            {respondido(i) && <div className="cb-msg user"><div className="cb-bubble">{resumo(s.key)}</div></div>}
          </div>
        ))}
        <div ref={fimRef} />
      </div>

      {mostraContador && (
        <div className="cb-count"><b>✨ {matches.length}</b> {matches.length === 1 ? 'imóvel combina' : 'imóveis combinam'} com o que você marcou</div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={atual.key} className="cb-input-area" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {/* campo-isca anti-spam (invisível) */}
          <input type="text" name="site" tabIndex={-1} autoComplete="off" style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0 }} aria-hidden="true" />

          {atual.tipo === 'single' && (
            <div className="cb-chips">
              {atual.opcoes.map((o) => <button type="button" key={o} className="cb-chip" onClick={() => escolher(atual.key, o)}>{o}</button>)}
            </div>
          )}

          {atual.tipo === 'multi' && (
            <>
              <div className="cb-chips">
                {atual.opcoes.map((o) => <button type="button" key={o} className={`cb-chip ${ans.tipos.includes(o) ? 'on' : ''}`} onClick={() => toggle('tipos', o)}>{o}</button>)}
              </div>
              <div className="cb-actions"><button type="button" className="btn btn-gold" onClick={avancar}>Continuar</button></div>
            </>
          )}

          {atual.tipo === 'bairros' && (
            <>
              <div className="cb-chips cb-chips--scroll">
                {atual.opcoes.map((o) => <button type="button" key={o} className={`cb-chip ${ans.bairros.includes(o) ? 'on' : ''}`} onClick={() => toggle('bairros', o)}>{o}</button>)}
              </div>
              <div className="cb-actions">
                <button type="button" className="cb-skip" onClick={() => { setAns((a) => ({ ...a, bairros: [] })); avancar() }}>Tanto faz</button>
                <button type="button" className="btn btn-gold" onClick={avancar}>Continuar</button>
              </div>
            </>
          )}

          {atual.tipo === 'faixa' && (
            <div className="cb-chips">
              {FAIXAS.map((f) => <button type="button" key={f.label} className="cb-chip" onClick={() => escolher('faixa', f)}>{f.label}</button>)}
            </div>
          )}

          {atual.tipo === 'quartos' && (
            <div className="cb-chips">
              {[1, 2, 3, 4].map((n) => <button type="button" key={n} className="cb-chip" onClick={() => escolher('quartosMin', n)}>{n}+</button>)}
              <button type="button" className="cb-chip" onClick={() => escolher('quartosMin', 0)}>Tanto faz</button>
            </div>
          )}

          {atual.tipo === 'texto' && (
            <form className="cb-form" onSubmit={(e) => { e.preventDefault(); avancar() }}>
              <input autoFocus value={ans.nome} onChange={(e) => setAns((a) => ({ ...a, nome: e.target.value }))} placeholder="Seu nome (opcional)" maxLength={60} />
              <button type="submit" className="btn btn-gold">Continuar</button>
            </form>
          )}

          {atual.tipo === 'tel' && (
            <form className="cb-form" onSubmit={(e) => { e.preventDefault(); enviar() }}>
              <input autoFocus type="tel" inputMode="tel" value={ans.whatsapp} onChange={(e) => setAns((a) => ({ ...a, whatsapp: e.target.value }))} placeholder="34 99999-9999" maxLength={20} />
              <button type="submit" className="btn btn-gold" disabled={enviando}>{enviando ? 'Enviando…' : 'Ver minha seleção'}</button>
            </form>
          )}

          {erro && <p className="cb-erro">{erro}</p>}
          {atual.tipo === 'tel' && <p className="cb-lgpd">Seu contato é usado só pra te atender. Nada de spam — palavra do Vinícius.</p>}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
