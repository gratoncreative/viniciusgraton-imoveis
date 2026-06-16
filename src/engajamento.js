// =============================================================
//  ENGAJAMENTO — curtidas / compartilhamentos / captação de lead
//  Backend: Cloudflare Pages Function /api/eng (Workers KV).
//  Sem backend ainda? Cai num "seed" determinístico por imóvel
//  (50–90 curtidas, 50–80 shares) para o site nunca aparecer zerado.
//  Quando o KV entra no ar, os números reais e compartilhados assumem.
// =============================================================
const API = '/api/eng'

// hash determinístico (djb2) → mesmo código sempre gera o mesmo número
function hashCod(cod) {
  const s = String(cod)
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h
}
// prova social: contagem inicial determinística por imóvel (estável, sem flicker).
// Normal: 5..28 (bem alternado). Imóveis "abaixo do mercado" / impulsionados
// (publicidade) recebem boost -> volume claramente maior. MESMA fórmula no back (eng.js).
function seedDe(cod, boost) {
  const h = hashCod(cod)
  if (boost) {
    const likes = 29 + (h % 15) // 29..43 (sempre acima do teto normal)
    const shares = 26 + ((h >>> 7) % 13) // 26..38
    return { likes, shares }
  }
  const likes = 5 + (h % 24) // 5..28
  const shares = 5 + ((h >>> 7) % 24) // 5..28
  return { likes, shares }
}
export const seedLikes = (cod, boost) => seedDe(cod, boost).likes
export const seedShares = (cod, boost) => seedDe(cod, boost).shares

// ---- estado local do visitante (o que ELE já curtiu) ----
const LSK = 'vg_curtidos'
const lidos = () => {
  try { return JSON.parse(localStorage.getItem(LSK) || '[]') } catch { return [] }
}
const grava = (arr) => {
  try { localStorage.setItem(LSK, JSON.stringify(arr)) } catch {}
}
export const jaCurtiu = (cod) => lidos().includes(String(cod))
// lista de imóveis favoritados (= curtidos) deste visitante, p/ a página /favoritos
export const favoritos = () => lidos()
const marcar = (cod, on) => {
  const c = String(cod)
  const arr = lidos().filter((x) => x !== c)
  if (on) arr.push(c)
  grava(arr)
  // avisa a navbar (contador de favoritos) p/ atualizar na hora
  try { window.dispatchEvent(new Event('vg-fav')) } catch {}
}

// ---- chamadas à API (sempre tolerantes a falha) ----
export async function lerEngajamento(cod, preco, boost) {
  try {
    const r = await fetch(`${API}?cod=${encodeURIComponent(cod)}${preco ? `&p=${encodeURIComponent(preco)}` : ''}${boost ? '&b=1' : ''}`)
    if (!r.ok) return null
    const d = await r.json()
    if (typeof d.likes === 'number') return d
  } catch {}
  return null
}

async function postEng(body) {
  try {
    const r = await fetch(API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
}

export async function alternarCurtida(cod, ligado, preco) {
  marcar(cod, ligado)
  return postEng({ cod: String(cod), tipo: ligado ? 'like' : 'unlike', p: preco })
}
export const registrarShare = (cod, preco) => postEng({ cod: String(cod), tipo: 'share', p: preco })
export const registrarLead = (lead) => postEng({ tipo: 'lead', ...lead })

// blog: registra leitura e lê as contagens (todas de uma vez)
export const registrarView = (slug) => postEng({ cod: String(slug), tipo: 'view' })
export async function lerBlogViews() {
  try { const r = await fetch(`${API}?blogviews=1`); if (r.ok) { const d = await r.json(); return d.views || {} } } catch {}
  return {}
}
