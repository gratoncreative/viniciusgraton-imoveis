// Conteúdo editorial dos bairros (história, curiosidades, perfil) — dados reais
// de fontes como ITV Urbanismo/Diário de Uberlândia, Wikipédia, prefeitura e portais.
// Usado nas páginas /imoveis/uberlandia/:bairro para "vender a ideia" do bairro.
//
// FOTOS REAIS de Uberlândia (fonte oficial/livre: Wikimedia Commons, CC BY-SA).
// Onde existe foto do PRÓPRIO bairro, usamos ela; onde não existe, usamos uma foto
// REAL da região/zona ou de um marco da cidade — e a legenda diz HONESTAMENTE o que
// a imagem mostra (nunca afirmamos ser uma rua específica que não é). Crédito sempre visível.
const CRED = (autor) => `Foto: ${autor} · Wikimedia Commons (CC BY-SA)`
const FOTOS = {
  'granja-marileusa': { src: '/img/bairros/granja-marileusa.jpg', local: 'Granja Marileusa, Uberlândia', cred: CRED('Will7') },
  'jardim-finotti': { src: '/img/bairros/jardim-finotti.jpg', local: 'Jardim Finotti, Uberlândia', cred: CRED('Will7') },
  'shopping-park': { src: '/img/bairros/shopping-park.jpg', local: 'Shopping Park, Uberlândia', cred: CRED('Will7') },
  'santa-monica': { src: '/img/bairros/santa-monica.jpg', local: 'Santa Mônica, Uberlândia', cred: CRED('Will7') },
  'santa-maria': { src: '/img/bairros/santa-maria.jpg', local: 'Santa Maria, Uberlândia', cred: CRED('Will7') },
  'tubalina': { src: '/img/bairros/tubalina.jpg', local: 'Tubalina, Uberlândia', cred: CRED('Will7') },
  'brasil': { src: '/img/bairros/brasil.jpg', local: 'Bairro Brasil, Uberlândia', cred: CRED('Will7') },
  'rondon-pacheco': { src: '/img/bairros/rondon-pacheco.jpg', local: 'Avenida Rondon Pacheco, Uberlândia', cred: CRED('Will7') },
  'zona-sul': { src: '/img/bairros/zona-sul.jpg', local: 'Zona Sul de Uberlândia', cred: CRED('Will7') },
  'jardim-acacias': { src: '/img/bairros/jardim-acacias.jpg', local: 'Jardim das Acácias, Zona Sul, Uberlândia', cred: CRED('Will7') },
  'centro-martins': { src: '/img/bairros/centro-martins.jpg', local: 'Centro (Martins), Uberlândia', cred: CRED('Will7') },
  'center-shopping': { src: '/img/bairros/center-shopping.jpg', local: 'Região do Center Shopping, Zona Leste, Uberlândia', cred: CRED('Will7') },
  'zona-oeste': { src: '/img/bairros/zona-oeste.jpg', local: 'Zona Oeste de Uberlândia', cred: CRED('Will7') },
  'vista-uberlandia': { src: '/img/bairros/vista-uberlandia.jpg', local: 'Uberlândia, MG', cred: CRED('Will7') },
  'parque-sabia': { src: '/img/bairros/parque-sabia.jpg', local: 'Parque do Sabiá, Uberlândia', cred: CRED('José R. V. Resende') },
}
// Qual foto real cada bairro usa (direta quando existe; senão, região/zona real coerente)
const BAIRRO_FOTO = {
  'jardim-karaiba': 'zona-sul', 'morada-da-colina': 'jardim-acacias', 'cidade-jardim': 'zona-sul',
  'gavea': 'jardim-acacias', 'granja-marileusa': 'granja-marileusa', 'vigilato-pereira': 'rondon-pacheco',
  'santa-maria': 'santa-maria', 'jardim-sul': 'zona-sul', 'jardim-finotti': 'jardim-finotti',
  'parque-una': 'zona-sul', 'patrimonio': 'centro-martins', 'lidice': 'centro-martins',
  'santa-monica': 'santa-monica', 'tabajaras': 'centro-martins', 'nova-uberlandia': 'rondon-pacheco',
  'tubalina': 'tubalina', 'alphaville': 'zona-sul', 'alphaville-i': 'zona-sul', 'tambore': 'zona-sul',
  'laranjeiras': 'center-shopping', 'shopping-park': 'shopping-park', 'jardim-ipanema': 'zona-oeste',
  'jardim-versailles': 'zona-sul', 'brasil': 'brasil', 'bom-jesus': 'centro-martins',
  'nossa-senhora-aparecida': 'centro-martins', 'chacaras-eldorado': 'vista-uberlandia', 'gsp-arts': 'zona-sul',
}
// keys de ambiência ainda referenciadas nas entradas abaixo -> apontam p/ fotos reais coerentes
const FOTO = {
  luxo: FOTOS['zona-sul'].src, casaModerna: FOTOS['jardim-acacias'].src, residencial: FOTOS['shopping-park'].src,
  arborizado: FOTOS['parque-sabia'].src, aconchego: FOTOS['centro-martins'].src, condominio: FOTOS['zona-sul'].src,
  cidade: FOTOS['vista-uberlandia'].src, classico: FOTOS['centro-martins'].src, familia: FOTOS['jardim-finotti'].src,
  central: FOTOS['centro-martins'].src, vertical: FOTOS['zona-sul'].src,
}
const FOTO_PADRAO_INFO = FOTOS['vista-uberlandia']
// foto padrão para qualquer bairro sem entrada editorial (garante "sempre uma foto")
export const BAIRRO_FOTO_PADRAO = FOTO_PADRAO_INFO.src
// info completa (src + local mostrado + crédito) para legenda honesta
export const getBairroFotoInfo = (slug) => FOTOS[BAIRRO_FOTO[slug]] || FOTO_PADRAO_INFO

