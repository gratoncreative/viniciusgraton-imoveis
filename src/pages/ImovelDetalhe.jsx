import { useEffect, useState, useMemo, useRef, lazy, Suspense } from 'react'
import { useParams, Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import Galeria from '../components/Galeria'
import AgendarVisita from '../components/AgendarVisita'
import CardImovel from '../components/CardImovel'
import Engajamento from '../components/Engajamento'
import PrecoGate from '../components/PrecoGate'
import PerguntasImovel from '../components/PerguntasImovel'
import {
  getImovel, fotosDe, formatPreco, formatArea, resumoImovel, subtituloImovel,
  destaquesImovel, ehCondominio, IMOVEIS, linkWhatsApp, waImovel, CONFIG, BAIRROS, oportunidade, estudoM2,
} from '../data'
import { IconWhats, IconArrow, IconPin, IconShield, IconHeart, ICONS } from './../components/icons'
import { useSEO } from '../useSEO'
import AdminImovelBar from '../components/AdminImovelBar'
import BaixarFotosImovel from '../components/BaixarFotosImovel'
import { jaCurtiu, alternarCurtida } from '../engajamento'
import { registrarVisto } from '../vistos'
// Lazy.. o estudo do m² (componente pesado + fontes premium) só carrega ao abrir
const EstudoModal = lazy(() => import('../components/EstudoModal'))

const plural = (n, s, p) => (n > 1 ? p : s)

// URL de vídeo "assistível" (extrai o ID do YouTube e monta /watch)
const ytWatch = (u) => { const m = String(u || '').match(/(?:embed\/|v=|youtu\.be\/)([\w-]{11})/); return m ? `https://www.youtube.com/watch?v=${m[1]}` : u }

// Apresentação PERSUASIVA e única por imóvel (gatilhos mentais), variando por código
function apresentacao(im) {
  const t = im.tipo || 'imóvel'
  const tl = t.toLowerCase()
  const b = im.bairro || 'Uberlândia'
  const seed = [...String(im.codigo)].reduce((a, c) => a + c.charCodeAt(0), 0)
  const pick = (arr, o = 0) => arr[(seed + o) % arr.length]
  const ehApto = /apart|kit|studio|stúdio|loft|flat|cobertura/i.test(t)
  const op = oportunidade(im)
  const extras = []
  if (im.suites) extras.push(`${im.suites} suíte${im.suites > 1 ? 's' : ''}`)
  if (im.vagas >= 2) extras.push(`${im.vagas} vagas`)
  if (ehApto && im.elevador) extras.push('elevador')
  ;(im.amenidades || []).slice(0, 2).forEach((a) => extras.push(String(a).toLowerCase()))

  const abre = pick([
    `Se você procura um ${tl} no ${b} que une boa localização, conforto e um negócio que vale a pena, esse merece a sua atenção.`,
    `Imóvel bom no ${b} não fica muito tempo no mercado — e esse ${tl} reúne o que mais pesa na hora de comprar bem.`,
    `Esse ${tl} no ${b} foi feito pra quem quer morar bem, sem abrir mão de praticidade, espaço e segurança.`,
  ])
  const corpo = `São ${[im.area && `${im.area} m²`, im.quartos && `${im.quartos} quartos`, ...extras].filter(Boolean).join(', ')}${im.condominio ? `, com condomínio organizado` : ''} — espaço e conforto pensados pra sua rotina.`
  const valor = op.abaixoMercado
    ? `E olha que oportunidade: pelo preço do metro quadrado no ${b}, ele está abaixo da média da região — chance real de comprar bem e ainda valorizar.`
    : pick([
      `Pelo padrão e pela localização, é o tipo de imóvel que mantém valor e tem boa liquidez na hora de revender.`,
      `Comprar no ${b} é decisão segura: região consolidada, procurada e com tendência de valorização.`,
    ], 1)
  const fecha = pick([
    `Quer ver de perto? Eu te acompanho na visita, esclareço tudo e cuido da documentação e do financiamento. Me chama no WhatsApp que a gente agenda.`,
    `Posso te mostrar pessoalmente e simular o financiamento com você — atendimento direto, do primeiro contato à entrega das chaves. É só chamar.`,
  ], 2)
  // destaques REAIS do imóvel (preenchem a apresentação de forma verdadeira)
  const ehTerreo = ehApto && (Number(im.andar) === 0)
  const destaques = [
    im.area && `${im.area} m² de área`,
    im.quartos && `${im.quartos} ${im.quartos > 1 ? 'quartos' : 'quarto'}${im.suites ? ` (sendo ${im.suites} suíte${im.suites > 1 ? 's' : ''})` : ''}`,
    im.banheiros && `${im.banheiros} banheiro${im.banheiros > 1 ? 's' : ''}`,
    im.vagas && `${im.vagas} vaga${im.vagas > 1 ? 's' : ''} de garagem`,
    ehApto && (im.andar != null && im.andar !== '') && (ehTerreo ? 'Térreo' : `${im.andar}º andar`),
    ehApto && typeof im.elevador === 'boolean' && (im.elevador ? 'Prédio com elevador' : 'Prédio sem elevador'),
    im.condominio && `Condomínio de ${formatPreco(im.condominio)}`,
    ...(im.amenidades || []),
    op.abaixoMercado && 'Preço abaixo da média do m² do bairro',
    `Localização no ${b}, ${im.cidade || 'Uberlândia'} — MG`,
  ].filter(Boolean)
  return { paras: [abre, corpo, valor, fecha], destaques }
}

// converte o imóvel vindo da API da Rotina (/api/rotina-imovel) para o formato do site
function mapApi(a) {
  return {
    codigo: String(a.codigo), tipo: a.tipo || '', bairro: a.bairro || '', cidade: a.cidade || 'Uberlândia', uf: a.estado || 'MG',
    finalidade: a.operacao === 'locação' ? 'Locação' : 'Venda',
    preco: a.valorNum || 0, condominio: a.condominio || 0,
    quartos: a.quartos || 0, suites: a.suites || 0, banheiros: a.banheiros || 0, vagas: a.vagas || 0,
    area: a.areaNum || 0, andar: a.andar, elevador: a.elevador,
    descricao: a.descricao || '', endereco: a.rua || '',
    img: a.foto || (a.fotos && a.fotos[0]) || '',
    fotos: a.fotos && a.fotos.length ? a.fotos : (a.foto ? [a.foto] : []),
    video: a.video || '', tour360: a.tour360 || '',
    externo: true,
  }
}

// condomínio pode vir como número (ex.: 325) ou texto (ex.: "Cond. R$ 325,00") — trata os dois
const condominioTxt = (c) => {
  if (c == null || c === '' || c === 0) return ''
  if (typeof c === 'number') return 'Condomínio ' + formatPreco(c)
  return String(c).replace(/^Cond\.\s*/i, 'Condomínio ')
}

// quebra a descrição em parágrafos legíveis (~3 frases cada)
function agruparFrases(texto) {
  const limpo = texto.trim()
  if (/\n/.test(limpo)) return limpo.split(/\n+/).map((s) => s.trim()).filter(Boolean)
  const frases = limpo.match(/[^.!?]+[.!?]+/g) || [limpo]
  const paras = []
  for (let i = 0; i < frases.length; i += 3) paras.push(frases.slice(i, i + 3).join(' ').trim())
  return paras
}

function Spec({ icon, valor, label }) {
  const Icon = ICONS[icon]
  return (
    <div className="det-spec">
      {Icon && <span className="det-spec-ico"><Icon width={22} height={22} /></span>}
      <div>
        <b>{valor}</b>
        <span>{label}</span>
      </div>
    </div>
  )
}

function Destaque({ icon, titulo, sub }) {
  const Icon = ICONS[icon]
  return (
    <div className="det-dest">
      <span className="det-dest-ico">{Icon && <Icon width={28} height={28} />}</span>
      <div>
        <b>{titulo}</b>
        <span>{sub}</span>
      </div>
    </div>
  )
}


// mensagens descontraídas que giram enquanto o imóvel carrega
const MSG_LOAD = [
  'Pegando as chaves desse imóvel… 🔑',
  'Separando as melhores fotos pra você…',
  'Já tá quase abrindo a porta…',
  'Conferindo cada detalhe pra você…',
]

// POIs reais por bairro — extremamente específicos (supermercados, escolas, hospitais, parques por nome)
const BAIRRO_POIS = {
  'Jardim Karaíba': [
    { icon: 'pin', text: 'Shopping Park e Pátio Sabiá a 5 min', sub: 'Os dois principais shoppings da Zona Sul com cinema UCI, Renner, Centauro e praças de alimentação completas no mesmo eixo de saída do bairro.' },
    { icon: 'home', text: 'Parque do Sabiá a menos de 2 km', sub: 'O maior parque urbano do Triângulo Mineiro: zoológico, lagoa natural, pista de cooper, arena de shows e ciclovia — lazer gratuito de alto nível a distância de caminhada.' },
    { icon: 'shield', text: 'Hospital Santa Marta e UAI Zona Sul', sub: 'Atendimento médico particular de referência e urgência pública a menos de 8 min — UTI, cirurgia, pronto-atendimento pediátrico e adulto.' },
    { icon: 'pin', text: 'Bretas Sabiá, Sam\'s Club e Atacadão na rota', sub: 'Supermercado, clube de compras e atacarejo num raio de 5 min — abastecimento mensal sem desvio de rota.' },
    { icon: 'home', text: 'Colégios Pitágoras e Colégio Santa Teresa', sub: 'Rede de ensino fundamental e médio de referência dentro do raio de 7 min — fundamental para famílias com filhos.' },
  ],
  'Morada da Colina': [
    { icon: 'pin', text: 'Av. Marcos de Freitas Costa — corredor nobre da Zona Sul', sub: 'A principal avenida da Zona Sul, com bancos (Itaú, Bradesco, Caixa), farmácias, clínicas e comércio diário a poucos passos.' },
    { icon: 'home', text: 'Praia Clube a menos de 5 min de carro', sub: 'Um dos maiores clubes do Brasil — piscinas olímpicas, quadras poliesportivas, tênis, academia e restaurantes. Raridade ter um clube deste porte tão próximo.' },
    { icon: 'shield', text: 'Hospital Santa Marta e clínicas especializadas', sub: 'Atendimento médico completo a poucos minutos, com maternidade, UTI e especialidades como cardiologia e ortopedia.' },
    { icon: 'pin', text: 'Supermercado Bretas e BH Supermercados na vizinhança', sub: 'Compras do dia a dia sem sair do raio do bairro — cadeia de frios, padaria, açougue e hortifruti frescos.' },
    { icon: 'home', text: 'Escola Estadual na rota e colégios particulares próximos', sub: 'Acesso fácil a opções de ensino fundamental e médio público e particular com transporte escolar disponível.' },
  ],
  'Vigilato Pereira': [
    { icon: 'home', text: 'Praia Clube literalmente ao lado', sub: 'Um dos maiores clubes particulares do Brasil, com piscinas, quadras, academia, salões e restaurantes — vizinhança de clube é raridade absoluta em qualquer cidade.' },
    { icon: 'pin', text: 'Av. Segismundo Pereira — comércio e serviços premium', sub: 'Farmácias, academias (Bodytech, Smart Fit), clínicas e restaurantes de alto padrão concentrados na mesma avenida.' },
    { icon: 'shield', text: 'Hospital Santa Marta a 6 min', sub: 'Um dos melhores hospitais particulares de Uberlândia, com pronto-socorro 24h, UTI adulto e pediátrico, e especialidades completas.' },
    { icon: 'pin', text: 'Pátio Sabiá e Shopping Park a 8 min', sub: 'Dois shoppings completos com cinema, lojas âncoras e ampla praça de alimentação acessíveis sem trânsito pesado.' },
    { icon: 'home', text: 'Colégios Objetivo e Colégio Santa Teresa', sub: 'Redes de ensino de referência com ótimo ENEM e transporte escolar disponível para o bairro.' },
  ],
  'Santa Maria': [
    { icon: 'pin', text: 'Av. Nicomedes Alves dos Santos — eixo de expansão da Zona Sul', sub: 'A avenida que mais cresceu nos últimos 5 anos: Caixa Econômica, Farmácias São João, supermercados e serviços novos a cada quadra.' },
    { icon: 'home', text: 'Shopping Park a 7 min', sub: 'Principal shopping do sul da cidade, com Casas Bahia, Renner, cinema Cinépolis e ampla praça de alimentação.' },
    { icon: 'shield', text: 'UAI Zona Sul e clínicas particulares', sub: 'Atendimento de urgência público e privado em até 10 min — tranquilidade garantida para a família.' },
    { icon: 'pin', text: 'Bretas Zona Sul e Atacadão na saída do bairro', sub: 'Compras semanais sem cruzar a cidade — supermercado e atacarejo na mesma rota de casa.' },
    { icon: 'home', text: 'Escola Municipal e Colégio Salesiano na região', sub: 'Tradição no ensino fundamental e médio, com transporte escolar e atividades extracurriculares para alunos da Zona Sul.' },
  ],
  'Jardim Sul': [
    { icon: 'pin', text: 'Av. Rondon Pacheco e Av. João Naves — acesso express', sub: 'Dois dos maiores eixos viários de Uberlândia a poucos minutos — aeroporto, centro e Zona Leste sem trânsito pesado.' },
    { icon: 'home', text: 'Uberlândia Shopping (Praça Umuarama) a 8 min', sub: 'Shopping central com C&A, Riachuelo, praça de alimentação diversificada e cinema, sem sair do eixo sul.' },
    { icon: 'shield', text: 'Clínicas médicas particulares e UAI', sub: 'Rede médica privada e pública num raio de 10 min — pediatria, ortopedia e pronto-atendimento.' },
    { icon: 'pin', text: 'Supermercado Bretas e hipermercado na rota', sub: 'Opções completas de supermercado e hipermercado sem precisar cruzar a cidade.' },
    { icon: 'home', text: 'Colégio Marista e Escola Estadual Polivalente', sub: 'Tradição no ensino com destaque no ENEM — colégio privado e público de qualidade a menos de 10 min.' },
  ],
  'Jardim Finotti': [
    { icon: 'pin', text: 'Av. Rondon Pacheco — acessibilidade total à cidade', sub: 'A maior via expressa de Uberlândia conecta o bairro ao centro, Zona Leste e aeroporto em minutos sem semáforos.' },
    { icon: 'home', text: 'Parque do Sabiá a 5 min de carro', sub: 'Zoológico, lago, pista de cooper e arena de shows no maior parque da cidade — ideal para crianças e atividades ao ar livre.' },
    { icon: 'shield', text: 'Hospital Santa Marta e UAI Zona Sul', sub: 'Atendimento especializado com maternidade, UTI e pronto-socorro particulares em menos de 10 min.' },
    { icon: 'pin', text: 'Supermercado Extra e Bretas próximos', sub: 'Conveniência máxima para compras do dia a dia sem precisar de deslocamentos longos.' },
    { icon: 'home', text: 'SESI e colégios particulares com transporte', sub: 'Infraestrutura educacional e esportiva do SESI, com academia, piscina e atividades para crianças acessível a pé.' },
  ],
  'Parque Una': [
    { icon: 'home', text: 'Parque do Sabiá a menos de 1 km — literalmente a vizinhança', sub: 'O nome "Parque Una" não é por acaso: o maior parque urbano de Uberlândia, com zoológico e lago, está praticamente na calçada — raro em qualquer cidade brasileira.' },
    { icon: 'pin', text: 'Av. Monsenhor Eduardo e comércio consolidado', sub: 'Farmácias São João, padarias, mercados e serviços de saúde concentrados na avenida principal a 3 min de caminhada.' },
    { icon: 'shield', text: 'UAI Central e clínicas de especialidades', sub: 'Atendimento de urgência pública e clínicas privadas de pediatria, clínica geral e ortopedia num raio de 8 min.' },
    { icon: 'pin', text: 'BH Supermercados e feira livre na Av. Monsenhor', sub: 'Supermercado completo e feira semanal com frutas, verduras e hortifruti frescos — alimentação de qualidade sem depender de carro.' },
    { icon: 'home', text: 'Escola Municipal Parque Una e E. E. na região', sub: 'Ensino público consolidado a distância de caminhada — bairro autossuficiente também na educação infantil.' },
  ],
  'Patrimônio': [
    { icon: 'pin', text: 'Centro de Uberlândia a 5 min a pé', sub: 'Bancos (todos os grandes), Fórum, Prefeitura, Câmara Municipal e comércio popular intenso — máxima comodidade urbana, zero deslocamento.' },
    { icon: 'home', text: 'Igreja São Pedro e patrimônio histórico tombado', sub: 'Bairro com identidade cultural forte: arquitetura histórica da cidade, Festa do Rosário, feiras tradicionais e calendário de eventos ao longo do ano.' },
    { icon: 'shield', text: 'Hospital de Clínicas UFU a 10 min', sub: 'Um dos maiores hospitais universitários do Brasil, referência em cirurgias de alta complexidade, oncologia e medicina de urgência.' },
    { icon: 'pin', text: 'Mercado Municipal, feiras e comércio atacadista', sub: 'Produtos frescos diariamente no Mercado Municipal de Uberlândia — alimentação de qualidade a preço de atacado a poucos quarteirões.' },
    { icon: 'home', text: 'CESEC, E. E. Raul Soares e escolas municipais', sub: 'Rede pública completa de ensino fundamental, médio, EJA e cursos profissionalizantes a poucos quarteirões do bairro.' },
  ],
  'Lídice': [
    { icon: 'pin', text: 'Av. Belo Horizonte — conectividade a toda a cidade', sub: 'A avenida corta o bairro e conecta diretamente ao centro, Zona Sul e todos os principais terminais de ônibus urbanos de Uberlândia.' },
    { icon: 'home', text: 'Arborização generosa — temperatura e qualidade de ar acima da média', sub: 'Um dos bairros mais arborizados de Uberlândia: ruas com árvores centenárias, microclima mais fresco e qualidade de vida percebida muito maior.' },
    { icon: 'shield', text: 'Clínicas privadas e farmácias Drogaria São Paulo', sub: 'Cobertura médica do pediatra ao cardiologista a menos de 10 min, com drogarias 24h a distância de caminhada.' },
    { icon: 'pin', text: 'Padaria, açougue e mercado local a pé', sub: 'Bairro autossuficiente para a rotina: serviços básicos resolvidos sem usar o carro — economia real de tempo e combustível.' },
    { icon: 'home', text: 'Escola Municipal Lídice e Centro Cultural UFU', sub: 'Escola pública de referência no ensino fundamental e UFU com programação cultural aberta ao público — biblioteca, teatro e eventos gratuitos.' },
  ],
  'Santa Mônica': [
    { icon: 'home', text: 'Praia Clube no bairro — acesso pelo portão', sub: 'O maior clube particular de Uberlândia tem sede em Santa Mônica: piscinas olímpicas, ginásio, quadras de tênis, academia e restaurantes. Pouquíssimos bairros do Brasil têm esse privilégio.' },
    { icon: 'shield', text: 'UFU e Hospital Universitário (HU-UFU) na mesma quadra', sub: 'Referência nacional em medicina universitária: ambulatórios especializados, centro cirúrgico de alta complexidade e urgência 24h, tudo a 5 min de carro.' },
    { icon: 'pin', text: 'BIG Hipermercado e Bretas Santa Mônica', sub: 'Dois grandes supermercados num raio de 3 km — compras do mês sem trânsito e com fácil estacionamento.' },
    { icon: 'home', text: 'Av. João Naves de Ávila — o maior corredor comercial da cidade', sub: 'Bancos de todos os tipos, concessionárias, restaurantes e os principais serviços de Uberlândia concentrados na mesma avenida que beira o bairro.' },
    { icon: 'pin', text: 'E. E. Bueno Brandão e CEFORES na região', sub: 'Ensino médio público histórico e formação profissional — raro ter essa concentração de oferta educacional pública num único bairro.' },
  ],
  'Tabajaras': [
    { icon: 'pin', text: 'Av. João Pinheiro — eixo histórico de serviços e transporte', sub: 'Uma das principais vias de acesso ao Centro Histórico de Uberlândia, com comércio estabelecido e linhas de ônibus a cada 10 min.' },
    { icon: 'home', text: 'Teatro Municipal Rondon Pacheco a 10 min', sub: 'O maior teatro de Uberlândia, com programação anual de espetáculos, shows e festivais — acesso à cultura da cidade sem grandes deslocamentos.' },
    { icon: 'shield', text: 'Clínicas médicas e Hospital Municipal próximos', sub: 'Cobertura de saúde pública e privada acessível a pé ou de bicicleta — do clínico geral à emergência.' },
    { icon: 'pin', text: 'Mercado, padaria e Farmácia São João na rua principal', sub: 'Bairro residencial autossuficiente — necessidades básicas do dia a dia resolvidas sem usar o carro.' },
    { icon: 'home', text: 'E. E. Presidente Roosevelt — escola centenária', sub: 'Uma das escolas públicas mais antigas e respeitadas de Uberlândia, com décadas de tradição no ensino médio.' },
  ],
  'Nova Uberlândia': [
    { icon: 'pin', text: 'Zona Sul em expansão documentada — valorização real', sub: 'Bairro com aprovação de empreendimentos residenciais de médio padrão nos últimos 3 anos — comprar agora significa aprovechar o início do ciclo de valorização.' },
    { icon: 'home', text: 'Acesso direto à Av. Nicomedes Alves dos Santos', sub: 'Conexão expressa à Av. Rondon Pacheco e ao centro em menos de 15 min, sem passar por bairros congestionados.' },
    { icon: 'shield', text: 'UAI Zona Sul e Hospital Santa Marta em 10 min', sub: 'Cobertura médica de qualidade disponível em menos de 15 min em qualquer direção da Zona Sul.' },
    { icon: 'pin', text: 'Supermercado Bretas e comércio local aquecido', sub: 'Nova unidade Bretas inaugurada na região — sinal objetivo de que o bairro já justifica investimentos comerciais de grande porte.' },
    { icon: 'home', text: 'Escola Municipal e rede de creches em expansão', sub: 'Infraestrutura educacional acompanhando o crescimento do bairro — vagas em creche e ensino fundamental a poucos quarteirões.' },
  ],
  'Tubalina': [
    { icon: 'pin', text: 'Av. dos Municípios — artéria norte com comércio ativo', sub: 'Acesso facilitado ao centro, UFU e aeroporto, com Bretas, farmácias e serviços concentrados na avenida principal.' },
    { icon: 'home', text: 'Linhas de ônibus integradas na esquina — a cada 12 min', sub: 'Mobilidade urbana acima da média: integração com o terminal central sem necessidade de troca, reduzindo dependência de carro.' },
    { icon: 'shield', text: 'UAI Norte e Hospital Municipal acessíveis', sub: 'Atendimento de saúde pública completa na região, sem deslocamentos longos ao centro da cidade.' },
    { icon: 'pin', text: 'Bretas Tubalina e feira livre toda semana', sub: 'Abastecimento com custo menor que a média da cidade — comércio local aquecido e feira de rua com hortifrutigranjeiros.' },
    { icon: 'home', text: 'Escola Municipal Tubalina e APAE Regional', sub: 'Infraestrutura educacional pública consolidada no bairro, com atendimento especializado para alunos com necessidades especiais.' },
  ],
  'Cidade Jardim': [
    { icon: 'pin', text: 'Condomínios horizontais de alto padrão na vizinhança imediata', sub: 'Bairro cercado por loteamentos fechados: perfil socioeconômico elevado dos moradores, manutenção das ruas e valorização constante do entorno.' },
    { icon: 'home', text: 'Pátio Sabiá e Shopping Park a 7 min', sub: 'Os dois shoppings da Zona Sul — cinema, Centauro, Hering, praça gourmet e supermercados — acessíveis sem trânsito intenso.' },
    { icon: 'shield', text: 'Hospital Santa Marta e clínicas particulares de especialidade', sub: 'Atendimento médico de alto padrão a menos de 10 min — hospitalar, laboratorial e ambulatorial num único raio.' },
    { icon: 'pin', text: 'Bretas, empório e comércio gourmet chegando na região', sub: 'Supermercado e lojas especializadas abrindo na região — sinal claro de que o bairro atinge um público de poder aquisitivo elevado.' },
    { icon: 'home', text: 'Colégios Pitágoras e Anglo próximos via Av. Rondon', sub: 'Redes de ensino privado com excelente ENEM, acessíveis por via expressa e com transporte escolar para o bairro.' },
  ],
  'Gávea': [
    { icon: 'home', text: 'Alphaville Uberlândia e condomínios fechados como vizinhos', sub: 'Entorno de alto padrão: o vizinhança de condomínios fechados valoriza organicamente o imóvel e filtra o perfil dos moradores da região.' },
    { icon: 'pin', text: 'Av. Rondon Pacheco em 4 min — mobilidade total', sub: 'A maior via expressa de Uberlândia leva ao aeroporto em 15 min, ao centro em 12 min e a qualquer ponto da cidade sem trânsito intenso.' },
    { icon: 'shield', text: 'Hospital Santa Marta e UAI Zona Sul', sub: 'Atendimento médico particular e público a menos de 12 min — tranquilidade para famílias com crianças e idosos.' },
    { icon: 'pin', text: 'Shopping Park e Atacadão no mesmo eixo de saída', sub: 'Compras, lazer e abastecimento mensal na mesma rota de casa, sem desvio de trajeto.' },
    { icon: 'home', text: 'Colégios particulares com van escolar disponível', sub: 'Redes de ensino fundamental e médio de referência com logística de transporte consolidada para o bairro.' },
  ],
  'Granja Marileusa': [
    { icon: 'home', text: 'Algar Telecom — sede nacional no bairro', sub: 'A maior empresa de Uberlândia tem sede aqui. A Granja Marileusa foi concebida como distrito tecnológico: startups, empresas de tecnologia e co-workings premium no mesmo quarteirão que o seu futuro imóvel.' },
    { icon: 'pin', text: 'Av. Belarmino Cotta Pacheco — o endereço mais exclusivo da cidade', sub: 'A avenida que concentra os condomínios mais valorizados de Uberlândia, com paisagismo planejado, iluminação premium e calçadas de granito.' },
    { icon: 'shield', text: 'Hospital Unimed e clínicas de alta complexidade a 8 min', sub: 'Atendimento médico cooperado de alto padrão com UTI, maternidade e especialidades concentradas a menos de 10 min.' },
    { icon: 'pin', text: 'Empório, restaurantes e lojas gourmet na região', sub: 'O perfil econômico do bairro atrai comércio especializado: padarias artesanais, restaurantes executivos e lojas de decoração premium.' },
    { icon: 'home', text: 'Colégios bilíngues e internacionais próximos', sub: 'Bairro que atrai famílias que priorizam educação diferenciada: ensino bilíngue, métodos construtivistas e projetos de alto desempenho acadêmico.' },
  ],
}

export default function ImovelDetalhe() {
  const { codigo } = useParams()
  const local = getImovel(codigo)
  const [showEstudo, setShowEstudo] = useState(false)
  const [imApi, setImApi] = useState(null)
  const [feed, setFeed] = useState([])
  const [feedColeta, setFeedColeta] = useState(null)
  const [beneficios, setBeneficios] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [tentativa, setTentativa] = useState(0)

  // base completa (espelho) — mostra o imóvel NA HORA, sem esperar a API/galeria
  useEffect(() => {
    let vivo = true
    fetch('/catalogo.json').then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivo && d && Array.isArray(d.imoveis)) { setFeed(d.imoveis); setFeedColeta(d.geradoEm || null) } })
      .catch(() => {})
    return () => { vivo = false }
  }, [])
  const feedItem = useMemo(() => feed.find((i) => String(i.codigo) === String(codigo)) || null, [feed, codigo])

  // dados completos (galeria, 360, mapa) vêm da API — com timeout de 9s pra nunca travar
  useEffect(() => {
    if (local) { setImApi(null); return }
    let vivo = true
    setBuscando(true)
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 12000)
    fetch(`/api/rotina-imovel?codigo=${encodeURIComponent(codigo)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (vivo && j && j.imovel) { setImApi(mapApi(j.imovel)); if (Array.isArray(j.beneficios)) setBeneficios(j.beneficios) } })
      .catch(() => {})
      .finally(() => { clearTimeout(t); if (vivo) setBuscando(false) })
    return () => { vivo = false; clearTimeout(t); ctrl.abort() }
  }, [codigo, local, tentativa])

  // mostra o feed na hora; quando a API completa chega, troca pela versão completa
  const im = local || imApi || feedItem

  // se NADA carregou ainda, tenta de novo sozinho a cada 5s (até 3x) — nunca fica preso
  useEffect(() => {
    if (im || tentativa >= 3) return
    const t = setTimeout(() => setTentativa((n) => n + 1), 3000)
    return () => clearTimeout(t)
  }, [im, tentativa])

  // mensagem descontraída girando enquanto carrega
  const [msgIdx, setMsgIdx] = useState(0)
  useEffect(() => {
    if (im) return
    const t = setInterval(() => setMsgIdx((n) => n + 1), 2600)
    return () => clearInterval(t)
  }, [im])

  const fotos = fotosDe(im)
  // Imagem social tem que ser do próprio imóvel. Se a foto aponta para a pasta
  // CDN de outro código (dado inconsistente do feed), usa fallback genérico.
  const ogImg = (() => {
    const cand = fotos[0] || im?.img
    if (!cand) return undefined
    const m = String(cand).match(/\/Imoveis\/(\d+)\//i)
    if (m && im && String(m[1]) !== String(im.codigo)) return '/casa-conceito.jpg'
    return cand
  })()
  useSEO({
    title: im ? `${im.tipo} ${im.bairro} · ${formatPreco(im.preco)}${im.area > 0 ? ` · ${Math.round(im.area)} m²` : ''} · Uberlândia` : 'Imóvel em Uberlândia',
    description: im ? resumoImovel(im) : 'Imóvel à venda em Uberlândia-MG. Consultoria personalizada com Vinícius Graton.',
    path: `/imovel/${codigo}`,
    image: ogImg,
  })
  const [pdfProc, setPdfProc] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [fav, setFav] = useState(false)
  useEffect(() => { if (im?.codigo) { setFav(jaCurtiu(im.codigo)); registrarVisto(im.codigo) } }, [im?.codigo])
  const toggleFav = () => {
    if (!im?.codigo) return
    const novo = !fav
    setFav(novo)
    alternarCurtida(im.codigo, novo, im.preco)
  }
  useEffect(() => {
    if (!im) return
    const t = setTimeout(() => setMounted(true), 60)
    return () => clearTimeout(t)
  }, [im])
  const compartilhar = async () => {
    if (!im) return
    const url = `https://viniciusgraton.com.br/imovel/${im.codigo}`
    const title = `${im.tipo} ${im.bairro} · ${formatPreco(im.preco)}`
    if (navigator.share) {
      try { await navigator.share({ title, url, text: resumoImovel(im) }) } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url)
        setCopiado(true)
        setTimeout(() => setCopiado(false), 2500)
      } catch {}
    }
  }
  const est = useMemo(() => { try { return { ...estudoM2(im, feed), coletaEm: feedColeta } } catch { return { ok: false } } }, [im, feed, feedColeta])
  const baixarPdf = async () => {
    if (!im) return
    setPdfProc(true)
    try { const { gerarPdfImovel } = await import('../pdfImovel'); await gerarPdfImovel(im, fotos, beneficios) } catch { /* ignora */ }
    setPdfProc(false)
  }

  // Laudo técnico pago (Mercado Pago R$ 29,90) -> gera o PDF completo após aprovado
  const [laudoLiberado, setLaudoLiberado] = useState(false)
  const laudoGerado = useRef(false)
  const comprarLaudo = async () => {
    if (!im) return
    try {
      const r = await fetch('/api/laudo-pagar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ codigo: im.codigo }) })
      const j = await r.json()
      if (j && j.ok && j.url) { window.location.href = j.url; return }
      if (j && j.naoConfigurado) { alert('O pagamento ainda não está configurado. Me chama no WhatsApp que eu te envio o laudo.'); return }
      alert('Não consegui iniciar o pagamento agora. Tente de novo em instantes.')
    } catch { alert('Falha de conexão. Tente de novo.') }
  }
  // ao voltar do Mercado Pago: verifica o pagamento e libera o PDF
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('laudo') !== '1') return
    const status = sp.get('status') || sp.get('collection_status')
    const payId = sp.get('payment_id') || sp.get('collection_id')
    if (status === 'approved' && payId) {
      fetch(`/api/laudo-verificar?payment_id=${encodeURIComponent(payId)}&codigo=${encodeURIComponent(codigo)}`)
        .then((r) => r.json()).then((j) => { if (j && j.ok) setLaudoLiberado(true) }).catch(() => {})
    }
    try { window.history.replaceState({}, '', `/imovel/${codigo}`) } catch { /* ok */ }
  }, [codigo])
  useEffect(() => {
    if (!laudoLiberado || !est || !est.ok || laudoGerado.current) return
    laudoGerado.current = true
    import('../pdfLaudoM2').then((m) => m.gerarPdfLaudoM2(im, est)).catch(() => {})
  }, [laudoLiberado, est, im])

  // registra a visita no histórico do cliente (área do cliente / recomendações)
  useEffect(() => { if (im) { import('../conta').then((m) => m.registrarVisita(im.codigo)) } }, [im])

  // Dados estruturados (SEO / rich results no Google)
  useEffect(() => {
    if (!im) return
    const origin = window.location.origin
    const abs = (u) => (u && u.startsWith('http') ? u : origin + u)
    const agente = {
      '@type': 'RealEstateAgent',
      name: CONFIG.marca,
      url: 'https://viniciusgraton.com.br',
      telephone: '+55-34-99157-0494',
      areaServed: { '@type': 'City', name: 'Uberlândia', addressRegion: 'MG', addressCountry: 'BR' },
    }
    const todasAmenidades = [
      ...((im.caracteristicas?.internas) || []),
      ...((im.caracteristicas?.externas) || []),
      ...((im.caracteristicas?.extras) || []),
      ...((im.amenidades) || []),
    ]
    const videoOk = im.video && !/NnAmly9Gb9s/.test(im.video) ? im.video : ''
    const data = {
      '@type': 'RealEstateListing',
      '@id': `https://viniciusgraton.com.br/imovel/${im.codigo}`,
      name: `${im.tipo} no ${im.bairro}, Uberlândia-MG`,
      description: resumoImovel(im),
      image: fotos.filter(Boolean).map((u) => abs(u.split('?')[0])),
      url: `https://viniciusgraton.com.br/imovel/${im.codigo}`,
      ...(im.area > 0 && { floorSize: { '@type': 'QuantitativeValue', value: im.area, unitCode: 'MTK' } }),
      ...(im.quartos > 0 && { numberOfRooms: im.quartos, numberOfBedrooms: im.quartos }),
      ...(im.banheiros > 0 && { numberOfBathroomsTotal: im.banheiros }),
      ...(im.vagas > 0 && { numberOfParkingSpaces: im.vagas }),
      address: {
        '@type': 'PostalAddress',
        addressLocality: im.cidade || 'Uberlândia',
        addressRegion: im.uf || 'MG',
        addressCountry: 'BR',
        ...(im.endereco && { streetAddress: im.endereco }),
      },
      ...(todasAmenidades.length > 0 && {
        amenityFeature: todasAmenidades.slice(0, 20).map((a) => ({
          '@type': 'LocationFeatureSpecification',
          name: String(a),
          value: true,
        })),
      }),
      ...(videoOk && {
        video: {
          '@type': 'VideoObject',
          name: `Vídeo do ${im.tipo} no ${im.bairro}`,
          url: ytWatch(videoOk),
          thumbnailUrl: fotos[0] ? abs(fotos[0]) : undefined,
        },
      }),
      broker: agente,
      offers: {
        '@type': 'Offer',
        price: im.preco,
        priceCurrency: 'BRL',
        availability: 'https://schema.org/InStock',
        url: `https://viniciusgraton.com.br/imovel/${im.codigo}`,
        seller: agente,
      },
    }
    const breadcrumb = {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: 'https://viniciusgraton.com.br/' },
        { '@type': 'ListItem', position: 2, name: 'Imóveis', item: 'https://viniciusgraton.com.br/imoveis' },
        { '@type': 'ListItem', position: 3, name: `${im.tipo} no ${im.bairro}`, item: `https://viniciusgraton.com.br/imovel/${im.codigo}` },
      ],
    }
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = 'ld-imovel'
    el.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': [data, breadcrumb] })
    document.head.appendChild(el)
    return () => { document.getElementById('ld-imovel')?.remove() }
  }, [im, fotos])

  if (!im) {
    if (buscando || tentativa < 3) {
      return (
        <main className="section--light det-vazio">
          <div className="container det-carregando">
            <div className="det-load-casa" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="46" height="46" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-5h4v5" /></svg>
              <span className="det-load-anel" />
            </div>
            <p className="det-load-msg">{MSG_LOAD[msgIdx % MSG_LOAD.length]}</p>
            <p className="det-load-sub">Se a internet estiver lenta, a gente tenta de novo sozinho em alguns segundos.</p>
            {tentativa > 0 && (
              <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => setTentativa(0)}>
                Tentar novamente
              </button>
            )}
          </div>
        </main>
      )
    }
    return (
      <main className="section--light det-vazio">
        <div className="container" style={{ textAlign: 'center' }}>
          <h1 className="section-title">Imóvel não encontrado</h1>
          <p className="section-sub" style={{ margin: '12px 0 28px' }}>
            Esse imóvel pode ter sido vendido ou saído do catálogo.
          </p>
          <Link className="btn btn-gold" to="/imoveis">Ver imóveis disponíveis <IconArrow /></Link>
        </div>
      </main>
    )
  }

  const ehApto = /apart|kit|studio|stúdio|loft|flat|cobertura/i.test(im.tipo || '')
  const temAndar = im.andar !== undefined && im.andar !== null && im.andar !== ''
  const terreo = im.andar === 0 || im.andar === '0' || /t[eé]rreo/i.test(String(im.andar))
  const specs = [
    im.quartos > 0 && { icon: 'bed', valor: im.quartos, label: plural(im.quartos, 'quarto', 'quartos') },
    im.suites > 0 && { icon: 'sparkle', valor: im.suites, label: plural(im.suites, 'suíte', 'suítes') },
    im.banheiros > 0 && { icon: 'bath', valor: im.banheiros, label: plural(im.banheiros, 'banheiro', 'banheiros') },
    im.vagas > 0 && { icon: 'car', valor: im.vagas, label: plural(im.vagas, 'vaga', 'vagas') },
    im.area > 0 && { icon: 'area', valor: formatArea(im.area), label: 'área interna' },
    im.areaLote > 0 && { icon: 'home', valor: formatArea(im.areaLote), label: 'área do lote' },
    ehApto && temAndar && { icon: 'floor', valor: terreo ? 'Térreo' : `${im.andar}º`, label: terreo ? 'andar' : 'andar' },
    ehApto && typeof im.elevador === 'boolean' && { icon: 'elevator', valor: im.elevador ? 'Com' : 'Sem', label: 'elevador' },
  ].filter(Boolean)

  const destaques = destaquesImovel(im)
  const temDescricao = im.descricao && im.descricao.trim().length > 0
  const paragrafos = temDescricao ? agruparFrases(im.descricao.trim()) : []
  const car = im.caracteristicas || {}
  const grupos = [
    { titulo: 'Por dentro do imóvel', itens: car.internas || [] },
    { titulo: 'Estrutura e segurança', itens: car.externas || [] },
    { titulo: 'Lazer e diferenciais', itens: car.extras || [] },
  ].filter((g) => g.itens.length > 0)

  const mapsQuery = encodeURIComponent(`${im.bairro}, ${im.cidade}, MG, Brasil`)
  const bairroInfo = BAIRROS.find((b) => b.nome.toLowerCase() === (im.bairro || '').toLowerCase())
  const prox = []
  if (im.pontoReferencia)
    prox.push({
      icon: 'pin',
      text: im.pontoReferencia,
      sub: 'Ponto de referência próximo que facilita o acesso, encurta deslocamentos do dia a dia e valoriza o endereço.',
    })
  if (im.condominio)
    prox.push({
      icon: 'shield',
      text: condominioTxt(im.condominio),
      sub: 'Estrutura, segurança e áreas de lazer do condomínio agregam conforto, comodidade e valor de revenda ao imóvel.',
    })
  prox.push({
    icon: 'home',
    text: `Bairro ${im.bairro}, ${im.cidade} — ${im.uf}`,
    sub: bairroInfo
      ? bairroInfo.desc
      : `Região consolidada de ${im.cidade}, com boa infraestrutura, comércio por perto e liquidez para uma compra segura.`,
  })
  // POIs específicos por bairro — nomeados com precisão
  const bairroPois = BAIRRO_POIS[im.bairro] || [
    { icon: 'pin', text: `Comércio completo no entorno de ${im.bairro}`, sub: 'Supermercados Bretas, farmácias São João, padarias e comércio do dia a dia concentrados nas ruas do bairro.' },
    { icon: 'home', text: 'Escolas públicas e particulares a poucos minutos', sub: 'Opções de ensino fundamental e médio com transporte escolar disponível — desde colégios municipais a redes privadas de referência.' },
    { icon: 'shield', text: 'Cobertura médica acessível', sub: `UAI, clínicas de especialidade e farmácias 24h num raio de 10 min de ${im.bairro} — atendimento pediátrico, clínico e de urgência disponíveis.` },
    { icon: 'pin', text: 'Transporte público e vias de acesso', sub: `Linhas de ônibus com integração ao terminal central de Uberlândia, e acesso direto às principais avenidas da cidade em minutos.` },
    { icon: 'home', text: 'Liquidez e valorização comprovadas na região', sub: 'Bairro com histórico de procura consistente e valorização documentada — compra segura e boa liquidez na hora de revender.' },
  ]
  prox.push(...bairroPois)

  // "Veja também" por SIMILARIDADE de filtros (mesmo tipo, bairro, faixa de preço,
  // quartos/suítes) — entregamos o mesmo perfil que o lead está olhando.
  const precoRef = im.preco || 0
  const similaridade = (i) => {
    let s = 0
    if (i.tipo === im.tipo) s += 3
    if ((i.bairro || '').toLowerCase() === (im.bairro || '').toLowerCase()) s += 3
    if (precoRef && i.preco && Math.abs(i.preco - precoRef) <= precoRef * 0.3) s += 2
    if ((i.quartos || 0) === (im.quartos || 0)) s += 1
    if ((i.suites || 0) === (im.suites || 0)) s += 1
    return s
  }
  const relacionados = IMOVEIS
    .filter((i) => i.codigo !== im.codigo)
    .map((i) => ({ i, s: similaridade(i) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 4)
    .map((x) => x.i)

  return (
    <>
    <AdminImovelBar im={im} />
    <main className="section--light det imovel-pg">
      <div className="container">
        <nav className="det-bread">
          <Link to="/">Início</Link> <span>/</span> <Link to="/imoveis">Imóveis</Link> <span>/</span> <b>{im.bairro}</b>
        </nav>

        <div className="det-grid">
          {/* Galeria */}
          <div className="det-galeria">
            <span className="det-tag">{im.tipo}</span>
            <button
              type="button"
              className={`det-fav${fav ? ' is-on' : ''}`}
              onClick={toggleFav}
              aria-pressed={fav}
              aria-label={fav ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
              title={fav ? 'Salvo nos favoritos' : 'Salvar nos favoritos'}
            >
              <IconHeart filled={fav} width={20} height={20} />
            </button>
            <Galeria fotos={fotos} alt={`${im.tipo} à venda no ${im.bairro}, Uberlândia · Cód. ${im.codigo}`} />
            {fotos.length > 0 && <BaixarFotosImovel im={im} fotos={fotos} galeria />}
            {(() => { const ap = apresentacao(im); return (
              <div className="det-apresenta">
                <span className="det-apresenta-eyebrow">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l2.1 5.4L20 9.3l-4 4 1 6-5-2.8L7 19.3l1-6-4-4 5.9-.9z" /></svg>
                  Análise do consultor
                </span>
                <h2 className="det-apresenta-tit">Por que esse imóvel vale a sua visita</h2>
                <div className="det-apresenta-corpo">
                  {ap.paras.map((p, i) => <p key={i}>{p}</p>)}
                </div>
                <div className="det-apresenta-assina">
                  <img src="/vinicius-graton-cutout.png" alt="" className="det-apresenta-foto" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                  <span><b>Vinícius Graton</b><i>Consultor de imóveis · Rotina Imobiliária</i></span>
                </div>
                {temDescricao && (
                  <div className="det-apre-bloco-desc">
                    <span className="det-apre-sub">Descrição do imóvel</span>
                    <div className="det-apre-desc">
                      {paragrafos.map((p, i) => {
                        const isTopico = p.length < 70 && !/\.\s*$/.test(p.trim()) && !p.trim().endsWith(':') && (p.match(/,/g) || []).length < 2
                        return <p key={i} className={isTopico ? 'det-apre-topico' : ''}>{isTopico ? `— ${p}` : p}</p>
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) })()}
          </div>

          {/* Painel de info */}
          <aside className={`det-info det-info--claro${mounted ? ' det-mounted' : ''}`}>
            <Reveal>
              <p className="det-local"><IconPin width={15} height={15} /> {im.cidade} — {im.uf} · Cód. {im.codigo}</p>
              <h1 className="det-titulo">{im.tipo} no {im.bairro}</h1>
              <p className="det-subtitulo">{subtituloImovel(im)}</p>
              {im.impulsionado && (
                <Link to="/impulsionar" className="det-pub">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 15l7-7 7 7" /></svg>
                  <span><b>Publicidade</b> · anúncio impulsionado em destaque. Você também pode impulsionar o seu →</span>
                </Link>
              )}
              {(() => { const op = oportunidade(im); return (op.temDesconto || op.abaixoMercado) ? (
                <div className="det-selos">
                  {op.temDesconto && <span className="im-selo im-selo--off">Preço caiu {op.pctDesconto}%</span>}
                  {op.abaixoMercado && <span className="im-selo im-selo--mercado">Abaixo do m² do bairro</span>}
                </div>
              ) : null })()}
              <PrecoGate valor={im.preco} anterior={im.precoAnterior} className="det-preco" tipo="detalhe" />
              {im.visto && (() => {
                const dias = Math.floor((Date.now() - new Date(im.visto).getTime()) / 86400000)
                if (dias > 60) return null
                const txt = dias === 0 ? 'Adicionado hoje' : dias === 1 ? 'Adicionado há 1 dia' : `Adicionado há ${dias} dias`
                return <p className="det-baixou-em det-novo-tag">{txt}</p>
              })()}
              {!im.visto && im.novo && (
                <p className="det-baixou-em det-novo-tag">Adicionado recentemente</p>
              )}
              {im.baixouEm && (
                <p className="det-baixou-em">
                  Preço reduzido em {new Date(im.baixouEm).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}

              {destaques.length > 0 && (
                <div className="det-dest-mini">
                  {destaques.slice(0, 4).map((d, i) => {
                    const Icon = ICONS[d.icon]
                    return (
                      <span key={i} className="det-dest-mini-chip">
                        {Icon && <Icon width={13} height={13} />}
                        {d.titulo}
                      </span>
                    )
                  })}
                </div>
              )}

              <div className="det-specs">
                {specs.map((s, i) => <Spec key={i} {...s} />)}
              </div>

              <a className="btn btn-gold det-whats" href={linkWhatsApp(waImovel(im))} target="_blank" rel="noopener noreferrer">
                <IconWhats /> Tenho interesse neste imóvel
              </a>
              <AgendarVisita im={im} />

              <div className="det-btns-grid">
                <button className={`det-btn-acao${copiado ? ' det-btn-acao--ok' : ''}`} onClick={compartilhar}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  {copiado ? 'Copiado!' : 'Compartilhar'}
                </button>
                <button className={`det-btn-acao${pdfProc ? ' det-btn-acao--proc' : ''}`} onClick={baixarPdf} disabled={pdfProc}>
                  {pdfProc ? (
                    <span className="pdfgen" role="status" aria-label="Gerando o PDF">
                      <span className="pdfgen-doc" aria-hidden="true">
                        <span className="pdfgen-fold" />
                        <span className="pdfgen-linha pdfgen-l1" />
                        <span className="pdfgen-linha pdfgen-l2" />
                        <span className="pdfgen-linha pdfgen-l3" />
                        <span className="pdfgen-selo">PDF</span>
                      </span>
                      <span className="pdfgen-txt">Gerando<span className="pdfgen-dots" /></span>
                    </span>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3v4a1 1 0 0 0 1 1h4M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-5zM12 18v-6M9 15l3 3 3-3" /></svg>
                      Baixar PDF
                    </>
                  )}
                </button>
                <Link to="/ferramentas" className="det-btn-acao">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3M16 5h3v3M14 11l5.5-5.5"/></svg>
                  Simular
                </Link>
                <a href={linkWhatsApp(waImovel(im))} className="det-btn-acao" target="_blank" rel="noopener noreferrer">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                  Agendar visita
                </a>
                {im.tour360 && (
                  <a href={im.tour360} className="det-btn-acao det-btn-acao--wide" target="_blank" rel="noopener noreferrer">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
                    Tour 360°
                  </a>
                )}
                {im.video && !/NnAmly9Gb9s/.test(im.video) && (
                  <a href={ytWatch(im.video)} className="det-btn-acao det-btn-acao--wide" target="_blank" rel="noopener noreferrer">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                    Ver vídeo do imóvel
                  </a>
                )}
                {est?.ok && (
                  <button className="det-estudo-cta" onClick={() => setShowEstudo(true)}>
                    <div className="det-estudo-cta-ico" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18M7 14l4-4 3 3 5-6" /></svg>
                    </div>
                    <div className="det-estudo-cta-txt">
                      <strong>Estudo do valor do m²</strong>
                      <span>Veja se o preço pedido está justo para este bairro</span>
                    </div>
                    <svg className="det-estudo-cta-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </button>
                )}
                {showEstudo && (
                  <Suspense fallback={null}>
                    <EstudoModal im={im} est={est} open={showEstudo} onClose={() => setShowEstudo(false)} />
                  </Suspense>
                )}
              </div>


              <PerguntasImovel im={im} />

              <div className="det-engaj">
                <Engajamento im={im} variante="detalhe" />
                <span className="det-engaj-dica">Curta e compartilhe com quem vai amar este imóvel</span>
              </div>

              <div className="det-trust">
                <IconShield width={20} height={20} />
                <p><b>Atendimento direto comigo</b>, do primeiro contato à entrega das chaves. Te ajudo na visita, na negociação e em toda a documentação — compra segura e sem dor de cabeça.</p>
              </div>
            </Reveal>
          </aside>
        </div>

        {/* "Destaques deste imóvel" removido: os mesmos itens já aparecem no topo
            (specs + chips no painel de info), evitando repetição. */}

        {grupos.length > 0 && (
          <div className="det-carac">
            <h2 className="det-rel-titulo">Características e comodidades</h2>
            {im.condominio && (
              <p className="det-carac-cond"><IconShield width={16} height={16} /> {condominioTxt(im.condominio)}</p>
            )}
            <div className="det-carac-grupos">
              {grupos.map((g, gi) => (
                <div className="det-carac-grupo" key={gi}>
                  <h3>{g.titulo}</h3>
                  <ul className="det-carac-lista">
                    {g.itens.map((it, ii) => <li key={ii}><span className="det-carac-check">âœ“</span> {it}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="det-mapa">
          <h2 className="det-rel-titulo">Localização e proximidades</h2>
          <p className="det-mapa-bairro"><IconPin width={18} height={18} /> {im.bairro}, {im.cidade} — {im.uf}</p>
          <div className="det-mapa-grid">
            <figure className="det-mapa-col">
              <div className="det-mapa-frame">
                <iframe
                  title={`Mapa do bairro ${im.bairro}`}
                  src={`https://maps.google.com/maps?q=${mapsQuery}&z=15&output=embed`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <a className="det-mapa-ampliar" href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`} target="_blank" rel="noopener noreferrer">
                â›¶ Ampliar e explorar a região no Google Maps
              </a>
            </figure>
            <div className="det-mapa-prox">
              <h3>O que valoriza este endereço</h3>
              <ul className="det-prox-lista">
                {prox.map((p, i) => {
                  const I = ICONS[p.icon]
                  return (
                    <li key={i}>
                      {I && <span className="det-prox-ico"><I width={18} height={18} /></span>}
                      <div className="det-prox-txt">
                        <b>{p.text}</b>
                        {p.sub && <span>{p.sub}</span>}
                      </div>
                    </li>
                  )
                })}
              </ul>
              <p className="det-mapa-aviso">Localização aproximada do bairro — o mapa mostra escolas, comércio e serviços ao redor. O endereço exato é informado no atendimento.</p>
            </div>
          </div>
        </div>

        {relacionados.length > 0 && (
          <div className="det-rel">
            <h2 className="det-rel-titulo">Veja também</h2>
            <div className="im-grid" style={{ perspective: '1400px' }}>
              {relacionados.map((r) => <CardImovel key={r.codigo} im={r} />)}
            </div>
          </div>
        )}

        <div style={{ marginTop: 48 }}>
          <Link className="btn btn-ghost" to="/imoveis"><IconArrow style={{ transform: 'rotate(180deg)' }} /> Voltar para o catálogo</Link>
        </div>
      </div>
    </main>
    </>
  )
}
