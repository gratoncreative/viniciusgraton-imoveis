import { useEffect, useState, useMemo } from 'react'
import { avaliarMatch, formatPreco } from '../data'

// WhatsApp com DDI Brasil
const waLink = (wa, msg) => { const d = String(wa || '').replace(/\D/g, ''); if (d.length < 8) return null; const full = d.length <= 11 ? '55' + d : d; return `https://wa.me/${full}?text=${encodeURIComponent(msg)}` }
const pNome = (n) => (n ? String(n).trim().split(' ')[0] : '')

// #5 e #14 — Oportunidades de contato do dia.
// Casa imóveis NOVOS com os critérios salvos de cada cliente (#5) e quedas de preço
// com seleção/favoritos (#14). Ao enviar o WhatsApp, marca o imóvel como AVISADO àquele
// cliente (KV) — assim a oportunidade SOME e não reaparece nos dias seguintes (sem reenvio).
export default function CrmOportunidades({ clientes = [], cadastros = [], linkCliente, token, onMudou }) {
  const [nov, setNov] = useState(null)
  const [avisadosUI, setAvisadosUI] = useState(() => new Set()) // `${id}|${cod}` marcados nesta sessão
  useEffect(() => {
    let vivo = true
    fetch('/novidades.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((d) => { if (vivo) setNov(d) }).catch(() => {})
    return () => { vivo = false }
  }, [])
  const novos = nov?.novos || []
  const baixaram = nov?.baixaram || []

  // já avisei esse imóvel pra esse cliente? (persistido em c.avisados + marcados nesta sessão)
  const jaAvisou = (id, cod) => {
    if (!id) return false
    if (avisadosUI.has(id + '|' + cod)) return true
    const c = clientes.find((x) => x.id === id)
    return !!(c && (c.avisados || []).map(String).includes(String(cod)))
  }
  const marcarAvisado = (id, codigos) => {
    const cods = (codigos || []).map(String).filter(Boolean)
    if (!id || !cods.length) return
    setAvisadosUI((prev) => { const n = new Set(prev); cods.forEach((cod) => n.add(id + '|' + cod)); return n })
    fetch('/api/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'crm-avisado', token, id, codigos: cods }) })
      .then(() => { if (onMudou) setTimeout(onMudou, 400) }).catch(() => {})
  }

  const alertasNovos = useMemo(() => {
    if (!novos.length) return []
    return clientes.map((c) => {
      if (['Fechado', 'Perdido'].includes(c.status)) return null
      const temPref = (c.tipos?.length || c.bairros?.length || +c.precoMax > 0 || +c.quartosMin > 0)
      if (!temPref) return null
      const prefs = { tipos: c.tipos, bairros: c.bairros, precoMin: +c.precoMin || 0, precoMax: +c.precoMax || 0, quartosMin: +c.quartosMin || 0, suitesMin: +c.suitesMin || 0, vagasMin: +c.vagasMin || 0, areaMin: +c.areaMin || 0 }
      const hits = novos.filter((im) => avaliarMatch(im, prefs).ok && !jaAvisou(c.id, im.codigo))
      return hits.length ? { c, hits } : null
    }).filter(Boolean).sort((a, b) => b.hits.length - a.hits.length)
  }, [clientes, novos, avisadosUI])

  const alertasQueda = useMemo(() => {
    if (!baixaram.length) return []
    const res = []
    for (const im of baixaram) {
      const cod = String(im.codigo)
      const pct = im.precoAnterior > 0 ? Math.round((1 - im.preco / im.precoAnterior) * 100) : 0
      const interessados = []
      for (const c of clientes) {
        if (jaAvisou(c.id, cod)) continue
        const liked = c.feedback && c.feedback[cod] === 'like'
        const naSel = (c.sugeridos || []).map(String).includes(cod)
        if (liked || naSel) interessados.push({ id: c.id, nome: c.nome, wa: c.whatsapp, como: liked ? 'curtiu' : 'estava na sua seleção' })
      }
      for (const ca of cadastros) {
        if ((ca.favoritos || []).map(String).includes(cod) && !avisadosUI.has('conta:' + (ca.token || ca.nome) + '|' + cod)) {
          interessados.push({ id: null, contaKey: 'conta:' + (ca.token || ca.nome), nome: ca.nome, wa: ca.fone, como: 'favoritou no site' })
        }
      }
      if (interessados.length) res.push({ im, cod, pct, interessados })
    }
    return res
  }, [clientes, cadastros, baixaram, avisadosUI])

  if (!novos.length && !baixaram.length) return null
  const totalAlertas = alertasNovos.length + alertasQueda.reduce((s, q) => s + q.interessados.length, 0)
  if (!totalAlertas) return null

  const msgNovo = (c, hits) => {
    const im = hits[0]
    const extra = hits.length > 1 ? ` (e mais ${hits.length - 1})` : ''
    return `Oi${pNome(c.nome) ? ' ' + pNome(c.nome) : ''}! Aqui é o Vinícius, do atendimento da Rotina. Entrou um imóvel novo com a sua cara.. ${im.tipo} no ${im.bairro} por ${formatPreco(im.preco)}${extra}.${c && linkCliente ? `\n\nDá uma olhada na sua seleção atualizada.. ${linkCliente(c)}` : ''}\n\nQuer que eu organize uma visita? 🤝`
  }
  const msgQueda = (im, pct, nome) => `Oi${pNome(nome) ? ' ' + pNome(nome) : ''}! Aqui é o Vinícius. Aquele ${im.tipo} no ${im.bairro} ${pct > 0 ? `baixou ${pct}%` : 'teve o preço reduzido'} — agora está ${formatPreco(im.preco)}${im.precoAnterior ? ` (era ${formatPreco(im.precoAnterior)})` : ''}. Boa hora pra negociar. Quer que eu veja os detalhes pra você?`

  return (
    <details className="crm-oport" open>
      <summary>🎯 Oportunidades de contato · {totalAlertas} {totalAlertas === 1 ? 'pessoa' : 'pessoas'} pra avisar hoje</summary>

      {alertasNovos.length > 0 && (
        <div className="crm-oport-bloco">
          <p className="crm-oport-tit">✨ Imóveis novos que combinam com clientes</p>
          {alertasNovos.map(({ c, hits }) => {
            const wa = waLink(c.whatsapp, msgNovo(c, hits))
            return (
              <div className="crm-oport-row" key={c.id}>
                <span className="crm-oport-info"><b>{c.nome || 'Sem nome'}</b><i>{hits.length} novo{hits.length > 1 ? 's' : ''} ({hits.slice(0, 2).map((im) => `${im.tipo} ${im.bairro}`).join(', ')}{hits.length > 2 ? '…' : ''})</i></span>
                {wa && <a className="admin-btn admin-btn--ok admin-btn--mini" href={wa} target="_blank" rel="noopener noreferrer" onClick={() => marcarAvisado(c.id, hits.map((h) => h.codigo))}>WhatsApp ✓</a>}
              </div>
            )
          })}
        </div>
      )}

      {alertasQueda.length > 0 && (
        <div className="crm-oport-bloco">
          <p className="crm-oport-tit">↓ Quedas de preço em quem favoritou / tinha na seleção</p>
          {alertasQueda.map(({ im, cod, pct, interessados }) => (
            <div className="crm-oport-queda" key={im.codigo}>
              <p className="crm-oport-queda-im"><b>{im.tipo} · {im.bairro}</b> — {formatPreco(im.preco)} {pct > 0 && <span className="crm-oport-pct">↓ {pct}%</span>}</p>
              {interessados.map((p, i) => {
                const wa = waLink(p.wa, msgQueda(im, pct, p.nome))
                const marcar = () => { if (p.id) marcarAvisado(p.id, [cod]); else setAvisadosUI((prev) => new Set(prev).add(p.contaKey + '|' + cod)) }
                return (
                  <div className="crm-oport-row" key={i}>
                    <span className="crm-oport-info"><b>{p.nome || 'Sem nome'}</b><i>{p.como}</i></span>
                    {wa && <a className="admin-btn admin-btn--ok admin-btn--mini" href={wa} target="_blank" rel="noopener noreferrer" onClick={marcar}>WhatsApp ✓</a>}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
      <p className="painel-meta" style={{ marginTop: 8 }}>Ao clicar em <b>WhatsApp</b>, o imóvel é marcado como avisado àquele cliente e sai daqui — não reaparece nem reenvia nos próximos dias. Baseado no último sync.</p>
    </details>
  )
}
