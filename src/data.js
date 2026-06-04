// =============================================================
//  CONFIG CENTRAL — dados reais do negócio
// =============================================================
export const CONFIG = {
  nome: 'Vinícius Graton',
  marca: 'Vinícius Graton Imóveis',
  papel: 'Consultor de Imóveis em Uberlândia',
  whatsapp: '5534991570494', // (34) 99157-0494
  whatsappMsg: 'Olá Vinícius! Vi seu site e quero ajuda para encontrar o imóvel certo.',
  instagram: 'https://www.instagram.com/viniciusgraton.imoveis/',
  cidade: 'Uberlândia / MG',
  email: 'contato@viniciusgraton.com.br',
  // Imagem realista da capa (troque por uma foto sua/local quando quiser)
  heroImg: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=2400&auto=format&fit=crop',
}

// aceita uma mensagem personalizada por contexto; usa a padrão se nenhuma for passada
export const linkWhatsApp = (msg) =>
  `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg || CONFIG.whatsappMsg)}`

// Mensagens pré-salvas por área do site
export const WA = {
  navbar: 'Olá Vinícius! Vim pelo seu site e quero falar com você sobre imóveis em Uberlândia.',
  hero: 'Olá Vinícius! Quero sua ajuda para comprar meu imóvel em Uberlândia sem medo de errar.',
  imoveis: 'Olá Vinícius! Quero te contar o que procuro em um imóvel. Pode me ajudar?',
  contato: 'Olá Vinícius! Vim pelo seu site e quero conversar sobre um imóvel.',
  flutuante: 'Olá Vinícius! Estou no seu site e queria tirar uma dúvida rápida.',
  banda1: 'Olá Vinícius! Quero encontrar o imóvel certo pra minha rotina. Pode me ajudar?',
  banda2: 'Olá Vinícius! Quero começar a procurar meu imóvel com a sua ajuda, do início ao fim.',
  destaque: 'Olá Vinícius! Quero ver os imóveis em destaque que estão no seu site.',
}

// =============================================================
//  IMÓVEIS EM DESTAQUE — alimentado automaticamente (ver scripts/sync-imoveis.mjs)
//  O arquivo imoveis-destaque.json é regerado na rotina diária a partir
//  da lista de imóveis publicados na web da Rotina Imobiliária (Imoview).
// =============================================================
import destaqueData from './imoveis-destaque.json'

export const IMOVEIS = destaqueData.imoveis || []
export const IMOVEIS_INFO = { geradoEm: destaqueData.geradoEm, fonte: destaqueData.fonte }

// Formata preço em reais de forma curta e elegante (R$ 3,3 mi / R$ 530 mil)
export const formatPreco = (v) => {
  if (!v || v <= 0) return 'Sob consulta'
  if (v >= 1000000) {
    const mi = v / 1000000
    return `R$ ${mi.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} mi`
  }
  return `R$ ${Math.round(v / 1000)} mil`
}

export const formatArea = (a) =>
  a ? `${a.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} m²` : null

// Mensagem de WhatsApp personalizada por imóvel
export const waImovel = (im) =>
  `Olá Vinícius! Tenho interesse no imóvel cód. ${im.codigo} — ${im.tipo} no ${im.bairro} (${formatPreco(im.preco)}). Pode me passar mais informações?`

// Faixas cinematográficas (mesmo estilo da capa) inseridas a cada 2 seções
export const BANDS = {
  b1: {
    img: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=2000&auto=format&fit=crop',
    frase: 'O imóvel certo muda a sua rotina inteira.',
    cta: 'Quero encontrar o meu',
    wa: 'banda1',
  },
  b2: {
    img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=2000&auto=format&fit=crop',
    frase: 'Da primeira conversa às chaves na sua mão.',
    cta: 'Começar agora',
    wa: 'banda2',
  },
}