export const BAIRROS_EDITORIAL = {
  'jardim-karaiba': {
    foto: FOTO.luxo,
    intro: 'Considerado um dos endereços mais valorizados e desejados de Uberlândia, o Jardim Karaíba é um bairro residencial de alto padrão na Zona Sul, a poucos minutos do centro. Seu planejamento urbano arrojado — ruas largas, calçadas amplas e casas com grandes jardins frontais sem muros — o consolida como referência de paisagismo na cidade.',
    historia: 'Lançado em maio de 1980 pelo engenheiro Roberto Freire (Karaíba Imobiliária), o bairro nasceu sobre uma área de 237 mil m² e trouxe uma proposta de urbanismo inédita em Uberlândia, inspirada nos subúrbios norte-americanos, voltada a quem buscava qualidade de vida numa Zona Sul então afastada.',
    curiosidades: [
      'Foi um dos primeiros bairros do Brasil concebidos com casas sem muros e grandes jardins na frente',
      'Abrigou o Ubershopping (1988), primeiro shopping da cidade, onde hoje fica o Uberlândia Medical Center',
      'O Uberlândia Shopping (2010) fica na região do bairro',
      'Próximo ao Praia Clube, tradicional clube fundado em 1935 às margens do Rio Uberabinha',
    ],
    perfil: 'Ideal para famílias de alto padrão que buscam qualidade de vida, segurança e um ambiente residencial planejado e arborizado.',
    destaques: ['Alto padrão e forte valorização', 'Planejamento urbano diferenciado', 'A poucos minutos do centro', 'Próximo ao Praia Clube e ao Uberlândia Shopping'],
  },
  'morada-da-colina': {
    foto: FOTO.casaModerna,
    intro: 'A Morada da Colina é um dos bairros mais nobres e tradicionais de Uberlândia, sinônimo de residências de alto padrão e ótima localização na região central/sul, vizinha ao Patrimônio e à Gávea. Reúne casas amplas, infraestrutura completa e proximidade de escolas e hospitais de referência.',
    historia: '',
    curiosidades: [
      'Faz divisa com os bairros Patrimônio, Gávea e Jardim das Acácias',
      'Colégios tradicionais por perto, como Colégio Nacional e Escola Estadual Honório Guimarães',
      'Hospitais e clínicas de referência na região, como Orthomed Center e CIAS Unimed',
    ],
    perfil: 'Ideal para famílias de alto poder aquisitivo que buscam casas amplas em um bairro nobre e bem localizado.',
    destaques: ['Bairro nobre e tradicional', 'Residências de alto padrão', 'Escolas renomadas no entorno', 'Localização central e bem conectada'],
  },
  'cidade-jardim': {
    foto: FOTO.arborizado,
    intro: 'O Cidade Jardim é um bairro arborizado e tranquilo da Zona Sul de Uberlândia, marcado por ruas largas, avenidas amplas e muitas áreas verdes, praças e parques. Com predomínio de casas de alto padrão, é procurado por quem valoriza qualidade de vida e contato com a natureza.',
    historia: 'O bairro tem origem na Fazenda Guaribas, comprada em 1967 pelo banqueiro Aldorando Dias de Sousa. Em 1977 ele lançou o primeiro "projeto dirigido" de Uberlândia — lotes de 1.000 m² entregues já com água, esgoto, drenagem, energia e asfalto.',
    curiosidades: [
      'Foi o 1º "projeto dirigido" (loteamento com infraestrutura completa) de Uberlândia',
      'As ruas da primeira fase receberam nomes de pássaros, como a Avenida Uirapuru; depois vieram nomes de árvores e flores',
      'Nasceu da antiga Fazenda Guaribas, às margens do Rio Uberabinha',
    ],
    perfil: 'Ideal para famílias de classe média alta que buscam tranquilidade, áreas verdes e casas de alto padrão.',
    destaques: ['Muito arborizado, com praças e áreas verdes', 'Ruas largas e avenidas amplas', 'Infraestrutura completa', 'Predomínio de casas de alto padrão'],
  },
  'gavea': {
    foto: FOTO.condominio,
    intro: 'A Gávea é um bairro nobre da região sul/central de Uberlândia, vizinho da Morada da Colina e do Patrimônio, conhecido pelo perfil residencial de alto padrão e pela boa localização. Reúne casas e condomínios sofisticados em uma área valorizada e bem servida de comércio e serviços.',
    historia: '',
    curiosidades: ['Faz vizinhança com bairros nobres como Morada da Colina e Patrimônio'],
    perfil: 'Ideal para famílias de alto padrão que buscam um bairro residencial nobre e bem localizado.',
    destaques: ['Bairro nobre e valorizado', 'Imóveis de alto padrão', 'Boa localização na zona sul/central', 'Vizinho de Morada da Colina e Patrimônio'],
  },
  'granja-marileusa': {
    foto: FOTO.cidade,
    intro: 'A Granja Marileusa é o primeiro bairro planejado de Uberlândia e o maior distrito de inovação e tecnologia do Triângulo Mineiro, na Zona Leste. Com urbanismo sustentável e segurança de ponta, integra moradia, trabalho e lazer em meio a amplas áreas verdes.',
    historia: 'O bairro se consolidou em 2013 como o único bairro planejado e polo tecnológico da cidade, projetado com conceitos de urbanismo sustentável sobre uma área de mais de 6 milhões de m², respeitando um corredor ecológico ligado ao vale do Rio Araguari.',
    curiosidades: [
      'É o primeiro bairro planejado de Uberlândia',
      'Abriga um Distrito de Inovação, reunindo startups e grandes corporações',
      'Apontado como o primeiro bairro do Brasil a ter IA conectada à Polícia Militar ("Segurança 4.0")',
      'Mais de 790 mil m² de áreas verdes, com parque linear, ciclovias e praças',
    ],
    perfil: 'Ideal para profissionais de tecnologia, famílias modernas e investidores que valorizam inovação, sustentabilidade e segurança.',
    destaques: ['Único bairro planejado da cidade', 'Maior distrito de inovação do Triângulo', 'Urbanismo sustentável', 'Amplas áreas verdes e parque linear'],
  },
  'vigilato-pereira': {
    foto: FOTO.vertical,
    intro: 'O Vigilato Pereira é uma das regiões mais privilegiadas e valorizadas da Zona Sul de Uberlândia, com forte verticalização de alto padrão e excelente localização junto à Avenida Rondon Pacheco. Combina infraestrutura completa com fácil acesso a toda a cidade.',
    historia: 'Aprovado em dezembro de 1966, o bairro surgiu entre os córregos Lagoinha e São Pedro, em terras da Fazenda da Barra do Rio Claro. Leva o nome do fazendeiro Vigilato Orozimbo Pereira (nascido em Uberaba em 1871), homenageado pelo genro Galeno de Andrade Santos, idealizador do loteamento.',
    curiosidades: [
      'Leva o nome de Vigilato Orozimbo Pereira, fazendeiro nascido em Uberaba em 1871',
      'A mesma fazenda deu origem a City Uberlândia, Santa Maria, Santa Mônica, Segismundo Pereira e Cazeca',
      'Nasceu entre dois córregos, o Lagoinha e o São Pedro',
      'É cortado pela Avenida Rondon Pacheco, uma das principais vias da cidade',
    ],
    perfil: 'Ideal para quem busca apartamentos de alto padrão em localização nobre e central da Zona Sul, e para investidores.',
    destaques: ['Uma das regiões mais privilegiadas', 'Forte verticalização de alto padrão', 'Junto à Avenida Rondon Pacheco', 'Infraestrutura completa'],
  },
  'santa-maria': {
    foto: FOTO.classico,
    intro: 'O Santa Maria é um bairro residencial da Zona Sul de Uberlândia, bem situado e com boa infraestrutura, que faz parte do conjunto de bairros valorizados que cresceram a partir das antigas fazendas da região. Oferece tranquilidade e proximidade dos principais polos de comércio e serviços do sul da cidade.',
    historia: 'Tem origem na Fazenda da Barra do Rio Claro, na divisa entre Uberlândia e Uberaba — a mesma propriedade que deu origem a outros bairros da Zona Sul e Leste, como Vigilato Pereira e Santa Mônica.',
    curiosidades: [
      'Surgiu a partir da Fazenda da Barra do Rio Claro',
      'Tem ligação histórica com a família Vigilato Pereira, que originou vários bairros',
    ],
    perfil: 'Ideal para famílias que buscam um bairro residencial tranquilo e bem localizado na Zona Sul.',
    destaques: ['Localização na Zona Sul', 'Bairro residencial tranquilo', 'Boa infraestrutura no entorno', 'Empreendimentos de alto padrão'],
  },
  'jardim-sul': {
    foto: FOTO.luxo,
    intro: 'O Jardim Sul é um dos bairros mais valorizados da Zona Sul de Uberlândia, reconhecido pelo alto padrão dos imóveis, segurança e excelente infraestrutura. Com terrenos planos e localização estratégica próxima a shoppings, universidades e grandes avenidas, oferece praticidade e qualidade de vida.',
    historia: '',
    curiosidades: [
      'Próximo ao Uberlândia Shopping e à universidade Unitri',
      'Perto de avenidas importantes como Landscape, Vinhedos e Nicomedes Alves dos Santos',
      'Topografia predominantemente plana, o que favorece a construção',
    ],
    perfil: 'Ideal para famílias e investidores que buscam imóveis de alto padrão em uma região nobre e bem conectada.',
    destaques: ['Alto padrão e forte valorização', 'Próximo ao Uberlândia Shopping e à Unitri', 'Junto a grandes avenidas', 'Terrenos planos'],
  },
  'jardim-finotti': {
    foto: FOTO.familia,
    intro: 'O Jardim Finotti é um bairro residencial valorizado de Uberlândia, estrategicamente localizado junto à Universidade Federal de Uberlândia (campus Santa Mônica) e cercado de instituições de ensino renomadas. A proximidade da UFU o torna atraente para famílias e para o público universitário.',
    historia: '',
    curiosidades: [
      'Fica ao lado da UFU (campus Santa Mônica)',
      'Escolas tradicionais por perto, como Colégio Finotti e Colégio Shalom',
      'Administrativamente integra a região do Santa Mônica, na Zona Leste',
    ],
    perfil: 'Ideal para famílias, estudantes e professores que buscam morar perto da UFU em um bairro bem servido de escolas.',
    destaques: ['Coladinho na UFU', 'Cercado de escolas renomadas', 'Bairro residencial valorizado', 'Boa localização'],
  },
  'parque-una': {
    foto: FOTO.arborizado,
    intro: 'O Parque Una é um bairro planejado e aberto da Zona Sul de Uberlândia, inspirado no conceito de Novo Urbanismo: ruas que priorizam o pedestre, integrando moradia, trabalho e lazer em escala humana. Premiado e cheio de áreas verdes, é uma das propostas mais modernas de viver na cidade.',
    historia: 'Desenvolvido sobre cerca de 171,5 mil m² na Zona Sul, foi concebido segundo o Novo Urbanismo, movimento criado nos anos 1990 nos Estados Unidos que valoriza o caminhar e a convivência. Diferentemente de um condomínio fechado, é um bairro planejado e aberto.',
    curiosidades: [
      'Inspirado no Novo Urbanismo norte-americano dos anos 1990',
      'Ruas estreitas e no nível da calçada, para priorizar o pedestre',
      'Recebeu o Prêmio Master Imobiliário em 2022 (soluções urbanas)',
      'Pistas de caminhada, quadra de areia, pet place, espaço fitness e food trucks',
    ],
    perfil: 'Ideal para quem busca um estilo de vida moderno e caminhável, e para investidores em uma região em valorização.',
    destaques: ['Bairro planejado e aberto', 'Conceito de Novo Urbanismo', 'Premiado (Master Imobiliário 2022)', 'Muitas áreas verdes e lazer'],
  },
  'patrimonio': {
    foto: FOTO.central,
    intro: 'O Patrimônio é um dos bairros mais antigos e historicamente significativos de Uberlândia — o primeiro a surgir após o núcleo original da cidade, o Fundinho. Hoje, na região central/sul e vizinho de bairros nobres, combina forte carga histórica com excelente localização e proximidade do Praia Clube.',
    historia: 'Conhecido como Patrimônio de Nossa Senhora da Abadia, nasceu de uma doação de 12 alqueires de terra à igreja em 1883, pelo fazendeiro José Machado Rodrigues. Após a abolição (1888), tornou-se refúgio de ex-escravizados, e por anos foi considerado área marginalizada antes de se valorizar.',
    curiosidades: [
      'É o primeiro bairro surgido após o Fundinho, núcleo original da cidade',
      'Nasceu de uma doação de terras à igreja em 1883',
      'O Praia Clube foi instalado às margens do Rio Uberabinha em 1935, na região',
    ],
    perfil: 'Ideal para quem valoriza tradição e história aliadas a uma localização central e nobre.',
    destaques: ['Bairro mais antigo após o Fundinho', 'Localização central/sul privilegiada', 'Próximo ao Praia Clube', 'Vizinho de bairros nobres'],
  },
  'lidice': {
    foto: FOTO.aconchego,
    intro: 'O Lídice é um bairro tradicional e nobre da região central de Uberlândia, a menos de 1 km do hipercentro, mas com atmosfera predominantemente residencial e tranquila. Reúne a proximidade do centro com o sossego de ruas com muitas casas e poucos prédios.',
    historia: 'Bairro central que reúne antigos loteamentos como Vila Ribeirinho, Vila Póvoa e Tobias Inácio. O nome é uma homenagem à vila de Lídice, na antiga Tchecoslováquia, destruída pelos nazistas na Segunda Guerra e tornada símbolo mundial contra a crueldade da guerra.',
    curiosidades: [
      'O nome homenageia a vila tcheca de Lídice, arrasada na 2ª Guerra Mundial',
      'Fica a menos de 1 km do hipercentro de Uberlândia',
      'Reúne antigos loteamentos como Vila Ribeirinho e Vila Póvoa',
    ],
    perfil: 'Ideal para quem quer morar pertíssimo do centro em um bairro tradicional, calmo e residencial.',
    destaques: ['Bairro nobre e tradicional do centro', 'A menos de 1 km do hipercentro', 'Predominantemente residencial', 'Mais casas do que prédios'],
  },
  'santa-monica': {
    foto: FOTO.residencial,
    intro: 'O Santa Mônica é um dos maiores e mais movimentados bairros da Zona Leste de Uberlândia, marcado pela presença do campus da UFU e pela vizinhança com o Parque do Sabiá. Com comércio forte e vida universitária, é um dos endereços mais procurados por famílias e estudantes.',
    historia: 'Começou a se desenvolver na década de 1950, acompanhando o crescimento de Uberlândia. O nome homenageia Santa Mônica de Hipona, mãe de Santo Agostinho. Reúne os setores A, B e C, além de áreas como Jardim Finotti e parte do Jardim Parque do Sabiá.',
    curiosidades: [
      'Abriga o campus Santa Mônica da UFU',
      'Inclui parte do Jardim Parque do Sabiá, junto a um dos maiores parques da cidade',
      'Era um dos bairros mais populosos no Censo IBGE de 2010 (mais de 35 mil habitantes)',
    ],
    perfil: 'Ideal para estudantes, famílias e investidores que buscam um bairro movimentado, perto da UFU e do Parque do Sabiá.',
    destaques: ['Campus da UFU dentro do bairro', 'Próximo ao Parque do Sabiá', 'Comércio completo e movimentado', 'Ampla oferta de moradia'],
  },
  'tabajaras': {
    foto: FOTO.central,
    intro: 'O Tabajaras é um bairro tradicional da região central de Uberlândia, ligado às origens da própria cidade, que cresceu em torno da capela fundadora do século XIX. Hoje oferece a praticidade de morar perto do centro em um bairro consolidado, com comércio e serviços à mão.',
    historia: 'A área está ligada à capela fundadora de Uberlândia: a Capela de Nossa Senhora do Carmo, idealizada em 1846 em adobe e barro, em terras doadas à santa — patrimônio que corresponde à parte central da atual cidade. O nome "Tabajara" vem do tupi (taba = aldeia, jara = senhor): "senhores da aldeia".',
    curiosidades: [
      'Ligado à área da capela fundadora de Uberlândia, do século XIX',
      'A Capela de Nossa Senhora do Carmo foi idealizada em 1846',
      'O nome "Tabajara" vem do tupi e significa "senhores da aldeia"',
    ],
    perfil: 'Ideal para quem busca um bairro tradicional, central e consolidado, com fácil acesso ao comércio.',
    destaques: ['Bairro tradicional ligado às origens da cidade', 'Localização central', 'Comércio e serviços consolidados', 'Forte identidade histórica'],
  },
  'nova-uberlandia': {
    foto: FOTO.vertical,
    intro: 'O Nova Uberlândia é uma das regiões mais valorizadas da Zona Sul de Uberlândia, com excelente infraestrutura e localização estratégica junto a vias importantes como a Avenida Rondon Pacheco e a BR-050. Oferece comércio, serviços, escolas, universidades e lazer.',
    historia: 'O atual Nova Uberlândia resulta da integração de antigos loteamentos, como Jardins Gênova, Jardins Roma, Jardins Barcelona e Jardim Versailles. Originalmente parte da Zona Oeste, passou a integrar a Zona Sul após a nova subdivisão da Prefeitura.',
    curiosidades: [
      'Resulta da integração de bairros como Jardins Gênova, Roma, Barcelona e Versailles',
      'Era parte da Zona Oeste e passou à Zona Sul após a nova divisão',
      'Acesso fácil à Avenida Rondon Pacheco e à BR-050',
    ],
    perfil: 'Ideal para famílias e investidores que buscam infraestrutura completa e ótima conexão viária na Zona Sul.',
    destaques: ['Região muito valorizada da Zona Sul', 'Localização estratégica (Rondon Pacheco e BR-050)', 'Infraestrutura completa', 'Escolas e universidades por perto'],
  },
  'tubalina': {
    foto: FOTO.classico,
    intro: 'O Tubalina é um bairro tradicional na divisa entre as zonas Oeste e Sul de Uberlândia, com forte importância histórica: foi o primeiro bairro a atravessar o Rio Uberabinha e a impulsionar a expansão da cidade para além dele. Consolidado e bem localizado, reúne comércio, serviços e fácil acesso ao restante da cidade.',
    historia: 'Leva o nome do ex-prefeito Tubal Vilela da Silva, que comprou a Fazenda Tubalina em 1948 (745 hectares). A fazenda foi registrada em 17 de novembro de 1949, quando a Empreza Immobiliaria Uberlandense (atual ITV) atravessou o Rio Uberabinha pela primeira vez, dando início à Zona Oeste.',
    curiosidades: [
      'Foi o 1º bairro de Uberlândia a atravessar o Rio Uberabinha',
      'Leva o nome do ex-prefeito Tubal Vilela da Silva',
      'A fazenda original tinha 745 hectares, registrada em 17/11/1949',
      'O ex-prefeito doava telhas e tijolos para facilitar a moradia de famílias de menor renda',
    ],
    perfil: 'Ideal para quem busca um bairro tradicional, consolidado e bem localizado, com bom custo-benefício.',
    destaques: ['Bairro histórico (1º a cruzar o Uberabinha)', 'Na divisa Oeste/Sul, bem conectado', 'Comércio e serviços consolidados', 'Tradicional e de identidade forte'],
  },

  // ————— Bairros e regiões que aparecem na carteira de imóveis —————
  'alphaville': {
    foto: FOTO.condominio,
    intro: 'Alphaville é a marca de condomínios horizontais fechados de alto padrão presente em Uberlândia, sinônimo de segurança, infraestrutura completa de lazer e lotes amplos para casas sofisticadas. É um dos endereços mais procurados por quem quer viver em condomínio fechado na cidade.',
    historia: '',
    curiosidades: [
      'Marca nacional de condomínios fechados de alto padrão',
      'Portaria com controle de acesso e segurança 24h',
      'Áreas de lazer completas e ruas internas arborizadas',
    ],
    perfil: 'Ideal para famílias de alto padrão que priorizam segurança, privacidade e lazer dentro de um condomínio fechado.',
    destaques: ['Condomínio fechado de alto padrão', 'Segurança 24h com controle de acesso', 'Lazer completo dentro do condomínio', 'Lotes amplos para casas sofisticadas', 'Ruas internas arborizadas', 'Forte valorização e liquidez'],
  },
  'alphaville-i': {
    foto: FOTO.condominio,
    intro: 'O Alphaville I é a primeira fase do condomínio horizontal fechado Alphaville em Uberlândia, reunindo casas de alto padrão em um ambiente seguro, arborizado e com infraestrutura de lazer completa. Um endereço consolidado para quem busca qualidade de vida em condomínio fechado.',
    historia: '',
    curiosidades: [
      'Primeira fase do residencial Alphaville na cidade',
      'Condomínio horizontal fechado com segurança 24h',
      'Clube e áreas de lazer para os moradores',
    ],
    perfil: 'Ideal para famílias de alto padrão que querem casa em condomínio fechado, com segurança e lazer.',
    destaques: ['Condomínio fechado consolidado', 'Casas de alto padrão', 'Segurança 24h', 'Áreas de lazer e clube', 'Ambiente arborizado e tranquilo', 'Excelente valorização'],
  },
  'tambore': {
    foto: FOTO.condominio,
    intro: 'O Tamboré é um condomínio horizontal fechado de alto padrão em Uberlândia, parte de uma das marcas mais reconhecidas do país em moradia planejada. Oferece lotes amplos, segurança de ponta e infraestrutura de lazer pensada para o dia a dia da família.',
    historia: '',
    curiosidades: [
      'Marca nacional de condomínios fechados de alto padrão',
      'Segurança com portaria e monitoramento',
      'Infraestrutura de lazer e áreas verdes',
    ],
    perfil: 'Ideal para famílias de alto padrão em busca de segurança, lotes amplos e lazer em condomínio fechado.',
    destaques: ['Condomínio fechado de alto padrão', 'Segurança e portaria controlada', 'Lotes amplos', 'Infraestrutura de lazer completa', 'Áreas verdes e ruas planejadas', 'Alto potencial de valorização'],
  },
  'laranjeiras': {
    foto: FOTO.residencial,
    intro: 'O Laranjeiras é um dos bairros que mais cresceram na região leste/sudeste de Uberlândia, hoje um forte polo residencial e comercial. Com grandes avenidas, comércio variado e ampla oferta de imóveis, reúne praticidade no dia a dia e boas oportunidades para morar e investir.',
    historia: '',
    curiosidades: [
      'Importante polo comercial e residencial da região leste/sudeste',
      'Cortado por grandes avenidas, com fácil acesso e comércio forte',
      'Ampla oferta de apartamentos, casas e salas comerciais',
    ],
    perfil: 'Ideal para famílias e investidores que buscam um bairro completo, com comércio à mão e boa liquidez.',
    destaques: ['Forte polo comercial e residencial', 'Grandes avenidas e fácil acesso', 'Comércio e serviços completos', 'Ampla oferta de imóveis', 'Boa liquidez para investir', 'Região em crescimento'],
  },
  'shopping-park': {
    foto: FOTO.residencial,
    intro: 'O Shopping Park é uma das maiores regiões residenciais da Zona Sul de Uberlândia, fruto de um grande projeto de moradia que se consolidou e segue em expansão. Com comércio crescente, escolas e fácil acesso pela BR-050, é uma das áreas com melhor custo-benefício da cidade.',
    historia: '',
    curiosidades: [
      'Uma das maiores regiões residenciais da Zona Sul',
      'Acesso facilitado pela BR-050',
      'Comércio, escolas e serviços em expansão',
    ],
    perfil: 'Ideal para quem busca o primeiro imóvel, famílias e investidores atentos ao custo-benefício e ao potencial de valorização.',
    destaques: ['Excelente custo-benefício', 'Grande região residencial em expansão', 'Acesso fácil pela BR-050', 'Comércio e escolas crescentes', 'Boas opções de financiamento e MCMV', 'Potencial de valorização'],
  },
  'jardim-ipanema': {
    foto: FOTO.familia,
    intro: 'O Jardim Ipanema é um bairro residencial consolidado de Uberlândia, conhecido pelo perfil familiar, ruas tranquilas e boa oferta de comércio de vizinhança. Reúne casas e apartamentos com bom custo-benefício, em uma região bem servida de serviços do dia a dia.',
    historia: '',
    curiosidades: [
      'Bairro residencial consolidado e de perfil familiar',
      'Comércio de vizinhança e serviços do dia a dia por perto',
      'Boa oferta de casas e apartamentos',
    ],
    perfil: 'Ideal para famílias e quem busca bom custo-benefício em um bairro tranquilo e bem localizado.',
    destaques: ['Bairro residencial consolidado', 'Perfil familiar e tranquilo', 'Comércio de vizinhança à mão', 'Bom custo-benefício', 'Boa oferta de imóveis', 'Fácil acesso às vias principais'],
  },
  'jardim-versailles': {
    foto: FOTO.luxo,
    intro: 'O Jardim Versailles é um loteamento valorizado da Zona Sul de Uberlândia, hoje integrado à região do Nova Uberlândia. Com ruas planejadas, terrenos amplos e proximidade de grandes avenidas, é procurado por quem busca alto padrão e ótima localização.',
    historia: 'Integra a região do Nova Uberlândia, resultado da união de loteamentos como Jardins Gênova, Roma, Barcelona e o próprio Versailles, na Zona Sul.',
    curiosidades: [
      'Faz parte da região do Nova Uberlândia, na Zona Sul',
      'Ruas planejadas e terrenos amplos',
      'Próximo da Avenida Rondon Pacheco e da BR-050',
    ],
    perfil: 'Ideal para famílias e investidores que buscam alto padrão e excelente localização na Zona Sul.',
    destaques: ['Loteamento valorizado da Zona Sul', 'Ruas planejadas e terrenos amplos', 'Integra a região do Nova Uberlândia', 'Próximo a grandes avenidas', 'Boa infraestrutura no entorno', 'Forte valorização'],
  },
  'brasil': {
    foto: FOTO.central,
    intro: 'O Bairro Brasil é um dos bairros tradicionais e centrais de Uberlândia, vizinho do hipercentro e com forte presença de comércio e serviços. Reúne a praticidade de morar perto de tudo com a identidade de um bairro consolidado e de fácil acesso.',
    historia: '',
    curiosidades: [
      'Bairro tradicional vizinho do hipercentro',
      'Forte presença de comércio e serviços',
      'Fácil acesso às principais vias da cidade',
    ],
    perfil: 'Ideal para quem quer morar perto do centro, com comércio e serviços à mão, e para investidores em locação.',
    destaques: ['Bairro central e tradicional', 'Vizinho do hipercentro', 'Comércio e serviços completos', 'Fácil acesso e mobilidade', 'Boa liquidez para investir', 'Infraestrutura consolidada'],
  },
  'bom-jesus': {
    foto: FOTO.aconchego,
    intro: 'O Bom Jesus é um bairro tradicional e central de Uberlândia, de perfil residencial e comercial, pertinho do centro. Consolidado e bem servido de comércio, oferece a praticidade de morar em região central com a tranquilidade de ruas residenciais.',
    historia: '',
    curiosidades: [
      'Bairro tradicional próximo ao centro',
      'Perfil residencial e comercial consolidado',
      'Boa oferta de comércio e serviços de bairro',
    ],
    perfil: 'Ideal para quem busca localização central, comércio à mão e bom custo-benefício.',
    destaques: ['Bairro tradicional e central', 'Próximo ao centro', 'Comércio e serviços à mão', 'Perfil residencial tranquilo', 'Bom custo-benefício', 'Fácil acesso às vias principais'],
  },
  'nossa-senhora-aparecida': {
    foto: FOTO.classico,
    intro: 'O Nossa Senhora Aparecida (bairro Aparecida) é um dos bairros tradicionais e centrais de Uberlândia, próximo ao hipercentro e com forte vocação comercial. É uma região consolidada, de fácil acesso, que reúne moradia, comércio e serviços — inclusive uma das unidades da Rotina Imobiliária, na Avenida Afonso Pena.',
    historia: '',
    curiosidades: [
      'Bairro tradicional e central, conhecido como Aparecida',
      'Forte vocação comercial e de serviços',
      'Próximo ao hipercentro e a importantes avenidas',
    ],
    perfil: 'Ideal para quem busca localização central, comércio forte e boas oportunidades de moradia e investimento.',
    destaques: ['Bairro central e tradicional', 'Forte vocação comercial', 'Próximo ao hipercentro', 'Fácil acesso e mobilidade', 'Boa liquidez para investir', 'Infraestrutura completa'],
  },
  'chacaras-eldorado': {
    foto: FOTO.arborizado,
    intro: 'As Chácaras Eldorado formam uma região de Uberlândia marcada por lotes e chácaras de maior dimensão, com mais verde, espaço e tranquilidade do que os bairros tradicionais. É procurada por quem deseja contato com a natureza sem abrir mão do acesso à cidade.',
    historia: '',
    curiosidades: [
      'Região de chácaras e lotes amplos',
      'Mais áreas verdes e espaço por imóvel',
      'Ambiente tranquilo, com acesso à cidade',
    ],
    perfil: 'Ideal para quem busca espaço, contato com a natureza e tranquilidade, mantendo o acesso à cidade.',
    destaques: ['Lotes e chácaras amplos', 'Muito verde e espaço', 'Ambiente tranquilo e arejado', 'Privacidade e qualidade de vida', 'Bom para casas amplas e lazer', 'Acesso à cidade preservado'],
  },
  'gsp-arts': {
    foto: FOTO.vertical,
    intro: 'O GSP Arts é um empreendimento residencial vertical de alto padrão em Uberlândia, com arquitetura assinada, lazer completo e localização valorizada. É voltado a quem busca apartamentos modernos, bem acabados e em uma região nobre da cidade.',
    historia: '',
    curiosidades: [
      'Empreendimento vertical de alto padrão',
      'Arquitetura diferenciada e lazer completo',
      'Localização valorizada na cidade',
    ],
    perfil: 'Ideal para quem busca apartamento de alto padrão, moderno e bem localizado, e para investidores.',
    destaques: ['Empreendimento de alto padrão', 'Arquitetura assinada', 'Lazer completo no condomínio', 'Acabamento de qualidade', 'Localização valorizada', 'Forte potencial de valorização'],
  },
}

export const getBairroEditorial = (slug) => BAIRROS_EDITORIAL[slug] || null
// foto REAL sempre disponível: o mapeamento por bairro, depois a do editorial, depois a padrão
export const getBairroFoto = (slug) =>
  (BAIRRO_FOTO[slug] && FOTOS[BAIRRO_FOTO[slug]].src) ||
  (BAIRROS_EDITORIAL[slug] && BAIRROS_EDITORIAL[slug].foto) ||
  BAIRRO_FOTO_PADRAO
