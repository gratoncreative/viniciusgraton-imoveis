// Cadastro de corretor — controla o acesso às ferramentas restritas (ex.: Rotina).
// Guarda no navegador e capta o lead do corretor no painel do Vinícius.
const KEY = 'vg_corretor'

export function getCorretor() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null }
}
export function corretorCadastrado() { return !!getCorretor() }
export function salvarCorretor(dados) {
  const c = { ...dados, ts: Date.now() }
  try { localStorage.setItem(KEY, JSON.stringify(c)) } catch {}
  try { window.dispatchEvent(new Event('vg-corretor')) } catch {}
  return c
}
