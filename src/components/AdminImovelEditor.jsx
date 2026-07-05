import { useState, useEffect } from 'react'
import { fotosDe } from '../data'
import '../styles/admin-editores.css'

const LSK = 'vg_admin_token'
const TIPOS = ['Apartamento', 'Casa', 'Casa em condomínio', 'Cobertura', 'Kitnet/Studio', 'Sala comercial', 'Galpão', 'Lote', 'Terreno', 'Chácara']
const FINALIDADES = ['Venda', 'Aluguel', 'Venda e Aluguel']

const NUM = ['preco', 'precoAnterior', 'quartos', 'suites', 'banheiros', 'vagas', 'area', 'areaLote', 'condominio']

// redimensiona a foto no navegador (máx 1400px, JPEG) antes de subir — fica leve no KV
const resizeToDataUrl = (file, max = 1400, q = 0.82) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = (ev) => {
    const img = new Image()
    img.onload = () => {
      let w = img.width, h = img.height
      if (w > h && w > max) { h = Math.round((h * max) / w); w = max } else if (h > max) { w = Math.round((w * max) / h); h = max }
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h
      cv.getContext('2d').drawImage(img, 0, 0, w, h)
      resolve(cv.toDataURL('image/jpeg', q))
    }
    img.onerror = reject
    img.src = ev.target.result
  }
  reader.onerror = reject
  reader.readAsDataURL(file)
})

const baseDe = (im) => ({
  titulo: im.titulo || '', tipo: im.tipo || '', finalidade: im.finalidade || '', bairro: im.bairro || '', cidade: im.cidade || '',
  endereco: im.endereco || '', pontoReferencia: im.pontoReferencia || '', descricao: im.descricao || '',
  preco: im.preco || 0, precoAnterior: im.precoAnterior || 0, quartos: im.quartos || 0, suites: im.suites || 0,
  banheiros: im.banheiros || 0, vagas: im.vagas || 0, area: im.area || 0, areaLote: im.areaLote || 0, condominio: im.condominio || 0,
  andar: (im.andar ?? '') === '' ? '' : im.andar, elevador: !!im.elevador, video: im.video || '', tour360: im.tour360 || '', tour3d: im.tour3d || '',
  destaque: !!im.destaque, oculto: false, fotos: fotosDe(im),
})

