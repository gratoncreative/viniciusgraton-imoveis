import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import Galeria from '../components/Galeria'
import AgendarVisita from '../components/AgendarVisita'
import CardImovel from '../components/CardImovel'
import Engajamento from '../components/Engajamento'
import PrecoGate from '../components/PrecoGate'
import PerguntasImovel from '../components/PerguntasImovel'
import EstudoM2 from '../components/EstudoM2'
import {
  getImovel, fotosDe, formatPreco, formatArea, resumoImovel, subtituloImovel,
  destaquesImovel, ehCondominio, IMOVEIS, linkWhatsApp, waImovel, CONFIG, BAIRROS, oportunidade, estudoM2,
} from '../data'
import { IconWhats, IconArrow, IconPin, IconShield, ICONS } from './../components/icons'
import { useSEO } from '../useSEO'
import AdminImovelBar from '../components/AdminImovelBar'

const plural = (n, s, p) => (n > 1 ? p : s)

// URL de vÃ­deo "assistÃ­vel" (extrai o ID do YouTube e monta /watch)
const ytWatch = (u) => { const m = String(u || '').match(/(?:embed\/|v=|youtu\.be\/)([\w-]{11})/); return m ? `https://www.youtube.com/watch?v=${m[1]}` : u }

// ApresentaÃ§Ã£o PERSUASIVA e Ãºnica por imÃ³vel (gatilhos mentais), variando por cÃ³digo
function apresentacao(im) {
  const t = im.tipo || 'imÃ³vel'
  const tl = t.toLowerCase()
  const b = im.bairro || 'UberlÃ¢ndia'
  const seed = [...String(im.codigo)].reduce((a, c) => a + c.charCodeAt(0), 0)
  const pick = (arr, o = 0) => arr[(seed + o) % arr.length]
  const ehApto = /apart|kit|studio|stÃºdio|loft|flat|cobertura/i.test(t)
  const op = oportunidade(im)
  const extras = []
  if (im.suites) extras.push(`${im.suites} suÃ­te${im.suites > 1 ? 's' : ''}`)
  if (im.vagas >= 2) extras.push(`${im.vagas} vagas`)
  if (ehApto && im.elevador) extras.push('elevador')
  ;(im.amenidades || []).slice(0, 2).forEach((a) => extras.push(String(a).toLowerCase()))

  const abre = pick([
    `Se vocÃª procura um ${tl} no ${b} que une boa localizaÃ§Ã£o, conforto e um negÃ³cio que vale a pena, esse merece a sua atenÃ§Ã£o.`,
    `ImÃ³vel bom no ${b} nÃ£o fica muito tempo no mercado â€” e esse ${tl} reÃºne o que mais pesa na hora de comprar bem.`,
    `Esse ${tl} no ${b} foi feito pra quem quer morar bem, sem abrir mÃ£o de praticidade, espaÃ§o e seguranÃ§a.`,
  ])
  const corpo = `SÃ£o ${[im.area && `${im.area} mÂ²`, im.quartos && `${im.quartos} quartos`, ...extras].filter(Boolean).join(', ')}${im.condominio ? `, com condomÃ­nio organizado` : ''} â€” espaÃ§o e conforto pensados pra sua rotina.`
  const valor = op.abaixoMercado
    ? `E olha que oportunidade: pelo preÃ§o do metro quadrado no ${b}, ele estÃ¡ abaixo da mÃ©dia da regiÃ£o â€” chance real de comprar bem e ainda valorizar.`
    : pick([
      `Pelo padrÃ£o e pela localizaÃ§Ã£o, Ã© o tipo de imÃ³vel que mantÃ©m valor e tem boa liquidez na hora de revender.`,
      `Comprar no ${b} Ã© decisÃ£o segura: regiÃ£o consolidada, procurada e com tendÃªncia de valorizaÃ§Ã£o.`,
    ], 1)
  const fecha = pick([
    `Quer ver de perto? Eu te acompanho na visita, esclareÃ§o tudo e cuido da documentaÃ§Ã£o e do financiamento. Me chama no WhatsApp que a gente agenda.`,
    `Posso te mostrar pessoalmente e simular o financiamento com vocÃª â€” atendimento direto, do primeiro contato Ã  entrega das chaves. Ã‰ sÃ³ chamar.`,
  ], 2)
  // destaques REAIS do imÃ³vel (preenchem a apresentaÃ§Ã£o de forma verdadeira)
  const ehTerreo = ehApto && (Number(im.andar) === 0)
  const destaques = [
    im.area && `${im.area} mÂ² de Ã¡rea`,
    im.quartos && `${im.quartos} ${im.quartos > 1 ? 'quartos' : 'quarto'}${im.suites ? ` (sendo ${im.suites} suÃ­te${im.suites > 1 ? 's' : ''})` : ''}`,
    im.banheiros && `${im.banheiros} banheiro${im.banheiros > 1 ? 's' : ''}`,
    im.vagas && `${im.vagas} vaga${im.vagas > 1 ? 's' : ''} de garagem`,
    ehApto && (im.andar != null && im.andar !== '') && (ehTerreo ? 'TÃ©rreo' : `${im.andar}Âº andar`),
    ehApto && typeof im.elevador === 'boolean' && (im.elevador ? 'PrÃ©dio com elevador' : 'PrÃ©dio sem elevador'),
    im.condominio && `CondomÃ­nio de ${formatPreco(im.condominio)}`,
    ...(im.amenidades || []),
    op.abaixoMercado && 'PreÃ§o abaixo da mÃ©dia do mÂ² do bairro',
    `LocalizaÃ§Ã£o no ${b}, ${im.cidade || 'UberlÃ¢ndia'} â€” MG`,
  ].filter(Boolean)
  return { paras: [abre, corpo, valor, fecha], destaques }
}

