/**
 * GET /sitemap.xml — sitemap dinâmico gerado pelo Cloudflare Worker
 * Inclui: páginas estáticas + todos os posts do blog + imóveis do catalogo.json
 * Cache de 6h no CDN da Cloudflare; regenera automaticamente a cada deploy.
 */

const SITE = 'https://viniciusgraton.com.br'
// Sentinela. NÃO computar a data no escopo de módulo: no Worker da Cloudflare o
// relógio só existe dentro do handler (com I/O) — no módulo new Date() volta 1970-01-01.
const TODAY = '@today'

const STATIC = [
  { loc: '/', changefreq: 'weekly', priority: '1.0', lastmod: TODAY },
  { loc: '/imoveis', changefreq: 'daily', priority: '0.9', lastmod: TODAY },
  { loc: '/blog', changefreq: 'weekly', priority: '0.8', lastmod: TODAY },
  { loc: '/sobre', changefreq: 'monthly', priority: '0.7' },
  { loc: '/como-funciona', changefreq: 'monthly', priority: '0.7' },
  { loc: '/regioes', changefreq: 'monthly', priority: '0.7' },
  { loc: '/avaliacao', changefreq: 'monthly', priority: '0.7' },
  { loc: '/contato', changefreq: 'monthly', priority: '0.7' },
  { loc: '/condominios', changefreq: 'monthly', priority: '0.7' },
  { loc: '/construtoras', changefreq: 'monthly', priority: '0.7' },
  { loc: '/lancamentos', changefreq: 'weekly', priority: '0.8', lastmod: TODAY },
  { loc: '/lancamentos/louis-studios-umuarama', changefreq: 'weekly', priority: '0.9', lastmod: TODAY },
  { loc: '/ferramentas', changefreq: 'monthly', priority: '0.6' },
  { loc: '/ferramentas/estudio-de-fotos', changefreq: 'monthly', priority: '0.7' },
  { loc: '/corretor', changefreq: 'monthly', priority: '0.6' },
  { loc: '/privacidade', changefreq: 'yearly', priority: '0.3' },
]

// Bairros com página SEO dedicada
const BAIRROS = [
  'jardim-karaiba', 'morada-da-colina', 'cidade-jardim', 'gavea',
  'granja-marileusa', 'vigilato-pereira', 'santa-maria', 'jardim-sul',
  'jardim-finotti', 'parque-una', 'patrimonio', 'lidice', 'santa-monica',
  'tabajaras', 'nova-uberlandia', 'tubalina',
]

