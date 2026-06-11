import { useEffect } from 'react'
import { CONFIG } from './data'

const SITE = 'https://viniciusgraton.com.br'

function setMeta(attr, key, content) {
  if (!content) return
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

// Atualiza título, descrição, canonical e OG por página (SPA) — bom para SEO
// e para o compartilhamento refletir a página atual ao navegar pelo menu.
export function useSEO({ title, description, path, noindex, image }) {
  useEffect(() => {
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')
    const fullTitle = title ? `${title} | ${CONFIG.nome}` : CONFIG.marca
    document.title = fullTitle
    setMeta('name', 'description', description)
    setMeta('property', 'og:title', title || CONFIG.marca)
    setMeta('property', 'og:description', description)
    const url = SITE + (path || window.location.pathname)
    setMeta('property', 'og:url', url)
    if (image) {
      setMeta('property', 'og:image', image)
      setMeta('name', 'twitter:image', image)
    }
    let can = document.head.querySelector('link[rel="canonical"]')
    if (!can) {
      can = document.createElement('link')
      can.setAttribute('rel', 'canonical')
      document.head.appendChild(can)
    }
    can.setAttribute('href', url)
  }, [title, description, path, noindex, image])
}
