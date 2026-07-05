// Google Analytics (GA4) com filtro dos acessos do PRÓPRIO dono.
//
// O ID fica em CONFIG.gaId (src/data.js). Se estiver vazio, o Analytics fica
// DESLIGADO. Este módulo CARREGA o gtag.js (faltava isso — por isso o GA não
// coletava nada) e a contagem de páginas é feita no App.jsx (page_view por rota).
//
// FILTRO "SOU EU": no seu computador/celular, acesse uma vez:
//     https://viniciusgraton.com.br/?sou-eu
// Isso marca ESTE navegador como "dono" e o GA passa a IGNORAR seus acessos.
// Repita em cada aparelho/navegador seu. Para voltar a contar: ?contar-me
import { CONFIG } from './data'

const CHAVE = 'vg_dono_no_track'

export function initAnalytics() {
  const id = CONFIG.gaId
  let dono = false
  try {
    const q = new URLSearchParams(location.search)
    if (q.has('sou-eu')) { localStorage.setItem(CHAVE, '1'); alert('Pronto! Este aparelho foi marcado como SEU - seus acessos não serão contados no Google Analytics.') }
    if (q.has('contar-me')) { localStorage.removeItem(CHAVE); alert('Ok, este aparelho voltará a ser contado no Google Analytics.') }
    dono = localStorage.getItem(CHAVE) === '1'
  } catch (e) { /* localStorage indisponível */ }

  if (!id) return
  if (dono) { window['ga-disable-' + id] = true; return } // não rastreia o dono

  const s = document.createElement('script')
  s.async = true
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + id
  document.head.appendChild(s)
  window.dataLayer = window.dataLayer || []
  window.gtag = function () { window.dataLayer.push(arguments) }
  window.gtag('js', new Date())
  // send_page_view:false -> o page_view é disparado no App.jsx a cada rota (SPA),
  // evitando contagem dupla da primeira página.
  window.gtag('config', id, { send_page_view: false, anonymize_ip: true })
}
