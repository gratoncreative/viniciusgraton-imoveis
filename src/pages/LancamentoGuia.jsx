import { Link } from 'react-router-dom'
import { useSEO } from '../useSEO'
import { linkWhatsApp } from '../data'
import Reveal from '../components/Reveal'
import { IconArrow, IconWhats, IconShield, IconPin } from '../components/icons'

const WA_GUIA = 'Olá Vinícius! Li o guia de compra na planta e tenho dúvidas que gostaria de esclarecer antes de tomar qualquer decisão.'

const SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  name: 'Guia completo para comprar na planta com segurança em Uberlândia',
  headline: 'Como comprar um imóvel na planta com segurança em Uberlândia',
  description:
    'Documentação, financiamento, INCC, prazo de entrega e tudo que você precisa saber antes de assinar qualquer contrato de lançamento imobiliário.',
  author: { '@type': 'Person', name: 'Vinícius Graton', jobTitle: 'Consultor de Imóveis', telephone: '+553499157-0494' },
  publisher: {
    '@type': 'Organization',
    name: 'Rotina Imobiliária',
    logo: { '@type': 'ImageObject', url: 'https://viniciusgraton.com.br/logo.png' },
  },
  inLanguage: 'pt-BR',
  url: 'https://viniciusgraton.com.br/lancamentos/guia',
}