// Editor de anúncio do admin. Dois modos:
//  • Não-controlado (padrão, página de detalhe): mostra o botão flutuante "Editar anúncio".
//  • Controlado (a partir da listagem /imoveis): some o FAB; o pai abre passando `controlled`,
//    `open` e `onClose`. Ao salvar, dispara onSaved(campos) — o pai reflete no card na hora.
export default function AdminImovelEditor({ im, onSaved, controlled = false, open: openProp, onClose }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [openInner, setOpenInner] = useState(false)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')

  const open = controlled ? !!openProp : openInner

  useEffect(() => {
    const check = () => setIsAdmin(!!localStorage.getItem(LSK))
    check()
    window.addEventListener('storage', check)
    return () => window.removeEventListener('storage', check)
  }, [])

  // Carrega o formulário ao abrir (e quando troca de imóvel sem fechar). Busca o que já
  // está salvo no KV para refletir exatamente a edição anterior.
  useEffect(() => {
    if (!open || !im) { if (!open) { setForm(null); setMsg('') } return }
    let vivo = true
    setForm(baseDe(im)); setMsg('')
    const tk = localStorage.getItem(LSK)
    ;(async () => {
      try {
        const r = await fetch('/api/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'imovel-get', token: tk, codigo: im.codigo }) })
        const j = await r.json()
        if (vivo && j.ok && j.registro && j.registro.campos) {
          const c = j.registro.campos
          setForm((f) => ({ ...f, ...c, fotos: (Array.isArray(c.fotos) && c.fotos.length) ? c.fotos : f.fotos }))
        }
      } catch {}
    })()
    return () => { vivo = false }
  }, [open, im?.codigo])

  if (!isAdmin || !im) return null
  const token = localStorage.getItem(LSK)
  const codigo = im.codigo

  const fechar = () => { if (controlled) onClose && onClose(); else setOpenInner(false) }

  const post = async (action, extra = {}) => {
    const r = await fetch('/api/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, token, codigo, ...extra }) })
    let j = {}; try { j = await r.json() } catch {}
    return { status: r.status, j }
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const addFoto = async (file) => {
    if (!file) return
    setUploading(true); setMsg('')
    try {
      const dataUrl = await resizeToDataUrl(file)
      const { j } = await post('img-upload', { dataUrl })
      if (j.ok && j.url) set('fotos', [...(form.fotos || []), j.url])
      else setMsg(j.msg || 'Falha ao subir a foto.')
    } catch { setMsg('Não consegui processar essa imagem.') }
    setUploading(false)
  }
  const removerFoto = (i) => set('fotos', (form.fotos || []).filter((_, k) => k !== i))
  const moverFoto = (i, dir) => {
    const arr = [...(form.fotos || [])]; const j = i + dir
    if (j < 0 || j >= arr.length) return
    ;[arr[i], arr[j]] = [arr[j], arr[i]]; set('fotos', arr)
  }
  const tornarCapa = (i) => {
    const arr = [...(form.fotos || [])]; const [f] = arr.splice(i, 1); arr.unshift(f); set('fotos', arr)
  }

  const salvar = async () => {
    setSaving(true); setMsg('')
    const campos = { ...form }
    NUM.forEach((k) => { campos[k] = Number(campos[k]) || 0 })
    if (campos.andar === '' || campos.andar == null) delete campos.andar; else campos.andar = Number(campos.andar) || 0
    try {
      const { status, j } = await post('imovel-save', { campos })
      if (status === 401) { setMsg('Sessão de admin expirada. Entre de novo em /admin e tente outra vez.'); setSaving(false); return }
      if (j.ok) {
        setMsg('✓ Anúncio atualizado e no ar')
        onSaved && onSaved(j.campos || campos)
        if (controlled) setTimeout(fechar, 700)
      } else setMsg(j.msg || 'Não consegui salvar.')
    } catch { setMsg('Falha de conexão. Tente de novo.') }
    setSaving(false)
  }

  const fotos = form?.fotos || []

  return (
    <>
      {!controlled && (
        <button className="aie-fab" onClick={() => setOpenInner((v) => !v)} title="Editar este anúncio (admin)">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
          Editar anúncio
        </button>
      )}

      {open && form && (
        <div className="aie-overlay" onClick={(e) => { if (e.target === e.currentTarget) fechar() }}>
          <div className="aie-modal" role="dialog" aria-label="Editar anúncio">
            <div className="aie-head">
              <h3>Editar anúncio · cód. {codigo}</h3>
              <button className="aie-x" onClick={fechar} aria-label="Fechar">✕</button>
            </div>

            <div className="aie-body">
              {/* Fotos */}
              <div className="aie-bloco">
                <label className="aie-lbl">Fotos <span>· a 1ª é a capa</span></label>
                <div className="aie-fotos">
                  {fotos.map((src, i) => (
                    <div className={`aie-foto ${i === 0 ? 'capa' : ''}`} key={src + i}>
                      <img src={src} alt="" loading="lazy" />
                      {i === 0 && <span className="aie-foto-capa">Capa</span>}
                      <div className="aie-foto-acoes">
                        {i !== 0 && <button type="button" onClick={() => tornarCapa(i)} title="Tornar capa">★</button>}
                        <button type="button" onClick={() => moverFoto(i, -1)} title="Mover p/ esquerda" disabled={i === 0}>‹</button>
                        <button type="button" onClick={() => moverFoto(i, 1)} title="Mover p/ direita" disabled={i === fotos.length - 1}>›</button>
                        <button type="button" className="aie-foto-del" onClick={() => removerFoto(i)} title="Remover">🗑</button>
                      </div>
                    </div>
                  ))}
                  <label className="aie-foto-add">
                    {uploading ? '⏳' : '+ Foto'}
                    <input type="file" accept="image/*" hidden disabled={uploading} onChange={(e) => addFoto(e.target.files && e.target.files[0])} />
                  </label>
                </div>
              </div>

              {/* Texto */}
              <div className="aie-bloco">
                <label className="aie-lbl">Título <span>· vazio = "{im.tipo} no {im.bairro}"</span></label>
                <input className="aie-inp" value={form.titulo} onChange={(e) => set('titulo', e.target.value)} placeholder={`${im.tipo} no ${im.bairro}`} maxLength={140} />
                <label className="aie-lbl" style={{ marginTop: 12 }}>Descrição</label>
                <textarea className="aie-inp" rows="6" value={form.descricao} onChange={(e) => set('descricao', e.target.value)} placeholder="Texto do anúncio…" />
              </div>

              {/* Campos */}
              <div className="aie-grid">
                <label className="aie-campo"><span>Tipo</span>
                  <select value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
                    <option value="">—</option>{TIPOS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </label>
                <label className="aie-campo"><span>Finalidade</span>
                  <select value={form.finalidade} onChange={(e) => set('finalidade', e.target.value)}>
                    <option value="">—</option>{FINALIDADES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </label>
                <label className="aie-campo"><span>Bairro</span><input value={form.bairro} onChange={(e) => set('bairro', e.target.value)} /></label>
                <label className="aie-campo"><span>Cidade</span><input value={form.cidade} onChange={(e) => set('cidade', e.target.value)} placeholder="Uberlândia/MG" /></label>
                <label className="aie-campo"><span>Preço (R$)</span><input type="number" value={form.preco} onChange={(e) => set('preco', e.target.value)} /></label>
                <label className="aie-campo"><span>Preço anterior (R$)</span><input type="number" value={form.precoAnterior} onChange={(e) => set('precoAnterior', e.target.value)} /></label>
                <label className="aie-campo"><span>Condomínio (R$)</span><input type="number" value={form.condominio} onChange={(e) => set('condominio', e.target.value)} /></label>
                <label className="aie-campo"><span>Área (m²)</span><input type="number" value={form.area} onChange={(e) => set('area', e.target.value)} /></label>
                <label className="aie-campo"><span>Área lote (m²)</span><input type="number" value={form.areaLote} onChange={(e) => set('areaLote', e.target.value)} /></label>
                <label className="aie-campo"><span>Quartos</span><input type="number" value={form.quartos} onChange={(e) => set('quartos', e.target.value)} /></label>
                <label className="aie-campo"><span>Suítes</span><input type="number" value={form.suites} onChange={(e) => set('suites', e.target.value)} /></label>
                <label className="aie-campo"><span>Banheiros</span><input type="number" value={form.banheiros} onChange={(e) => set('banheiros', e.target.value)} /></label>
                <label className="aie-campo"><span>Vagas</span><input type="number" value={form.vagas} onChange={(e) => set('vagas', e.target.value)} /></label>
                <label className="aie-campo"><span>Andar</span><input type="number" value={form.andar} onChange={(e) => set('andar', e.target.value)} placeholder="—" /></label>
                <label className="aie-campo"><span>Endereço</span><input value={form.endereco} onChange={(e) => set('endereco', e.target.value)} /></label>
                <label className="aie-campo"><span>Ponto de referência</span><input value={form.pontoReferencia} onChange={(e) => set('pontoReferencia', e.target.value)} /></label>
                <label className="aie-campo"><span>Vídeo (YouTube)</span><input value={form.video} onChange={(e) => set('video', e.target.value)} placeholder="https://youtu.be/…" /></label>
                <label className="aie-campo"><span>Tour 360°</span><input value={form.tour360} onChange={(e) => set('tour360', e.target.value)} placeholder="https://…" /></label>
                <label className="aie-campo"><span>Tour 3D (arquivo/link)</span><input value={form.tour3d} onChange={(e) => set('tour3d', e.target.value)} placeholder="/splats/COD/scene.compressed.ply" /></label>
              </div>

              <div className="aie-toggles">
                <label className="aie-check"><input type="checkbox" checked={!!form.elevador} onChange={(e) => set('elevador', e.target.checked)} /> Tem elevador</label>
                <label className="aie-check"><input type="checkbox" checked={!!form.destaque} onChange={(e) => set('destaque', e.target.checked)} /> Destacar</label>
                <label className="aie-check aie-check--warn"><input type="checkbox" checked={!!form.oculto} onChange={(e) => set('oculto', e.target.checked)} /> Ocultar do site</label>
              </div>
            </div>

            <div className="aie-foot">
              {msg && <span className={`aie-msg${msg.startsWith('✓') ? ' aie-msg--ok' : ''}`}>{msg}</span>}
              <button className="aie-cancelar" onClick={fechar}>Fechar</button>
              <button className="aie-salvar" onClick={salvar} disabled={saving || uploading}>{saving ? 'Salvando…' : 'Salvar anúncio'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
