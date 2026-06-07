// Blog — conteúdo de autoridade (SEO + ajuda real ao cliente). Escrito pelo Vinícius.
// cor: índice 0..4 para o gradiente da capa (sem imagens externas, nunca quebra).
import POSTS_EXTRA from './blog-extra.json'

const POSTS_BASE = [
  {
    slug: 'como-usar-fgts-para-comprar-imovel',
    titulo: 'Como usar o FGTS para comprar seu imóvel em 2026',
    resumo: 'Quem tem FGTS pode dar um grande passo rumo à casa própria. Veja as regras, o que dá pra fazer com o saldo e como aproveitar ao máximo.',
    categoria: 'Guia de compra',
    leitura: '5 min',
    data: '2026-06-05',
    destaque: true,
    cor: 0,
    capa: '/img/emp/vitta__arysta.jpg',
    conteudo: [
      { tipo: 'p', txt: 'O FGTS é um dos maiores aliados de quem quer comprar o primeiro imóvel — e muita gente não usa todo o potencial dele. Neste guia, explico de forma simples o que você pode fazer com o seu saldo e como se planejar.' },
      { tipo: 'h', txt: 'Quem pode usar o FGTS na compra' },
      { tipo: 'p', txt: 'Em linhas gerais, você pode usar o FGTS se tiver pelo menos 3 anos de trabalho sob o regime do FGTS (somados, não precisam ser seguidos), se o imóvel for urbano e residencial e destinado à sua moradia, e se você não tiver outro imóvel residencial nem financiamento ativo no Sistema Financeiro de Habitação (SFH) na cidade onde mora ou trabalha.' },
      { tipo: 'h', txt: 'O que dá pra fazer com o saldo' },
      { tipo: 'p', txt: 'O FGTS pode entrar na entrada do financiamento, pode complementar o valor para comprar à vista e pode ser usado depois para amortizar o saldo devedor ou reduzir o valor das parcelas. Para amortização, em geral existe um intervalo (costuma ser a cada 2 anos), e para usar o fundo numa nova compra, um intervalo de 3 anos a partir do registro do contrato.' },
      { tipo: 'h', txt: 'O erro mais comum' },
      { tipo: 'p', txt: 'Muita gente esquece de usar o FGTS para amortizar ao longo do contrato. Cada amortização derruba os juros futuros e pode encurtar anos de financiamento. Vale colocar isso no planejamento desde o começo.' },
      { tipo: 'p', txt: 'Quer saber se você se enquadra e quanto o seu FGTS resolve no imóvel que você quer? Me chama no WhatsApp que eu faço essa conta com você, sem compromisso.' },
    ],
  },
  {
    slug: 'financiamento-caixa-passo-a-passo',
    titulo: 'Financiamento imobiliário: o passo a passo sem complicação',
    resumo: 'Da simulação à entrega das chaves: entenda cada etapa do financiamento, o que o banco analisa e como aumentar suas chances de aprovação.',
    categoria: 'Financiamento',
    leitura: '6 min',
    data: '2026-06-04',
    destaque: true,
    cor: 1,
    capa: '/img/emp/zp__santa-maria-lifestyle.jpg',
    conteudo: [
      { tipo: 'p', txt: 'Financiar assusta quem nunca passou pelo processo, mas ele é mais organizado do que parece. Aqui vai o caminho completo, do início ao fim.' },
      { tipo: 'h', txt: '1. Simulação e capacidade' },
      { tipo: 'p', txt: 'Tudo começa entendendo quanto cabe no seu bolso. Os bancos costumam aprovar parcelas de até cerca de 30% da renda familiar e financiar até 80% do valor do imóvel — ou seja, você entra com aproximadamente 20% de entrada, que pode incluir o FGTS. Use a calculadora aqui do site para ter uma primeira ideia.' },
      { tipo: 'h', txt: '2. Análise de crédito' },
      { tipo: 'p', txt: 'O banco avalia seu histórico (score), renda, estabilidade e se você tem o nome limpo. Quanto mais organizada a comprovação de renda — principalmente para autônomos e MEI —, melhores as condições.' },
      { tipo: 'h', txt: '3. Avaliação do imóvel e contrato' },
      { tipo: 'p', txt: 'Depois da aprovação, o banco avalia o imóvel e analisa a documentação. Estando tudo certo, é gerado o contrato, que já vale como a transferência e vai a registro no Cartório de Registro de Imóveis.' },
      { tipo: 'h', txt: 'SAC ou Price?' },
      { tipo: 'p', txt: 'No SAC as parcelas começam mais altas e caem ao longo do tempo, com menos juros no total. No Price as parcelas são fixas. A maioria dos contratos no Brasil usa o SAC. A melhor escolha depende do seu orçamento de hoje e do seu planejamento.' },
      { tipo: 'p', txt: 'Eu te acompanho em cada etapa, organizo a documentação e ajudo a comparar bancos para você fechar nas melhores condições. Chama no WhatsApp.' },
    ],
  },
  {
    slug: 'itbi-e-custos-de-compra-uberlandia',
    titulo: 'ITBI e custos de cartório em Uberlândia: o que reservar além do preço',
    resumo: 'Além do valor do imóvel, existem custos de transferência. Veja quanto separar para não ser pego de surpresa na hora de comprar em Uberlândia.',
    categoria: 'Guia de compra',
    leitura: '4 min',
    data: '2026-06-03',
    destaque: true,
    cor: 2,
    capa: '/img/emp/inconew__leme-do-praia.jpg',
    conteudo: [
      { tipo: 'p', txt: 'Na hora de comprar, o preço do imóvel não é a única conta. Existem os custos de transferência — e quem não se planeja acaba apertado no fim. Veja o que reservar.' },
      { tipo: 'h', txt: 'ITBI — o imposto da transferência' },
      { tipo: 'p', txt: 'O ITBI é o imposto municipal pago para passar o imóvel para o seu nome. Em Uberlândia, a alíquota para compra e venda comum é de 2% sobre o valor do imóvel. Em operações de financiamento pelo SFH para menor renda, há uma alíquota reduzida sobre a parte financiada. Sem o ITBI pago, o cartório não registra a compra.' },
      { tipo: 'h', txt: 'Escritura e registro' },
      { tipo: 'p', txt: 'A escritura (quando não é compra financiada) e o registro no Cartório de Registro de Imóveis seguem uma tabela de emolumentos. Some isso ao ITBI e, na prática, vale reservar em torno de 4% a 6% do valor do imóvel para esses custos.' },
      { tipo: 'h', txt: 'A regra de ouro' },
      { tipo: 'p', txt: 'No Brasil, só é dono quem registra. Não deixe de registrar o imóvel no seu nome — é o que garante a sua segurança jurídica. Use a calculadora de custos aqui do site para estimar o seu caso, e me chame para conferir tudo antes de fechar.' },
    ],
  },
  {
    slug: 'vale-a-pena-morar-no-jardim-karaiba',
    titulo: 'Vale a pena morar no Jardim Karaíba, em Uberlândia?',
    resumo: 'O bairro mais nobre de Uberlândia tem alto padrão, lazer e valorização. Veja o perfil do Jardim Karaíba e para quem ele faz sentido.',
    categoria: 'Bairros de Uberlândia',
    leitura: '4 min',
    data: '2026-06-02',
    destaque: false,
    cor: 3,
    capa: '/img/cond/bosque-karaiba.jpg',
    conteudo: [
      { tipo: 'p', txt: 'O Jardim Karaíba é, hoje, um dos endereços mais desejados de Uberlândia. Mas será que ele combina com o seu momento? Vou te dar um panorama honesto.' },
      { tipo: 'h', txt: 'O perfil do bairro' },
      { tipo: 'p', txt: 'Localizado na Zona Sul, o Karaíba concentra condomínios e edifícios de alto padrão, com arquitetura moderna, lazer completo e forte preocupação com segurança. É um bairro residencial, arborizado e bem cuidado, próximo a serviços, escolas e ao comércio da região sul.' },
      { tipo: 'h', txt: 'Valorização e investimento' },
      { tipo: 'p', txt: 'Por reunir empreendimentos de qualidade e localização privilegiada, o Karaíba costuma ter boa liquidez e tende a se manter valorizado. Para quem busca patrimônio sólido e padrão de moradia elevado, é uma aposta consistente.' },
      { tipo: 'h', txt: 'Para quem faz sentido' },
      { tipo: 'p', txt: 'Famílias e profissionais que valorizam segurança, lazer e um endereço de prestígio se sentem em casa no Karaíba. Se é o seu caso, eu te mostro as melhores opções disponíveis e faço a curadoria pra você escolher com segurança.' },
    ],
  },
  {
    slug: 'comprar-na-planta-ou-pronto',
    titulo: 'Comprar na planta ou pronto para morar? Como decidir',
    resumo: 'Cada opção tem vantagens. Entenda preço, prazo, risco e valorização para escolher o que faz mais sentido para o seu momento.',
    categoria: 'Mercado',
    leitura: '5 min',
    data: '2026-06-01',
    destaque: false,
    cor: 4,
    capa: '/img/emp/perplan__grandverse-place.jpg',
    conteudo: [
      { tipo: 'p', txt: 'Uma das primeiras dúvidas de quem vai comprar: lançamento na planta ou um imóvel pronto? As duas opções são boas — depende do seu momento.' },
      { tipo: 'h', txt: 'Comprar na planta' },
      { tipo: 'p', txt: 'Você costuma pagar mais barato, parcela a entrada direto com a construtora durante a obra e tende a ver o imóvel valorizar até a entrega. Em troca, espera para morar e assume o risco do prazo — por isso é fundamental escolher uma construtora sólida e com bom histórico de entregas.' },
      { tipo: 'h', txt: 'Comprar pronto' },
      { tipo: 'p', txt: 'Você vê exatamente o que está levando, muda mais rápido e tira dúvidas olhando o imóvel real. O preço tende a ser maior, mas a segurança de já estar pronto pesa bastante para quem tem pressa.' },
      { tipo: 'h', txt: 'Como eu te ajudo a decidir' },
      { tipo: 'p', txt: 'Eu analiso o seu momento (pressa, orçamento, objetivo) e a reputação de cada construtora, e te mostro opções dos dois tipos para comparar lado a lado. Assim você decide com clareza, sem achismo.' },
    ],
  },
]

export const POSTS = [...POSTS_BASE, ...POSTS_EXTRA]

export const getPost = (slug) => POSTS.find((p) => p.slug === slug)
export const postsDestaque = () => {
  const d = POSTS.filter((p) => p.destaque)
  return (d.length >= 3 ? d : POSTS).slice(0, 3)
}
