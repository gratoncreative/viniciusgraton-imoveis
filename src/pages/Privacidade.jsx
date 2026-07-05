import { Link } from 'react-router-dom'
import { CONFIG } from '../data'
import { IconArrow } from '../components/icons'
import { useSEO } from '../useSEO'

export default function Privacidade() {
  useSEO({
    title: 'Política de Privacidade e Termos de Uso',
    description: 'Política de privacidade e termos de uso do site Vinícius Graton Imóveis em Uberlândia.',
    path: '/privacidade',
  })

  const email = CONFIG.email
  const cidade = CONFIG.cidade || 'Uberlândia'

  return (
    <main className="section--light catalogo legal">
      <div className="container" style={{ maxWidth: 860 }}>
        <Link className="legal-back" to="/"><IconArrow style={{ transform: 'rotate(180deg)' }} width={16} height={16} /> Voltar ao início</Link>
        <h1 className="section-title" style={{ marginTop: 18 }}>Política de Privacidade <em>e Termos de Uso</em></h1>
        <p className="section-sub" style={{ margin: '12px 0 8px' }}>Última atualização: junho de 2026</p>

        <div className="legal-body legal-mini">
          <p>
            Este documento reúne a <b>Política de Privacidade</b> e os <b>Termos de Uso</b> do site
            <b> viniciusgraton.com.br</b> (o "Site"), operado por {CONFIG.nome}, consultor de imóveis em {cidade}-MG
            ("nós", "consultor"). Ao acessar e utilizar o Site, você ("usuário", "você") declara que leu, entendeu e
            concorda integralmente com as condições abaixo. Caso não concorde, por favor não utilize o Site. Tratamos
            seus dados de acordo com a Lei Geral de Proteção de Dados - LGPD (Lei nº 13.709/2018), o Marco Civil da
            Internet (Lei nº 12.965/2014) e o Código de Defesa do Consumidor, no que for aplicável.
          </p>

          <h2>1. Responsável pelo tratamento e contato (Encarregado/DPO)</h2>
          <p>
            O responsável pelo tratamento dos dados e o encarregado para fins da LGPD é {CONFIG.nome}, que pode ser
            contatado pelo e-mail <a href={`mailto:${email}`}>{email}</a>. Atuamos como consultor imobiliário,
            prestando serviços de assessoria e intermediação na compra, venda e locação de imóveis em {cidade} e região,
            em parceria com imobiliárias, construtoras e proprietários.
          </p>

          <h2>2. Natureza do Site e do serviço</h2>
          <p>
            O Site é uma <b>vitrine informativa</b> e um canal de relacionamento. As informações aqui publicadas têm
            caráter meramente ilustrativo e informativo e <b>não constituem oferta, proposta vinculante, contrato,
            promessa de venda nem garantia de disponibilidade, preço ou condição</b>. Toda e qualquer negociação
            depende de confirmação direta, de análise documental específica e de instrumento contratual próprio,
            celebrado por escrito entre as partes envolvidas.
          </p>

          <h2>3. Dados que tratamos</h2>
          <p>
            <b>(a) Dados que você fornece:</b> nome, telefone/WhatsApp, e-mail e as informações sobre o imóvel que você
            procura ou oferece (objetivo, bairro, tipo, faixa de valor, perfil, e demais dados que você opte por enviar
            por formulário, WhatsApp ou e-mail). <b>(b) Dados de navegação:</b> informações técnicas coletadas
            automaticamente, como endereço IP, tipo de dispositivo e navegador, páginas visitadas e data/hora de acesso,
            por meio de provedores de infraestrutura e, quando habilitadas, ferramentas de analytics. <b>(c) Dados de
            uso e preferências:</b> imóveis favoritados, curtidos, compartilhados e visitados, que podem ser guardados
            localmente no seu navegador (armazenamento local) e/ou em nosso backend para melhorar a sua experiência e o
            atendimento. Não solicitamos dados sensíveis; pedimos que você não nos envie informações dessa natureza.
          </p>

          <h2>4. Finalidades e bases legais</h2>
          <p>
            Tratamos seus dados para: (i) responder a contatos, atender e dar andamento à busca, compra, venda ou locação
            de imóveis; (ii) enviar opções, comunicações e novidades relacionadas ao seu interesse; (iii) personalizar a
            sua experiência no Site (favoritos, histórico, recomendações); (iv) cumprir obrigações legais e regulatórias;
            e (v) prevenir fraudes e garantir a segurança. As bases legais aplicáveis são, conforme o caso, o
            <b> consentimento</b>, a <b>execução de procedimentos preliminares e de contrato</b> a seu pedido, o
            <b> cumprimento de obrigação legal</b> e o <b>legítimo interesse</b>, sempre respeitados os seus direitos.
          </p>

          <h2>5. Compartilhamento de dados</h2>
          <p>
            <b>Não vendemos seus dados.</b> Podemos compartilhá-los, na medida do necessário, com: imobiliárias,
            construtoras, proprietários e parceiros envolvidos no atendimento ao seu pedido; instituições financeiras e
            correspondentes bancários, quando você solicitar simulação ou financiamento; e fornecedores de tecnologia que
            viabilizam o Site (ex.: hospedagem e CDN, mensageria do WhatsApp/Meta, mapas do Google, ferramentas de
            formulário, e-mail e analytics), que tratam os dados conforme as respectivas políticas. Também poderemos
            compartilhar dados para cumprir lei, ordem judicial ou requisição de autoridade competente.
          </p>

          <h2>6. Cookies e tecnologias de armazenamento</h2>
          <p>
            Utilizamos armazenamento local do navegador para lembrar suas preferências (como favoritos) e cookies/recursos
            estritamente necessários ao funcionamento do Site. Serviços de terceiros incorporados (como mapas do Google e
            vídeos do YouTube) podem definir cookies próprios ao serem carregados. Você pode bloquear ou apagar cookies nas
            configurações do seu navegador, ciente de que isso pode afetar funcionalidades.
          </p>

          <h2>7. Retenção e exclusão</h2>
          <p>
            Mantemos seus dados pelo tempo necessário às finalidades acima e ao cumprimento de obrigações legais. Encerrado
            o atendimento e os prazos legais, os dados são eliminados ou anonimizados.
          </p>

          <h2>8. Seus direitos como titular</h2>
          <p>
            Nos termos do art. 18 da LGPD, você pode solicitar: confirmação da existência de tratamento; acesso,
            correção, anonimização, bloqueio ou eliminação de dados; portabilidade; informação sobre compartilhamentos; e
            revogação do consentimento. Basta escrever para <a href={`mailto:${email}`}>{email}</a>. Você também pode
            reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
          </p>

          <h2>9. Segurança</h2>
          <p>
            Adotamos medidas técnicas e organizacionais razoáveis para proteger seus dados. Contudo, nenhum sistema é
            100% imune; não podemos garantir segurança absoluta e não nos responsabilizamos por acessos indevidos
            decorrentes de fatores fora do nosso controle razoável.
          </p>

          <h2>10. Menores de idade</h2>
          <p>
            O Site não se destina a menores de 18 anos e não coletamos intencionalmente dados de menores. Caso identifique
            o envio de tais dados, entre em contato para que sejam removidos.
          </p>

          <h2>11. Transferência internacional</h2>
          <p>
            Alguns provedores de tecnologia podem armazenar ou processar dados em servidores fora do Brasil. Nesses casos,
            buscamos parceiros que adotem padrões adequados de proteção, em conformidade com a LGPD.
          </p>

          <h2>12. Isenções e limitações de responsabilidade</h2>
          <p>
            <b>12.1. Informações de imóveis, empreendimentos e condomínios.</b> Os dados, fotos, plantas, vídeos, valores,
            metragens, prazos, características e disponibilidade exibidos são fornecidos por terceiros (proprietários,
            construtoras, incorporadoras, imobiliárias e portais) e/ou coletados de fontes públicas, podendo conter erros,
            desatualizações ou divergências. <b>Não garantimos a exatidão, atualidade ou completude dessas informações</b>,
            que devem ser sempre confirmadas diretamente conosco e com a documentação oficial antes de qualquer decisão ou
            pagamento. Imagens podem ser ilustrativas e não refletir o imóvel real.
          </p>
          <p>
            <b>12.2. Marcas e materiais de terceiros.</b> Nomes, marcas, logotipos e materiais de construtoras, condomínios
            e empreendimentos pertencem aos respectivos titulares e são exibidos apenas para fins informativos e de
            divulgação dos produtos. Qualquer titular que deseje a remoção ou correção de um material pode solicitar pelo
            e-mail acima, e atenderemos prontamente.
          </p>
          <p>
            <b>12.3. Simuladores e calculadoras.</b> As ferramentas de cálculo (financiamento, custos, capacidade,
            rentabilidade, etc.) são <b>estimativas educativas</b>, baseadas em premissas genéricas. Não constituem
            proposta de crédito, oferta, garantia de aprovação ou de taxa, nem aconselhamento financeiro. Condições reais
            variam conforme a instituição financeira, o seu perfil e a legislação vigente.
          </p>
          <p>
            <b>12.4. Ausência de aconselhamento profissional.</b> O conteúdo do Site tem caráter informativo e não
            substitui aconselhamento jurídico, financeiro, tributário, contábil ou de investimento. Recomendamos consultar
            profissionais habilitados antes de decisões. Não somos instituição financeira e não realizamos análise de
            crédito.
          </p>
          <p>
            <b>12.5. Intermediação.</b> A prestação de serviços de consultoria e intermediação imobiliária, bem como
            eventuais comissões, honorários e responsabilidades, são regidas por contrato específico ajustado entre as
            partes. Nenhuma informação do Site cria, por si só, obrigação de intermediação ou de pagamento.
          </p>
          <p>
            <b>12.6. Disponibilidade e links externos.</b> O Site é fornecido "no estado em que se encontra" e "conforme
            disponível", sem garantia de funcionamento ininterrupto ou livre de erros. Não nos responsabilizamos pelo
            conteúdo, políticas ou práticas de sites de terceiros eventualmente acessados por links.
          </p>
          <p>
            <b>12.7. Limitação.</b> Na máxima extensão permitida pela lei, não responderemos por danos indiretos,
            incidentais, lucros cessantes ou prejuízos decorrentes do uso ou da impossibilidade de uso do Site, das
            informações nele contidas ou de decisões tomadas com base nelas.
          </p>

          <h2>13. Responsabilidade do usuário e veracidade</h2>
          <p>
            Você se compromete a usar o Site de boa-fé e a fornecer informações verdadeiras, exatas e atualizadas,
            responsabilizando-se por elas. Ao enviar dados de um imóvel para avaliação/cadastro, você declara ser o
            proprietário ou estar autorizado a oferecê-lo, e ser o responsável pela veracidade das informações e das fotos
            enviadas, autorizando seu uso para fins de análise e eventual divulgação, sem que isso gere qualquer obrigação
            de publicação ou de resultado por nossa parte.
          </p>

          <h2>14. Propriedade intelectual</h2>
          <p>
            O projeto visual, os textos e os demais elementos próprios do Site são protegidos por direitos autorais. É
            vedada a reprodução, cópia ou uso comercial sem autorização prévia, ressalvados os materiais de terceiros, que
            pertencem aos respectivos titulares.
          </p>

          <h2>15. Alterações</h2>
          <p>
            Esta política pode ser atualizada a qualquer momento para refletir mudanças legais ou operacionais. A versão
            vigente é sempre a publicada nesta página, com a data de atualização indicada no topo.
          </p>

          <h2>16. Lei aplicável e foro</h2>
          <p>
            Aplica-se a legislação brasileira. Fica eleito o foro da Comarca de {cidade}/MG para dirimir quaisquer
            questões oriundas deste documento, com renúncia a qualquer outro, por mais privilegiado que seja.
          </p>

          <p style={{ marginTop: 28 }}>
            Dúvidas sobre privacidade ou sobre estes termos? Fale comigo em <a href={`mailto:${email}`}>{email}</a>.
          </p>
        </div>
      </div>
    </main>
  )
}
