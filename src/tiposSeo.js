// Tipos de imóvel para as páginas long-tail de SEO (/imoveis/uberlandia/<bairro>/<tipo>).
// Módulo PURO (sem React) — usado pela página BairroTipo.
// As MESMAS regras (slug + regex + mínimo) estão replicadas em scripts/prerender-og.mjs
// e functions/sitemap.xml.js — manter os três em sincronia.
export const TIPOS_SEO = [
  { slug: 'apartamentos', plural: 'Apartamentos', singular: 'apartamento', re: /apart|kit|st[uú]dio|loft|flat|cobertura/i },
  { slug: 'casas', plural: 'Casas', singular: 'casa', re: /casa|sobrado/i },
  { slug: 'terrenos', plural: 'Terrenos e lotes', singular: 'terreno', re: /lote|terreno/i },
]
export const tipoSeoPorSlug = (slug) => TIPOS_SEO.find((t) => t.slug === slug) || null
// mínimo de imóveis pra a página existir no Google (evita página fininha que o buscador pune)
export const MIN_TIPO_SEO = 3
