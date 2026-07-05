import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useSEO } from '../useSEO'
import { estudoM2, BAIRROS_TODOS, CONFIG } from '../data'
import { buildEstudo, EstudoContent } from './EstudoM2Page'

// Estudo do valor do m² para QUALQUER imóvel. Dois caminhos:
//  1) o cliente COLA O LINK de um anúncio (ZAP, Viva Real, OLX, Rotina…) → /api/analisar-url
//     lê a página server-side e PREENCHE o formulário sozinho;
//  2) ou preenche os dados na mão. Em ambos os casos o estudo é gratuito.
const LSK = 'vg_estudo_avulso'
const TIPOS = ['Apartamento', 'Casa', 'Casa em condomínio', 'Cobertura', 'Kitnet/Studio', 'Sala comercial', 'Terreno', 'Lote', 'Chácara']
const VAZIO = { codigo: '', tipo: 'Apartamento', bairro: '', cidade: 'Uberlândia/MG', area: '', preco: '', quartos: '', suites: '', banheiros: '', vagas: '', link: '' }

// normaliza o "tipo" que vem do extrator para uma das opções do <select>
const normTipo = (t) => {
  if (!t) return null
  const s = String(t).toLowerCase()
  if (s.includes('condom')) return 'Casa em condomínio'
  if (s.includes('cobertura')) return 'Cobertura'
  if (s.includes('kitnet') || s.includes('studio') || s.includes('flat')) return 'Kitnet/Studio'
  if (s.includes('sala') || s.includes('comerc') || s.includes('loja') || s.includes('office')) return 'Sala comercial'
  if (s.includes('terreno')) return 'Terreno'
  if (s.includes('lote')) return 'Lote'
  if (s.includes('chác') || s.includes('chac') || s.includes('sít') || s.includes('sit') || s.includes('fazenda')) return 'Chácara'
  if (s.includes('casa') || s.includes('sobrado') || s.includes('house')) return 'Casa'
  if (s.includes('apart') || s === 'ap' || s.includes('apto') || s.includes('residential')) return 'Apartamento'
  return TIPOS.find((o) => o.toLowerCase() === s) || null
}