export default function LancamentoGuia() {
  useSEO({
    title: 'Como comprar na planta com segurança em Uberlândia - Guia completo',
    description:
      'Tudo que você precisa saber antes de assinar um contrato de lançamento imobiliário. Documentação, INCC, financiamento na planta, prazos de entrega e direitos do comprador.',
    path: '/lancamentos/guia',
  })

  return (
    <main className="pagina guia-pagina">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA) }} />

      {/* Hero */}
      <section className="guia-hero">
        <div className="container">
          <Reveal>
            <nav className="breadcrumb" aria-label="Localização">
              <Link to="/">Início</Link>
              <span>/</span>
              <Link to="/lancamentos">Lançamentos</Link>
              <span>/</span>
              <span>Guia de compra na planta</span>
            </nav>
            <span className="eyebrow" style={{ color: 'var(--gold-2)' }}>Guia gratuito</span>
            <h1 className="guia-titulo">Como comprar na planta com segurança em Uberlândia</h1>
            <p className="guia-sub">
              Documentação, financiamento, INCC, prazo de entrega e tudo que você precisa entender antes de assinar qualquer contrato. Sem enrolação.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Índice */}
      <section className="guia-indice-section">
        <div className="container guia-indice">
          <strong>Neste guia</strong>
          <ul>
            <li><a href="#o-que-e">O que é comprar na planta</a></li>
            <li><a href="#vantagens">Vantagens reais da compra na planta</a></li>
            <li><a href="#riscos">Riscos que ninguém conta</a></li>
            <li><a href="#incc">O que é o INCC e como afeta seu contrato</a></li>
            <li><a href="#financiamento">Financiamento na planta .. como funciona</a></li>
            <li><a href="#documentos">Documentos que você deve exigir</a></li>
            <li><a href="#vistoria">Vistoria antes de receber as chaves</a></li>
            <li><a href="#checklist">Checklist completo antes de assinar</a></li>
          </ul>
        </div>
      </section>

      {/* Conteúdo */}
      <article className="container guia-corpo">

        <section id="o-que-e" className="guia-sec">
          <h2>O que é comprar na planta</h2>
          <p>
            Comprar na planta significa adquirir um imóvel que ainda vai ser construído, ou que está no início das obras. Você paga durante a construção e recebe as chaves quando o empreendimento fica pronto.
          </p>
          <p>
            Em Uberlândia, esse modelo é muito comum tanto em lançamentos de construtoras consolidadas como MRV, Perplan e Castelo Real, quanto em incorporadoras menores com foco em padrão médio e alto. O ciclo típico vai de 24 a 48 meses entre a compra e a entrega das chaves.
          </p>
          <p>
            Durante esse período, você paga parcelas mensais diretamente para a construtora (chamadas de "parcelamento de obra"). Quando o imóvel fica pronto, quem financiou via banco faz a transferência do saldo devedor para o banco. Quem comprou à vista recebe as chaves e quita o restante no ato.
          </p>
        </section>

        <section id="vantagens" className="guia-sec">
          <h2>Vantagens reais da compra na planta</h2>
          <div className="guia-cards">
            <div className="guia-card">
              <h3>Preço menor que o imóvel pronto</h3>
              <p>O preço na planta costuma ser 15% a 30% menor do que o mesmo imóvel pronto. A construtora precisa captar recursos no início da obra, então oferece condições melhores para quem compra cedo.</p>
            </div>
            <div className="guia-card">
              <h3>Parcelas menores durante a obra</h3>
              <p>O parcelamento da construtora durante a construção é menor do que a parcela do financiamento final. Isso facilita para quem ainda paga aluguel enquanto espera o imóvel ficar pronto.</p>
            </div>
            <div className="guia-card">
              <h3>Personalização do imóvel</h3>
              <p>Dependendo do estágio da obra, é possível escolher revestimentos, alterar alguns itens de acabamento e, em alguns casos, unir ou dividir cômodos. Quanto antes você compra, mais opções tem.</p>
            </div>
            <div className="guia-card">
              <h3>Valorização entre a compra e a entrega</h3>
              <p>Um imóvel comprado na planta por R$ 400.000 pode valer R$ 480.000 quando fica pronto, dependendo da localização e da qualidade do empreendimento. Essa valorização é o principal atrativo para investidores.</p>
            </div>
          </div>
        </section>

        <section id="riscos" className="guia-sec">
          <h2>Riscos que ninguém conta</h2>
          <div className="guia-alerta">
            <IconShield width={20} height={20} />
            <p>Conhecer os riscos não é motivo para não comprar. É motivo para comprar com os olhos abertos e as perguntas certas.</p>
          </div>
          <div className="guia-lista">
            <div className="guia-lista-item">
              <strong>Atraso na entrega</strong>
              <p>A lei permite até 180 dias de tolerância além do prazo previsto em contrato. Se a obra atrasar mais do que isso, você tem direito de rescindir o contrato com devolução de 100% do valor pago corrigido, ou de receber multa de 1% ao mês sobre o valor total do imóvel. Leia o contrato antes de assinar para entender o que consta no seu caso.</p>
            </div>
            <div className="guia-lista-item">
              <strong>Construtora em dificuldade financeira</strong>
              <p>Empresas com problemas financeiros podem paralisar a obra. Sempre pesquise o histórico da construtora antes de comprar. Verifique empreendimentos entregues, busque reclamações no Reclame Aqui e nos cartórios de registro de imóveis, e pergunte ao consultor sobre a reputação da empresa em Uberlândia.</p>
            </div>
            <div className="guia-lista-item">
              <strong>Correção pelo INCC durante a obra</strong>
              <p>O saldo devedor durante a construção é corrigido pelo INCC (Índice Nacional da Construção Civil), que historicamente supera o IPCA. Em anos de inflação alta da construção civil, o valor final do seu imóvel pode ser significativamente maior do que o previsto. Simule o pior cenário antes de assinar.</p>
            </div>
            <div className="guia-lista-item">
              <strong>Diferença entre decorado e entregue</strong>
              <p>O imóvel decorado é mobiliado e equipado para impressionar. O imóvel que você recebe é a unidade crua, sem móveis, sem iluminação de destaque, sem espelhos que ampliam o espaço. Visite a planta e o decorado ao mesmo tempo e compare metragem com metragem, não ambiente com ambiente.</p>
            </div>
            <div className="guia-lista-item">
              <strong>Custos extras não divulgados</strong>
              <p>ITBI (2% em Uberlândia), cartório (escritura e registro, cerca de 1,5% a 2%), avaliação bancária (em torno de R$ 3.500) e possível taxa de evolução de obra. Orce esses valores antes de fechar o negócio para não ser surpreendido.</p>
            </div>
          </div>
        </section>

        <section id="incc" className="guia-sec">
          <h2>O que é o INCC e como afeta seu contrato</h2>
          <p>
            O INCC (Índice Nacional da Construção Civil) é o índice que corrige o saldo devedor durante o período de construção. Ele mede a variação dos custos de materiais e mão de obra na construção civil.
          </p>
          <p>
            Na prática, funciona assim.. você assina um contrato com saldo devedor de R$ 300.000 hoje. Se o INCC acumular 18% até a entrega das chaves (em 36 meses, por exemplo), seu saldo devedor na entrega será de aproximadamente R$ 354.000.
          </p>
          <p>
            Isso não é um problema em si, porque o valor do imóvel também sobe. O problema é quando o comprador não conta com isso no seu planejamento e se surpreende na hora de assinar o financiamento com o banco.
          </p>
          <p>
            Peça à construtora a projeção de INCC acumulado usada nas simulações deles. Compare com o histórico real do índice. Não aceite projeções de INCC abaixo de 6% ao ano sem questionar.
          </p>
        </section>

        <section id="financiamento" className="guia-sec">
          <h2>Financiamento na planta .. como funciona</h2>
          <p>
            O financiamento de um imóvel na planta tem duas fases distintas.
          </p>
          <p>
            Durante a obra, você paga parcelas mensais à construtora. Essas parcelas são normalmente uma parte pequena do valor total (entre 20% e 40% do valor), e o restante é o saldo a ser financiado pelo banco na entrega.
          </p>
          <p>
            Na entrega das chaves, o saldo devedor restante é transferido para o banco, que faz uma nova avaliação do imóvel e libera o financiamento. Aqui estão os pontos de atenção.
          </p>
          <div className="guia-lista">
            <div className="guia-lista-item">
              <strong>Aprovação de crédito antecipada é essencial</strong>
              <p>Muitos compradores chegam à entrega das chaves e descobrem que o banco não aprova o crédito pelo valor necessário. Faça a simulação de crédito com o banco antes de assinar o contrato, não depois. Isso confirma que você vai conseguir financiar o saldo devedor corrigido na data de entrega.</p>
            </div>
            <div className="guia-lista-item">
              <strong>Avaliação do banco pode ser menor que o valor do contrato</strong>
              <p>O banco avalia o imóvel na entrega e financia apenas até 80% do valor avaliado (em geral). Se a avaliação bancária for menor que o saldo devedor, você precisará completar a diferença com recursos próprios.</p>
            </div>
            <div className="guia-lista-item">
              <strong>FGTS pode ser usado</strong>
              <p>Em imóveis financiados pelo SFH (Sistema Financeiro de Habitação) com valor até R$ 1.500.000 em Uberlândia/MG, é possível usar o FGTS para amortizar o saldo devedor ou reduzir parcelas na entrega. Verifique seu saldo de FGTS como parte do planejamento da compra.</p>
            </div>
          </div>
        </section>

        <section id="documentos" className="guia-sec">
          <h2>Documentos que você deve exigir antes de assinar</h2>
          <div className="guia-lista">
            <div className="guia-lista-item">
              <strong>Registro de Incorporação no Cartório</strong>
              <p>Todo empreendimento deve ter registro de incorporação antes de vender qualquer unidade. Peça o número do registro e confirme no cartório de registro de imóveis da comarca. Um empreendimento sem registro não pode ser vendido legalmente.</p>
            </div>
            <div className="guia-lista-item">
              <strong>Memorial Descritivo</strong>
              <p>Descreve todos os materiais, acabamentos e equipamentos que fazem parte do contrato. Se o memorial diz "piso de porcelanato 60x60 cm", é isso que deve ser entregue. Guarde o memorial e compare com o imóvel na vistoria final.</p>
            </div>
            <div className="guia-lista-item">
              <strong>Planta baixa cotada e aprovada</strong>
              <p>A planta com todas as dimensões em metros, aprovada pela Prefeitura. Verifique se a metragem privatica e a área de lazer correspondem ao que foi anunciado.</p>
            </div>
            <div className="guia-lista-item">
              <strong>Minuta do contrato (antes de assinar)</strong>
              <p>Você tem direito a receber a minuta do contrato com pelo menos 5 dias de antecedência para análise. Não assine nada no ato da apresentação sem ler com calma ou sem consultoria de advogado.</p>
            </div>
          </div>
        </section>

        <section id="vistoria" className="guia-sec">
          <h2>Vistoria antes de receber as chaves</h2>
          <p>
            A vistoria é o momento em que você percorre o imóvel pronto, antes de assinar o auto de entrega de chaves, e registra formalmente tudo que não está de acordo com o contrato. É um direito seu e protege você de brigas futuras sobre o que existia antes e depois da entrega.
          </p>
          <p>
            Leve o memorial descritivo e a planta durante a vistoria. Compare cada item. Documente em vídeo e fotos tudo que encontrar de diferença, seja fissura, infiltração, item de acabamento diferente do contratado, pintura com falha, esquadria desalinhada ou equipamento faltando.
          </p>
          <p>
            Registre as pendências no "Termo de Vistoria" ou "Boletim de Entrega" antes de assinar qualquer documento de recebimento. Construtor responsável assina o prazo para corrigir cada item antes de você finalizar a entrega.
          </p>
          <p>
            Se as pendências forem graves (infiltração estrutural, porta que não fecha, piso com nível errado), você pode recusar o imóvel naquele dia e solicitar nova vistoria após as correções. Esse direito está previsto no Código de Defesa do Consumidor.
          </p>
        </section>

        <section id="checklist" className="guia-sec">
          <h2>Checklist completo antes de assinar</h2>
          <div className="guia-checklist">
            {[
              'Confirmar o registro de incorporação no cartório',
              'Pesquisar o histórico de entrega da construtora (outros empreendimentos prontos)',
              'Solicitar e ler a minuta do contrato com antecedência mínima de 5 dias',
              'Verificar as cláusulas de prazo de entrega e multa por atraso',
              'Fazer simulação de crédito com o banco antes de assinar',
              'Calcular o INCC projetado até a entrega e rever o valor final esperado',
              'Orçar ITBI (2%), cartório (~1,5%), avaliação bancária (~R$3.500)',
              'Verificar se seu FGTS é utilizável neste imóvel',
              'Guardar o memorial descritivo assinado pela construtora',
              'Visitar outros empreendimentos prontos da mesma construtora para avaliar acabamento',
              'Confirmar área privativa na planta cotada (não confiar apenas na metragem do folheto)',
              'Verificar taxa de condomínio prevista e quem paga durante a obra',
            ].map((item, i) => (
              <label key={i} className="guia-check-item">
                <input type="checkbox" />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </section>

        {/* CTA consultor */}
        <div className="guia-cta-consultor">
          <IconShield width={28} height={28} />
          <div>
            <h3>Ficou com dúvida em algum ponto?</h3>
            <p>Fale comigo antes de assinar qualquer contrato. Analiso o empreendimento, a construtora e o contrato junto com você, sem custo adicional para o comprador.</p>
          </div>
          <a href={linkWhatsApp(WA_GUIA)} className="btn btn-gold" target="_blank" rel="noopener noreferrer">
            <IconWhats width={16} height={16} /> Falar com Vinícius <IconArrow width={13} height={13} />
          </a>
        </div>

        {/* Links relacionados */}
        <div className="guia-relacionados">
          <h3>Próximos passos</h3>
          <div className="guia-rel-links">
            <Link to="/lancamentos/catalogo" className="guia-rel-link">
              <IconPin width={14} height={14} />
              Ver catálogo de lançamentos em Uberlândia <IconArrow width={13} height={13} />
            </Link>
            <Link to="/ferramentas" className="guia-rel-link">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 7h6M9 12h6M9 17h4"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
              Simular financiamento e calcular custos de compra <IconArrow width={13} height={13} />
            </Link>
          </div>
        </div>
      </article>
    </main>
  )
}
