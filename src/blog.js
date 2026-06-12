// Blog — conteúdo de autoridade (SEO + ajuda real ao cliente). Escrito pelo Vinícius.
// cor: índice 0..4 para o gradiente da capa (sem imagens externas, nunca quebra).
// POSTS_BASE vive em blog-base.json para que o prerender-og.mjs possa lê-lo sem bundler.
import POSTS_BASE from './blog-base.json'
import POSTS_EXTRA from './blog-extra.json'

// REGRA OBRIGATÓRIA: post sem foto de capa NÃO é publicado (filtra fora).
export const POSTS = [...POSTS_BASE, ...POSTS_EXTRA].filter((p) => p.capa)

export const getPost = (slug) => POSTS.find((p) => p.slug === slug)
export const postsDestaque = () => {
  const d = POSTS.filter((p) => p.destaque)
  return (d.length >= 3 ? d : POSTS).slice(0, 3)
}
