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
    const fullTitle = title
      ? (title.includes(CONFIG.nome) ? title : `${title} | ${CONFIG.nome}`)
      : CONFIG.marca
    document.title = fullTitle
    setMeta('name', 'description', description)
    setMeta('property', 'og:title', title || CONFIG.marca)
    setMeta('property', 'og:description', description)
    const url = SITE + (path || window.location.pathname)
    setMeta('property', 'og:url', url)
    if (image) {
      // Open Graph/Twitter exigem URL absoluta — caminho relativo (/imoveis/x.jpg)
      // quebra a prévia em WhatsApp/Facebook. Absolutiza a partir do domínio.
      const absImg = /^https?:\/\//.test(image) ? image : SITE + (image.startsWith('/') ? '' : '/') + image
      setMeta('property', 'og:image', absImg)
      setMeta('name', 'twitter:image', absImg)
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
