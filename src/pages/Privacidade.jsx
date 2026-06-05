import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CONFIG } from '../data'
import { IconArrow } from '../components/icons'

export default function Privacidade() {
  useEffect(() => {
    document.title = `Política de Privacidade | ${CONFIG.nome}`
    return () => { document.title = CONFIG.marca }
  }, [])

  return (
    <main className="section--light catalogo legal">
      <div className="container" style={{ maxWidth: 820 }}>
        <Link className="legal-back" to="/"><IconArrow style={{ transform: 'rotate(180deg)' }} width={16} height={16} /> Voltar ao início</Link>
        <h1 className="section-title" style={{ marginTop: 18 }}>Política de <em>Privacidade</em></h1>
        <p className="section-sub" style={{ margin: '12px 0 8px' }}>Última atualização: junho de 2026</p>

        <div className="legal-body">
          <p>
            Esta política explica, de forma simples, como os seus dados são tratados quando você usa
            o site <b>viniciusgraton.com.br</b> e fala comigo. Levo a sua privacidade a sério e sigo a
            Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018).
          </p>

          <h2>1. Quem é o responsável</h2>
          <p>
            {CONFIG.nome}, consultor de imóveis em {CONFIG.cidade}. Contato:{' '}
            <a href={`mailto:${CONFIG.email}`}>{CONFIG.email}</a>.
          </p>

          <h2>2. Quais dados eu coleto</h2>
          <p>
            Apenas o que você me envia voluntariamente pelo formulário de contato ou pelo WhatsApp:
            <b> nome, telefone e as informações sobre o imóvel que você procura</b> (objetivo, bairro,
            faixa de valor, etc.). O site não coleta dados sensíveis e não exige cadastro.
          </p>

          <h2>3. Para que eu uso</h2>
          <p>
            Exclusivamente para <b>entrar em contato e te atender</b> na busca pelo imóvel: entender o
            que você procura, enviar opções e dar andamento à negociação. Não uso seus dados para
            outra finalidade.
          </p>

          <h2>4. Compartilhamento</h2>
          <p>
            <b>Eu não vendo nem compartilho seus dados</b> com terceiros para fins de marketing. Posso
            usar ferramentas que ajudam no atendimento (ex.: WhatsApp e o serviço de formulários da
            hospedagem), que tratam os dados apenas para viabilizar o contato.
          </p>

          <h2>5. Por quanto tempo guardo</h2>
          <p>
            Mantenho seus dados enquanto durar o atendimento e pelo tempo necessário para cumprir
            obrigações legais. Depois disso, eles são descartados.
          </p>

          <h2>6. Seus direitos</h2>
          <p>
            Você pode, a qualquer momento, solicitar <b>acesso, correção ou exclusão</b> dos seus
            dados, bem como revogar o consentimento. É só me escrever em{' '}
            <a href={`mailto:${CONFIG.email}`}>{CONFIG.email}</a> que eu atendo.
          </p>

          <h2>7. Cookies</h2>
          <p>
            Este site é simples e não usa cookies para te rastrear ou criar perfis de publicidade.
            Recursos de terceiros (como o mapa do Google nas páginas de imóvel) podem definir cookies
            próprios ao serem carregados.
          </p>

          <p style={{ marginTop: 28 }}>
            Dúvidas sobre privacidade? Fale comigo em{' '}
            <a href={`mailto:${CONFIG.email}`}>{CONFIG.email}</a>.
          </p>
        </div>
      </div>
    </main>
  )
}
