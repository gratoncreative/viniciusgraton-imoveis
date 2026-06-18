import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useSEO } from '../useSEO'
import { estudoM2, BAIRROS_TODOS, CONFIG } from '../data'
import { buildEstudo, EstudoContent } from './EstudoM2Page'

// Estudo do valor do m² para QUALQUER imóvel — o cliente preenche os dados (ou de um
// anúncio de outro site) e a gente calcula. Resultado completo fica BORRADO até o
// pagamento (R$ 4,90, Mercado Pago) — aí libera, baixa o PDF e recebe por e-mail.
const LSK = 'vg_estudo_avulso'
const TIPOS = ['Apartamento', 'Casa', 'Casa em condomínio', 'Cobertura', 'Kitnet/Studio', 'Sala comercial', 'Terreno', 'Lote', 'Chácara']
const VAZIO = { codigo: '', tipo: 'Apartamento', bairro: '', cidade: 'Uberlândia/MG', area: '', preco: '', quartos: '', suites: '', banheiros: '', vagas: '', link: '' }

export default function EstudoAvulso() {
  useSEO({
    title: 'Avalie qualquer imóvel · Estudo do valor do m² — Uberlândia',
    description: 'Descubra se o preço de qualquer imóvel está justo. Preencha os dados (ou de um anúncio de outro site) e receba o estudo do valor do m² pela metodologia NBR 14653, com comparáveis reais do bairro.',
    path: '/avaliar',
  })

  const [feed, setFeed] = useState([])
  const [form, setForm] = useState(() => { try { const s = JSON.parse(localStorage.getItem(LSK) || 'null'); return s && s.bairro ? { ...VAZIO, ...s } : VAZIO } catch { return VAZIO } })
  const [calc, setCalc] = useState(false)
  const [erro, setErro] = useState('')

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
            Funciona para <b>qualquer imóvel</b> — mesmo os que não estão no meu site. Preencha os dados (ou de um anúncio de outro site) e eu comparo com os imóveis reais do bairro pela metodologia <b>NBR 14653</b>.
          </p>
        </div>

        <div className="eav-form">
          <label className="eav-campo eav-campo--full">
            <span>Link do anúncio <i>(opcional — só pra referência)</i></span>
            <input type="url" value={form.link} onChange={(e) => set('link', e.target.value)} placeholder="https://… (ZAP, OLX, outro site)" />
          </label>
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
          <p className="eav-nota">O resultado aparece na hora, com os <b>números exatos</b> e o laudo em PDF — <b>de graça</b>. <Link to="/imoveis">← Voltar aos imóveis</Link></p>
        </div>
      </div>
    </main>
  )
}