// Todos os posts do blog (slug + data)
const BLOG_POSTS = [
  { slug: 'como-usar-fgts-para-comprar-imovel', data: '2026-06-05' },
  { slug: 'financiamento-caixa-passo-a-passo', data: '2026-06-04' },
  { slug: 'itbi-e-custos-de-compra-uberlandia', data: '2026-06-03' },
  { slug: 'vale-a-pena-morar-no-jardim-karaiba', data: '2026-06-02' },
  { slug: 'comprar-na-planta-ou-pronto', data: '2026-06-01' },
  { slug: 'aluguel-temporada-x-tradicional-dono', data: '2026-06-09' },
  { slug: 'amortizacao-extraordinaria-financiamento-imovel', data: '2026-06-08' },
  { slug: 'area-divergente-matricula-imovel-o-que-fazer', data: '2026-06-07' },
  { slug: 'bairros-em-valorizacao-uberlandia-comprar-agora', data: '2026-06-06' },
  { slug: 'carencia-financiamento-imobiliario-como-funciona', data: '2026-06-05' },
  { slug: 'certidao-de-onus-reais-o-que-e', data: '2026-06-04' },
  { slug: 'cet-financiamento-imobiliario-como-comparar', data: '2026-06-03' },
  { slug: 'clausulas-contrato-aluguel-conferir-antes-assinar', data: '2026-06-02' },
  { slug: 'como-ler-matricula-do-imovel', data: '2026-06-01' },
  { slug: 'como-montar-carteira-de-imoveis-do-zero', data: '2026-05-31' },
  { slug: 'como-regularizar-imovel-irregular', data: '2026-05-30' },
  { slug: 'comprar-imovel-comercial-uberlandia-renda', data: '2026-05-29' },
  { slug: 'comprar-imovel-construtora-x-particular', data: '2026-05-28' },
  { slug: 'comprar-imovel-nome-sujo-spc-serasa', data: '2026-05-27' },
  { slug: 'comprar-imovel-para-familiar-como-fazer', data: '2026-05-26' },
  { slug: 'comprar-imovel-pessoa-falecida-inventario', data: '2026-05-25' },
  { slug: 'comprar-imovel-uniao-estavel-protecao', data: '2026-05-24' },
  { slug: 'comprar-na-planta-revender-flip-imovel', data: '2026-05-23' },
  { slug: 'comprovacao-renda-autonomo-financiamento', data: '2026-05-22' },
  { slug: 'contrato-de-gaveta-imovel-riscos', data: '2026-05-21' },
  { slug: 'custo-total-real-comprar-imovel-checklist', data: '2026-05-20' },
  { slug: 'financiar-imovel-sem-entrada-100-por-cento', data: '2026-05-19' },
  { slug: 'fundos-imobiliarios-ou-imovel-fisico', data: '2026-05-18' },
  { slug: 'habite-se-averbacao-construcao-imovel', data: '2026-05-17' },
  { slug: 'imovel-aluguel-ufu-uniube-qual-rende-mais', data: '2026-05-16' },
  { slug: 'investir-loteamento-uberlandia-vale-pena', data: '2026-05-15' },
  { slug: 'kitnet-studio-2-quartos-melhor-investimento', data: '2026-05-14' },
  { slug: 'melhor-banco-financiar-imovel-2026', data: '2026-05-13' },
  { slug: 'melhores-bairros-familias-criancas-uberlandia', data: '2026-05-12' },
  { slug: 'melhores-bairros-investir-aluguel-uberlandia', data: '2026-05-11' },
  { slug: 'multa-quebra-contrato-aluguel-como-calcular', data: '2026-05-10' },
  { slug: 'outorga-conjugal-venda-imovel', data: '2026-05-09' },
  { slug: 'permuta-de-imovel-como-funciona', data: '2026-05-08' },
  { slug: 'prazo-garantia-construtora-imovel-novo', data: '2026-05-07' },
  { slug: 'procotista-sbpe-caixa-qual-melhor', data: '2026-05-06' },
  { slug: 'procuracao-comprar-vender-imovel', data: '2026-05-05' },
  { slug: 'quando-proprietario-pode-pedir-imovel-de-volta', data: '2026-05-04' },
  { slug: 'quanto-preciso-comecar-investir-imoveis', data: '2026-05-03' },
  { slug: 'quanto-rende-alugar-imovel-uberlandia', data: '2026-05-02' },
  { slug: 'quem-paga-iptu-condominio-reparos-aluguel', data: '2026-05-01' },
  { slug: 'quem-tem-direito-minha-casa-minha-vida-uberlandia', data: '2026-04-30' },
  { slug: 'refinanciamento-imovel-home-equity', data: '2026-04-29' },
  { slug: 'renda-necessaria-financiar-imovel-300-mil', data: '2026-04-28' },
  { slug: 'repasse-financiamento-entrega-obra-como-funciona', data: '2026-04-27' },
  { slug: 'seguro-fianca-ou-caucao-qual-melhor', data: '2026-04-26' },
  { slug: 'seguro-mip-dfi-financiamento-imobiliario', data: '2026-04-25' },
  { slug: 'sinal-arras-compra-imovel-o-que-saber', data: '2026-04-24' },
  { slug: 'somar-renda-conjuge-financiamento-imovel', data: '2026-04-23' },
  { slug: 'tabela-de-obra-pagamento-imovel-na-planta', data: '2026-04-22' },
  { slug: 'taxa-fixa-tr-poupanca-indexador-financiamento', data: '2026-04-21' },
  { slug: 'usucapiao-como-regularizar-imovel', data: '2026-04-20' },
  { slug: 'vacancia-inadimplencia-riscos-viver-de-aluguel', data: '2026-04-19' },
  { slug: 'vale-a-pena-comprar-imovel-2026-ou-esperar', data: '2026-04-18' },
  { slug: 'vale-a-pena-morar-na-cidade-jardim', data: '2026-04-17' },
  { slug: 'vale-a-pena-morar-no-bairro-brasil', data: '2026-04-16' },
  { slug: 'vale-a-pena-morar-no-copacabana', data: '2026-04-15' },
  { slug: 'vale-a-pena-morar-no-morada-da-colina', data: '2026-04-14' },
  { slug: 'vale-a-pena-morar-no-saraiva', data: '2026-04-13' },
  { slug: 'vale-a-pena-morar-no-tibery', data: '2026-04-12' },
  { slug: 'zona-sul-uberlandia-alto-padrao-guia', data: '2026-04-11' },
  { slug: 'documentos-necessarios-comprar-imovel-uberlandia', data: '2026-06-08' },
  { slug: 'score-credito-aprovacao-financiamento-imovel', data: '2026-06-08' },
  { slug: 'minha-casa-minha-vida-faixas-2026', data: '2026-06-08' },
  { slug: 'sfh-sbpe-diferencas-financiamento', data: '2026-06-08' },
  { slug: 'consorcio-ou-financiamento-imovel', data: '2026-06-08' },
  { slug: 'portabilidade-financiamento-imobiliario', data: '2026-06-08' },
  { slug: 'escritura-e-registro-imovel-passo-a-passo', data: '2026-06-08' },
  { slug: 'alienacao-fiduciaria-o-que-e', data: '2026-06-08' },
  { slug: 'fgts-para-amortizar-financiamento', data: '2026-06-08' },
  { slug: 'iptu-uberlandia-como-funciona', data: '2026-06-08' },
  { slug: 'valorizacao-imoveis-uberlandia-2026', data: '2026-06-08' },
  { slug: 'comprar-imovel-para-investir-renda-aluguel', data: '2026-06-08' },
  { slug: 'imovel-para-estudante-perto-ufu-uberlandia', data: '2026-06-08' },
  { slug: 'condominio-fechado-x-bairro-aberto', data: '2026-06-08' },
  { slug: 'primeiro-imovel-guia-iniciante', data: '2026-06-08' },
  { slug: 'comprar-imovel-na-aposentadoria', data: '2026-06-08' },
  { slug: 'vicios-ocultos-na-compra-de-imovel', data: '2026-06-08' },
  { slug: 'certidoes-antes-de-comprar-due-diligence', data: '2026-06-08' },
  { slug: 'leilao-de-imovel-como-funciona-riscos', data: '2026-06-08' },
  { slug: 'reforma-que-valoriza-imovel-vender-mais-rapido', data: '2026-06-08' },
  { slug: 'financiamento-imovel-autonomo-mei-como-aprovar', data: '2026-06-08' },
  { slug: 'taxa-selic-juros-financiamento-imobiliario-impacto', data: '2026-06-08' },
  { slug: 'financiar-imovel-usado-ou-novo-qual-a-melhor-escolha', data: '2026-06-08' },
  { slug: 'erros-que-reprovam-credito-imobiliario-como-evitar', data: '2026-06-08' },
  { slug: 'segundo-imovel-financiamento-regras-e-estrategia', data: '2026-06-08' },
  { slug: 'quanto-preciso-de-entrada-para-financiar-imovel', data: '2026-06-08' },
  { slug: 'como-organizar-orcamento-para-comprar-imovel', data: '2026-06-08' },
  { slug: 'quitar-dividas-antes-de-financiar-imovel', data: '2026-06-08' },
  { slug: 'reserva-de-emergencia-e-compra-de-imovel', data: '2026-06-08' },
  { slug: 'comprar-imovel-com-renda-informal', data: '2026-06-08' },
  { slug: 'como-descobrir-dividas-imovel-antes-comprar', data: '2026-06-08' },
  { slug: 'golpes-na-compra-de-imovel-como-identificar-evitar', data: '2026-06-08' },
  { slug: 'comprar-imovel-heranca-inventario-o-que-saber', data: '2026-06-08' },
  { slug: 'imovel-com-pendencia-judicial-penhora-o-que-fazer', data: '2026-06-08' },
  { slug: 'contrato-compra-venda-x-escritura-diferenca-importancia', data: '2026-06-08' },
  { slug: 'como-calcular-rentabilidade-aluguel-imovel', data: '2026-06-08' },
  { slug: 'airbnb-temporada-uberlandia-vale-pena', data: '2026-06-08' },
  { slug: 'lote-terreno-como-investimento-uberlandia', data: '2026-06-08' },
  { slug: 'sala-comercial-vs-apartamento-renda-investimento', data: '2026-06-08' },
  { slug: 'imovel-x-renda-fixa-como-diversificar-patrimonio', data: '2026-06-08' },
  { slug: 'vale-a-pena-morar-no-santa-monica', data: '2026-06-08' },
  { slug: 'vale-a-pena-morar-na-granja-marileusa', data: '2026-06-08' },
  { slug: 'vale-a-pena-morar-no-jardim-sul', data: '2026-06-08' },
  { slug: 'vale-a-pena-morar-no-patrimonio', data: '2026-06-08' },
  { slug: 'vale-a-pena-morar-na-tubalina', data: '2026-06-08' },
  { slug: 'checklist-completo-primeiro-imovel', data: '2026-06-08' },
  { slug: 'casa-ou-apartamento-primeira-compra-uberlandia', data: '2026-06-08' },
  { slug: 'perguntas-fazer-antes-comprar-imovel', data: '2026-06-08' },
  { slug: 'comprar-imovel-sozinho-jovem-uberlandia', data: '2026-06-08' },
  { slug: 'comprar-imovel-em-casal-recem-casado', data: '2026-06-08' },
  { slug: 'garantias-de-aluguel-fiador-seguro-fianca-caucao-titulo', data: '2026-06-08' },
  { slug: 'documentos-para-alugar-imovel-uberlandia', data: '2026-06-08' },
  { slug: 'direitos-e-deveres-inquilino-proprietario', data: '2026-06-08' },
  { slug: 'vistoria-imovel-entrada-saida-o-que-saber', data: '2026-06-08' },
  { slug: 'reajuste-aluguel-como-funciona-indices', data: '2026-06-08' },
  { slug: 'como-precificar-imovel-para-vender-rapido', data: '2026-06-08' },
  { slug: 'fotos-que-vendem-imovel-guia-completo', data: '2026-06-08' },
  { slug: 'documentos-necessarios-para-vender-imovel', data: '2026-06-08' },
  { slug: 'vender-imovel-com-inquilino-o-que-saber', data: '2026-06-08' },
  { slug: 'home-staging-barato-preparar-imovel-venda', data: '2026-06-08' },
  { slug: 'taxa-de-condominio-como-avaliar-antes-de-comprar', data: '2026-06-08' },
  { slug: 'custos-escondidos-na-compra-e-mudanca-de-imovel', data: '2026-06-08' },
  { slug: 'imposto-de-renda-na-venda-de-imovel-o-que-saber', data: '2026-06-08' },
  { slug: 'o-que-muda-no-iptu-depois-que-voce-compra-um-imovel', data: '2026-06-08' },
  { slug: 'primeiras-providencias-depois-de-pegar-as-chaves', data: '2026-06-08' },
  { slug: 'comprar-ou-alugar-imovel-uberlandia', data: '2026-06-08' },
  { slug: 'selic-alta-e-mercado-imobiliario-o-que-muda', data: '2026-06-08' },
  { slug: 'imovel-como-protecao-contra-inflacao', data: '2026-06-08' },
  { slug: 'tendencias-do-morar-apartamentos-compactos-bem-estar-sustentabilidade', data: '2026-06-08' },
  { slug: 'por-que-uberlandia-e-boa-opcao-para-morar-e-investir', data: '2026-06-08' },
]

