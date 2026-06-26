import { useState, useEffect, useRef, useCallback } from 'react'

// Backup geral do cadastro -> Cloudflare R2 (bucket próprio).
// Catálogo inteiro organizado por bairro, 1 .zip por imóvel (dados + proprietário do
// cache + fotos). Roda em lotes resumíveis; nada é enviado a terceiros.

const _norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
const slug = (s) => (_norm(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)) || 'sem-bairro'
const fmtData = (ts) => { try { return new Date(ts).toLocaleString('pt-BR') } catch { return '' } }

export default function BackupPanel({ token }) {
  const [r2ok, setR2ok] = useState(null) // null=desconhecido, true, false
  const [motivoMsg, setMotivoMsg] = useState('')
  const [manifest, setManifest] = useState(null)
  const [running, setRunning] = useState(false)
  const [prog, setProg] = useState(null) // { done, total, fotos, comDono }
  const [msg, setMsg] = useState('')
  const [cod, setCod] = useState('')
  const pausaRef = useRef(false)
  const manRef = useRef(null)

  const post = useCallback((action, extra = {}) =>
    fetch('/api/backup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, token, ...extra }) })
      .then((r) => r.json()), [token])

  const carregarStatus = useCallback(async () => {
    try {
      const j = await post('status')
      if (j && j.motivo === 'r2') { setR2ok(false); setMotivoMsg(j.msg || ''); return }
      setR2ok(true); setManifest(j.manifest || null); manRef.current = j.manifest || null
    } catch { setMsg('Falha ao consultar o status do backup.') }
  }, [post])

  useEffect(() => { carregarStatus() }, [carregarStatus])

  // loop de lotes com 3 trabalhadores; cursor compartilhado (incremento síncrono = sem colisão)
  const rodar = async (inicio, totalInicial) => {
    pausaRef.current = false
    setRunning(true); setMsg('')
    let cursor = inicio
    let total = totalInicial || (manRef.current?.total) || 0
    let fotos = (manRef.current?.fotos) || 0
    let comDono = (manRef.current?.comDono) || 0
    let done = inicio
    let falhas = 0, incompletos = 0
    setProg({ done, total, fotos, comDono })
    const worker = async () => {
      while (!pausaRef.current) {
        const meu = cursor
        if (total && meu >= total) break
        cursor += 1
        const j = await post('lote', { from: meu, count: 1 }).catch(() => null)
        if (j && j.ok) {
          fotos += j.copiadas || 0; comDono += j.comDono || 0; if (j.total) total = j.total
          if (j.falhou && j.falhou.length) falhas += j.falhou.length
          else if (j.previstas && (j.copiadas || 0) < j.previstas) incompletos += 1
        } else { falhas += 1 } // lote sem resposta/erro (rede, sessão, Worker) — NÃO é sucesso
        done += 1
        setProg({ done: Math.min(done, total || done), total, fotos, comDono })
        // persiste cursor + contadores autoritativos de tempos em tempos (só este cliente grava)
        if (done % 8 === 0) post('progresso', { cursor: done, fotos, comDono, total }).catch(() => {})
      }
    }
    await Promise.all([worker(), worker(), worker()])
    const okFinal = !pausaRef.current && !!total && done >= total && falhas === 0
    await post('progresso', { cursor: done, fotos, comDono, total, concluido: okFinal }).catch(() => {})
    setRunning(false)
    await carregarStatus()
    setProg(null) // tira a barra otimista; o painel passa a refletir o manifesto autoritativo
    setMsg(
      pausaRef.current ? '⏸ Backup pausado — dá pra continuar quando quiser.'
        : falhas ? `⚠ Backup terminou com ${falhas} imóvel(is) com erro — clique em "Refazer backup completo" para fechar os buracos.`
          : incompletos ? `✓ Backup no R2 · ${incompletos} imóvel(is) tinham muitas fotos e a galeria foi cortada (veja _FOTOS-CORTADAS.txt dentro deles).`
            : '✓ Backup concluído e guardado no R2.'
    )
  }

  const iniciar = async () => {
    if (running) return
    if (!window.confirm('Iniciar/atualizar o backup completo do catálogo (≈3.400 imóveis com fotos) no R2? Pode levar um tempo — você pode pausar e continuar.')) return
    setMsg('Preparando catálogo…'); setProg(null)
    const j = await post('iniciar').catch(() => null)
    if (!j || !j.ok) { setMsg((j && j.msg) || 'Não consegui iniciar o backup.'); return }
    manRef.current = { total: j.total, cursor: 0, fotos: 0, comDono: 0 }
    await rodar(0, j.total)
  }

  const continuar = async () => {
    if (running) return
    const m = manRef.current
    if (!m || !m.total) { iniciar(); return }
    await rodar(m.cursor || 0, m.total)
  }

  const pausar = () => { pausaRef.current = true; setMsg('Parando após os lotes em andamento…') }

  const baixarChave = async (key, nome) => {
    setMsg('Baixando ' + nome + '…')
    try {
      const r = await fetch('/api/backup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'baixar', token, key }) })
      if (!r.ok) { setMsg('Arquivo ainda não está no backup (rode o backup primeiro).'); return }
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
      setMsg('✓ ' + nome + ' baixado.')
    } catch { setMsg('Falha ao baixar.') }
  }

  const baixarImovel = async () => {
    const c = String(cod || '').replace(/\D/g, '')
    if (!c) { setMsg('Digite o código do imóvel.'); return }
    // descobre o bairro pelo catálogo (pra montar a chave <slug>/<cod>.zip)
    setMsg('Localizando o imóvel no catálogo…')
    const cat = await fetch('/catalogo.json').then((r) => r.json()).catch(() => null)
    const it = ((cat && cat.imoveis) || []).find((x) => String(x.codigo) === c)
    if (!it) { setMsg('Código não encontrado no catálogo.'); return }
    await baixarChave(`backup/imoveis/${slug(it.bairro)}/${c}.zip`, `imovel-${c}.zip`)
  }

  // ——— R2 ainda não configurado ———
  if (r2ok === false) {
    return (
      <div className="section--light" style={{ maxWidth: 760 }}>
        <h2 className="section-title" style={{ fontSize: '1.4rem' }}>💾 Backup geral do cadastro</h2>
        <p className="section-sub">{motivoMsg || 'O armazenamento do backup ainda não está ligado.'}</p>
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginTop: 12 }}>
          <p style={{ margin: '0 0 8px', fontWeight: 700 }}>Como ligar (uma vez só, no painel da Cloudflare):</p>
          <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
            <li>Cloudflare → <b>R2</b> → <b>Create bucket</b> → nome <code>vg-backups</code>.</li>
            <li>Pages → projeto do site → <b>Settings → Functions → R2 bucket bindings</b> → Add: variável <code>BACKUPS</code> = bucket <code>vg-backups</code>.</li>
            <li>Salvar e fazer um novo deploy (ou aguardar o próximo push). Recarregue esta aba.</li>
          </ol>
          <p className="section-sub" style={{ marginTop: 10 }}>Guia completo: <code>docs/backup-r2-setup.md</code> no projeto.</p>
        </div>
        <button className="admin-btn" style={{ marginTop: 12 }} onClick={carregarStatus}>↺ Verificar de novo</button>
      </div>
    )
  }

  const m = manifest
  const pct = prog && prog.total ? Math.round((prog.done / prog.total) * 100) : (m && m.total ? Math.round(((m.cursor || 0) / m.total) * 100) : 0)

  return (
    <div className="section--light" style={{ maxWidth: 820 }}>
      <h2 className="section-title" style={{ fontSize: '1.4rem' }}>💾 Backup geral do cadastro <span style={{ fontSize: '.8rem', fontWeight: 500, color: 'var(--muted)' }}>· Cloudflare R2</span></h2>
      <p className="section-sub" style={{ marginTop: 4 }}>
        Salva o catálogo inteiro no seu próprio R2, organizado por bairro — 1 arquivo .zip por imóvel
        (dados + descrição + <b>proprietário já captado</b> + fotos), mais <code>catalogo.json</code> e <code>imoveis.csv</code> na raiz.
        As fotos vêm do CDN público; o proprietário só do que já está no cache (não faz login em massa no Imoview).
      </p>

      {/* estado atual */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 14 }}>
        <Bloco rotulo="Imóveis no backup" valor={m ? `${m.cursor || 0} / ${m.total || '—'}` : '—'} />
        <Bloco rotulo="Fotos copiadas" valor={m ? (m.fotos || 0).toLocaleString('pt-BR') : '—'} />
        <Bloco rotulo="Com proprietário" valor={m ? (m.comDono || 0).toLocaleString('pt-BR') : '—'} />
        <Bloco rotulo="Situação" valor={m ? (m.concluido ? '✓ Concluído' : (m.cursor ? 'Em andamento' : 'Não iniciado')) : 'Não iniciado'} />
      </div>
      {m?.atualizadoEm && <p className="section-sub" style={{ marginTop: 6, fontSize: '.78rem' }}>Atualizado em {fmtData(m.atualizadoEm)}</p>}

      {/* barra de progresso */}
      {(running || (prog && prog.total)) && (
        <div style={{ marginTop: 14 }}>
          <div style={{ height: 12, background: '#ece7df', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ width: pct + '%', height: '100%', background: '#212b3d', transition: 'width .3s' }} />
          </div>
          <p className="section-sub" style={{ marginTop: 6 }}>
            {prog ? `${prog.done.toLocaleString('pt-BR')} / ${(prog.total || 0).toLocaleString('pt-BR')} imóveis · ${prog.fotos.toLocaleString('pt-BR')} fotos · ${prog.comDono} com proprietário` : 'Processando…'} ({pct}%)
          </p>
        </div>
      )}

      {/* ações */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
        {!running && (
          <button className="admin-btn admin-btn--gold" onClick={iniciar}>▶ {m && m.cursor ? 'Refazer backup completo' : 'Iniciar backup completo'}</button>
        )}
        {!running && m && m.cursor > 0 && !m.concluido && (
          <button className="admin-btn" onClick={continuar}>⏯ Continuar de onde parou ({m.cursor}/{m.total})</button>
        )}
        {running && <button className="admin-btn" onClick={pausar}>⏸ Pausar</button>}
        <button className="admin-btn" onClick={carregarStatus} disabled={running}>↺ Atualizar status</button>
      </div>

      {msg && <p className="section-sub" style={{ marginTop: 12, fontWeight: 600 }}>{msg}</p>}

      {/* downloads */}
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <p style={{ fontWeight: 700, margin: '0 0 10px' }}>Baixar do backup</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <button className="admin-btn" onClick={() => baixarChave('backup/atual/catalogo.json', 'catalogo.json')}>⬇ Catálogo (JSON)</button>
          <button className="admin-btn" onClick={() => baixarChave('backup/atual/imoveis.csv', 'imoveis.csv')}>⬇ Planilha (CSV)</button>
          <span style={{ width: 1, height: 26, background: 'var(--border)' }} />
          <input value={cod} onChange={(e) => setCod(e.target.value)} placeholder="código do imóvel"
            style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, background: '#fff', width: 150 }} />
          <button className="admin-btn" onClick={baixarImovel}>⬇ Baixar imóvel (.zip)</button>
        </div>
        <p className="section-sub" style={{ marginTop: 8, fontSize: '.78rem' }}>
          Tudo também fica navegável no painel da Cloudflare → R2 → <code>vg-backups</code> → <code>backup/imoveis/&lt;bairro&gt;/</code>.
        </p>
      </div>
    </div>
  )
}

function Bloco({ rotulo, valor }) {
  return (
    <div style={{ flex: '1 1 150px', minWidth: 140, background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ fontSize: '.72rem', textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--muted)', fontWeight: 700 }}>{rotulo}</div>
      <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: 2 }}>{valor}</div>
    </div>
  )
}