// Pilares do atendimento (qualitativos, sem métricas inventadas)
export const PILARES = [
  { icon: 'home', titulo: 'Casa, apto e investimento', sub: 'orientação para cada objetivo', foto: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=900&auto=format&fit=crop' },
  { icon: 'target', titulo: 'Curadoria personalizada', sub: 'só o que faz sentido pra você', foto: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=900&auto=format&fit=crop' },
  { icon: 'shield', titulo: 'Documentação conferida', sub: 'compra com segurança', foto: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=900&auto=format&fit=crop' },
  { icon: 'pin', titulo: 'Uberlândia e região', sub: 'o mercado que eu conheço', foto: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?q=80&w=900&auto=format&fit=crop' },
]

// Segmentos com que o Vinícius atua (substitui listagem real até receber imóveis)
export const SEGMENTOS = [
  {
    id: 1,
    icon: 'building',
    titulo: 'Apartamentos',
    desc: 'Do compacto ao alto padrão, encontro a planta e a localização certas pra você.',
    img: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1200&auto=format&fit=crop',
  },
  {
    id: 2,
    icon: 'home',
    titulo: 'Casas em condomínio',
    desc: 'Segurança, lazer e espaço pra família, nos melhores condomínios da região.',
    img: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=1200&auto=format&fit=crop',
  },
  {
    id: 3,
    icon: 'sparkle',
    titulo: 'Lançamentos',
    desc: 'Acesso a empreendimentos novos, com as condições de entrada de cada construtora.',
    img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1200&auto=format&fit=crop',
  },
  {
    id: 4,
    icon: 'trend',
    titulo: 'Imóvel para investir',
    desc: 'Análise pensada em renda de aluguel e potencial de valorização no longo prazo.',
    img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=1200&auto=format&fit=crop',
  },
  {
    id: 5,
    icon: 'key',
    titulo: 'Primeiro imóvel',
    desc: 'Te oriento no financiamento, no uso do FGTS e em cada etapa, sem você se perder.',
    img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=1200&auto=format&fit=crop',
  },
  {
    id: 6,
    icon: 'store',
    titulo: 'Imóvel comercial',
    desc: 'Salas, lojas e pontos comerciais para o seu negócio se instalar e crescer.',
    img: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1200&auto=format&fit=crop',
  },
]

// Campos do formulário de busca (baseado em filtros padrão de imobiliárias / Imoview)
export const FILTRO = {
  tipos: ['Apartamento', 'Casa em condomínio', 'Casa', 'Cobertura', 'Terreno / Lote', 'Sala ou loja comercial'],
  finalidades: ['Para morar', 'Para investir'],
  precos: [
    'Até R$ 300 mil',
    'R$ 300 mil a R$ 500 mil',
    'R$ 500 mil a R$ 800 mil',
    'R$ 800 mil a R$ 1,2 milhão',
    'R$ 1,2 a R$ 2 milhões',
    'Acima de R$ 2 milhões',
    'Ainda não sei',
  ],
  caracteristicas: ['Varanda / Sacada', 'Piscina', 'Churrasqueira', 'Mobiliado', 'Condomínio fechado', 'Academia', 'Portaria 24h', 'Pet friendly'],
}

// pré-seleção do formulário conforme o card clicado (id do segmento)
export const SEG_PRESET = {
  1: { tipo: 'Apartamento' },
  2: { tipo: 'Casa em condomínio' },
  3: { tipo: 'Apartamento', lancamento: true },
  4: { finalidade: 'Para investir' },
  5: { fgts: true },
  6: { tipo: 'Sala ou loja comercial' },
}

export const PASSOS = [
  {
    n: '01',
    titulo: 'Conversa & objetivo',
    texto: 'Entendo seu momento, seu orçamento e o que você realmente busca — morar, trocar ou investir.',
  },
  {
    n: '02',
    titulo: 'Curadoria de imóveis',
    texto: 'Seleciono apenas os imóveis que fazem sentido pra você. Sem perda de tempo com o que não serve.',
  },
  {
    n: '03',
    titulo: 'Visitas guiadas',
    texto: 'Acompanho cada visita apontando pontos fortes, riscos e potencial de cada opção.',
  },
  {
    n: '04',
    titulo: 'Negociação segura',
    texto: 'Negocio preço e condições e confiro toda a parte documental antes de qualquer assinatura.',
  },
]

// Compromissos reais (substitui depoimentos fictícios)
export const COMPROMISSO = [
  {
    icon: 'eye',
    titulo: 'Transparência total',
    texto: 'Você entende cada passo, cada custo e cada risco antes de decidir. Nada nas entrelinhas.',
  },
  {
    icon: 'shield',
    titulo: 'Segurança na documentação',
    texto: 'Confiro a situação documental e jurídica do imóvel antes de qualquer assinatura.',
  },
  {
    icon: 'whats',
    titulo: 'Atendimento direto comigo',
    texto: 'Do primeiro contato à entrega das chaves, quem cuida de você sou eu — sem call center.',
  },
]

// Foto humana ilustrativa para a seção de compromisso (família feliz / sonho realizado)
export const COMPROMISSO_IMG =
  'https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?q=80&w=1200&auto=format&fit=crop'

// Dores reais do comprador -> como o Vinícius resolve
export const DORES = [
  {
    medo: 'Tenho medo de comprar errado e me arrepender depois.',
    solucao: 'Faço a curadoria certa pro seu perfil e aponto os pontos fortes e os riscos de cada imóvel antes de você decidir.',
  },
  {
    medo: 'E se eu pagar mais caro do que o imóvel realmente vale?',
    solucao: 'Avalio o preço pelo mercado real da região e negocio as melhores condições a seu favor.',
  },
  {
    medo: 'Documentação e contrato me assustam. E se for furada?',
    solucao: 'Confiro toda a situação documental e jurídica do imóvel antes de qualquer assinatura.',
  },
  {
    medo: 'Financiamento, FGTS, ITBI... não entendo nada disso.',
    solucao: 'Eu te explico e te conduzo em cada etapa, em linguagem simples, sem você se perder.',
  },
]

// Bairros de Uberlândia (autoridade local / SEO) — descrições gerais e honestas
export const BAIRROS = [
  { nome: 'Jardim Karaíba', desc: 'Alto padrão, condomínios e apartamentos modernos.' },
  { nome: 'Gávea', desc: 'Casas em condomínios fechados, lazer e segurança.' },
  { nome: 'Santa Mônica', desc: 'Central, ótimo para morar e para investir.' },
  { nome: 'Morada da Colina', desc: 'Bairro nobre, arborizado e bem valorizado.' },
  { nome: 'Tabajaras', desc: 'Tradicional, perto do centro e com boa liquidez.' },
  { nome: 'Cidade Jardim', desc: 'Residencial, ideal para famílias.' },
  { nome: 'Tubalina', desc: 'Em crescimento, com boas oportunidades.' },
  { nome: 'Granja Marileusa', desc: 'Bairro planejado e tecnológico, alto padrão.' },
]

// Perguntas frequentes (conteúdo de autoridade + schema FAQ)
export const FAQ = [
  {
    q: 'Posso usar o FGTS para comprar meu imóvel?',
    a: 'Em muitos casos, sim. O FGTS pode ser usado na entrada, na compra ou para abater o financiamento, desde que você atenda às regras (tempo de carteira, imóvel residencial e urbano, entre outras). Eu te ajudo a verificar se o seu caso se enquadra.',
  },
  {
    q: 'Como funciona o financiamento imobiliário?',
    a: 'O banco financia parte do valor do imóvel e você paga em parcelas mensais, normalmente com uma entrada. As condições variam conforme renda, valor e banco. Eu te oriento a organizar a documentação e a comparar as melhores opções.',
  },
  {
    q: 'O que são ITBI e escritura?',
    a: 'O ITBI é o imposto de transmissão pago à prefeitura na compra do imóvel, e a escritura com registro oficializa a transferência em cartório. São etapas obrigatórias, e eu acompanho cada uma para você não ter surpresas.',
  },
  {
    q: 'Em quais regiões você atende?',
    a: 'Atendo Uberlândia e região, em todos os perfis: casas, apartamentos, lançamentos, imóvel para investir e imóvel comercial.',
  },
  {
    q: 'Como começamos a procurar meu imóvel?',
    a: 'É simples. Me chama no WhatsApp e me conta o que você procura. A partir daí eu faço a curadoria e avançamos no seu ritmo, sem compromisso.',
  },
]

export const DIFERENCIAIS = [
  { titulo: 'Curadoria, não catálogo', texto: 'Você não recebe uma lista infinita. Recebe as opções certas pro seu perfil.' },
  { titulo: 'Olhar de investimento', texto: 'Avalio cada imóvel também pelo potencial de valorização e liquidez na região.' },
  { titulo: 'Documentação conferida', texto: 'A parte jurídica e cartorial é verificada antes de qualquer assinatura.' },
  { titulo: 'Atendimento pessoal', texto: 'Você fala direto comigo, do primeiro contato à entrega das chaves.' },
]
