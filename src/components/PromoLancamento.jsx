import { useState, useEffect } from 'react'
import { linkWhatsApp } from '../data'
import { IconWhats } from './icons'
import AdminPromoEditor from './AdminPromoEditor'

// Publicidade de lançamento no MESMO layout dos imóveis da página onde aparece.
// REGRA: todo anúncio se mistura à listagem, no formato de card daquela página.
// variante 'linha' (catálogo) | 'card' (grade vertical) | 'texto' (faixa).
// O conteúdo (capa, selo, título, subtítulo, descrição, preço, botão) é EDITÁVEL
// pelo admin logado (/api/promo lê; /api/admin promo-save grava no KV).
const LSK_ADMIN = 'vg_admin_token'
const DEFAULTS = {
  ativo: true,
  capa: '/anuncios/louis-studios.jpg',
  selo: 'Lançamento',
  titulo: 'Louis Studios',
  subtitulo: 'Studios · 36 e 37 m² · próximos à UFU Umuarama',
  descricao: 'Gestão Housi · rentabilidade 1,5% a.m. · mensais R$ 2.000 + intermediárias.',
  precoLabel: 'Entrada R$ 41.400',
  ctaTexto: 'Quero saber mais',
  ctaUrl: '',
  waMsg: 'Olá Vinícius! Vi o lançamento Louis Studios (Studios próximos ao Campus UFU Umuarama) e quero saber mais sobre as unidades, entrada, parcelas e rentabilidade.',
}

let _promoCache = null // memo entre instâncias — 1 fetch por carregamento da página

const PubTag = () => (
  <span className="im-pub promo-imovel-pub" title="Publicidade — anúncio">
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 15l7-7 7 7" /></svg>
    Publicidade
  </span>
)

export default function PromoLancamento({ variante = 'linha' }) {
  const [cfg, setCfg] = useState(_promoCache || DEFAULTS)
  const [imgOk, setImgOk] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    const onAdmin = () => setIsAdmin(!!localStorage.getItem(LSK_ADMIN))
    onAdmin()
    window.addEventListener('storage', onAdmin)
    const aplicar = (p) => { if (p && typeof p === 'object') { _promoCache = { ...DEFAULTS, ...p }; setCfg(_promoCache); setImgOk(true) } }
    if (!_promoCache) {
      fetch('/api/promo').then((r) => (r.ok ? r.json() : null)).then((j) => aplicar(j && j.promo)).catch(() => {})
    }
    const onPromo = (e) => aplicar(e.detail)
    window.addEventListener('vg-promo', onPromo)
    return () => { window.removeEventListener('storage', onAdmin); window.removeEventListener('vg-promo', onPromo) }
  }, [])

  const href = (cfg.ctaUrl && cfg.ctaUrl.trim()) ? cfg.ctaUrl.trim() : linkWhatsApp(cfg.waMsg || DEFAULTS.waMsg)
  const abrir = () => window.open(href, '_blank', 'noopener')
  const onSaved = (p) => { const novo = { ...DEFAULTS, ...p }; _promoCache = novo; setCfg(novo); setImgOk(true); window.dispatchEvent(new CustomEvent('vg-promo', { detail: p })) }

  // pausada: some para o público; o admin continua vendo (esmaecida) para reativar
  if (cfg.ativo === false && !isAdmin) return null
  const pausada = cfg.ativo === false

  const EditBtn = isAdmin ? (
    <button type="button" className="promo-edit-btn" title="Editar publicidade (admin)"
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); setEditOpen(true) }}>
      ✎ Editar{pausada ? ' · pausada' : ''}
    </button>
  ) : null
  const Editor = isAdmin ? <AdminPromoEditor cfg={cfg} open={editOpen} onClose={() => setEditOpen(false)} onSaved={onSaved} /> : null

  const Media = () => (
    <>
      {!imgOk && <span className="promo-imovel-marca" aria-hidden="true">{cfg.titulo}</span>}
      {imgOk && cfg.capa && (
        <img src={cfg.capa} alt={cfg.titulo} loading="lazy" decoding="async" onError={() => setImgOk(false)} />
      )}
      <span className="promo-imovel-tint" aria-hidden="true" />
      <PubTag />
      {cfg.selo && <span className="im-tag">{cfg.selo}</span>}
      {EditBtn}
    </>
  )

  // ——— variante TEXTO — faixa elegante só com texto/elementos (catálogo) ———
  if (variante === 'texto') {
    return (
      <>
        <article className={`promo-texto card-clickable${pausada ? ' promo-pausada' : ''}`} onClick={abrir} role="link" tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir() } }}
          aria-label="Publicidade">
          <span className="promo-texto-glow" aria-hidden="true" />
          <div className="promo-texto-conteudo">
            <span className="promo-texto-eyebrow">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 15l7-7 7 7" /></svg>
              Publicidade{cfg.selo ? ` · ${cfg.selo}` : ''}
            </span>
            <h3 className="promo-texto-tit">{cfg.titulo}</h3>
            <p className="promo-texto-sub">{cfg.subtitulo}</p>
          </div>
          <a className="promo-texto-cta" href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
            {cfg.ctaTexto}
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </a>
          {EditBtn}
        </article>
        {Editor}
      </>
    )
  }

  // ——— variante CARD (vertical) — mistura na grade de imóveis ———
  if (variante === 'card') {
    return (
      <>
        <article className={`card-imovel im-card card-clickable promo-imovel promo-imovel--card${pausada ? ' promo-pausada' : ''}`} onClick={abrir} aria-label="Publicidade">
          <div className="card-media im-media promo-imovel-media">
            <Media />
            {cfg.precoLabel && <span className="im-preco promo-imovel-preco-ov">{cfg.precoLabel}</span>}
          </div>
          <div className="card-body im-body">
            <h3 className="im-bairro">{cfg.titulo}</h3>
            <p className="im-local">{cfg.subtitulo}</p>
            {cfg.descricao && <p className="im-desc">{cfg.descricao}</p>}
            <div className="im-actions">
              <a className="im-cta" href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                <IconWhats width={18} height={18} /> {cfg.ctaTexto}
              </a>
            </div>
          </div>
        </article>
        {Editor}
      </>
    )
  }

  // ——— variante LINHA (horizontal) — catálogo ———
  return (
    <>
      <article className={`im-linha card-clickable promo-imovel${pausada ? ' promo-pausada' : ''}`} onClick={abrir} aria-label="Publicidade">
        <div className="im-linha-media promo-imovel-media">
          <Media />
        </div>
        <div className="im-linha-body">
          <div className="im-linha-top">
            <div className="im-linha-tit">
              {cfg.subtitulo && <span className="im-linha-tipo">{cfg.subtitulo}</span>}
              <h3 className="im-bairro">{cfg.titulo}</h3>
              {cfg.descricao && <p className="im-local">{cfg.descricao}</p>}
            </div>
          </div>
          <div className="im-linha-rodape">
            <div className="im-linha-precobloco">
              {cfg.precoLabel && <span className="promo-imovel-preco">{cfg.precoLabel}</span>}
            </div>
            <div className="im-actions">
              <a className="im-cta" href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                <IconWhats width={18} height={18} /> {cfg.ctaTexto}
              </a>
            </div>
          </div>
        </div>
      </article>
      {Editor}
    </>
  )
}