// converte o imÃ³vel vindo da API da Rotina (/api/rotina-imovel) para o formato do site
function mapApi(a) {
  return {
    codigo: String(a.codigo), tipo: a.tipo || '', bairro: a.bairro || '', cidade: a.cidade || 'UberlÃ¢ndia', uf: a.estado || 'MG',
    finalidade: a.operacao === 'locaÃ§Ã£o' ? 'LocaÃ§Ã£o' : 'Venda',
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

// condomÃ­nio pode vir como nÃºmero (ex.: 325) ou texto (ex.: "Cond. R$ 325,00") â€” trata os dois
const condominioTxt = (c) => {
  if (c == null || c === '' || c === 0) return ''
  if (typeof c === 'number') return 'CondomÃ­nio ' + formatPreco(c)
  return String(c).replace(/^Cond\.\s*/i, 'CondomÃ­nio ')
}

// quebra a descriÃ§Ã£o em parÃ¡grafos legÃ­veis (~3 frases cada)
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

// mensagens descontraÃ­das que giram enquanto o imÃ³vel carrega
const MSG_LOAD = [
  'Pegando as chaves desse imÃ³velâ€¦ ðŸ”‘',
  'Separando as melhores fotos pra vocÃªâ€¦',
  'JÃ¡ tÃ¡ quase abrindo a portaâ€¦',
  'Conferindo cada detalhe pra vocÃªâ€¦',
]

// POIs reais por bairro â€” extremamente especÃ­ficos (supermercados, escolas, hospitais, parques por nome)
const BAIRRO_POIS = {
  'Jardim KaraÃ­ba': [
    { icon: 'pin', text: 'Shopping Park e PÃ¡tio SabiÃ¡ a 5 min', sub: 'Os dois principais shoppings da Zona Sul com cinema UCI, Renner, Centauro e praÃ§as de alimentaÃ§Ã£o completas no mesmo eixo de saÃ­da do bairro.' },
    { icon: 'home', text: 'Parque do SabiÃ¡ a menos de 2 km', sub: 'O maior parque urbano do TriÃ¢ngulo Mineiro: zoolÃ³gico, lagoa natural, pista de cooper, arena de shows e ciclovia â€” lazer gratuito de alto nÃ­vel a distÃ¢ncia de caminhada.' },
    { icon: 'shield', text: 'Hospital Santa Marta e UAI Zona Sul', sub: 'Atendimento mÃ©dico particular de referÃªncia e urgÃªncia pÃºblica a menos de 8 min â€” UTI, cirurgia, pronto-atendimento pediÃ¡trico e adulto.' },
    { icon: 'pin', text: 'Bretas SabiÃ¡, Sam\'s Club e AtacadÃ£o na rota', sub: 'Supermercado, clube de compras e atacarejo num raio de 5 min â€” abastecimento mensal sem desvio de rota.' },
    { icon: 'home', text: 'ColÃ©gios PitÃ¡goras e ColÃ©gio Santa Teresa', sub: 'Rede de ensino fundamental e mÃ©dio de referÃªncia dentro do raio de 7 min â€” fundamental para famÃ­lias com filhos.' },
  ],
  'Morada da Colina': [
    { icon: 'pin', text: 'Av. Marcos de Freitas Costa â€” corredor nobre da Zona Sul', sub: 'A principal avenida da Zona Sul, com bancos (ItaÃº, Bradesco, Caixa), farmÃ¡cias, clÃ­nicas e comÃ©rcio diÃ¡rio a poucos passos.' },
    { icon: 'home', text: 'Praia Clube a menos de 5 min de carro', sub: 'Um dos maiores clubes do Brasil â€” piscinas olÃ­mpicas, quadras poliesportivas, tÃªnis, academia e restaurantes. Raridade ter um clube deste porte tÃ£o prÃ³ximo.' },
    { icon: 'shield', text: 'Hospital Santa Marta e clÃ­nicas especializadas', sub: 'Atendimento mÃ©dico completo a poucos minutos, com maternidade, UTI e especialidades como cardiologia e ortopedia.' },
    { icon: 'pin', text: 'Supermercado Bretas e BH Supermercados na vizinhanÃ§a', sub: 'Compras do dia a dia sem sair do raio do bairro â€” cadeia de frios, padaria, aÃ§ougue e hortifruti frescos.' },
    { icon: 'home', text: 'Escola Estadual na rota e colÃ©gios particulares prÃ³ximos', sub: 'Acesso fÃ¡cil a opÃ§Ãµes de ensino fundamental e mÃ©dio pÃºblico e particular com transporte escolar disponÃ­vel.' },
  ],
  'Vigilato Pereira': [
    { icon: 'home', text: 'Praia Clube literalmente ao lado', sub: 'Um dos maiores clubes particulares do Brasil, com piscinas, quadras, academia, salÃµes e restaurantes â€” vizinhanÃ§a de clube Ã© raridade absoluta em qualquer cidade.' },
    { icon: 'pin', text: 'Av. Segismundo Pereira â€” comÃ©rcio e serviÃ§os premium', sub: 'FarmÃ¡cias, academias (Bodytech, Smart Fit), clÃ­nicas e restaurantes de alto padrÃ£o concentrados na mesma avenida.' },
    { icon: 'shield', text: 'Hospital Santa Marta a 6 min', sub: 'Um dos melhores hospitais particulares de UberlÃ¢ndia, com pronto-socorro 24h, UTI adulto e pediÃ¡trico, e especialidades completas.' },
    { icon: 'pin', text: 'PÃ¡tio SabiÃ¡ e Shopping Park a 8 min', sub: 'Dois shoppings completos com cinema, lojas Ã¢ncoras e ampla praÃ§a de alimentaÃ§Ã£o acessÃ­veis sem trÃ¢nsito pesado.' },
    { icon: 'home', text: 'ColÃ©gios Objetivo e ColÃ©gio Santa Teresa', sub: 'Redes de ensino de referÃªncia com Ã³timo ENEM e transporte escolar disponÃ­vel para o bairro.' },
  ],
  'Santa Maria': [
    { icon: 'pin', text: 'Av. Nicomedes Alves dos Santos â€” eixo de expansÃ£o da Zona Sul', sub: 'A avenida que mais cresceu nos Ãºltimos 5 anos: Caixa EconÃ´mica, FarmÃ¡cias SÃ£o JoÃ£o, supermercados e serviÃ§os novos a cada quadra.' },
    { icon: 'home', text: 'Shopping Park a 7 min', sub: 'Principal shopping do sul da cidade, com Casas Bahia, Renner, cinema CinÃ©polis e ampla praÃ§a de alimentaÃ§Ã£o.' },
    { icon: 'shield', text: 'UAI Zona Sul e clÃ­nicas particulares', sub: 'Atendimento de urgÃªncia pÃºblico e privado em atÃ© 10 min â€” tranquilidade garantida para a famÃ­lia.' },
    { icon: 'pin', text: 'Bretas Zona Sul e AtacadÃ£o na saÃ­da do bairro', sub: 'Compras semanais sem cruzar a cidade â€” supermercado e atacarejo na mesma rota de casa.' },
    { icon: 'home', text: 'Escola Municipal e ColÃ©gio Salesiano na regiÃ£o', sub: 'TradiÃ§Ã£o no ensino fundamental e mÃ©dio, com transporte escolar e atividades extracurriculares para alunos da Zona Sul.' },
  ],
  'Jardim Sul': [
    { icon: 'pin', text: 'Av. Rondon Pacheco e Av. JoÃ£o Naves â€” acesso express', sub: 'Dois dos maiores eixos viÃ¡rios de UberlÃ¢ndia a poucos minutos â€” aeroporto, centro e Zona Leste sem trÃ¢nsito pesado.' },
    { icon: 'home', text: 'UberlÃ¢ndia Shopping (PraÃ§a Umuarama) a 8 min', sub: 'Shopping central com C&A, Riachuelo, praÃ§a de alimentaÃ§Ã£o diversificada e cinema, sem sair do eixo sul.' },
    { icon: 'shield', text: 'ClÃ­nicas mÃ©dicas particulares e UAI', sub: 'Rede mÃ©dica privada e pÃºblica num raio de 10 min â€” pediatria, ortopedia e pronto-atendimento.' },
    { icon: 'pin', text: 'Supermercado Bretas e hipermercado na rota', sub: 'OpÃ§Ãµes completas de supermercado e hipermercado sem precisar cruzar a cidade.' },
    { icon: 'home', text: 'ColÃ©gio Marista e Escola Estadual Polivalente', sub: 'TradiÃ§Ã£o no ensino com destaque no ENEM â€” colÃ©gio privado e pÃºblico de qualidade a menos de 10 min.' },
  ],
  'Jardim Finotti': [
    { icon: 'pin', text: 'Av. Rondon Pacheco â€” acessibilidade total Ã  cidade', sub: 'A maior via expressa de UberlÃ¢ndia conecta o bairro ao centro, Zona Leste e aeroporto em minutos sem semÃ¡foros.' },
    { icon: 'home', text: 'Parque do SabiÃ¡ a 5 min de carro', sub: 'ZoolÃ³gico, lago, pista de cooper e arena de shows no maior parque da cidade â€” ideal para crianÃ§as e atividades ao ar livre.' },
    { icon: 'shield', text: 'Hospital Santa Marta e UAI Zona Sul', sub: 'Atendimento especializado com maternidade, UTI e pronto-socorro particulares em menos de 10 min.' },
    { icon: 'pin', text: 'Supermercado Extra e Bretas prÃ³ximos', sub: 'ConveniÃªncia mÃ¡xima para compras do dia a dia sem precisar de deslocamentos longos.' },
    { icon: 'home', text: 'SESI e colÃ©gios particulares com transporte', sub: 'Infraestrutura educacional e esportiva do SESI, com academia, piscina e atividades para crianÃ§as acessÃ­vel a pÃ©.' },
  ],
  'Parque Una': [
    { icon: 'home', text: 'Parque do SabiÃ¡ a menos de 1 km â€” literalmente a vizinhanÃ§a', sub: 'O nome "Parque Una" nÃ£o Ã© por acaso: o maior parque urbano de UberlÃ¢ndia, com zoolÃ³gico e lago, estÃ¡ praticamente na calÃ§ada â€” raro em qualquer cidade brasileira.' },
    { icon: 'pin', text: 'Av. Monsenhor Eduardo e comÃ©rcio consolidado', sub: 'FarmÃ¡cias SÃ£o JoÃ£o, padarias, mercados e serviÃ§os de saÃºde concentrados na avenida principal a 3 min de caminhada.' },
    { icon: 'shield', text: 'UAI Central e clÃ­nicas de especialidades', sub: 'Atendimento de urgÃªncia pÃºblica e clÃ­nicas privadas de pediatria, clÃ­nica geral e ortopedia num raio de 8 min.' },
    { icon: 'pin', text: 'BH Supermercados e feira livre na Av. Monsenhor', sub: 'Supermercado completo e feira semanal com frutas, verduras e hortifruti frescos â€” alimentaÃ§Ã£o de qualidade sem depender de carro.' },
    { icon: 'home', text: 'Escola Municipal Parque Una e E. E. na regiÃ£o', sub: 'Ensino pÃºblico consolidado a distÃ¢ncia de caminhada â€” bairro autossuficiente tambÃ©m na educaÃ§Ã£o infantil.' },
  ],
  'PatrimÃ´nio': [
    { icon: 'pin', text: 'Centro de UberlÃ¢ndia a 5 min a pÃ©', sub: 'Bancos (todos os grandes), FÃ³rum, Prefeitura, CÃ¢mara Municipal e comÃ©rcio popular intenso â€” mÃ¡xima comodidade urbana, zero deslocamento.' },
    { icon: 'home', text: 'Igreja SÃ£o Pedro e patrimÃ´nio histÃ³rico tombado', sub: 'Bairro com identidade cultural forte: arquitetura histÃ³rica da cidade, Festa do RosÃ¡rio, feiras tradicionais e calendÃ¡rio de eventos ao longo do ano.' },
    { icon: 'shield', text: 'Hospital de ClÃ­nicas UFU a 10 min', sub: 'Um dos maiores hospitais universitÃ¡rios do Brasil, referÃªncia em cirurgias de alta complexidade, oncologia e medicina de urgÃªncia.' },
    { icon: 'pin', text: 'Mercado Municipal, feiras e comÃ©rcio atacadista', sub: 'Produtos frescos diariamente no Mercado Municipal de UberlÃ¢ndia â€” alimentaÃ§Ã£o de qualidade a preÃ§o de atacado a poucos quarteirÃµes.' },
    { icon: 'home', text: 'CESEC, E. E. Raul Soares e escolas municipais', sub: 'Rede pÃºblica completa de ensino fundamental, mÃ©dio, EJA e cursos profissionalizantes a poucos quarteirÃµes do bairro.' },
  ],
  'LÃ­dice': [
    { icon: 'pin', text: 'Av. Belo Horizonte â€” conectividade a toda a cidade', sub: 'A avenida corta o bairro e conecta diretamente ao centro, Zona Sul e todos os principais terminais de Ã´nibus urbanos de UberlÃ¢ndia.' },
    { icon: 'home', text: 'ArborizaÃ§Ã£o generosa â€” temperatura e qualidade de ar acima da mÃ©dia', sub: 'Um dos bairros mais arborizados de UberlÃ¢ndia: ruas com Ã¡rvores centenÃ¡rias, microclima mais fresco e qualidade de vida percebida muito maior.' },
    { icon: 'shield', text: 'ClÃ­nicas privadas e farmÃ¡cias Drogaria SÃ£o Paulo', sub: 'Cobertura mÃ©dica do pediatra ao cardiologista a menos de 10 min, com drogarias 24h a distÃ¢ncia de caminhada.' },
    { icon: 'pin', text: 'Padaria, aÃ§ougue e mercado local a pÃ©', sub: 'Bairro autossuficiente para a rotina: serviÃ§os bÃ¡sicos resolvidos sem usar o carro â€” economia real de tempo e combustÃ­vel.' },
    { icon: 'home', text: 'Escola Municipal LÃ­dice e Centro Cultural UFU', sub: 'Escola pÃºblica de referÃªncia no ensino fundamental e UFU com programaÃ§Ã£o cultural aberta ao pÃºblico â€” biblioteca, teatro e eventos gratuitos.' },
  ],
  'Santa MÃ´nica': [
    { icon: 'home', text: 'Praia Clube no bairro â€” acesso pelo portÃ£o', sub: 'O maior clube particular de UberlÃ¢ndia tem sede em Santa MÃ´nica: piscinas olÃ­mpicas, ginÃ¡sio, quadras de tÃªnis, academia e restaurantes. PouquÃ­ssimos bairros do Brasil tÃªm esse privilÃ©gio.' },
    { icon: 'shield', text: 'UFU e Hospital UniversitÃ¡rio (HU-UFU) na mesma quadra', sub: 'ReferÃªncia nacional em medicina universitÃ¡ria: ambulatÃ³rios especializados, centro cirÃºrgico de alta complexidade e urgÃªncia 24h, tudo a 5 min de carro.' },
    { icon: 'pin', text: 'BIG Hipermercado e Bretas Santa MÃ´nica', sub: 'Dois grandes supermercados num raio de 3 km â€” compras do mÃªs sem trÃ¢nsito e com fÃ¡cil estacionamento.' },
    { icon: 'home', text: 'Av. JoÃ£o Naves de Ãvila â€” o maior corredor comercial da cidade', sub: 'Bancos de todos os tipos, concessionÃ¡rias, restaurantes e os principais serviÃ§os de UberlÃ¢ndia concentrados na mesma avenida que beira o bairro.' },
    { icon: 'pin', text: 'E. E. Bueno BrandÃ£o e CEFORES na regiÃ£o', sub: 'Ensino mÃ©dio pÃºblico histÃ³rico e formaÃ§Ã£o profissional â€” raro ter essa concentraÃ§Ã£o de oferta educacional pÃºblica num Ãºnico bairro.' },
  ],
  'Tabajaras': [
    { icon: 'pin', text: 'Av. JoÃ£o Pinheiro â€” eixo histÃ³rico de serviÃ§os e transporte', sub: 'Uma das principais vias de acesso ao Centro HistÃ³rico de UberlÃ¢ndia, com comÃ©rcio estabelecido e linhas de Ã´nibus a cada 10 min.' },
    { icon: 'home', text: 'Teatro Municipal Rondon Pacheco a 10 min', sub: 'O maior teatro de UberlÃ¢ndia, com programaÃ§Ã£o anual de espetÃ¡culos, shows e festivais â€” acesso Ã  cultura da cidade sem grandes deslocamentos.' },
    { icon: 'shield', text: 'ClÃ­nicas mÃ©dicas e Hospital Municipal prÃ³ximos', sub: 'Cobertura de saÃºde pÃºblica e privada acessÃ­vel a pÃ© ou de bicicleta â€” do clÃ­nico geral Ã  emergÃªncia.' },
    { icon: 'pin', text: 'Mercado, padaria e FarmÃ¡cia SÃ£o JoÃ£o na rua principal', sub: 'Bairro residencial autossuficiente â€” necessidades bÃ¡sicas do dia a dia resolvidas sem usar o carro.' },
    { icon: 'home', text: 'E. E. Presidente Roosevelt â€” escola centenÃ¡ria', sub: 'Uma das escolas pÃºblicas mais antigas e respeitadas de UberlÃ¢ndia, com dÃ©cadas de tradiÃ§Ã£o no ensino mÃ©dio.' },
  ],
  'Nova UberlÃ¢ndia': [
    { icon: 'pin', text: 'Zona Sul em expansÃ£o documentada â€” valorizaÃ§Ã£o real', sub: 'Bairro com aprovaÃ§Ã£o de empreendimentos residenciais de mÃ©dio padrÃ£o nos Ãºltimos 3 anos â€” comprar agora significa aprovechar o inÃ­cio do ciclo de valorizaÃ§Ã£o.' },
    { icon: 'home', text: 'Acesso direto Ã  Av. Nicomedes Alves dos Santos', sub: 'ConexÃ£o expressa Ã  Av. Rondon Pacheco e ao centro em menos de 15 min, sem passar por bairros congestionados.' },
    { icon: 'shield', text: 'UAI Zona Sul e Hospital Santa Marta em 10 min', sub: 'Cobertura mÃ©dica de qualidade disponÃ­vel em menos de 15 min em qualquer direÃ§Ã£o da Zona Sul.' },
    { icon: 'pin', text: 'Supermercado Bretas e comÃ©rcio local aquecido', sub: 'Nova unidade Bretas inaugurada na regiÃ£o â€” sinal objetivo de que o bairro jÃ¡ justifica investimentos comerciais de grande porte.' },
    { icon: 'home', text: 'Escola Municipal e rede de creches em expansÃ£o', sub: 'Infraestrutura educacional acompanhando o crescimento do bairro â€” vagas em creche e ensino fundamental a poucos quarteirÃµes.' },
  ],
  'Tubalina': [
    { icon: 'pin', text: 'Av. dos MunicÃ­pios â€” artÃ©ria norte com comÃ©rcio ativo', sub: 'Acesso facilitado ao centro, UFU e aeroporto, com Bretas, farmÃ¡cias e serviÃ§os concentrados na avenida principal.' },
    { icon: 'home', text: 'Linhas de Ã´nibus integradas na esquina â€” a cada 12 min', sub: 'Mobilidade urbana acima da mÃ©dia: integraÃ§Ã£o com o terminal central sem necessidade de troca, reduzindo dependÃªncia de carro.' },
    { icon: 'shield', text: 'UAI Norte e Hospital Municipal acessÃ­veis', sub: 'Atendimento de saÃºde pÃºblica completa na regiÃ£o, sem deslocamentos longos ao centro da cidade.' },
    { icon: 'pin', text: 'Bretas Tubalina e feira livre toda semana', sub: 'Abastecimento com custo menor que a mÃ©dia da cidade â€” comÃ©rcio local aquecido e feira de rua com hortifrutigranjeiros.' },
    { icon: 'home', text: 'Escola Municipal Tubalina e APAE Regional', sub: 'Infraestrutura educacional pÃºblica consolidada no bairro, com atendimento especializado para alunos com necessidades especiais.' },
  ],
  'Cidade Jardim': [
    { icon: 'pin', text: 'CondomÃ­nios horizontais de alto padrÃ£o na vizinhanÃ§a imediata', sub: 'Bairro cercado por loteamentos fechados: perfil socioeconÃ´mico elevado dos moradores, manutenÃ§Ã£o das ruas e valorizaÃ§Ã£o constante do entorno.' },
    { icon: 'home', text: 'PÃ¡tio SabiÃ¡ e Shopping Park a 7 min', sub: 'Os dois shoppings da Zona Sul â€” cinema, Centauro, Hering, praÃ§a gourmet e supermercados â€” acessÃ­veis sem trÃ¢nsito intenso.' },
    { icon: 'shield', text: 'Hospital Santa Marta e clÃ­nicas particulares de especialidade', sub: 'Atendimento mÃ©dico de alto padrÃ£o a menos de 10 min â€” hospitalar, laboratorial e ambulatorial num Ãºnico raio.' },
    { icon: 'pin', text: 'Bretas, empÃ³rio e comÃ©rcio gourmet chegando na regiÃ£o', sub: 'Supermercado e lojas especializadas abrindo na regiÃ£o â€” sinal claro de que o bairro atinge um pÃºblico de poder aquisitivo elevado.' },
    { icon: 'home', text: 'ColÃ©gios PitÃ¡goras e Anglo prÃ³ximos via Av. Rondon', sub: 'Redes de ensino privado com excelente ENEM, acessÃ­veis por via expressa e com transporte escolar para o bairro.' },
  ],
  'GÃ¡vea': [
    { icon: 'home', text: 'Alphaville UberlÃ¢ndia e condomÃ­nios fechados como vizinhos', sub: 'Entorno de alto padrÃ£o: o vizinhanÃ§a de condomÃ­nios fechados valoriza organicamente o imÃ³vel e filtra o perfil dos moradores da regiÃ£o.' },
    { icon: 'pin', text: 'Av. Rondon Pacheco em 4 min â€” mobilidade total', sub: 'A maior via expressa de UberlÃ¢ndia leva ao aeroporto em 15 min, ao centro em 12 min e a qualquer ponto da cidade sem trÃ¢nsito intenso.' },
    { icon: 'shield', text: 'Hospital Santa Marta e UAI Zona Sul', sub: 'Atendimento mÃ©dico particular e pÃºblico a menos de 12 min â€” tranquilidade para famÃ­lias com crianÃ§as e idosos.' },
    { icon: 'pin', text: 'Shopping Park e AtacadÃ£o no mesmo eixo de saÃ­da', sub: 'Compras, lazer e abastecimento mensal na mesma rota de casa, sem desvio de trajeto.' },
    { icon: 'home', text: 'ColÃ©gios particulares com van escolar disponÃ­vel', sub: 'Redes de ensino fundamental e mÃ©dio de referÃªncia com logÃ­stica de transporte consolidada para o bairro.' },
  ],
  'Granja Marileusa': [
    { icon: 'home', text: 'Algar Telecom â€” sede nacional no bairro', sub: 'A maior empresa de UberlÃ¢ndia tem sede aqui. A Granja Marileusa foi concebida como distrito tecnolÃ³gico: startups, empresas de tecnologia e co-workings premium no mesmo quarteirÃ£o que o seu futuro imÃ³vel.' },
    { icon: 'pin', text: 'Av. Belarmino Cotta Pacheco â€” o endereÃ§o mais exclusivo da cidade', sub: 'A avenida que concentra os condomÃ­nios mais valorizados de UberlÃ¢ndia, com paisagismo planejado, iluminaÃ§Ã£o premium e calÃ§adas de granito.' },
    { icon: 'shield', text: 'Hospital Unimed e clÃ­nicas de alta complexidade a 8 min', sub: 'Atendimento mÃ©dico cooperado de alto padrÃ£o com UTI, maternidade e especialidades concentradas a menos de 10 min.' },
    { icon: 'pin', text: 'EmpÃ³rio, restaurantes e lojas gourmet na regiÃ£o', sub: 'O perfil econÃ´mico do bairro atrai comÃ©rcio especializado: padarias artesanais, restaurantes executivos e lojas de decoraÃ§Ã£o premium.' },
    { icon: 'home', text: 'ColÃ©gios bilÃ­ngues e internacionais prÃ³ximos', sub: 'Bairro que atrai famÃ­lias que priorizam educaÃ§Ã£o diferenciada: ensino bilÃ­ngue, mÃ©todos construtivistas e projetos de alto desempenho acadÃªmico.' },
  ],
}

export default function ImovelDetalhe() {
  const { codigo } = useParams()
  const local = getImovel(codigo)
  const [imApi, setImApi] = useState(null)
  const [feed, setFeed] = useState([])
  const [beneficios, setBeneficios] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [tentativa, setTentativa] = useState(0)

  // base completa (espelho) â€” mostra o imÃ³vel NA HORA, sem esperar a API/galeria
  useEffect(() => {
    let vivo = true
    fetch('/catalogo.json').then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivo && d && Array.isArray(d.imoveis)) setFeed(d.imoveis) })
      .catch(() => {})
    return () => { vivo = false }
  }, [])
  const feedItem = useMemo(() => feed.find((i) => String(i.codigo) === String(codigo)) || null, [feed, codigo])

  // dados completos (galeria, 360, mapa) vÃªm da API â€” com timeout de 9s pra nunca travar
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

  // mostra o feed na hora; quando a API completa chega, troca pela versÃ£o completa
  const im = local || imApi || feedItem

  // se NADA carregou ainda, tenta de novo sozinho a cada 5s (atÃ© 3x) â€” nunca fica preso
  useEffect(() => {
    if (im || tentativa >= 3) return
    const t = setTimeout(() => setTentativa((n) => n + 1), 3000)
    return () => clearTimeout(t)
  }, [im, tentativa])

  // mensagem descontraÃ­da girando enquanto carrega
  const [msgIdx, setMsgIdx] = useState(0)
  useEffect(() => {
    if (im) return
    const t = setInterval(() => setMsgIdx((n) => n + 1), 2600)
    return () => clearInterval(t)
  }, [im])

  const fotos = fotosDe(im)
  useSEO({
    title: im ? `${im.tipo} no ${im.bairro} â€” ${formatPreco(im.preco)}` : 'ImÃ³vel em UberlÃ¢ndia',
    description: im ? resumoImovel(im) : 'ImÃ³vel Ã  venda em UberlÃ¢ndia-MG. Consultoria personalizada com VinÃ­cius Graton.',
    path: `/imovel/${codigo}`,
    image: fotos[0] || im?.img,
  })
  const [pdfProc, setPdfProc] = useState(false)
  const [estudoAberto, setEstudoAberto] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    if (!im) return
    const t = setTimeout(() => setMounted(true), 60)
    return () => clearTimeout(t)
  }, [im])
  const compartilhar = async () => {
    if (!im) return
    const url = `https://viniciusgraton.com.br/imovel/${im.codigo}`
    const title = `${im.tipo} no ${im.bairro} â€” ${formatPreco(im.preco)}`
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
  const est = useMemo(() => { try { return estudoM2(im, feed) } catch { return { ok: false } } }, [im, feed])
  const baixarPdf = async () => {
    if (!im) return
    setPdfProc(true)
    try { const { gerarPdfImovel } = await import('../pdfImovel'); await gerarPdfImovel(im, fotos, beneficios) } catch { /* ignora */ }
    setPdfProc(false)
  }

  // Laudo tÃ©cnico pago (Mercado Pago R$ 29,90) -> gera o PDF completo apÃ³s aprovado
  const [laudoLiberado, setLaudoLiberado] = useState(false)
  const laudoGerado = useRef(false)
  const comprarLaudo = async () => {
    if (!im) return
    try {
      const r = await fetch('/api/laudo-pagar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ codigo: im.codigo }) })
      const j = await r.json()
      if (j && j.ok && j.url) { window.location.href = j.url; return }
      if (j && j.naoConfigurado) { alert('O pagamento ainda nÃ£o estÃ¡ configurado. Me chama no WhatsApp que eu te envio o laudo.'); return }
      alert('NÃ£o consegui iniciar o pagamento agora. Tente de novo em instantes.')
    } catch { alert('Falha de conexÃ£o. Tente de novo.') }
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

  // registra a visita no histÃ³rico do cliente (Ã¡rea do cliente / recomendaÃ§Ãµes)
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
      areaServed: { '@type': 'City', name: 'UberlÃ¢ndia', addressRegion: 'MG', addressCountry: 'BR' },
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
      name: `${im.tipo} no ${im.bairro}, UberlÃ¢ndia-MG`,
      description: resumoImovel(im),
      image: fotos.filter(Boolean).map((u) => abs(u.split('?')[0])),
      url: `https://viniciusgraton.com.br/imovel/${im.codigo}`,
      ...(im.area > 0 && { floorSize: { '@type': 'QuantitativeValue', value: im.area, unitCode: 'MTK' } }),
      ...(im.quartos > 0 && { numberOfRooms: im.quartos, numberOfBedrooms: im.quartos }),
      ...(im.banheiros > 0 && { numberOfBathroomsTotal: im.banheiros }),
      ...(im.vagas > 0 && { numberOfParkingSpaces: im.vagas }),
      address: {
        '@type': 'PostalAddress',
        addressLocality: im.cidade || 'UberlÃ¢ndia',
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
          name: `VÃ­deo do ${im.tipo} no ${im.bairro}`,
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
        { '@type': 'ListItem', position: 1, name: 'InÃ­cio', item: 'https://viniciusgraton.com.br/' },
        { '@type': 'ListItem', position: 2, name: 'ImÃ³veis', item: 'https://viniciusgraton.com.br/imoveis' },
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
          <h1 className="section-title">ImÃ³vel nÃ£o encontrado</h1>
          <p className="section-sub" style={{ margin: '12px 0 28px' }}>
            Esse imÃ³vel pode ter sido vendido ou saÃ­do do catÃ¡logo.
          </p>
          <Link className="btn btn-gold" to="/imoveis">Ver imÃ³veis disponÃ­veis <IconArrow /></Link>
        </div>
      </main>
    )
  }

  const ehApto = /apart|kit|studio|stÃºdio|loft|flat|cobertura/i.test(im.tipo || '')
  const temAndar = im.andar !== undefined && im.andar !== null && im.andar !== ''
  const terreo = im.andar === 0 || im.andar === '0' || /t[eÃ©]rreo/i.test(String(im.andar))
  const specs = [
    im.quartos > 0 && { icon: 'bed', valor: im.quartos, label: plural(im.quartos, 'quarto', 'quartos') },
    im.suites > 0 && { icon: 'sparkle', valor: im.suites, label: plural(im.suites, 'suÃ­te', 'suÃ­tes') },
    im.banheiros > 0 && { icon: 'bath', valor: im.banheiros, label: plural(im.banheiros, 'banheiro', 'banheiros') },
    im.vagas > 0 && { icon: 'car', valor: im.vagas, label: plural(im.vagas, 'vaga', 'vagas') },
    im.area > 0 && { icon: 'area', valor: formatArea(im.area), label: 'Ã¡rea interna' },
    im.areaLote > 0 && { icon: 'home', valor: formatArea(im.areaLote), label: 'Ã¡rea do lote' },
    ehApto && temAndar && { icon: 'floor', valor: terreo ? 'TÃ©rreo' : `${im.andar}Âº`, label: terreo ? 'andar' : 'andar' },
    ehApto && typeof im.elevador === 'boolean' && { icon: 'elevator', valor: im.elevador ? 'Com' : 'Sem', label: 'elevador' },
  ].filter(Boolean)

  const destaques = destaquesImovel(im)
  const temDescricao = im.descricao && im.descricao.trim().length > 0
  const paragrafos = temDescricao ? agruparFrases(im.descricao.trim()) : []
  const car = im.caracteristicas || {}
  const grupos = [
    { titulo: 'Por dentro do imÃ³vel', itens: car.internas || [] },
    { titulo: 'Estrutura e seguranÃ§a', itens: car.externas || [] },
    { titulo: 'Lazer e diferenciais', itens: car.extras || [] },
  ].filter((g) => g.itens.length > 0)

  const mapsQuery = encodeURIComponent(`${im.bairro}, ${im.cidade}, MG, Brasil`)
  const bairroInfo = BAIRROS.find((b) => b.nome.toLowerCase() === (im.bairro || '').toLowerCase())
  const prox = []
  if (im.pontoReferencia)
    prox.push({
      icon: 'pin',
      text: im.pontoReferencia,
      sub: 'Ponto de referÃªncia prÃ³ximo que facilita o acesso, encurta deslocamentos do dia a dia e valoriza o endereÃ§o.',
    })
  if (im.condominio)
    prox.push({
      icon: 'shield',
      text: condominioTxt(im.condominio),
      sub: 'Estrutura, seguranÃ§a e Ã¡reas de lazer do condomÃ­nio agregam conforto, comodidade e valor de revenda ao imÃ³vel.',
    })
  prox.push({
    icon: 'home',
    text: `Bairro ${im.bairro}, ${im.cidade} â€” ${im.uf}`,
    sub: bairroInfo
      ? bairroInfo.desc
      : `RegiÃ£o consolidada de ${im.cidade}, com boa infraestrutura, comÃ©rcio por perto e liquidez para uma compra segura.`,
  })
  // POIs especÃ­ficos por bairro â€” nomeados com precisÃ£o
  const bairroPois = BAIRRO_POIS[im.bairro] || [
    { icon: 'pin', text: `ComÃ©rcio completo no entorno de ${im.bairro}`, sub: 'Supermercados Bretas, farmÃ¡cias SÃ£o JoÃ£o, padarias e comÃ©rcio do dia a dia concentrados nas ruas do bairro.' },
    { icon: 'home', text: 'Escolas pÃºblicas e particulares a poucos minutos', sub: 'OpÃ§Ãµes de ensino fundamental e mÃ©dio com transporte escolar disponÃ­vel â€” desde colÃ©gios municipais a redes privadas de referÃªncia.' },
    { icon: 'shield', text: 'Cobertura mÃ©dica acessÃ­vel', sub: `UAI, clÃ­nicas de especialidade e farmÃ¡cias 24h num raio de 10 min de ${im.bairro} â€” atendimento pediÃ¡trico, clÃ­nico e de urgÃªncia disponÃ­veis.` },
    { icon: 'pin', text: 'Transporte pÃºblico e vias de acesso', sub: `Linhas de Ã´nibus com integraÃ§Ã£o ao terminal central de UberlÃ¢ndia, e acesso direto Ã s principais avenidas da cidade em minutos.` },
    { icon: 'home', text: 'Liquidez e valorizaÃ§Ã£o comprovadas na regiÃ£o', sub: 'Bairro com histÃ³rico de procura consistente e valorizaÃ§Ã£o documentada â€” compra segura e boa liquidez na hora de revender.' },
  ]
  prox.push(...bairroPois)

  // "Veja tambÃ©m" por SIMILARIDADE de filtros (mesmo tipo, bairro, faixa de preÃ§o,
  // quartos/suÃ­tes) â€” entregamos o mesmo perfil que o lead estÃ¡ olhando.
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
    .slice(0, 3)
    .map((x) => x.i)

  return (
    <>
    <AdminImovelBar im={im} />
    <main className="section--light det imovel-pg">
      <div className="container">
        <nav className="det-bread">
          <Link to="/">InÃ­cio</Link> <span>/</span> <Link to="/imoveis">ImÃ³veis</Link> <span>/</span> <b>{im.bairro}</b>
        </nav>

        <div className="det-grid">
          {/* Galeria */}
          <div className="det-galeria">
            <span className="det-tag">{im.tipo}</span>
            <Galeria fotos={fotos} alt={`${im.tipo} no ${im.bairro}, UberlÃ¢ndia`} />
            {(() => { const ap = apresentacao(im); return (
              <div className="det-apresenta">
                <h2 className="det-apresenta-tit">Por que esse imÃ³vel vale a sua visita</h2>
                {ap.paras.map((p, i) => <p key={i}>{p}</p>)}
                {temDescricao && (
                  <>
                    <span className="det-apre-sub">DescriÃ§Ã£o do imÃ³vel</span>
                    <div className="det-apre-desc">
                      {paragrafos.map((p, i) => {
                        const isTopico = p.length < 70 && !/\.\s*$/.test(p.trim()) && !p.trim().endsWith(':') && (p.match(/,/g) || []).length < 2
                        return <p key={i} className={isTopico ? 'det-apre-topico' : ''}>{isTopico ? `â€” ${p}` : p}</p>
                      })}
                    </div>
                  </>
                )}
              </div>
            ) })()}
          </div>

          {/* Painel de info */}
          <aside className={`det-info${mounted ? ' det-mounted' : ''}`}>
            <Reveal>
              <p className="det-local"><IconPin width={15} height={15} /> {im.cidade} â€” {im.uf} Â· CÃ³d. {im.codigo}</p>
              <h1 className="det-titulo">{im.tipo} no {im.bairro}</h1>
              <p className="det-subtitulo">{subtituloImovel(im)}</p>
              {im.impulsionado && (
                <Link to="/impulsionar" className="det-pub">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 15l7-7 7 7" /></svg>
                  <span><b>Publicidade</b> Â· anÃºncio impulsionado em destaque. VocÃª tambÃ©m pode impulsionar o seu â†’</span>
                </Link>
              )}
              {(() => { const op = oportunidade(im); return (op.temDesconto || op.abaixoMercado) ? (
                <div className="det-selos">
                  {op.temDesconto && <span className="im-selo im-selo--off">PreÃ§o reduzido Â· -{op.pctDesconto}%</span>}
                  {op.abaixoMercado && <span className="im-selo im-selo--mercado">Abaixo do mÂ² do bairro</span>}
                </div>
              ) : null })()}
              <PrecoGate valor={im.preco} anterior={im.precoAnterior} className="det-preco" tipo="detalhe" />
              {im.visto && (() => {
                const dias = Math.floor((Date.now() - new Date(im.visto).getTime()) / 86400000)
                if (dias > 60) return null
                const txt = dias === 0 ? 'Adicionado hoje' : dias === 1 ? 'Adicionado hÃ¡ 1 dia' : `Adicionado hÃ¡ ${dias} dias`
                return <p className="det-baixou-em det-novo-tag">{txt}</p>
              })()}
              {!im.visto && im.novo && (
                <p className="det-baixou-em det-novo-tag">Adicionado recentemente</p>
              )}
              {im.baixouEm && (
                <p className="det-baixou-em">
                  PreÃ§o reduzido em {new Date(im.baixouEm).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
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

              <a className="btn btn-gold det-whats" href={linkWhatsApp(waImovel(im))} target="_blank" rel="noopener">
                <IconWhats /> Tenho interesse neste imÃ³vel
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
                <a href={linkWhatsApp(waImovel(im))} className="det-btn-acao" target="_blank" rel="noopener">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                  Agendar visita
                </a>
                {im.tour360 && (
                  <a href={im.tour360} className="det-btn-acao det-btn-acao--wide" target="_blank" rel="noopener">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
                    Tour 360Â°
                  </a>
                )}
                {im.video && !/NnAmly9Gb9s/.test(im.video) && (
                  <a href={ytWatch(im.video)} className="det-btn-acao det-btn-acao--wide" target="_blank" rel="noopener">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                    Ver vÃ­deo do imÃ³vel
                  </a>
                )}
                {est?.ok && (
                  <button className="det-estudo-cta" onClick={() => setEstudoAberto(true)}>
                    <div className="det-estudo-cta-ico" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18M7 14l4-4 3 3 5-6" /></svg>
                    </div>
                    <div className="det-estudo-cta-txt">
                      <strong>Estudo do valor do mÂ²</strong>
                      <span>Veja se o preÃ§o pedido estÃ¡ justo para este bairro</span>
                    </div>
                    <svg className="det-estudo-cta-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </button>
                )}
              </div>


              <PerguntasImovel im={im} />

              <div className="det-engaj">
                <Engajamento im={im} variante="detalhe" />
                <span className="det-engaj-dica">Curta e compartilhe com quem vai amar este imÃ³vel</span>
              </div>

              <div className="det-trust">
                <IconShield width={20} height={20} />
                <p><b>Atendimento direto comigo</b>, do primeiro contato Ã  entrega das chaves. Te ajudo na visita, na negociaÃ§Ã£o e em toda a documentaÃ§Ã£o â€” compra segura e sem dor de cabeÃ§a.</p>
              </div>
            </Reveal>
          </aside>
        </div>

        {/* Destaques (benefÃ­cios) */}
        {destaques.length > 0 && (
          <div className="det-destaques">
            <h2 className="det-rel-titulo">Destaques deste imÃ³vel</h2>
            <div className="det-dest-grid">
              {destaques.map((d, i) => <Destaque key={i} {...d} />)}
            </div>
          </div>
        )}

        {grupos.length > 0 && (
          <div className="det-carac">
            <h2 className="det-rel-titulo">CaracterÃ­sticas e comodidades</h2>
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
          <h2 className="det-rel-titulo">LocalizaÃ§Ã£o e proximidades</h2>
          <p className="det-mapa-bairro"><IconPin width={18} height={18} /> {im.bairro}, {im.cidade} â€” {im.uf}</p>
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
              <a className="det-mapa-ampliar" href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`} target="_blank" rel="noopener">
                â›¶ Ampliar e explorar a regiÃ£o no Google Maps
              </a>
            </figure>
            <div className="det-mapa-prox">
              <h3>O que valoriza este endereÃ§o</h3>
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
              <p className="det-mapa-aviso">LocalizaÃ§Ã£o aproximada do bairro â€” o mapa mostra escolas, comÃ©rcio e serviÃ§os ao redor. O endereÃ§o exato Ã© informado no atendimento.</p>
            </div>
          </div>
        </div>

        {relacionados.length > 0 && (
          <div className="det-rel">
            <h2 className="det-rel-titulo">Veja tambÃ©m</h2>
            <div className="im-grid" style={{ perspective: '1400px' }}>
              {relacionados.map((r) => <CardImovel key={r.codigo} im={r} />)}
            </div>
          </div>
        )}

        <div style={{ marginTop: 48 }}>
          <Link className="btn btn-ghost" to="/imoveis"><IconArrow style={{ transform: 'rotate(180deg)' }} /> Voltar para o catÃ¡logo</Link>
        </div>
      </div>
      {estudoAberto && est?.ok && <EstudoM2 im={im} est={est} onClose={() => setEstudoAberto(false)} onLaudo={comprarLaudo} />}
    </main>
    </>
  )
}
