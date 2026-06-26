import { useState, useEffect, useRef, useCallback } from 'react'
import { montarZipsBairro } from '../bairroZip'
import { subirParaDrive, driveConfigurado } from '../gdrive'

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
  // ☁ Google Drive (2 TB)
  const [driveRun, setDriveRun] = useState(false)
  const [driveTxt, setDriveTxt] = useState('')
  const [drivePct, setDrivePct] = useState(null)
  const [driveResumo, setDriveResumo] = useState('')
  const [driveLink, setDriveLink] = useState('')
  const driveStopRef = useRef(false)

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

  // ——— Google Drive (2 TB) ———
  const postAdmin = (action, extra = {}) =>
    fetch('/api/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, token, ...extra }) }).then((r) => r.json())

  // Camada 1 → Drive: espelha o backup de DADOS (pequeno) no seu Drive, 1 clique.
  const dadosParaDrive = async () => {
    if (driveRun) return
    if (!driveConfigurado()) { setDriveResumo('Google Drive não configurado (falta o Client ID).'); return }
    setDriveRun(true); setDriveLink(''); setDrivePct(null); setDriveTxt(''); setDriveResumo('Buscando o último backup de dados…')
    try {
      const r = await fetch('/api/backup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'baixar', token, key: 'backup/dados/atual.json' }) })
      if (!r.ok) { setDriveResumo('Ainda não há backup de dados no R2 — rode o backup automático (GitHub → Actions → Run workflow) primeiro.'); setDriveRun(false); return }
      const blob = await r.blob()
      setDriveTxt('Enviando pro Drive…'); setDrivePct(0)
      const res = await subirParaDrive('backup-dados-site.json', blob, (f) => setDrivePct(Math.round(f * 100)))
      setDrivePct(100); setDriveResumo('✓ Backup de dados no seu Google Drive.')
      if (res?.folderLink) setDriveLink(res.folderLink)
    } catch (e) { setDriveResumo('Falha: ' + ((e && e.message) || 'erro') + '.'); setDrivePct(null) }
    setDriveRun(false)
  }

  // Camada 2 → Drive: SITE INTEIRO (todas as fotos) por bairro, resumível. Proprietário do cache.
  const LSK_DRIVE = 'vg_backup_drive_bairros'
  const subirSiteDrive = async () => {
    if (driveRun) return
    if (!driveConfigurado()) { setDriveResumo('Google Drive não configurado (falta o Client ID).'); return }
    if (!window.confirm('Subir o SITE INTEIRO pro seu Google Drive (todas as fotos, por bairro)? É demorado (vários GB), mas é resumível — pode pausar e continuar depois. Os proprietários entram do cache (não estressa o Imoview).')) return
    setDriveRun(true); driveStopRef.current = false; setDriveLink(''); setDriveResumo(''); setDriveTxt('Carregando catálogo…'); setDrivePct(0)
    try {
      const cat = await fetch('/catalogo.json').then((r) => r.json()).catch(() => null)
      const grupos = {}
      for (const imovel of (cat?.imoveis || [])) { const b = (imovel.bairro || '').trim() || 'Sem bairro'; (grupos[b] ??= []).push(imovel) }
      const bairros = Object.keys(grupos).sort()
      const total = bairros.length
      if (!total) { setDriveResumo('Catálogo vazio.'); setDriveRun(false); return }
      let done = {}; try { done = JSON.parse(localStorage.getItem(LSK_DRIVE) || '{}') } catch {}
      let feitosBairros = bairros.filter((b) => done[b]).length
      for (const bairro of bairros) {
        if (driveStopRef.current) break
        if (done[bairro]) continue
        const lista = grupos[bairro]
        const overall = (w) => Math.round(((feitosBairros + (w / 100)) / total) * 100)
        const res = await montarZipsBairro({
          bairro, lista, postAdmin, ownerMode: 'cache', uploadShare: 0.4,
          onProg: (pct, txt) => { setDriveTxt(`Bairro ${feitosBairros + 1}/${total} — ${txt}`); setDrivePct(overall(pct)) },
          onParte: async (blob, nome, pi, np, base, span) => { const r2 = await subirParaDrive(nome, blob, (f) => setDrivePct(overall(base + f * span))); if (r2?.folderLink) setDriveLink(r2.folderLink) },
        })
        if (res && res.abort) { setDriveResumo('Interrompido (' + res.abort + '). Tente continuar mais tarde.'); break }
        done[bairro] = true; feitosBairros++
        try { localStorage.setItem(LSK_DRIVE, JSON.stringify(done)) } catch {}
        setDrivePct(overall(0))
      }
      const restantes = bairros.filter((b) => !done[b]).length
      setDrivePct(restantes ? null : 100)
      setDriveResumo(
        driveStopRef.current ? `⏸ Pausado — ${feitosBairros}/${total} bairros no Drive. Clique de novo pra continuar de onde parou.`
          : restantes ? `Parou com ${restantes} bairro(s) faltando — clique de novo pra continuar.`
            : `✓ Site inteiro no seu Google Drive · ${total} bairros.`
      )
    } catch (e) { setDriveResumo('Falha: ' + ((e && e.message) || 'erro') + '.'); setDrivePct(null) }
    setDriveRun(false)
  }
  const pausarDrive = () => { driveStopRef.current = true; setDriveTxt('Parando após o bairro atual…') }
  const reiniciarDrive = () => { try { localStorage.removeItem(LSK_DRIVE) } catch {}; setDriveResumo('Progresso zerado — o próximo "Subir site inteiro" recomeça do zero.') }

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

  // Seção do Google Drive — NÃO depende do R2 (sobe direto do navegador pro seu Drive),
  // então aparece mesmo quando o R2 ainda não está configurado.
  const secaoDrive = driveConfigurado() ? (
    <div style={{ marginTop: 16, padding: 16, background: '#fff', border: '1px solid var(--border)', borderRadius: 12 }}>
      <p style={{ fontWeight: 800, margin: '0 0 4px' }}>☁ Enviar pro seu Google Drive <span style={{ fontSize: '.8rem', fontWeight: 500, color: 'var(--muted)' }}>· 2 TB · não precisa de R2</span></p>
      <p className="section-sub" style={{ margin: '0 0 12px', fontSize: '.84rem' }}>
        Cópia no seu Drive, pasta <b>"Rotina Imóveis — Backups"</b>. O <b>site inteiro</b> (fotos) é pesado e <b>resumível</b> (pausa e continua). Proprietário entra do cache — sem estressar o Imoview.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <button className="admin-btn admin-btn--gold" onClick={subirSiteDrive} disabled={driveRun}>☁ Subir SITE INTEIRO → Drive (por bairro)</button>
        <button className="admin-btn" onClick={dadosParaDrive} disabled={driveRun} title="Espelha o backup de dados (precisa do R2 ligado)">⬆ Backup de dados → Drive</button>
        {driveRun && <button className="admin-btn" onClick={pausarDrive}>⏸ Pausar</button>}
        {!driveRun && <button className="admin-btn" onClick={reiniciarDrive} title="Esquece os bairros já enviados e recomeça do zero no próximo envio">↺ Zerar progresso</button>}
      </div>
      {drivePct != null && (
        <div style={{ height: 10, background: '#ece7df', borderRadius: 6, overflow: 'hidden', marginTop: 12 }} role="progressbar" aria-valuenow={drivePct} aria-valuemin={0} aria-valuemax={100}>
          <div style={{ width: drivePct + '%', height: '100%', background: '#212b3d', transition: 'width .3s' }} />
        </div>
      )}
      {driveTxt && <p className="section-sub" style={{ marginTop: 6 }}>{driveTxt}{drivePct != null ? ` · ${drivePct}%` : ''}</p>}
      {driveResumo && <p className="section-sub" style={{ marginTop: 6, fontWeight: 600 }}>{driveResumo} {driveLink && <a href={driveLink} target="_blank" rel="noopener noreferrer">Abrir pasta no Drive →</a>}</p>}
    </div>
  ) : null

  // ——— R2 ainda não configurado ———
  if (r2ok === false) {
    return (
      <div className="section--light" style={{ maxWidth: 820 }}>
        <h2 className="section-title" style={{ fontSize: '1.4rem' }}>💾 Backup</h2>
        <p className="section-sub" style={{ marginTop: 4 }}>
          O backup pro seu <b>Google Drive funciona já</b> — é só clicar abaixo. (O backup no Cloudflare R2 é um <b>extra opcional</b>, ainda não ligado.)
        </p>
        {secaoDrive}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginTop: 18, opacity: 0.92 }}>
          <p style={{ margin: '0 0 8px', fontWeight: 700 }}>Backup automático no Cloudflare R2 <span style={{ fontWeight: 500, color: 'var(--muted)' }}>(opcional) — ainda não ligado</span></p>
          <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
            <li>Cloudflare → <b>R2</b> → <b>Create bucket</b> → nome <code>vg-backups</code>.</li>
            <li>Pages → projeto do site → <b>Settings → Functions → R2 bucket bindings</b> → Add: variável <code>BACKUPS</code> = bucket <code>vg-backups</code>.</li>
            <li>Salvar e fazer um novo deploy. Recarregue esta aba.</li>
          </ol>
          <p className="section-sub" style={{ marginTop: 10 }}>Guia: <code>docs/backup-r2-setup.md</code>.</p>
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

      {secaoDrive}

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

      {/* backup automático diário (dados insubstituíveis) */}
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <p style={{ fontWeight: 700, margin: '0 0 4px' }}>🔒 Backup automático dos dados (diário)</p>
        <p className="section-sub" style={{ margin: '0 0 10px', fontSize: '.82rem' }}>
          CRM, leads, clientes, <b>proprietários captados</b> e conversões — o que só existe no site —
          são salvos sozinhos todo dia no R2. <a href="https://github.com/gratoncreative/viniciusgraton-imoveis/actions" target="_blank" rel="noopener noreferrer">Ver execuções (GitHub Actions)</a>. Setup: <code>docs/backup-automatico-setup.md</code>.
        </p>
        <button className="admin-btn admin-btn--gold" onClick={() => baixarChave('backup/dados/atual.json', 'backup-dados-site.json')}>⬇ Baixar último backup de dados</button>
      </div>

      {/* downloads do catálogo/imóveis */}
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <p style={{ fontWeight: 700, margin: '0 0 10px' }}>Baixar do backup (catálogo / imóveis)</p>
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