// Construtoras e condomínios (das páginas dedicadas)
const CONSTRUTORAS = [
  'perplan','r-freitas','inconew','urbanix','zp','morais','atp','trust','bild','vitta',
  'realiza','casanova','mrv','pacaembu','maxi','persa','pacheco','v-pacheco','resende',
  'senza','castelo-real','brasal-incorporacoes','manzan-construtora','machado-incorporadora',
  'portento-construtora','mor-construtora','construtora-stefani',
]

const CONDOMINIOS = [
  'vila-real-exclusive','arts-uberlandia','reserva-do-lago','tambore-uberlandia','reserva-do-vale',
  'gavea-paradiso','splendido','villa-dos-ipes','golden-village','alphaville-uberlandia-1',
  'alphaville-uberlandia-2','terras-alpha','buritis-club-village','tambore-miranda','park-sul',
  'reserva-dos-ipes','royal-park','cyrela-bosque-dos-buritis','hamoa-resort','granja-marileusa',
  'lago-verde','jardins-barcelona','jardins-roma','jardins-genova','jardim-versailles',
  'bosque-karaiba','condominio-solares-da-gavea','morada-do-sol','raros-alto-umuarama',
  'condominio-carmel','mirante-do-lago','mirante-das-aguas','reserva-do-parque','verde-bosque',
  'village-paradiso-1','village-paradiso-2','residencial-ingles','quality-residence',
  'village-unique','condominio-casas-alto-paradiso','terra-nova-1','terra-nova-2',
  'chacaras-eldorado','catucaba-condominio-campo','recanto-bela-vista','village-le-premier',
  'monterre','reserva-novo-mundo','terra-nova-3','terra-nova','porto-do-granja',
  'cittadella-57','bossa-home-design','paradiso-ecologico','dolce-vita','village-karaiba',
  'villa-do-sol','terras-altas','praca-alto-umuarama',
]