export default function EstudoAvulso() {
  useSEO({
    title: 'Avalie qualquer imóvel · Estudo do valor do m² - Uberlândia',
    description: 'Descubra se o preço de qualquer imóvel está justo. Preencha os dados (ou de um anúncio de outro site) e receba o estudo do valor do m² pela metodologia NBR 14653, com comparáveis reais do bairro.',
    path: '/avaliar',
  })

  const [feed, setFeed] = useState([])
  const [form, setForm] = useState(() => { try { const s = JSON.parse(localStorage.getItem(LSK) || 'null'); return s && s.bairro ? { ...VAZIO, ...s } : VAZIO } catch { return VAZIO } })
  const [calc, setCalc] = useState(false)
  const [erro, setErro] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [linkMsg, setLinkMsg] = useState(null) // { tipo:'ok'|'erro', txt }
  const ultimoLink = useRef('') // evita re-disparar a busca pro mesmo link

  // Lê o anúncio pelo link (server-side, sem CORS) e preenche os campos sozinho.
  const buscarDoLink = async (urlArg) => {
    const u = String(urlArg ?? form.link).trim()
    if (!/^https?:\/\/.{6,}/i.test(u)) { setLinkMsg({ tipo: 'erro', txt: 'Cole um link completo, começando com https://' }); return }
    ultimoLink.current = u
    setBuscando(true); setLinkMsg(null); setErro('')
    try {
      const r = await fetch('/api/analisar-url', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: u }) })
      const j = await r.json()
      if (!j.ok || !j.dados) { setLinkMsg({ tipo: 'erro', txt: (j && j.erro) || 'Não consegui ler esse link. Preencha os campos abaixo manualmente.' }); return }
      const d = j.dados
      setForm((f) => ({
        ...f,
        link: u,
        tipo: normTipo(d.tipo) || f.tipo,
        bairro: d.bairro || f.bairro,
        cidade: d.cidade ? (String(d.cidade).includes('/') ? d.cidade : d.cidade + '/' + (d.estado || 'MG')) : f.cidade,
        area: d.area > 0 ? String(d.area) : f.area,
        preco: d.preco > 0 ? String(Math.round(d.preco)) : f.preco,
        quartos: d.quartos > 0 ? String(d.quartos) : f.quartos,
        suites: d.suites > 0 ? String(d.suites) : f.suites,
        banheiros: d.banheiros > 0 ? String(d.banheiros) : f.banheiros,
        vagas: d.vagas > 0 ? String(d.vagas) : f.vagas,
      }))
      const fonte = d.fonte ? ` no ${d.fonte}` : ''
      setLinkMsg({ tipo: 'ok', txt: `Pronto! Li o anúncio${fonte} e preenchi os campos abaixo. Confira, ajuste o que precisar e clique em calcular.` })
    } catch {
      setLinkMsg({ tipo: 'erro', txt: 'Não consegui acessar esse link agora. Preencha os campos abaixo manualmente.' })
    } finally { setBuscando(false) }
  }

  // auto-busca ~900ms depois que o cliente cola/digita um link completo
  useEffect(() => {
    const u = (form.link || '').trim()
    if (!/^https?:\/\/.{8,}/i.test(u)) return
    if (u === ultimoLink.current) return
    const t = setTimeout(() => buscarDoLink(u), 900)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.link])

  useEffect(() => {
    let vivo = true
    fetch('/catalogo.json').then((r) => (r.ok ? r.json() : null)).then((d) => { if (vivo && Array.isArray(d?.imoveis)) setFeed(d.imoveis) }).catch(() => {})
    return () => { vivo = false }
  }, [])

  // volta do pagamento (?pago=1): restaura o que foi calculado e mostra o resultado já liberado
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search)
      if (sp.get('pago')) { const s = JSON.parse(localStorage.getItem(LSK) || 'null'); if (s && s.bairro) { setForm({ ...VAZIO, ...s }); setCalc(true) } }
    } catch {}
  }, [])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const calcular = () => {
    if (!form.bairro.trim() || !(Number(form.area) > 0) || !(Number(form.preco) > 0)) {
      setErro('Preencha ao menos o bairro, a área (m²) e o preço pedido.'); return
    }
    setErro('')
    const codigo = form.codigo || ('aval-' + Date.now().toString(36))
    const novo = { ...form, codigo }
    setForm(novo)
    try { localStorage.setItem(LSK, JSON.stringify(novo)) } catch {}
    setCalc(true)
    window.scrollTo(0, 0)
  }

  const pseudoIm = useMemo(() => ({
    codigo: form.codigo || 'aval', tipo: form.tipo, bairro: form.bairro.trim(), cidade: form.cidade || 'Uberlândia/MG',
    uf: 'MG', preco: Number(form.preco) || 0, area: Number(form.area) || 0,
    quartos: Number(form.quartos) || 0, suites: Number(form.suites) || 0, banheiros: Number(form.banheiros) || 0, vagas: Number(form.vagas) || 0,
  }), [form])

  const estudo = useMemo(() => {
    if (!calc || feed.length === 0) return null
    try { const r = estudoM2(pseudoIm, feed); return r?.ok ? buildEstudo(pseudoIm, r) : null } catch { return null }
  }, [calc, pseudoIm, feed])

  // resultado pronto (borrado até pagar)
  if (calc && estudo) {
    return <main className="pagina ep-pg"><EstudoContent estudo={estudo} im={pseudoIm} onClose={() => setCalc(false)} bloquearAteLiberar /></main>
  }
  // calculando (feed ainda carregando)
  if (calc && feed.length === 0) {
    return <main className="pagina ep-pg ep-pg--loading"><div className="ep-spinner" /><p>Calculando o estudo…</p></main>
  }
  // sem comparáveis suficientes nesse bairro/tipo
  if (calc && !estudo) {
    const wa = `Olá Vinícius! Quero o estudo de valor de um ${form.tipo} no ${form.bairro} (${form.area} m², ${Number(form.preco).toLocaleString('pt-BR')}). Pode me ajudar?`
    return (
      <main className="pagina section--light det-vazio">
        <div className="container" style={{ textAlign: 'center', maxWidth: 560 }}>
          <h1 className="section-title">Ainda não tenho comparáveis suficientes</h1>
          <p className="section-sub" style={{ margin: '14px auto 24px' }}>Para o <b>{form.tipo}</b> no <b>{form.bairro}</b> não há amostra suficiente na base pública agora. Me chama que eu faço o estudo desse imóvel manualmente pra você.</p>
          <a className="btn btn-gold" href={`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(wa)}`} target="_blank" rel="noopener noreferrer">Falar com o Vinícius</a>
          <button className="btn btn-ghost" style={{ marginLeft: 10 }} onClick={() => setCalc(false)}>← Revisar dados</button>
        </div>
      </main>
    )
  }

  // ── Formulário ──────────────────────────────────────────────────────────
  return (
    <main className="pagina section--light eav-pg">
      <div className="container eav-wrap">
        <div className="eav-head">
          <span className="eyebrow" style={{ justifyContent: 'center' }}>Estudo do valor do m²</span>
          <h1 className="section-title">Esse imóvel <em>vale o que pedem?</em></h1>
          <p className="section-sub" style={{ margin: '14px auto 0', maxWidth: 620 }}>
            Funciona para <b>qualquer imóvel</b> - mesmo os que não estão no meu site. <b>Cole o link</b> de um anúncio (ZAP, Viva Real, OLX…) que eu leio e preencho tudo sozinho, ou preencha os dados na mão. Comparo com os imóveis reais do bairro pela metodologia <b>NBR 14653</b>.
          </p>
        </div>

        <div className="eav-form">
          <div className="eav-campo eav-campo--full eav-link">
            <span>Tem o link do anúncio? <i>Cole aqui que eu leio e preencho tudo sozinho</i></span>
            <div className="eav-link-row">
              <input type="url" value={form.link} onChange={(e) => set('link', e.target.value)} disabled={buscando}
                placeholder="https://… (ZAP, Viva Real, OLX, Chaves na Mão, Rotina…)" />
              <button type="button" className="eav-link-btn" onClick={() => buscarDoLink()} disabled={buscando || !form.link.trim()}>
                {buscando ? <span className="eav-link-spin" aria-hidden="true" /> : 'Buscar dados'}
              </button>
            </div>
            {buscando && <p className="eav-link-status eav-link-status--load">Lendo o anúncio e extraindo os dados…</p>}
            {!buscando && linkMsg && <p className={`eav-link-status eav-link-status--${linkMsg.tipo}`}>{linkMsg.txt}</p>}
          </div>

          <div className="eav-ou"><span>ou preencha os dados na mão</span></div>

          <div className="eav-grid">
            <label className="eav-campo"><span>Tipo</span>
              <select value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>{TIPOS.map((t) => <option key={t}>{t}</option>)}</select>
            </label>
            <label className="eav-campo"><span>Bairro *</span>
              <input list="eav-bairros" value={form.bairro} onChange={(e) => set('bairro', e.target.value)} placeholder="Ex.: Santa Mônica" />
              <datalist id="eav-bairros">{(BAIRROS_TODOS || []).map((b) => <option key={b} value={b} />)}</datalist>
            </label>
            <label className="eav-campo"><span>Área (m²) *</span>
              <input type="number" inputMode="decimal" value={form.area} onChange={(e) => set('area', e.target.value)} placeholder="Ex.: 75" />
            </label>
            <label className="eav-campo"><span>Preço pedido (R$) *</span>
              <input type="number" inputMode="numeric" value={form.preco} onChange={(e) => set('preco', e.target.value)} placeholder="Ex.: 350000" />
            </label>
            <label className="eav-campo"><span>Quartos</span>
              <input type="number" value={form.quartos} onChange={(e) => set('quartos', e.target.value)} placeholder="0" />
            </label>
            <label className="eav-campo"><span>Suítes</span>
              <input type="number" value={form.suites} onChange={(e) => set('suites', e.target.value)} placeholder="0" />
            </label>
            <label className="eav-campo"><span>Banheiros</span>
              <input type="number" value={form.banheiros} onChange={(e) => set('banheiros', e.target.value)} placeholder="0" />
            </label>
            <label className="eav-campo"><span>Vagas</span>
              <input type="number" value={form.vagas} onChange={(e) => set('vagas', e.target.value)} placeholder="0" />
            </label>
          </div>
          {erro && <p className="eav-erro">{erro}</p>}
          <button type="button" className="eav-calcular" onClick={calcular}>
            Calcular o estudo do m²
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </button>
          <p className="eav-nota">O resultado aparece na hora, com os <b>números exatos</b> e o laudo em PDF - <b>de graça</b>. <Link to="/imoveis">← Voltar aos imóveis</Link></p>
        </div>
      </div>
    </main>
  )
}
