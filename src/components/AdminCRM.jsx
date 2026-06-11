import { useEffect, useState, useMemo } from 'react'
import { IMOVEIS, TIPOS_IMOVEL, BAIRROS_TODOS, filtrarParaCliente, formatPreco, getImovel, oportunidade, ehEsquina, fotosDe } from '../data'
import InputMoeda from './InputMoeda'
import { agruparPorSetor } from '../bairros-setores'

const api = (payload) => fetch('/api/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }).then((r) => r.json().then((j) => ({ status: r.status, j })))

const VAZIO = { id: '', nome: '', whatsapp: '', finalidade: 'Comprar', tipos: [], bairros: [], precoMin: '', precoMax: '', quartosMin: '', suitesMin: '', vagasMin: '', areaMin: '', obs: '', nota: '', sugeridos: [] }
const waLink = (wa, msg) => { const d = String(wa || '').replace(/\D/g, ''); const full = d.length <= 11 ? '55' + d : d; return `https://wa.me/${full}?text=${encodeURIComponent(msg)}` }

const objToFinal = (o) => { const s = (o || '').toLowerCase(); if (s.includes('alug')) return 'Alugar'; if (s.includes('invest')) return 'Investir'; return 'Comprar' }

// funil de atendimento
const STATUS = ['A revisar', 'Novo', 'Em atendimento', 'Visita marcada', 'Proposta', 'Fechado', 'Perdido']
const STATUS_COR = { 'A revisar': '#8a909c', Novo: '#b8862f', 'Em atendimento': '#2f6fb8', 'Visita marcada': '#7a4fce', Proposta: '#c98a1a', Fechado: '#2e8c57', Perdido: '#b04a4a' }
const diasParado = (c) => { const t = c.ultimaAcaoEm || c.atualizadoEm || c.criadoEm || 0; if (!t) return 0; return Math.floor((Date.now() - t) / 86400000) }
// prioriza quem chamar hoje: mexeu na página > novo do site > prazo curto > parado há dias
const scoreFollowUp = (c, d) => {
  if (['Fechado', 'Perdido'].includes(c.status)) return 0
  let s = 0
  if (c.temNovidade) s += 100
  if (c.novo) s += 30
  if (c.prazo === 'Esse mês') s += 50; else if (String(c.prazo || '').includes('2 a 6')) s += 20
  if (d >= 3) s += Math.min(d, 30)
  return s
}
const motivoFollowUp = (c, d) => {
  const r = []
  if (c.temNovidade) r.push('🔔 mexeu na página dele')
  if (c.novo) r.push('✨ novo do site, revisar')
  if (c.prazo === 'Esse mês') r.push('🔥 quer resolver esse mês')
  if (d >= 3) r.push(`⏰ parado há ${d} dias`)
  return r.slice(0, 2).join(' · ') || 'vale um alô'
}

export default function AdminCRM({ token, onSair, cadastros = [], onExcluirCadastro }) {
  const [clientes, setClientes] = useState(null)
  const [sel, setSel] = useState(null) // null = lista; objeto = editando
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState('')
  const [linkCopiado, setLinkCopiado] = useState(false)

  const carregar = async () => {
    const { status, j } = await api({ action: 'crm-list', token })
    if (status === 401) return onSair()
    setClientes(j.clientes || [])
  }
  useEffect(() => { carregar() }, [])

  // base COMPLETA para casar com o cliente: espelho de TODOS os imóveis (catalogo.json) + curados do bundle.
  // (Antes o CRM só via os ~58 curados, por isso "0 combinam" mesmo havendo imóveis na base.)
  const [feed, setFeed] = useState([])
  const [feedPronto, setFeedPronto] = useState(false)
  useEffect(() => {
    let vivo = true
    fetch('/catalogo.json').then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivo && d && Array.isArray(d.imoveis)) setFeed(d.imoveis) })
      .catch(() => {})
      .finally(() => { if (vivo) setFeedPronto(true) })
    return () => { vivo = false }
  }, [])
  // memorizado: só recalcula quando o feed muda (não a cada tecla) → preview instantâneo
  const baseImoveis = useMemo(() => {
    const mapa = new Map()
    for (const im of feed) mapa.set(String(im.codigo), im)
    for (const im of IMOVEIS) mapa.set(String(im.codigo), im) // curados têm prioridade (galeria/descrição completas)
    return [...mapa.values()]
  }, [feed])

  const setF = (k, v) => setSel((s) => ({ ...s, [k]: v }))
  const toggleArr = (k, val) => setSel((s) => { const a = new Set(s[k] || []); a.has(val) ? a.delete(val) : a.add(val); return { ...s, [k]: [...a] } })
  // foto do cliente: redimensiona no navegador (máx 480px, JPEG) e guarda como dataURL
  const lerFoto = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const max = 480; let w = img.width; let h = img.height
        if (w > h && w > max) { h = Math.round((h * max) / w); w = max } else if (h > max) { w = Math.round((w * max) / h); h = max }
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h
        cv.getContext('2d').drawImage(img, 0, 0, w, h)
        setF('foto', cv.toDataURL('image/jpeg', 0.82))
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  }

  // imóveis que casam com os critérios atuais (para sugerir/escolher)
  const matches = useMemo(() => (sel ? filtrarParaCliente({
    tipos: sel.tipos, bairros: sel.bairros,
    precoMin: +sel.precoMin || 0, precoMax: +sel.precoMax || 0,
    quartosMin: +sel.quartosMin || 0, suitesMin: +sel.suitesMin || 0, vagasMin: +sel.vagasMin || 0, areaMin: +sel.areaMin || 0,
  }, baseImoveis) : []), [sel, baseImoveis])

  // resumo AO VIVO do que o filtro atual rende (atualiza conforme preenche, sem precisar abrir a página)
  const resumo = (() => {
    if (!matches.length) return null
    const precos = matches.map((x) => x.im.preco).filter((p) => p > 0)
    const areas = matches.map((x) => x.im.area).filter((a) => a > 0)
    return {
      total: matches.length,
      precoMin: precos.length ? Math.min(...precos) : 0,
      precoMax: precos.length ? Math.max(...precos) : 0,
      areaMin: areas.length ? Math.min(...areas) : 0,
      areaMax: areas.length ? Math.max(...areas) : 0,
      tipos: [...new Set(matches.map((x) => x.im.tipo).filter(Boolean))],
      bairros: [...new Set(matches.map((x) => x.im.bairro).filter(Boolean))],
    }
  })()

  const sugerirAuto = () => setSel((s) => ({ ...s, sugeridos: matches.slice(0, 9).map((x) => String(x.im.codigo)) }))
  const toggleSug = (cod) => setSel((s) => { const a = new Set(s.sugeridos || []); a.has(cod) ? a.delete(cod) : a.add(cod); return { ...s, sugeridos: [...a] } })

  const m2mediana = useMemo(() => {
    const vals = matches.slice(0, 80).map(({ im }) => im.preco > 0 && im.area > 0 ? im.preco / im.area : 0).filter(v => v > 0).sort((a, b) => a - b)
    return vals.length ? vals[Math.floor(vals.length / 2)] : 0
  }, [matches])

  const [prevCod, setPrevCod] = useState(null)
  const [prevSlide, setPrevSlide] = useState(0)

  const salvar = async () => {
    setErro('')
    const { status, j } = await api({ action: 'crm-save', token, cliente: sel })
    if (status === 401) { onSair(); return null }
    if (!j.ok) { setErro(j.msg || 'Não consegui salvar.'); return null }
    setSel(j.cliente); setSalvo(true); setTimeout(() => setSalvo(false), 1800); carregar()
    return j.cliente
  }
  // Salva ANTES de abrir/enviar — aguarda propagação do Cloudflare KV (pode levar até ~2s)
  const [abrindo, setAbrindo] = useState(false)
  const comSalvar = async (acao) => {
    setAbrindo(true)
    const c = await salvar()
    if (!c || !c.id) { setAbrindo(false); return }
    await new Promise((r) => setTimeout(r, 2500))
    setAbrindo(false)
    acao(c)
  }
  const excluir = async (id) => {
    if (!confirm('Excluir este cliente do CRM?')) return
    await api({ action: 'crm-del', token, id }); setSel(null); carregar()
  }
  // limpa o aviso de novidade ao abrir o cliente
  const abrir = (c) => {
    if (c.temNovidade) { api({ action: 'crm-visto', token, id: c.id }); setClientes((cs) => (cs || []).map((x) => (x.id === c.id ? { ...x, temNovidade: false } : x))) }
    setSel({ ...VAZIO, ...c })
  }
  // mudança rápida de status no funil (a partir da lista)
  const mudarStatus = async (c, status) => {
    setClientes((cs) => (cs || []).map((x) => (x.id === c.id ? { ...x, status } : x)))
    await api({ action: 'crm-save', token, cliente: { ...c, status } })
  }
  // imóveis que combinam com o cliente e que ele ainda NÃO tem na página (oportunidade de envio)
  const prefsDe = (c) => ({ tipos: c.tipos, bairros: c.bairros, precoMin: +c.precoMin || 0, precoMax: +c.precoMax || 0, quartosMin: +c.quartosMin || 0, suitesMin: +c.suitesMin || 0, vagasMin: +c.vagasMin || 0, areaMin: +c.areaMin || 0 })
  const novosMatch = (c) => { try { return filtrarParaCliente(prefsDe(c), baseImoveis).filter((x) => !(c.sugeridos || []).includes(String(x.im.codigo))).length } catch { return 0 } }
  // resolve um imóvel pelo código olhando a base completa (espelho + curados), não só os curados
  const resolverImovel = (cod) => baseImoveis.find((i) => String(i.codigo) === String(cod)) || getImovel(cod)

  const linkCliente = (c) => `${window.location.origin}/cliente/${c.id}`

  // mensagem PERSONALIZADA pro WhatsApp (estilo Vinícius/Rotina): cumprimenta pelo nome,
  // resume o que o cliente procura e os diferenciais dos imóveis escolhidos, depois o link.
  const montarMsgCliente = (c) => {
    const nome = c.nome ? c.nome.trim().split(' ')[0] : ''
    const fin = (c.finalidade || 'Comprar').toLowerCase()
    const finTxt = fin.includes('alug') ? 'alugar' : fin.includes('invest') ? 'investir em' : 'comprar'
    const nec = []
    if (c.tipos && c.tipos.length) nec.push(c.tipos.join(' ou ').toLowerCase())
    if (c.bairros && c.bairros.length) nec.push(c.bairros.length <= 3 ? `no ${c.bairros.join(', ')}` : `no ${c.bairros.slice(0, 3).join(', ')} e outros bairros`)
    if (+c.quartosMin > 0) nec.push(`${c.quartosMin}+ quartos`)
    if (+c.areaMin > 0) nec.push(`a partir de ${c.areaMin} m²`)
    if (+c.precoMax > 0) nec.push(`até ${formatPreco(c.precoMax)}`)
    const necTxt = nec.length ? nec.join(', ') : 'o que combina com o seu momento'
    const ims = (c.sugeridos || []).map(resolverImovel).filter(Boolean)
    const difs = []
    if (ims.some((im) => ehEsquina(im))) difs.push('tem opção de esquina')
    if (ims.some((im) => { const o = oportunidade(im); return o.abaixoMercado || o.temDesconto })) difs.push('tem imóvel com preço abaixo do mercado')
    if (ims.some((im) => im.aceitaFinanciamento || /financia|fgts|minha casa/i.test(im.descricao || ''))) difs.push('com opção de financiamento')
    const n = ims.length
    const L = []
    L.push(`Oi${nome ? ' ' + nome : ''}, tudo bem? Aqui é o Vinícius, do atendimento da Rotina Imobiliária.`)
    L.push('')
    L.push(`Separei uma seleção pensando no que você me disse que procura.. ${finTxt} ${necTxt}.`)
    if (n > 0) {
      let frase = `São ${n} ${n === 1 ? 'opção escolhida' : 'opções escolhidas'} a dedo pra você`
      if (difs.length) frase += `, e ${difs.join(', ')}`
      L.push('')
      L.push(frase + '.')
    }
    L.push('')
    L.push(`Dá uma olhada na sua seleção exclusiva aqui.. ${linkCliente(c)}`)
    L.push('')
    L.push('Pode curtir e descartar à vontade por lá, que vou te entendendo melhor. Qualquer uma que te chamar atenção, me fala que já organizo a visita pra você. 🤝')
    return L.join('\n')
  }

  // transforma um cadastro da "área do cliente" (conta) num cliente do CRM, já pré-preenchido
  const adicionarAoCRM = (c) => {
    setSel({
      ...VAZIO,
      nome: c.nome || '', whatsapp: c.fone || '',
      finalidade: objToFinal(c.objetivo),
      bairros: String(c.bairros || '').split(/[,;/]+/).map((s) => s.trim()).filter(Boolean).slice(0, 20),
      sugeridos: (c.favoritos || []).map((x) => String(x)),
      obs: [c.email && ('Email: ' + c.email), c.faixa && ('Faixa informada: ' + c.faixa), c.idade && (c.idade + ' anos'), c.sexo, 'Origem: área do cliente do site'].filter(Boolean).join(' · '),
      origem: 'area-cliente',
    })
    setErro(''); window.scrollTo(0, 0)
  }

  // ——— EDITOR ———
  if (sel) {
    const podePagina = sel.id && (sel.sugeridos?.length || matches.length)
    const msg = `Olá${sel.nome ? ' ' + sel.nome.split(' ')[0] : ''}! Aqui é o Vinícius. Separei alguns imóveis pensando no que você procura. Dá uma olhada na sua seleção: ${sel.id ? linkCliente(sel) : ''}`
    return (
      <section>
        <div className="admin-barra">
          <button className="admin-btn" onClick={() => setSel(null)}>← Voltar à lista</button>
          {sel.id && <span className="painel-meta">Cliente salvo · página: /cliente/{sel.id.slice(0, 8)}…</span>}
        </div>
        <div className="admin-edit-grid">
          <div>
            <h3 className="det-rel-titulo">Dados e preferências do cliente</h3>
            <div className="crm-foto-campo">
              {sel.foto ? <img className="crm-foto-prev" src={sel.foto} alt="Foto do cliente" /> : <span className="crm-foto-vazia">👤</span>}
              <div className="crm-foto-acoes">
                <label className="admin-btn">{sel.foto ? 'Trocar foto' : '📷 Adicionar foto do cliente'}<input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => lerFoto(e.target.files && e.target.files[0])} /></label>
                {sel.foto && <button type="button" className="admin-btn admin-btn--del admin-btn--mini" onClick={() => setF('foto', '')}>Remover</button>}
                <span className="painel-meta">Aparece na página de seleção do cliente.</span>
              </div>
            </div>
            <div className="admin-fields">
              <label className="admin-field"><span>Nome (opcional)</span><input value={sel.nome} onChange={(e) => setF('nome', e.target.value)} /></label>
              <label className="admin-field"><span>WhatsApp (obrigatório)</span><input value={sel.whatsapp} onChange={(e) => setF('whatsapp', e.target.value)} placeholder="34 99999-9999" /></label>
              <label className="admin-field"><span>Finalidade</span>
                <select value={sel.finalidade} onChange={(e) => setF('finalidade', e.target.value)}><option>Comprar</option><option>Alugar</option><option>Investir</option></select>
              </label>
              <label className="admin-field"><span>Status (funil)</span>
                <select value={sel.status || ''} onChange={(e) => setF('status', e.target.value)}><option value="">—</option>{STATUS.map((s) => <option key={s}>{s}</option>)}</select>
              </label>
              <label className="admin-field"><span>Preço mín.</span><InputMoeda value={sel.precoMin} onChange={(v) => setF('precoMin', v)} /></label>
              <label className="admin-field"><span>Preço máx.</span><InputMoeda value={sel.precoMax} onChange={(v) => setF('precoMax', v)} /></label>
              <label className="admin-field"><span>Quartos (mín.)</span><input type="number" value={sel.quartosMin} onChange={(e) => setF('quartosMin', e.target.value)} /></label>
              <label className="admin-field"><span>Suítes (mín.)</span><input type="number" value={sel.suitesMin} onChange={(e) => setF('suitesMin', e.target.value)} /></label>
              <label className="admin-field"><span>Vagas (mín.)</span><input type="number" value={sel.vagasMin} onChange={(e) => setF('vagasMin', e.target.value)} /></label>
              <label className="admin-field"><span>Área mín. (m²)</span><input type="number" value={sel.areaMin} onChange={(e) => setF('areaMin', e.target.value)} /></label>
            </div>

            <p className="admin-mini-label">Tipo de imóvel</p>
            <div className="crm-chips">
              {TIPOS_IMOVEL.map((t) => <button type="button" key={t} className={`crm-chip ${(sel.tipos || []).includes(t) ? 'on' : ''}`} onClick={() => toggleArr('tipos', t)}>{t}</button>)}
            </div>
            <p className="admin-mini-label">Bairros de interesse <span className="painel-meta">(todos os bairros de Uberlândia · {(sel.bairros || []).length} selecionado{(sel.bairros || []).length === 1 ? '' : 's'})</span></p>
            <div className="crm-chips crm-chips--bairros crm-setores">
              {agruparPorSetor(BAIRROS_TODOS).map(({ setor, bairros }) => (
                <div className="crm-setor" key={setor}>
                  <span className="crm-setor-tit">{setor}</span>
                  <div className="crm-setor-chips">
                    {bairros.map((b) => <button type="button" key={b} className={`crm-chip ${(sel.bairros || []).includes(b) ? 'on' : ''}`} onClick={() => toggleArr('bairros', b)}>{b}</button>)}
                  </div>
                </div>
              ))}
            </div>
            <label className="admin-field admin-field--full" style={{ marginTop: 12 }}><span>Observações internas <span className="painel-meta">(só você vê)</span></span><textarea rows="3" value={sel.obs} onChange={(e) => setF('obs', e.target.value)} /></label>
            <label className="admin-field admin-field--full" style={{ marginTop: 10 }}><span>Contexto para a página do cliente <span className="painel-meta">(aparece como apresentação — escreva livremente)</span></span><textarea rows="3" placeholder="ex: Quer apartamento para investimento e revenda, prefere bairros com boa valorização e liquidez, orçamento até 500k." value={sel.nota} onChange={(e) => setF('nota', e.target.value)} /></label>

            <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-gold" onClick={salvar}>Salvar cliente</button>
              {salvo && <span className="lead-salvo">✓ salvo</span>}
              {erro && <span className="lead-erro">{erro}</span>}
            </div>
          </div>

          <div>
            <div className="admin-owner crm-resumo">
              <h3 className="det-rel-titulo" style={{ marginTop: 0 }}>Resumo do filtro <span className="painel-meta">· ao vivo</span></h3>
              {!feedPronto ? (
                <p className="painel-meta">Carregando a base completa de imóveis…</p>
              ) : !resumo ? (
                <p className="painel-meta">Vá preenchendo os filtros ao lado — aqui aparece, na hora, quantos imóveis batem com os critérios e um resumo deles (antes de abrir a página).</p>
              ) : (
                <>
                  <p className="crm-resumo-num"><b>{resumo.total}</b> imóvel{resumo.total > 1 ? 'is' : ''} combina{resumo.total > 1 ? 'm' : ''} com esses critérios agora</p>
                  <ul className="crm-resumo-lista">
                    <li><span>Preço</span>{resumo.precoMin === resumo.precoMax ? formatPreco(resumo.precoMin) : `${formatPreco(resumo.precoMin)} — ${formatPreco(resumo.precoMax)}`}</li>
                    <li><span>Tipos</span>{resumo.tipos.join(', ')}</li>
                    <li><span>Bairros</span>{resumo.bairros.slice(0, 8).join(', ')}{resumo.bairros.length > 8 ? ` +${resumo.bairros.length - 8}` : ''}</li>
                    {resumo.areaMax > 0 && <li><span>Área</span>{resumo.areaMin === resumo.areaMax ? `${resumo.areaMin} m²` : `${resumo.areaMin} — ${resumo.areaMax} m²`}</li>}
                  </ul>
                </>
              )}
            </div>

            <div className="admin-owner">
              <h3 className="det-rel-titulo" style={{ marginTop: 0 }}>Imóveis sugeridos <span className="painel-meta">({(sel.sugeridos || []).length})</span></h3>
              <p className="calc-nota">Marque os imóveis que vão aparecer na página do cliente. Use <b>Sugerir automático</b> pra preencher com os que mais combinam.</p>
              <button className="admin-btn" onClick={sugerirAuto} style={{ marginBottom: 10 }}>✨ Sugerir automático ({matches.length} combinam)</button>
              <div className="crm-matches-wrap">
                {(() => {
                  const prevHit = prevCod
                    ? matches.find(({ im }) => String(im.codigo) === prevCod)
                    : (matches.length > 0 ? matches[0] : null)
                  if (!prevHit) return (
                    <div className="crm-prev-panel crm-prev-empty">
                      <div className="crm-prev-noimg">🏠</div>
                      <div className="crm-prev-body"><p className="crm-prev-hint">Preencha os filtros ao lado — os imóveis compatíveis aparecem aqui</p></div>
                    </div>
                  )
                  const { im: pim } = prevHit
                  const fotos = fotosDe(pim)
                  const slide = Math.min(prevSlide, fotos.length - 1)
                  const m2 = pim.preco > 0 && pim.area > 0 ? pim.preco / pim.area : 0
                  const m2tag = m2 && m2mediana ? (m2 < m2mediana * 0.85 ? 'bom' : m2 > m2mediana * 1.15 ? 'alto' : 'ok') : ''
                  const m2rMin = matches.slice(0, 80).reduce((mn, { im }) => im.preco > 0 && im.area > 0 ? Math.min(mn, im.preco / im.area) : mn, Infinity)
                  const m2rMax = matches.slice(0, 80).reduce((mx, { im }) => im.preco > 0 && im.area > 0 ? Math.max(mx, im.preco / im.area) : mx, 0)
                  const m2pct = m2 && isFinite(m2rMin) && m2rMin < m2rMax ? Math.round(((m2 - m2rMin) / (m2rMax - m2rMin)) * 100) : 50
                  const infos = [
                    pim.quartos > 0 && { ic: '🛏', v: `${pim.quartos} quarto${pim.quartos > 1 ? 's' : ''}` },
                    pim.suites > 0 && { ic: '🛁', v: `${pim.suites} suíte${pim.suites > 1 ? 's' : ''}` },
                    pim.banheiros > 0 && { ic: '🚿', v: `${pim.banheiros} banheiro${pim.banheiros > 1 ? 's' : ''}` },
                    pim.vagas > 0 && { ic: '🚗', v: `${pim.vagas} vaga${pim.vagas > 1 ? 's' : ''}` },
                    pim.area > 0 && { ic: '📐', v: `${pim.area} m²` },
                    pim.andar > 0 && { ic: '🏢', v: `${pim.andar}º andar` },
                  ].filter(Boolean)
                  return (
                    <div className="crm-prev-panel">
                      <div className="crm-prev-galeria">
                        <img src={fotos[slide]} alt="" />
                        {fotos.length > 1 && <button type="button" className="crm-prev-seta crm-prev-seta--l" onClick={(e) => { e.stopPropagation(); setPrevSlide(s => (s - 1 + fotos.length) % fotos.length) }}>‹</button>}
                        {fotos.length > 1 && <button type="button" className="crm-prev-seta crm-prev-seta--r" onClick={(e) => { e.stopPropagation(); setPrevSlide(s => (s + 1) % fotos.length) }}>›</button>}
                        {fotos.length > 1 && <span className="crm-prev-cnt">{slide + 1} / {fotos.length}</span>}
                        <a className="crm-prev-ver" href={`/imovel/${pim.codigo}`} target="_blank" rel="noopener" title="Abrir imóvel completo com todas as fotos">
                          {fotos.length <= 1 ? '🔗 Ver todas as fotos' : `🔗 Página do imóvel`}
                        </a>
                      </div>
                      <div className="crm-prev-body">
                        <div className="crm-prev-header">
                          <span className="crm-prev-tipo">{pim.tipo} · {pim.bairro}</span>
                          <span className="crm-prev-cod">cód {pim.codigo}</span>
                        </div>
                        <strong className="crm-prev-preco">{formatPreco(pim.preco)}</strong>
                        {infos.length > 0 && (
                          <div className="crm-prev-infos">
                            {infos.map(({ ic, v }) => <span key={v} className="crm-prev-info-item">{ic} {v}</span>)}
                          </div>
                        )}
                        {m2 > 0 && (
                          <div className="crm-prev-gauge">
                            <div className="crm-prev-gauge-bar">
                              <div className="crm-prev-gauge-track" />
                              <div className="crm-prev-gauge-dot" style={{ left: `${Math.min(93, Math.max(7, m2pct))}%` }} />
                            </div>
                            <div className="crm-prev-gauge-labels"><span>Baixo</span><span>Médio</span><span>Alto</span></div>
                            <span className={`crm-prev-gauge-val crm-prev-gauge-val--${m2tag || 'ok'}`}>
                              {formatPreco(Math.round(m2))}/m²{m2tag === 'bom' ? ' · ótimo preço' : m2tag === 'alto' ? ' · acima da média' : ' · preço mediano'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}
                <div className="crm-match-list" data-lenis-prevent>
                  {matches.length === 0 && <p className="painel-meta">Nenhum imóvel publicado combina com esses critérios ainda. Ajuste os filtros.</p>}
                  {matches.slice(0, 80).map(({ im, m }) => {
                    const cod = String(im.codigo); const on = (sel.sugeridos || []).includes(cod)
                    return (
                      <div className={`crm-match ${on ? 'on' : ''} ${prevCod === cod ? 'prev' : ''}`} key={cod}
                        onClick={() => { if (prevCod !== cod) { setPrevSlide(0); setPrevCod(cod) } }}>
                        <input type="checkbox" checked={on} onChange={() => toggleSug(cod)} onClick={(e) => e.stopPropagation()} />
                        <img src={im.img} alt="" loading="lazy" />
                        <span className="crm-match-info"><b>{im.tipo} · {im.bairro}</b><i>{formatPreco(im.preco)} · {im.quartos}q · cód {cod}</i></span>
                      </div>
                    )
                  })}
                  {matches.length > 80 && <p className="painel-meta">Mostrando os 80 mais compatíveis de {matches.length}. Refine os filtros (bairro, preço, área) pra afunilar — ou use "Sugerir automático".</p>}
                </div>
              </div>
            </div>

            {sel.id && (() => {
              const fb = sel.feedback && typeof sel.feedback === 'object' ? sel.feedback : {}
              const likes = Object.keys(fb).filter((k) => fb[k] === 'like')
              const dislikes = Object.keys(fb).filter((k) => fb[k] === 'dislike')
              if (!sel.refinadoEm && likes.length === 0 && dislikes.length === 0) return null
              const linha = (cod) => { const im = resolverImovel(cod); return im ? `${im.tipo} · ${im.bairro} · ${formatPreco(im.preco)} (cód ${cod})` : `cód ${cod}` }
              return (
                <div className="admin-owner crm-feedback" style={{ marginTop: 14 }}>
                  <h3 className="det-rel-titulo" style={{ marginTop: 0 }}>O que o cliente sinalizou <span className="painel-meta">{sel.refinadoEm ? '· refinou em ' + new Date(sel.refinadoEm).toLocaleString('pt-BR') : ''}</span></h3>
                  {likes.length > 0 && (<><p className="crm-fb-tit crm-fb-tit--like">❤️ Curtiu ({likes.length})</p><ul className="crm-fb-lista">{likes.map((c) => <li key={c}>{linha(c)}</li>)}</ul></>)}
                  {dislikes.length > 0 && (<><p className="crm-fb-tit crm-fb-tit--dis">👎 Descartou ({dislikes.length})</p><ul className="crm-fb-lista">{dislikes.map((c) => <li key={c}>{linha(c)}</li>)}</ul></>)}
                  {likes.length === 0 && dislikes.length === 0 && <p className="painel-meta">Ajustou os filtros, mas ainda não curtiu/descartou imóveis.</p>}
                </div>
              )
            })()}

            {sel.id && (
              <div className="admin-owner" style={{ marginTop: 14 }}>
                <h3 className="det-rel-titulo" style={{ marginTop: 0 }}>Página do cliente</h3>
                <p className="calc-nota">Link exclusivo (privado, não indexado). Os botões abaixo <b>salvam suas alterações automaticamente</b> antes de abrir/enviar.</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="admin-btn" disabled={abrindo} onClick={() => comSalvar((c) => window.open(linkCliente(c), '_blank', 'noopener'))}>{abrindo ? '⏳ Salvando…' : 'Salvar e abrir página'}</button>
                  <button className="admin-btn" disabled={abrindo} onClick={() => comSalvar((c) => { navigator.clipboard?.writeText(linkCliente(c)); setLinkCopiado(true); setTimeout(() => setLinkCopiado(false), 1500) })}>{abrindo ? '⏳ Salvando…' : linkCopiado ? '✓ copiado' : 'Salvar e copiar link'}</button>
                  <button className="btn btn-gold" disabled={abrindo} onClick={() => comSalvar((c) => window.open(waLink(c.whatsapp, montarMsgCliente(c)), '_blank', 'noopener'))}>{abrindo ? '⏳ Salvando…' : 'Salvar e enviar no WhatsApp'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    )
  }

  // ——— LISTA ———
  return (
    <section>
      <div className="admin-barra">
        <button className="btn btn-gold" onClick={() => { setSel({ ...VAZIO }); setErro('') }}>+ Novo cliente</button>
        <span className="painel-meta">{clientes ? `${clientes.length} cliente(s)${clientes.filter((c) => c.novo).length ? ` · ${clientes.filter((c) => c.novo).length} novo(s) do site` : ''}` : 'Carregando…'}</span>
      </div>
      {clientes && clientes.length === 0 && <p className="section-sub">Nenhum cliente cadastrado ainda. Clique em <b>+ Novo cliente</b> para começar.</p>}

      {(() => {
        const fu = [...(clientes || [])].map((c) => ({ c, d: diasParado(c) })).map((x) => ({ ...x, s: scoreFollowUp(x.c, x.d) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 6)
        if (!fu.length) return null
        return (
          <div className="crm-followup">
            <b className="crm-fu-tit">⏰ Seu follow-up de hoje · {fu.length} {fu.length === 1 ? 'pessoa' : 'pessoas'} pra chamar</b>
            <div className="crm-fu-lista">
              {fu.map(({ c, d }) => (
                <div className="crm-fu-item" key={c.id}>
                  <span className="crm-fu-info"><b>{c.nome || 'Sem nome'}</b><i>{motivoFollowUp(c, d)}</i></span>
                  <span className="crm-fu-acoes">
                    <a className="admin-btn admin-btn--ok admin-btn--mini" href={waLink(c.whatsapp, `Olá${c.nome ? ' ' + c.nome.split(' ')[0] : ''}! Aqui é o Vinícius. Passando pra saber como está sua busca — separei novidades que podem te interessar.`)} target="_blank" rel="noopener">WhatsApp</a>
                    <button className="admin-btn admin-btn--mini" onClick={() => abrir(c)}>Abrir</button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      <div className="crm-lista">
        {[...(clientes || [])].sort((a, b) => (b.temNovidade ? 1 : 0) - (a.temNovidade ? 1 : 0)).map((c) => {
          const nm = novosMatch(c)
          return (
          <div className={`crm-card ${c.novo ? 'crm-card--novo' : ''} ${c.temNovidade ? 'crm-card--mexeu' : ''}`} key={c.id}>
            <div className="crm-card-top">
              <b>{c.nome || 'Sem nome'}</b>
              {c.status && <span className="crm-status-chip" style={{ background: STATUS_COR[c.status] || '#8a909c' }}>{c.status}</span>}
              {c.temNovidade && <span className="crm-mexeu-tag">🔔 Mexeu na página</span>}
              {c.novo && <span className="crm-novo-tag">✨ Novo · do site</span>}
              <span className="painel-meta">{c.whatsapp}</span>
            </div>
            <p className="crm-card-crit">{[c.finalidade, (c.tipos || []).join('/'), (c.bairros || []).slice(0, 2).join(', '), c.precoMax ? 'até ' + formatPreco(c.precoMax) : '', c.prazo ? '⏱ ' + c.prazo : ''].filter(Boolean).join(' · ')}</p>
            <p className="painel-meta">{(c.sugeridos || []).length} imóvel(is) na página{nm > 0 && <> · <b className="crm-oportunidade">🎯 {nm} novo{nm > 1 ? 's' : ''} combina{nm > 1 ? 'm' : ''}</b></>}</p>
            {diasParado(c) >= 3 && !['Fechado', 'Perdido'].includes(c.status) && <p className="crm-parado">⏰ parado há {diasParado(c)} dias — vale reaquecer</p>}
            <div className="crm-card-acoes">
              <select className="crm-status-sel" value={c.status || ''} onChange={(e) => mudarStatus(c, e.target.value)} title="Mudar status no funil">
                <option value="">Status…</option>
                {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button className="admin-btn" onClick={() => abrir(c)}>Abrir / editar</button>
              <a className="admin-btn" href={`${window.location.origin}/cliente/${c.id}`} target="_blank" rel="noopener">Página</a>
              <a className="admin-btn admin-btn--ok" href={waLink(c.whatsapp, `Olá${c.nome ? ' ' + c.nome.split(' ')[0] : ''}! Aqui é o Vinícius. Separei uma seleção de imóveis pensando no que você procura: ${window.location.origin}/cliente/${c.id}`)} target="_blank" rel="noopener">WhatsApp</a>
              <button className="admin-btn admin-btn--del" onClick={() => excluir(c.id)}>Excluir</button>
            </div>
          </div>
        )})}
      </div>

      {cadastros && cadastros.length > 0 && (
        <div className="crm-cadastros">
          <h3 className="det-rel-titulo">Cadastros do site (área do cliente) <span className="painel-meta">({cadastros.length})</span></h3>
          <p className="calc-nota">São visitantes que criaram conta no site (com favoritos). Clique em <b>Adicionar ao CRM</b> pra virar cliente — eu já trago nome, WhatsApp, bairros e os imóveis que ele favoritou como seleção inicial.</p>
          <div className="crm-lista">
            {cadastros.map((c) => (
              <div className="crm-card" key={c._key || c.token}>
                <div className="crm-card-top">
                  <b>{c.nome || 'Sem nome'}</b>
                  <span className="painel-meta">{c.fone}</span>
                </div>
                <p className="crm-card-crit">{[c.objetivo, c.bairros, c.faixa || 'faixa livre', c.email].filter(Boolean).join(' · ')}</p>
                <p className="painel-meta">❤️ {(c.favoritos || []).length} favoritos · 👁 {(c.historico || []).length} visitados · {new Date(c.atualizadoEm || 0).toLocaleDateString('pt-BR')}</p>
                <div className="crm-card-acoes">
                  <button className="btn btn-gold admin-btn--mini" onClick={() => adicionarAoCRM(c)}>+ Adicionar ao CRM</button>
                  <a className="admin-btn" href={waLink(c.fone, `Olá${c.nome ? ' ' + c.nome.split(' ')[0] : ''}! Aqui é o Vinícius. Vi que você criou conta no meu site, posso te ajudar na busca?`)} target="_blank" rel="noopener">WhatsApp</a>
                  {onExcluirCadastro && <button className="admin-btn admin-btn--del" onClick={() => onExcluirCadastro(c)}>Excluir</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </section>
  )
}
