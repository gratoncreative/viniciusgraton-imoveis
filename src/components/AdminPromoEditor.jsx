import { useState, useEffect } from 'react'

const LSK = 'vg_admin_token'

// redimensiona a capa no navegador (máx 1600px, JPEG) antes de subir — fica leve no KV
const resizeToDataUrl = (file, max = 1600, q = 0.82) => new Promise((resolve, reject) => {
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

// Editor da PEÇA DE PUBLICIDADE (admin logado). Controlado pelo pai (PromoLancamento):
// recebe a config atual, abre o modal, salva no KV via /api/admin (promo-save) e
// devolve a nova config em onSaved — todas as instâncias do anúncio se atualizam.
export default function AdminPromoEditor({ cfg, open, onClose, onSaved }) {
  const [form, setForm] = useState(cfg)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { if (open) { setForm(cfg); setMsg('') } }, [open, cfg])

  if (!open || !form) return null
  const token = localStorage.getItem(LSK)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const post = async (action, extra = {}) => {
    const r = await fetch('/api/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, token, ...extra }) })
    let j = {}; try { j = await r.json() } catch {}
    return { status: r.status, j }
  }

  const trocarCapa = async (file) => {
    if (!file) return
    setUploading(true); setMsg('')
    try {
      const dataUrl = await resizeToDataUrl(file)
      const { j } = await post('img-upload', { codigo: 'promo', dataUrl })
      if (j.ok && j.url) set('capa', j.url)
      else setMsg(j.msg || 'Falha ao subir a imagem.')
    } catch { setMsg('Não consegui processar essa imagem.') }
    setUploading(false)
  }

  const salvar = async () => {
    setSaving(true); setMsg('')
    try {
      const { status, j } = await post('promo-save', { promo: form })
      if (status === 401) { setMsg('Sessão de admin expirada. Entre de novo em /admin.'); setSaving(false); return }
      if (j.ok) {
        setMsg('✓ Publicidade atualizada e no ar')
        onSaved && onSaved(j.promo || form)
        setTimeout(() => { onClose && onClose() }, 700)
      } else setMsg(j.msg || 'Não consegui salvar.')
    } catch { setMsg('Falha de conexão. Tente de novo.') }
    setSaving(false)
  }

  return (
    <div className="aie-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose && onClose() }}>
      <div className="aie-modal" role="dialog" aria-label="Editar publicidade">
        <div className="aie-head">
          <h3>Editar publicidade</h3>
          <button className="aie-x" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        <div className="aie-body">
          {/* Capa */}
          <div className="aie-bloco">
            <label className="aie-lbl">Foto de capa</label>
            <div className="aie-fotos">
              {form.capa && (
                <div className="aie-foto capa">
                  <img src={form.capa} alt="" loading="lazy" />
                  <span className="aie-foto-capa">Capa</span>
                </div>
              )}
              <label className="aie-foto-add">
                {uploading ? '⏳' : (form.capa ? 'Trocar' : '+ Foto')}
                <input type="file" accept="image/*" hidden disabled={uploading} onChange={(e) => trocarCapa(e.target.files && e.target.files[0])} />
              </label>
            </div>
          </div>

          {/* Textos */}
          <div className="aie-bloco">
            <label className="aie-lbl">Selo (canto)</label>
            <input className="aie-inp" value={form.selo || ''} onChange={(e) => set('selo', e.target.value)} placeholder="Ex.: Lançamento" maxLength={40} />
            <label className="aie-lbl" style={{ marginTop: 12 }}>Título</label>
            <input className="aie-inp" value={form.titulo || ''} onChange={(e) => set('titulo', e.target.value)} placeholder="Ex.: Louis Studios" maxLength={80} />
            <label className="aie-lbl" style={{ marginTop: 12 }}>Subtítulo</label>
            <input className="aie-inp" value={form.subtitulo || ''} onChange={(e) => set('subtitulo', e.target.value)} placeholder="Ex.: Studios · 36 e 37 m² · próximos à UFU Umuarama" maxLength={160} />
            <label className="aie-lbl" style={{ marginTop: 12 }}>Descrição</label>
            <textarea className="aie-inp" rows="3" value={form.descricao || ''} onChange={(e) => set('descricao', e.target.value)} placeholder="Ex.: Gestão Housi · rentabilidade 1,5% a.m. · mensais R$ 2.000 + intermediárias." />
            <label className="aie-lbl" style={{ marginTop: 12 }}>Preço / chamada de valor</label>
            <input className="aie-inp" value={form.precoLabel || ''} onChange={(e) => set('precoLabel', e.target.value)} placeholder="Ex.: Entrada R$ 41.400" maxLength={60} />
          </div>

          {/* Botão */}
          <div className="aie-bloco">
            <label className="aie-lbl">Texto do botão</label>
            <input className="aie-inp" value={form.ctaTexto || ''} onChange={(e) => set('ctaTexto', e.target.value)} placeholder="Ex.: Quero saber mais" maxLength={40} />
            <label className="aie-lbl" style={{ marginTop: 12 }}>Link do botão <span>· em branco = abre seu WhatsApp</span></label>
            <input className="aie-inp" value={form.ctaUrl || ''} onChange={(e) => set('ctaUrl', e.target.value)} placeholder="https://… (deixe vazio p/ WhatsApp)" maxLength={600} />
            <label className="aie-lbl" style={{ marginTop: 12 }}>Mensagem do WhatsApp <span>· usada quando o link está vazio</span></label>
            <textarea className="aie-inp" rows="3" value={form.waMsg || ''} onChange={(e) => set('waMsg', e.target.value)} placeholder="Olá Vinícius! Vi o anúncio e quero saber mais…" />
          </div>

          <div className="aie-toggles">
            <label className="aie-check aie-check--warn"><input type="checkbox" checked={form.ativo === false} onChange={(e) => set('ativo', !e.target.checked)} /> Pausar (esconder a publicidade do site)</label>
          </div>
        </div>

        <div className="aie-foot">
          {msg && <span className={`aie-msg${msg.startsWith('✓') ? ' aie-msg--ok' : ''}`}>{msg}</span>}
          <button className="aie-cancelar" onClick={onClose}>Fechar</button>
          <button className="aie-salvar" onClick={salvar} disabled={saving || uploading}>{saving ? 'Salvando…' : 'Salvar publicidade'}</button>
        </div>
      </div>
    </div>
  )
}