function urlTag({ loc, changefreq, priority, lastmod }) {
  // barra final = forma que o servidor entrega (evita o hop 308 /x -> /x/)
  const path = loc === '/' ? '/' : loc.replace(/\/+$/, '') + '/'
  return [
    '  <url>',
    `    <loc>${SITE}${path}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : '',
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : '',
    priority ? `    <priority>${priority}</priority>` : '',
    '  </url>',
  ].filter(Boolean).join('\n')
}

export async function onRequestGet({ request }) {
  const origin = new URL(request.url).origin
  const today = new Date().toISOString().slice(0, 10) // data real só existe aqui (dentro do handler)
  const parts = []

  // Páginas estáticas (resolve a sentinela @today pela data real)
  for (const p of STATIC) parts.push(urlTag(p.lastmod === TODAY ? { ...p, lastmod: today } : p))

  // Bairros
  for (const b of BAIRROS) {
    parts.push(urlTag({ loc: `/imoveis/uberlandia/${b}`, changefreq: 'weekly', priority: '0.8', lastmod: today }))
  }

  // Construtoras
  for (const c of CONSTRUTORAS) {
    parts.push(urlTag({ loc: `/construtoras/${c}`, changefreq: 'monthly', priority: '0.7' }))
  }

  // Condomínios
  for (const c of CONDOMINIOS) {
    parts.push(urlTag({ loc: `/condominios/${c}`, changefreq: 'monthly', priority: '0.7' }))
  }

  // Blog posts
  for (const p of BLOG_POSTS) {
    parts.push(urlTag({ loc: `/blog/${p.slug}`, changefreq: 'monthly', priority: '0.7', lastmod: p.data }))
  }

  // Imóveis individuais — lidos do catalogo.json em tempo real
  try {
    const res = await fetch(`${origin}/catalogo.json`, {
      cf: { cacheTtl: 3600, cacheEverything: true },
    })
    if (res.ok) {
      const data = await res.json()
      const imoveis = Array.isArray(data?.imoveis) ? data.imoveis : []
      for (const im of imoveis) {
        if (im.codigo) {
          parts.push(urlTag({
            loc: `/imovel/${im.codigo}`,
            changefreq: 'weekly',
            priority: '0.8',
            lastmod: today,
          }))
        }
      }
    }
  } catch (_) {
    // catalogo.json indisponível — sitemap sem imóveis individuais (não quebra)
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...parts,
    '</urlset>',
  ].join('\n')

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=21600, s-maxage=21600',
    },
  })
}
