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
// prova social: contagem inicial entre 2 e 45, variando por imóvel (determinístico,
// estável, sem flicker). MESMA fórmula no back (eng.js).
function seedDe(cod) {
  const h = hashCod(cod)
  const likes = 2 + (h % 44) // 2..45
  const shares = 2 + ((h >>> 7) % 44) // 2..45
  return { likes, shares }
}
export const seedLikes = (cod, preco) => seedDe(cod, preco).likes
export const seedShares = (cod, preco) => seedDe(cod, preco).shares

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
export async function lerEngajamento(cod, preco) {
  try {
    const r = await fetch(`${API}?cod=${encodeURIComponent(cod)}${preco ? `&p=${encodeURIComponent(preco)}` : ''}`)
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
