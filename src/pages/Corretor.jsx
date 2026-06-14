import { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react'
import { gerarComIA } from '../useFerramentaIA'
import { Link } from 'react-router-dom'
import { useSEO } from '../useSEO'
import { getCorretor, salvarCorretor, sairCorretor } from '../corretor'
import { registrarLead } from '../engajamento'
import { CalcComissao, CalcACM, FichaAvaliacao } from './Ferramentas'
import FerramentaRotina from '../components/FerramentaRotina'
import { IconShield, IconArrow } from '../components/icons'

const MelhorarFotos = lazy(() => import('../components/MelhorarFotos'))
const PostGen = lazy(() => import('../components/PostGen'))
const RemoverMarca = lazy(() => import('../components/RemoverMarca'))

const soNum = (s) => String(s || '').replace(/\D/g, '')
const mascaraFone = (s) => {
  const d = soNum(s).slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}
const fmtData = (ts) => new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const ICN = {
  chat: 'M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2zM8 9h8M8 13h5',
  percent: 'M19 5 5 19M7.5 7.5h.01M16.5 16.5h.01M6 7.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0M15 16.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0',
  chart: 'M4 20V4M4 20h16M8 20v-7M13 20V9M18 20v-4',
  edit: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z',
  camera: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  megafone: 'M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1zM15 8a5 5 0 0 1 0 8M18 5a9 9 0 0 1 0 14',
  varinha: 'M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M12.2 6.2 11 5M14 22l-4-4L20 8l4 4-10 10z',
  swap: 'M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7',
  foguete: 'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2zM9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5',
  painel: 'M3 3h18v18H3zM3 9h18M9 21V9',
  doc: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  list: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2m-6 9 2 2 4-4',
  msg: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.97-4.03 9-9 9a9.86 9.86 0 0 1-4.29-.97L3 21l1.97-4.71A8.96 8.96 0 0 1 3 12C3 7.03 7.03 3 12 3s9 4.03 9 9z',
  video: 'M23 7 16 12 23 17zM1 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
  calc: 'M4 7h4M4 12h4M4 17h4M14 7h6M14 12h6M14 17h6',
  clock: 'M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zM12 6v6l4 2',
}
const Ico = ({ name, size = 22 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICN[name]} /></svg>
)

// ─── ferramentas ────────────────────────────────────────────────────────────
const TOOLS = [
  { id: 'rotina',   nome: 'Abordagem por código',    desc: 'Mensagem de 1º contato com gatilhos e benefícios da região.',                 icon: 'chat',    dor: 'Cada hora sem resposta é um lead que o concorrente está capturando. Com o código de abordagem, você envia em 30 segundos uma mensagem personalizada para o bairro e o perfil do cliente — enquanto ele ainda está com o imóvel na cabeça.' },
  { id: 'legenda',  nome: 'Legenda para portais',    desc: 'Gera descrição profissional para OLX, ZAP e VivaReal em segundos.',           icon: 'doc',     dor: 'Você gasta quanto tempo descrevendo o mesmo imóvel em três portais? Aqui você gera uma legenda completa e profissional em segundos — e adapta para cada portal sem digitar nada de novo.' },
  { id: 'objecoes', nome: 'Script de objeções',      desc: 'Respostas prontas para as objeções mais comuns no WhatsApp.',                 icon: 'msg',     dor: '"Vou pensar." "Tá caro." "Não é a hora." Essas frases travam a maioria dos corretores. O script dá a você a resposta certa, no tom certo, para cada objeção — sem parecer forçado e sem perder o cliente.' },
  { id: 'captacao', nome: 'Checklist de captação',   desc: 'Lista completa do que verificar na captação de um novo imóvel.',              icon: 'list',    dor: 'Já perdeu uma captação porque chegou sem as perguntas certas ou esqueceu de verificar a documentação? O checklist garante que você não deixa nenhum detalhe de lado — e demonstra profissionalismo desde a primeira visita.' },
  { id: 'fotos',    nome: 'Estúdio de fotos',        desc: 'Endireitar, filtros, super-resolução com IA e sem marca.',                   icon: 'camera',  dor: 'Foto torta ou escura mata o anúncio antes de o cliente clicar. Com IA, você endireita, melhora o contraste e aumenta a resolução direto no navegador — sem Photoshop, sem precisar enviar para edição.' },
  { id: 'post',     nome: 'Estúdio de publicidade',  desc: 'Posts para Story e Feed com 5 estilos de design, em lote.',                  icon: 'megafone', dor: 'Fazer um post profissional para Instagram leva horas se feito manualmente. A ferramenta gera posts para Story e Feed em 5 estilos diferentes, em lote, em menos de 1 minuto — você fica ativo nas redes sem abrir o Canva.' },
  { id: 'roteiro',  nome: 'Roteiro de vídeo',        desc: 'Gera roteiro completo para gravar o vídeo do imóvel de forma profissional.', icon: 'video',   dor: 'Vídeo amador espanta comprador. Um roteiro profissional guia você pelos cômodos na ordem certa, destaca os pontos fortes do imóvel e termina com um CTA que converte — sem improviso, sem editar depois.' },
  { id: 'marca',    nome: 'Remover marcas das fotos', desc: 'Remove logotipos e marcas com IA, direto no navegador.',                    icon: 'varinha', dor: 'Recebeu uma boa foto do imóvel que veio com o logo da imobiliária concorrente? Com IA, a marca sai em segundos — foto limpa, pronta para usar nos seus anúncios sem precisar tirar foto nova.' },
  { id: 'comissao', nome: 'Calculadora de comissão', desc: 'Comissão, repasse e líquido de uma venda.',                                  icon: 'percent', dor: 'Saber exatamente quanto você vai receber antes de fechar muda a negociação. Calcule comissão total, repasse para a imobiliária e seu líquido em segundos — sem improvisação na hora de assinar.' },
  { id: 'acm',      nome: 'Análise de mercado (ACM)', desc: 'Sugere o preço pelo m² do bairro com base nos imóveis do catálogo.',       icon: 'chart',   dor: 'Proprietário acha que o imóvel vale mais do que o mercado paga? Com a ACM, você apresenta o preço baseado no m² real do bairro — dado concreto, com fonte, sem discussão subjetiva.' },
  { id: 'ficha',    nome: 'Ficha de avaliação',      desc: 'Resumo formatado do imóvel para enviar ao cliente.',                         icon: 'edit',    dor: 'Passar as informações do imóvel via WhatsApp em texto corrido parece amador. A ficha gera um resumo profissional formatado, pronto para enviar ao cliente em segundos — você chega na frente.' },
  { id: 'agenda',   nome: 'Planner de visitas',      desc: 'Organize sua agenda de visitas do dia com horários e observações.',           icon: 'clock',   dor: 'Confusão de horário é uma das maiores causas de cancelamento de visita. O planner organiza seu dia com horários, endereços e observações de cada cliente — você vai a cada visita preparado e no horário.' },
]
const ATALHOS = [
  { to: '/ferramentas/converter', nome: 'Conversor de fotos',  desc: 'JPG, PNG, WebP e AVIF em lote.',              icon: 'swap'    },
  { to: '/impulsionar',           nome: 'Impulsionar anúncio', desc: 'Destaque pago para o seu imóvel nos buscadores.', icon: 'foguete' },
]

// ─── componentes internos ────────────────────────────────────────────────────

function LegendaPortais() {
  const [f, setF] = useState({ tipo: 'Apartamento', quartos: '', suites: '', vagas: '', area: '', bairro: '', preco: '', diferenciais: '', disponivel: '' })
  const [texto, setTexto] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [gerando, setGerando] = useState(false)
  const set = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }))
  const [codImovel, setCodImovel] = useState('')
  const [buscandoCod, setBuscandoCod] = useState(false)
  const [codMsg, setCodMsg] = useState('')

  const buscarCod = useCallback(async () => {
    const cod = codImovel.trim().replace(/\D/g, '')
    if (!cod) return
    setBuscandoCod(true); setCodMsg('')
    try {
      const r = await fetch(`/api/rotina-imovel?codigo=${cod}`)
      const j = await r.json()
      if (!r.ok || j.erro) { setCodMsg('⚠ ' + (j.erro || 'Imóvel não encontrado.')); setBuscandoCod(false); return }
      const im = j.imovel
      const TIPOS = ['Apartamento','Casa','Sobrado','Cobertura','Lote','Sala comercial','Galpão','Chácara']
      const tipoNorm = TIPOS.find(t => t.toLowerCase() === (im.tipo || '').toLowerCase()) || im.tipo
      setF(prev => ({
        ...prev,
        ...(tipoNorm && { tipo: tipoNorm }),
        ...(im.bairro && { bairro: im.bairro }),
        ...(im.areaNum && { area: String(Math.round(im.areaNum)) }),
        ...(im.valorNum && { preco: im.valorNum.toLocaleString('pt-BR') }),
        ...(im.quartos && { quartos: String(im.quartos) }),
        ...(im.suites && { suites: String(im.suites) }),
        ...(im.vagas && { vagas: String(im.vagas) }),
        ...(im.amenidades?.length && { diferenciais: im.amenidades.join('\n') }),
      }))
      setCodMsg(`✓ Imóvel ${im.codigo} — ${im.tipo} no ${im.bairro}. Edite se precisar.`)
    } catch { setCodMsg('⚠ Falha de conexão.') }
    setBuscandoCod(false)
  }, [codImovel])

  const gerarEstatico = useCallback(() => {
    const { tipo, quartos, suites, vagas, area, bairro, preco, diferenciais, disponivel } = f
    const linhas = []
    linhas.push(`🏠 ${tipo}${bairro ? ' no ' + bairro : ''} — oportunidade imperdível!`)
    linhas.push('')
    if (quartos) linhas.push(`🛏 ${quartos} quarto${quartos > 1 ? 's' : ''}${suites ? ` (${suites} suíte${suites > 1 ? 's' : ''})` : ''}`)
    if (vagas) linhas.push(`🚗 ${vagas} vaga${vagas > 1 ? 's' : ''} de garagem`)
    if (area) linhas.push(`📐 ${area} m² de área`)
    if (bairro) linhas.push(`📍 ${bairro} — Uberlândia/MG`)
    if (preco) linhas.push(`💰 R$ ${preco}`)
    if (diferenciais) {
      linhas.push('')
      linhas.push('✅ Diferenciais:')
      diferenciais.split('\n').filter(Boolean).forEach(d => linhas.push(`• ${d.trim()}`))
    }
    linhas.push('')
    linhas.push('📲 Quer saber mais? Me chama no WhatsApp!')
    if (disponivel) linhas.push(`📅 Disponível a partir de: ${disponivel}`)
    setTexto(linhas.join('\n'))
    setCopiado(false)
  }, [f])

  const gerar = () => {
    setTexto('')
    setCopiado(false)
    setGerando(true)
    gerarComIA(
      'legenda',
      f,
      (delta) => setTexto(t => t + delta),
      () => setGerando(false),
      (err) => {
        if (err === '__sem_chave__') { gerarEstatico() }
        else { setGerando(false); alert('Erro: ' + err) }
      }
    )
  }

  const copiar = () => {
    navigator.clipboard.writeText(texto).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000) })
  }

  return (
    <div className="corr-ferr">
      <div className="corr-ferr-cod">
        <span className="corr-ferr-cod-label">Código do imóvel <em>(opcional — preenche automaticamente)</em></span>
        <div className="corr-ferr-cod-row">
          <input value={codImovel} onChange={e => setCodImovel(e.target.value)} onKeyDown={e => e.key === 'Enter' && buscarCod()} placeholder="Ex: 1601" inputMode="numeric" />
          <button type="button" className="btn btn-ghost" onClick={buscarCod} disabled={buscandoCod}>{buscandoCod ? 'Buscando…' : 'Buscar'}</button>
        </div>
        {codMsg && <p className={`corr-ferr-cod-msg${codMsg.startsWith('✓') ? ' ok' : ''}`}>{codMsg}</p>}
      </div>
      <div className="corr-ferr-grade">
        <label><span>Tipo de imóvel</span>
          <select value={f.tipo} onChange={set('tipo')}>
            {['Apartamento','Casa','Sobrado','Cobertura','Lote','Sala comercial','Galpão','Chácara'].map(t => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label><span>Bairro</span><input value={f.bairro} onChange={set('bairro')} placeholder="Tabajaras" /></label>
        <label><span>Área (m²)</span><input type="number" value={f.area} onChange={set('area')} placeholder="120" /></label>
        <label><span>Preço (ex: 550.000,00)</span><input value={f.preco} onChange={set('preco')} placeholder="550.000,00" /></label>
        <label><span>Quartos</span><input type="number" value={f.quartos} onChange={set('quartos')} placeholder="3" /></label>
        <label><span>Suítes</span><input type="number" value={f.suites} onChange={set('suites')} placeholder="1" /></label>
        <label><span>Vagas</span><input type="number" value={f.vagas} onChange={set('vagas')} placeholder="2" /></label>
        <label><span>Disponível a partir de</span><input value={f.disponivel} onChange={set('disponivel')} placeholder="Imediata" /></label>
      </div>
      <label><span>Diferenciais (um por linha)</span><textarea rows={3} value={f.diferenciais} onChange={set('diferenciais')} placeholder="Varanda gourmet&#10;Piscina&#10;Academia no condomínio" /></label>
      <button className="btn btn-gold" style={{ marginTop: 10 }} onClick={gerar} disabled={gerando}>
        {gerando ? 'Gerando com IA…' : 'Gerar legenda'}
      </button>
      {texto && (
        <div className="corr-ferr-resultado">
          <pre>{texto}</pre>
          {!gerando && <button className="btn btn-ghost" onClick={copiar}>{copiado ? '✓ Copiado!' : 'Copiar texto'}</button>}
        </div>
      )}
    </div>
  )
}

function ScriptObjecoes() {
  const [aberto, setAberto] = useState(null)
  const [copiado, setCopiado] = useState(null)
  const [objecaoCustom, setObjecaoCustom] = useState('')
  const [respostaIA, setRespostaIA] = useState('')
  const [gerando, setGerando] = useState(false)
  const [copiadoIA, setCopiadoIA] = useState(false)

  const copiar = (idx, txt) => {
    navigator.clipboard.writeText(txt).then(() => { setCopiado(idx); setTimeout(() => setCopiado(null), 2000) })
  }

  const gerarResposta = () => {
    if (!objecaoCustom.trim() || gerando) return
    setRespostaIA('')
    setGerando(true)
    gerarComIA(
      'objecoes',
      { objecao: objecaoCustom.trim() },
      (delta) => setRespostaIA(t => t + delta),
      () => setGerando(false),
      () => setGerando(false)
    )
  }

  const OBJECOES = [
    {
      objecao: '"Tá caro, achei mais barato em outro lugar."',
      resposta: 'Entendo! Mas o preço de anúncio não é o preço real, né? Condomínio, IPTU, taxa de cartório e ITBI entram no custo total. Posso montar a conta cheia dos dois pra você comparar de verdade. Faz sentido?',
    },
    {
      objecao: '"Vou pensar e te dou um retorno."',
      resposta: 'Claro, sem pressão! Me ajuda só a entender o que travou — é o valor, o bairro, a parte do financiamento ou outra coisa? Pergunto porque às vezes é uma dúvida que resolve em 5 minutos e não precisa esperar.',
    },
    {
      objecao: '"Não fui aprovado no financiamento."',
      resposta: 'Isso é mais comum do que parece e quase sempre tem solução. Me conta o motivo que te informaram — renda, score ou restrição? A gente trabalha com vários bancos e dependendo do caso tem caminho alternativo.',
    },
    {
      objecao: '"Prefiro alugar do que comprar agora."',
      resposta: 'Faz sentido dependendo do momento. Mas posso te mostrar uma simulação rápida: qual seria sua parcela de financiamento vs. o aluguel que você pagaria no mesmo imóvel. Muita gente se surpreende com a diferença.',
    },
    {
      objecao: '"Você é novo, não tem experiência."',
      resposta: 'Verdade, estou em formação — e isso significa que você tem atenção total de alguém que quer mostrar resultado. E tenho o suporte completo de uma equipe com mais de 30 anos no mercado de Uberlândia. Melhor dos dois mundos.',
    },
    {
      objecao: '"Vou ver com outro corretor também."',
      resposta: 'Ótimo, comparar é sempre inteligente. Só lembra que tenho acesso ao mesmo catálogo que os outros corretores daqui. Se quiser, te mando uma lista com as opções que mais combinam com o seu perfil e você compara direto.',
    },
    {
      objecao: '"Não tenho entrada."',
      resposta: 'Vamos ver o que você tem disponível de FGTS — muita gente tem mais do que imagina parado lá. E dependendo do imóvel, o Minha Casa Minha Vida financia com entrada reduzida. Quanto você tem no FGTS aproximadamente?',
    },
    {
      objecao: '"O imóvel não tem o que preciso."',
      resposta: 'Me conta o que tava faltando — um cômodo, localização, tamanho? Com isso na mão consigo filtrar o catálogo e te mandar 3 opções que batem com exatamente o que você quer. Tem algum inegociável pra você?',
    },
  ]

  return (
    <div className="corr-ferr">
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px', marginBottom: 20 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>🤖 IA — responda qualquer objeção</div>
        <textarea
          rows={3}
          value={objecaoCustom}
          onChange={e => setObjecaoCustom(e.target.value)}
          placeholder={`Digite a objeção do cliente...\nEx.: "Vou pensar e te dou um retorno quando decidir."`}
          style={{ marginBottom: 8 }}
        />
        <button className="btn btn-gold" onClick={gerarResposta} disabled={gerando || !objecaoCustom.trim()} style={{ fontSize: '0.88rem' }}>
          {gerando ? 'Gerando…' : '✨ Gerar resposta com IA'}
        </button>
        {respostaIA && (
          <div className="corr-ferr-resultado" style={{ marginTop: 12 }}>
            <pre>{respostaIA}</pre>
            {!gerando && (
              <button className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '6px 14px' }} onClick={() => { navigator.clipboard.writeText(respostaIA).then(() => { setCopiadoIA(true); setTimeout(() => setCopiadoIA(false), 2000) }) }}>
                {copiadoIA ? '✓ Copiado!' : 'Copiar resposta'}
              </button>
            )}
          </div>
        )}
      </div>
      <p style={{ fontSize: '0.88rem', color: 'var(--text-soft)', marginBottom: 16 }}>Ou clique em uma objeção comum abaixo para ver a resposta e copiar.</p>
      <div className="corr-objecoes">
        {OBJECOES.map((o, i) => (
          <div key={i} className={`corr-objcard ${aberto === i ? 'corr-objcard--open' : ''}`}>
            <button className="corr-objcard-q" onClick={() => setAberto(aberto === i ? null : i)}>
              <span>{o.objecao}</span>
              <span className="corr-objcard-arr">{aberto === i ? '↑' : '↓'}</span>
            </button>
            {aberto === i && (
              <div className="corr-objcard-r">
                <p>{o.resposta}</p>
                <button className="btn btn-ghost" style={{ marginTop: 8, fontSize: '0.8rem', padding: '6px 14px' }} onClick={() => copiar(i, o.resposta)}>
                  {copiado === i ? '✓ Copiado!' : 'Copiar resposta'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ChecklistCaptacao() {
  const GRUPOS = [
    { titulo: 'Documentação', itens: ['RG/CPF do proprietário', 'Escritura ou contrato de compra', 'Certidão de matrícula atualizada (< 30 dias)', 'IPTU do ano corrente', 'Habite-se (construções novas)', 'Declaração de inexistência de débitos condominiais', 'Procuração (se representado)'] },
    { titulo: 'Vistoria do imóvel', itens: ['Metragem real conferida', 'Infiltrações/umidade nas paredes', 'Estado elétrico (quadro de energia)', 'Estado hidráulico (pressão, vedações)', 'Estrutura do telhado/laje', 'Janelas e portas em bom estado', 'Instalação de gás verificada', 'Ventilação e iluminação natural'] },
    { titulo: 'Fotos e material', itens: ['Mínimo de 15 fotos de qualidade', 'Foto da fachada com boa luz', 'Todos os cômodos fotografados', 'Área externa/garagem/varanda', 'Área de lazer do condomínio', 'Vista do andar (se apartamento)', 'Vídeo de tour completo (opcional)'] },
    { titulo: 'Dados para anúncio', itens: ['Endereço completo e CEP', 'Valor solicitado e margem de negociação', 'Condomínio e IPTU mensais', 'Aceita financiamento?', 'Aceita FGTS?', 'Aceita permuta?', 'Prazo para desocupação', 'Mobília inclusa (o quê?)'] },
  ]

  const [checks, setChecks] = useState({})
  const toggle = (key) => setChecks(p => ({ ...p, [key]: !p[key] }))
  const total = GRUPOS.flatMap(g => g.itens).length
  const feitos = Object.values(checks).filter(Boolean).length

  return (
    <div className="corr-ferr">
      <div className="corr-check-prog">
        <div className="corr-check-barra"><div style={{ width: `${(feitos / total) * 100}%` }} /></div>
        <span>{feitos} de {total} itens verificados</span>
        {feitos === total && <span className="corr-check-ok">✓ Captação completa!</span>}
      </div>
      {GRUPOS.map((g, gi) => (
        <div key={gi} className="corr-check-grupo">
          <h5>{g.titulo}</h5>
          <ul>
            {g.itens.map((item, ii) => {
              const key = `${gi}-${ii}`
              return (
                <li key={key} className={checks[key] ? 'checked' : ''} onClick={() => toggle(key)}>
                  <span className="corr-check-box">{checks[key] ? '✓' : ''}</span>
                  {item}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
      <button className="btn btn-ghost" style={{ marginTop: 12, fontSize: '0.8rem' }} onClick={() => setChecks({})}>Limpar checklist</button>
    </div>
  )
}

function RoteirVideo() {
  const [f, setF] = useState({ tipo: 'Apartamento', quartos: '', area: '', bairro: '', destaque: '', publico: 'Família' })
  const [roteiro, setRoteiro] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [gerando, setGerando] = useState(false)
  const set = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }))

  const gerarEstatico = useCallback(() => {
    const { tipo, quartos, area, bairro, destaque, publico } = f
    const desc = `${tipo}${quartos ? ' com ' + quartos + ' quartos' : ''}${area ? ' de ' + area + ' m²' : ''}${bairro ? ' no ' + bairro : ''}`
    setRoteiro(`🎬 ROTEIRO DE VÍDEO — ${desc.toUpperCase()}

▶ ABERTURA (0:00–0:10)
Câmera na fachada. Fala:
"Oi! Aqui é o [seu nome], e hoje vou te mostrar um ${tipo.toLowerCase()} incrível${bairro ? ' no ' + bairro : ''} que pode ser exatamente o que você está procurando${publico === 'Investidor' ? ' pra investir' : publico === 'Família' ? ' pra morar com a família' : ''}. Vem comigo!"

▶ ENTRADA (0:10–0:25)
Mostrar corredor/hall de entrada.
"Olha que entrada bem pensada — já dá pra sentir a qualidade do imóvel desde aqui."

▶ SALA (0:25–0:50)
Panorâmica lenta da sala.
"Aqui é a sala de estar${area ? ' — ' + area + ' m² no total' : ''}. Repara no espaço, na iluminação natural... perfeito para ${publico === 'Família' ? 'reunir a família' : 'receber clientes ou alugar'}."

▶ COZINHA (0:50–1:10)
Câmera passando pela cozinha.
"A cozinha é bem funcional — [descreva o que viu: armários, bancada, área de serviço integrada etc.]."

▶ QUARTOS (1:10–1:45)
${quartos ? 'Mostrar cada quarto.' : 'Mostrar os ambientes.'}
"${quartos ? `São ${quartos} quartos — ` : ''}[comentar sobre tamanho, armários embutidos, ventilação]."

▶ ÁREA EXTERNA / GARAGEM / LAZER (1:45–2:10)
"Olha que diferencial: [citar área de lazer, garagem, varanda, vista]."

▶ DESTAQUE PRINCIPAL (2:10–2:25)
${destaque ? `"Mas o que realmente se destaca aqui é ${destaque}. Isso é raro de encontrar no bairro."` : '"[Cite o maior diferencial do imóvel aqui.]"'}

▶ FECHAMENTO (2:25–2:40)
"Se você se interessou, me chama no WhatsApp — o link tá aqui embaixo. Atendo você pessoalmente e agendo a visita. Te vejo em breve!"

💡 DICAS DE GRAVAÇÃO:
• Use luz natural — grave entre 9h e 15h
• Câmera no modo paisagem (horizontal)
• Caminhe devagar e com movimentos suaves
• Grave cada cômodo 3x e use a melhor tomada
• Fundo musical leve (sem direitos autorais)`)
    setCopiado(false)
  }, [f])

  const gerar = () => {
    setRoteiro('')
    setCopiado(false)
    setGerando(true)
    gerarComIA(
      'roteiro',
      f,
      (delta) => setRoteiro(t => t + delta),
      () => setGerando(false),
      (err) => {
        if (err === '__sem_chave__') { gerarEstatico() }
        else { setGerando(false); alert('Erro: ' + err) }
      }
    )
  }

  const copiar = () => {
    navigator.clipboard.writeText(roteiro).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000) })
  }

  return (
    <div className="corr-ferr">
      <div className="corr-ferr-grade">
        <label><span>Tipo de imóvel</span>
          <select value={f.tipo} onChange={set('tipo')}>
            {['Apartamento','Casa','Sobrado','Cobertura','Lote','Sala comercial'].map(t => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label><span>Público-alvo</span>
          <select value={f.publico} onChange={set('publico')}>
            {['Família','Casal sem filhos','Investidor','Primeiro imóvel','Idosos'].map(t => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label><span>Quartos</span><input type="number" value={f.quartos} onChange={set('quartos')} placeholder="3" /></label>
        <label><span>Área (m²)</span><input type="number" value={f.area} onChange={set('area')} placeholder="120" /></label>
        <label><span>Bairro</span><input value={f.bairro} onChange={set('bairro')} placeholder="Tabajaras" /></label>
      </div>
      <label><span>Principal diferencial (será destacado no vídeo)</span><input value={f.destaque} onChange={set('destaque')} placeholder="varanda gourmet com churrasqueira" /></label>
      <button className="btn btn-gold" style={{ marginTop: 10 }} onClick={gerar} disabled={gerando}>
        {gerando ? 'Gerando com IA…' : 'Gerar roteiro'}
      </button>
      {roteiro && (
        <div className="corr-ferr-resultado">
          <pre>{roteiro}</pre>
          {!gerando && <button className="btn btn-ghost" onClick={copiar}>{copiado ? '✓ Copiado!' : 'Copiar roteiro'}</button>}
        </div>
      )}
    </div>
  )
}

function PlannerAgenda() {
  const [visitas, setVisitas] = useState([{ hora: '', imovel: '', cliente: '', obs: '', feita: false }])
  const addVisita = () => setVisitas(p => [...p, { hora: '', imovel: '', cliente: '', obs: '', feita: false }])
  const rem = (i) => setVisitas(p => p.filter((_, j) => j !== i))
  const upd = (i, k, v) => setVisitas(p => p.map((v2, j) => j === i ? { ...v2, [k]: v } : v2))
  const feitas = visitas.filter(v => v.feita).length

  return (
    <div className="corr-ferr">
      <div className="corr-agenda-header">
        <span className="corr-agenda-prog">{feitas}/{visitas.length} visitas concluídas</span>
        <button className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '6px 14px' }} onClick={addVisita}>+ Adicionar visita</button>
      </div>
      <div className="corr-agenda-lista">
        {visitas.map((v, i) => (
          <div key={i} className={`corr-agenda-item ${v.feita ? 'corr-agenda-item--feita' : ''}`}>
            <button className="corr-agenda-check" onClick={() => upd(i, 'feita', !v.feita)}>{v.feita ? '✓' : ''}</button>
            <div className="corr-agenda-campos">
              <input value={v.hora} onChange={e => upd(i, 'hora', e.target.value)} placeholder="09:00" style={{ width: 70 }} />
              <input value={v.imovel} onChange={e => upd(i, 'imovel', e.target.value)} placeholder="Imóvel (cód. ou endereço)" style={{ flex: 2 }} />
              <input value={v.cliente} onChange={e => upd(i, 'cliente', e.target.value)} placeholder="Cliente" style={{ flex: 1 }} />
              <input value={v.obs} onChange={e => upd(i, 'obs', e.target.value)} placeholder="Obs." style={{ flex: 1 }} />
            </div>
            <button className="corr-agenda-rem" onClick={() => rem(i)} title="Remover">×</button>
          </div>
        ))}
      </div>
    </div>
  )
}

const RENDER = {
  rotina: FerramentaRotina,
  comissao: CalcComissao,
  acm: CalcACM,
  ficha: FichaAvaliacao,
  fotos: MelhorarFotos,
  post: PostGen,
  marca: RemoverMarca,
  legenda: LegendaPortais,
  objecoes: ScriptObjecoes,
  captacao: ChecklistCaptacao,
  roteiro: RoteirVideo,
  agenda: PlannerAgenda,
}

// ─── gate de acesso ──────────────────────────────────────────────────────────

const PLANOS = [
  {
    id: 'mensal',
    periodo: 'Mensal',
    preco: 'R$ 150',
    sub: '/mês',
    porDia: 'R$ 5/dia',
    detalhe: 'Acesso completo por 30 dias',
    popular: true,
    economia: '★ Melhor custo-benefício · 30% mais barato que semanal',
    beneficios: ['Todas as ferramentas liberadas', 'IA sem limite de uso', 'Renovação automática opcional'],
  },
  {
    id: 'semanal',
    periodo: 'Semanal',
    preco: 'R$ 49,90',
    sub: '/semana',
    porDia: 'R$ 7,13/dia',
    detalhe: 'Acesso completo por 7 dias',
    popular: false,
    economia: 'Sem compromisso',
    beneficios: ['Todas as ferramentas liberadas', 'Ideal para testar o fluxo', 'Renove quando quiser'],
  },
]

function GateCorretor({ onOk }) {
  const [aba, setAba] = useState('teste')
  const [fTeste, setFTeste] = useState({ nome: '', fone: '' })
  const [fAcesso, setFAcesso] = useState({ nome: '', fone: '', creci: '', email: '', codigo: '' })
  const [fCheckout, setFCheckout] = useState({ nome: '', fone: '', email: '', creci: '' })
  const [planoSel, setPlanoSel] = useState('mensal')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [trialOk, setTrialOk] = useState(null)
  const [ativandoMP, setAtivandoMP] = useState(false)
  const [codigoAtivado, setCodigoAtivado] = useState(null) // { codigo, expiresAt, nome, plano }
  const [hoverTool, setHoverTool] = useState(null)

  const setT = (k) => (e) => setFTeste(p => ({ ...p, [k]: k === 'fone' ? mascaraFone(e.target.value) : e.target.value }))
  const setA = (k) => (e) => setFAcesso(p => ({ ...p, [k]: k === 'fone' ? mascaraFone(e.target.value) : e.target.value }))
  const setC = (k) => (e) => setFCheckout(p => ({ ...p, [k]: k === 'fone' ? mascaraFone(e.target.value) : e.target.value }))

  // Detecta retorno do Mercado Pago
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const payId = sp.get('payment_id')
    const extRef = sp.get('external_reference')
    const status = sp.get('status')
    const pgPendente = sp.get('pg_pendente')
    const pgFalha = sp.get('pg_falha')
    window.history.replaceState({}, '', '/corretor')
    if (pgFalha) {
      setAba('assinar')
      setErro(<>Pagamento não concluído. Tente novamente ou <a href="https://wa.me/5534991570494?text=Ol%C3%A1%21+Tive+problema+no+pagamento+da+%C3%81rea+do+Corretor." target="_blank" rel="noreferrer" className="corr-erro-link">fale pelo WhatsApp</a>.</>)
      return
    }
    if (pgPendente) {
      setErro('Seu pagamento está em análise (PIX ou boleto). Assim que confirmado, o código de acesso chega automaticamente. Se já pagou e está aguardando, volte em alguns minutos.')
      return
    }
    if (payId && extRef && status === 'approved') {
      setAtivandoMP(true)
      fetch('/api/corretor-ativar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ payment_id: payId, external_reference: extRef }),
      })
        .then(r => r.json())
        .then(res => {
          if (res.ok) {
            setCodigoAtivado(res)
            salvarCorretor({ nome: res.nome || '', creci: '', rotina: true, fone: '', email: '' })
          } else {
            setErro(res.erro || 'Pagamento aprovado, mas não foi possível gerar o código. Entre em contato pelo WhatsApp com o ID: ' + payId)
            setAtivandoMP(false)
          }
        })
        .catch(() => { setErro('Falha ao ativar após pagamento. Guarde seu Payment ID: ' + payId + ' e entre em contato.'); setAtivandoMP(false) })
    }
  }, [])

  const ativarTeste = async (e) => {
    e.preventDefault()
    const nome = fTeste.nome.trim()
    if (nome.length < 3) { setErro('Informe seu nome completo.'); return }
    if (soNum(fTeste.fone).length < 10) { setErro('WhatsApp inválido.'); return }
    setErro(''); setEnviando(true)
    try {
      const r = await fetch('/api/corretor-trial', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nome, fone: soNum(fTeste.fone) }) })
      const res = await r.json()
      if (res.expirado) { setErro('Seu período de teste de 24h já foi utilizado. Assine um plano para continuar.'); setEnviando(false); setAba('acesso'); return }
      if (!res.ok) { setErro(res.erro || 'Não foi possível ativar o teste. Tente novamente.'); setEnviando(false); return }
      // Auto-login com o código gerado
      const r2 = await fetch('/api/corretor-acesso', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ codigo: res.codigo }) })
      const res2 = await r2.json()
      if (res2.ok) {
        const c = salvarCorretor({ nome, creci: '', rotina: true, fone: soNum(fTeste.fone), email: '', expiresAt: res.expiresAt, tipo: 'trial' })
        setTrialOk({ codigo: res.codigo, expiresAt: res.expiresAt, ativo: res.ativo })
        setTimeout(() => onOk(c), 1800)
      } else {
        setErro('Erro ao ativar. Tente novamente.')
      }
    } catch { setErro('Falha de conexão.') }
    setEnviando(false)
  }

  const entrarComCodigo = async (e) => {
    e.preventDefault()
    const nome = fAcesso.nome.trim()
    if (nome.length < 3) { setErro('Informe seu nome.'); return }
    if (soNum(fAcesso.fone).length < 10) { setErro('WhatsApp inválido.'); return }
    if (!fAcesso.codigo.trim()) { setErro('Digite o código de acesso.'); return }
    setErro(''); setEnviando(true)
    try {
      const r = await fetch('/api/corretor-acesso', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ codigo: fAcesso.codigo.trim() }) })
      const res = await r.json()
      if (res.expirado) { setErro('Seu código expirou. Renove sua assinatura para continuar.'); setEnviando(false); return }
      if (!res.ok) { setErro('Código inválido. Verifique o código recebido.'); setEnviando(false); return }
      const c = salvarCorretor({ nome, creci: fAcesso.creci.trim(), rotina: true, fone: soNum(fAcesso.fone), email: fAcesso.email.trim() })
      try { registrarLead({ cod: 'corretor-pro', nome, fone: soNum(fAcesso.fone), email: fAcesso.email.trim(), bairro: `Corretor Pro${fAcesso.creci ? ' · CRECI ' + fAcesso.creci : ''}` }) } catch {}
      onOk(c)
    } catch { setErro('Falha de conexão.') }
    setEnviando(false)
  }

  const irParaCheckout = async (e) => {
    e.preventDefault()
    const nome = fCheckout.nome.trim()
    if (nome.length < 3) { setErro('Informe seu nome completo.'); return }
    if (soNum(fCheckout.fone).length < 10) { setErro('WhatsApp inválido.'); return }
    setErro(''); setEnviando(true)
    try {
      const r = await fetch('/api/corretor-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nome, fone: soNum(fCheckout.fone), email: fCheckout.email.trim(), creci: fCheckout.creci.trim(), plano: planoSel }),
      })
      const res = await r.json()
      if (!res.ok) { setErro(res.erro || 'Não foi possível criar o pagamento.'); setEnviando(false); return }
      window.location.href = res.url
    } catch { setErro('Falha de conexão. Tente novamente.') }
    setEnviando(false)
  }

  if (ativandoMP) {
    return (
      <div className="corr-gate-wrap">
        <div className="corr-trial-ok">
          <div className="corr-trial-ok-ico" style={{ fontSize: '1.2rem' }}>⏳</div>
          <h2>Ativando seu acesso…</h2>
          <p>Verificando o pagamento no Mercado Pago. Aguarde um momento.</p>
        </div>
      </div>
    )
  }

  if (codigoAtivado) {
    const planoNome = codigoAtivado.plano === 'semanal' ? 'Semanal (7 dias)' : codigoAtivado.plano === 'mensal' ? 'Mensal (30 dias)' : codigoAtivado.plano
    return (
      <div className="corr-gate-wrap">
        <div className="corr-trial-ok">
          <div className="corr-trial-ok-ico">✓</div>
          <h2>Pagamento aprovado!</h2>
          <p>Seu código de acesso foi gerado. Guarde-o em local seguro — ele libera todas as ferramentas pelo período contratado.</p>
          <div className="corr-codigo-box">
            <span className="corr-codigo-label">Seu código de acesso</span>
            <strong className="corr-codigo-val">{codigoAtivado.codigo}</strong>
            <span className="corr-codigo-plano">{planoNome}</span>
            {codigoAtivado.expiresAt && <span className="corr-trial-expira">Válido até {fmtData(codigoAtivado.expiresAt)}</span>}
          </div>
          <button className="btn btn-gold" style={{ marginTop: 20 }} onClick={() => onOk(getCorretor())}>
            Entrar na área agora <IconArrow />
          </button>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-mute)', marginTop: 12 }}>O código foi salvo para login rápido. Na próxima vez, use-o na aba "Já tenho código".</p>
        </div>
      </div>
    )
  }

  if (trialOk) {
    return (
      <div className="corr-gate-wrap">
        <div className="corr-trial-ok">
          <div className="corr-trial-ok-ico">✓</div>
          <h2>Teste ativado com sucesso!</h2>
          <p>Você tem <b>24 horas</b> de acesso completo a todas as ferramentas.</p>
          {trialOk.expiresAt && <p className="corr-trial-expira">Acesso válido até {fmtData(trialOk.expiresAt)}</p>}
          <p className="corr-trial-entrando">Entrando na área do corretor…</p>
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="corr-trust-bar">
      <span><b>✓</b> 24h grátis</span>
      <span><b>✓</b> Sem cartão</span>
      <span><b>✓</b> Acesso imediato</span>
      <span><b>✓</b> 12 ferramentas</span>
    </div>
    <div className="corr-gate-wrap">
      <div className="corr-pitch">
        <span className="eyebrow">Ferramentas exclusivas para corretores</span>
        <h1 className="section-title">Área do <em>corretor</em></h1>
        <p className="section-sub" style={{ marginTop: 12 }}>
          Tudo que você precisa para captar, divulgar e vender mais rápido — num lugar só.
        </p>
        <ul className="corr-lista">
          {TOOLS.map((t) => (
            <li
              key={t.id}
              className={hoverTool === t.id ? 'corr-lista-li--hover' : ''}
              onMouseEnter={() => setHoverTool(t.id)}
              onMouseLeave={() => setHoverTool(null)}
            >
              <span className="corr-lista-ico"><Ico name={t.icon} size={18} /></span>
              <div>
                <b>{t.nome}</b>
                <span>{t.desc}</span>
                {hoverTool === t.id && <p className="corr-lista-dor">{t.dor}</p>}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="corr-form-area">
        {/* Planos */}
        <p style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-mute)', marginBottom: 10, marginTop: 28 }}>Escolha seu plano</p>
        <div className="corr-planos-v2">
          {PLANOS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`corr-plano-v2 ${planoSel === p.id ? 'corr-plano-v2--sel' : ''} ${p.popular ? 'corr-plano-v2--popular' : ''}`}
              onClick={() => setPlanoSel(p.id)}
            >
              {p.popular && <span className="corr-plano-badge">Mais popular</span>}
              <span className="corr-plano-v2-periodo">{p.periodo}</span>
              <span className="corr-plano-v2-preco">{p.preco}<small>{p.sub}</small></span>
              <span className="corr-plano-v2-pordia">{p.porDia}</span>
              <span className="corr-plano-v2-detalhe">{p.detalhe}</span>
              <span className="corr-plano-v2-economia">{p.economia}</span>
              <ul className="corr-plano-v2-items">
                {p.beneficios.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="corr-tabs" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
          <button className={`corr-tab ${aba === 'teste' ? 'corr-tab--ativo' : ''}`} onClick={() => { setAba('teste'); setErro('') }}>
            🎁 Testar grátis
          </button>
          <button className={`corr-tab ${aba === 'assinar' ? 'corr-tab--ativo' : ''}`} onClick={() => { setAba('assinar'); setErro('') }} style={{ borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
            Assinar plano
          </button>
          <button className={`corr-tab ${aba === 'acesso' ? 'corr-tab--ativo' : ''}`} onClick={() => { setAba('acesso'); setErro('') }}>
            Já tenho código
          </button>
        </div>

        {aba === 'teste' && (
          <form className="lead-form conta-form corr-form" onSubmit={ativarTeste}>
            <h3>Ativar teste gratuito</h3>
            <p className="conta-form-promessa">Sem cartão. Sem cobrança. Acesso total por <b>24 horas</b> — só precisamos do seu nome e WhatsApp.</p>
            <label><span>Nome completo *</span><input value={fTeste.nome} onChange={setT('nome')} required placeholder="Seu nome" /></label>
            <label><span>WhatsApp *</span><input type="tel" inputMode="tel" value={fTeste.fone} onChange={setT('fone')} required placeholder="(34) 99999-9999" /></label>
            {erro && <p className="lead-erro">{erro}</p>}
            <button type="submit" className="btn btn-gold lead-submit" disabled={enviando}>
              <IconShield width={18} height={18} /> {enviando ? 'Ativando…' : 'Ativar 24h grátis'} <IconArrow />
            </button>
            <p className="lead-note">Uma vez por número de WhatsApp. Após as 24h, escolha um plano para continuar.</p>
          </form>
        )}

        {aba === 'assinar' && (
          <form className="lead-form conta-form corr-form" onSubmit={irParaCheckout}>
            <h3>Assinar — plano {PLANOS.find(p => p.id === planoSel)?.periodo}</h3>
            <p className="conta-form-promessa">Você será redirecionado ao Mercado Pago. Após o pagamento, o código chega automaticamente.</p>
            <label><span>Nome completo *</span><input value={fCheckout.nome} onChange={setC('nome')} required placeholder="Seu nome" /></label>
            <div className="conta-form-row">
              <label><span>WhatsApp *</span><input type="tel" inputMode="tel" value={fCheckout.fone} onChange={setC('fone')} required placeholder="(34) 99999-9999" /></label>
              <label><span>CRECI <i>(se tiver)</i></span><input value={fCheckout.creci} onChange={setC('creci')} placeholder="MG-00000" /></label>
            </div>
            <label><span>E-mail <i>(para receber o código)</i></span><input type="email" value={fCheckout.email} onChange={setC('email')} placeholder="voce@email.com" /></label>
            {erro && <p className="lead-erro">{erro}</p>}
            <button type="submit" className="btn btn-gold lead-submit" disabled={enviando}>
              {enviando ? 'Redirecionando…' : `Pagar ${PLANOS.find(p => p.id === planoSel)?.preco} no Mercado Pago`} <IconArrow />
            </button>
            <p className="lead-note">Pix, cartão de crédito e boleto. Código gerado automaticamente após aprovação.</p>
          </form>
        )}

        {aba === 'acesso' && (
          <form className="lead-form conta-form corr-form" onSubmit={entrarComCodigo}>
            <h3>Entrar com código</h3>
            <p className="conta-form-promessa">Digite o código recebido após o pagamento para liberar o acesso.</p>
            <label><span>Código de acesso *</span><input value={fAcesso.codigo} onChange={setA('codigo')} placeholder="Código recebido por e-mail ou WhatsApp" autoComplete="off" required /></label>
            <label><span>Nome completo *</span><input value={fAcesso.nome} onChange={setA('nome')} required /></label>
            <div className="conta-form-row">
              <label><span>CRECI <i>(se tiver)</i></span><input value={fAcesso.creci} onChange={setA('creci')} placeholder="MG-00000" /></label>
              <label><span>WhatsApp *</span><input type="tel" inputMode="tel" value={fAcesso.fone} onChange={setA('fone')} placeholder="(34) 99999-9999" required /></label>
            </div>
            <label><span>E-mail <i>(opcional)</i></span><input type="email" value={fAcesso.email} onChange={setA('email')} placeholder="voce@email.com" /></label>
            {erro && <p className="lead-erro">{erro}</p>}
            <button type="submit" className="btn btn-gold lead-submit" disabled={enviando}>
              <IconShield width={18} height={18} /> {enviando ? 'Validando…' : 'Entrar na área'} <IconArrow />
            </button>
            <p className="lead-note">Acesso liberado conforme o cadastro. Dados protegidos.</p>
          </form>
        )}
      </div>
    </div>
    <div className="corr-como-funciona">
      <p className="corr-como-titulo">Como funciona</p>
      <div className="corr-como-steps">
        <div className="corr-como-step">
          <span className="corr-como-num">1</span>
          <b>Ative o teste grátis</b>
          <span>Só nome e WhatsApp — sem cartão, sem cobrança automática.</span>
        </div>
        <span className="corr-como-arr">→</span>
        <div className="corr-como-step">
          <span className="corr-como-num">2</span>
          <b>Explore por 24 horas</b>
          <span>Acesso completo às 12 ferramentas profissionais.</span>
        </div>
        <span className="corr-como-arr">→</span>
        <div className="corr-como-step">
          <span className="corr-como-num">3</span>
          <b>Continue se gostar</b>
          <span>Plano mensal por menos de R$ 2/dia — cancele quando quiser.</span>
        </div>
      </div>
    </div>
    </>
  )
}

// ─── hub logado ──────────────────────────────────────────────────────────────

function TrialCountdownBanner({ corretor, onAssinar }) {
  const [rem, setRem] = useState(() => {
    if (corretor.tipo !== 'trial' || !corretor.expiresAt) return null
    return corretor.expiresAt - Date.now()
  })
  useEffect(() => {
    if (!corretor.expiresAt || corretor.tipo !== 'trial') return
    const t = setInterval(() => setRem(corretor.expiresAt - Date.now()), 60000)
    return () => clearInterval(t)
  }, [corretor.expiresAt, corretor.tipo])
  if (rem === null || rem <= 0 || rem > 12 * 3600000) return null
  const h = Math.floor(rem / 3600000)
  const m = Math.floor((rem % 3600000) / 60000)
  return (
    <div className={`corr-countdown-banner${rem < 2 * 3600000 ? ' corr-countdown-urgente' : ''}`}>
      <span>⏰ Teste expira em <b>{h ? `${h}h ` : ''}{m}min</b> — assine para não perder o acesso.</span>
      <button type="button" className="corr-countdown-btn" onClick={onAssinar}>Assinar plano →</button>
    </div>
  )
}

function HubCorretor({ corretor, onSair }) {
  const [modal, setModal] = useState(null)
  const [modoGate, setModoGate] = useState(false)
  const [dragIdx, setDragIdx] = useState(null)
  const [toolOrder, setToolOrder] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('vg_corretor_tools_order') || 'null')
      if (Array.isArray(saved) && saved.length) return saved
    } catch {}
    return TOOLS.map(t => t.id)
  })
  const primeiro = (corretor.nome || '').trim().split(' ')[0]

  const orderedTools = (() => {
    const ordered = toolOrder.map(id => TOOLS.find(t => t.id === id)).filter(Boolean)
    const missing = TOOLS.filter(t => !toolOrder.includes(t.id))
    return [...ordered, ...missing]
  })()

  const onDragStart = (e, idx) => { setDragIdx(idx); e.dataTransfer.effectAllowed = 'move' }
  const onDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }
  const onDrop = (e, idx) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); return }
    const newOrder = orderedTools.map(t => t.id)
    const [moved] = newOrder.splice(dragIdx, 1)
    newOrder.splice(idx, 0, moved)
    setToolOrder(newOrder)
    try { localStorage.setItem('vg_corretor_tools_order', JSON.stringify(newOrder)) } catch {}
    setDragIdx(null)
  }
  const onDragEnd = () => setDragIdx(null)

  useEffect(() => {
    if (corretor.tipo !== 'trial' || !corretor.expiresAt) return
    const remaining = corretor.expiresAt - Date.now()
    if (remaining <= 0) { onSair(); return }
    const t = setTimeout(onSair, remaining)
    return () => clearTimeout(t)
  }, [corretor, onSair])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setModal(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (modoGate) return (
    <>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: '0.84rem', color: 'var(--text-soft)' }}>
        <span>👁 Prévia — visualizando a tela de entrada como um corretor sem acesso veria.</span>
        <button type="button" className="btn btn-ghost" onClick={() => setModoGate(false)}>← Voltar ao hub</button>
      </div>
      <GateCorretor onOk={() => setModoGate(false)} />
    </>
  )

  return (
    <>
      <header className="corr-hero">
        <div>
          <span className="eyebrow">Área do corretor · ferramentas profissionais</span>
          <h1 className="section-title">Olá, <em>{primeiro || 'corretor'}</em></h1>
          <p className="section-sub" style={{ marginTop: 8 }}>Suas ferramentas de captação, divulgação e venda — tudo num lugar só.</p>
        </div>
        <div className="corr-hero-acoes">
          {corretor.creci && <span className="corr-chip">CRECI {corretor.creci}</span>}
          {corretor.tipo === 'admin' && (
            <button className="btn btn-ghost" type="button" onClick={() => setModoGate(true)} style={{ fontSize: '0.8rem' }}>👁 Prévia da entrada</button>
          )}
          <button className="btn btn-ghost" type="button" onClick={onSair}>Sair</button>
        </div>
      </header>
      <TrialCountdownBanner corretor={corretor} onAssinar={onSair} />

      <div className="ferr-grid corr-grid">
        {orderedTools.map((t, idx) => (
          <button
            key={t.id}
            className="ferr-card"
            onClick={() => setModal(t.id)}
            draggable
            onDragStart={(e) => onDragStart(e, idx)}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, idx)}
            onDragEnd={onDragEnd}
            style={{ opacity: dragIdx === idx ? 0.4 : 1, cursor: 'grab' }}
            title="Arraste para reordenar"
          >
            <span className="ferr-ico"><Ico name={t.icon} /></span>
            <span className="ferr-txt"><b>{t.nome}</b><i>{t.desc}</i></span>
          </button>
        ))}
        {ATALHOS.map((t) => (
          <Link key={t.to} className="ferr-card" to={t.to}>
            <span className="ferr-ico"><Ico name={t.icon} /></span>
            <span className="ferr-txt"><b>{t.nome}</b><i>{t.desc}</i></span>
          </Link>
        ))}
        <Link className="ferr-card ferr-card--gold" to="/admin">
          <span className="ferr-ico"><Ico name="painel" /></span>
          <span className="ferr-txt"><b>Painel administrativo</b><i>Imóveis, leads e clientes.</i></span>
        </Link>
      </div>

      {modal && (() => {
        const t = TOOLS.find(t => t.id === modal)
        const Comp = RENDER[modal]
        if (!t || !Comp) return null
        return (
          <div className="corr-modal-overlay" onClick={() => setModal(null)}>
            <div className="corr-modal" onClick={e => e.stopPropagation()}>
              <div className="corr-modal-head">
                <span className="corr-modal-ico"><Ico name={t.icon} size={20} /></span>
                <h3 className="corr-modal-tit">{t.nome}</h3>
                <button className="corr-modal-close" type="button" onClick={() => setModal(null)}>×</button>
              </div>
              <div className="corr-modal-body">
                <Suspense fallback={<p className="section-sub" style={{ padding: '24px 0' }}>Carregando…</p>}>
                  <Comp />
                </Suspense>
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}

// ─── página ──────────────────────────────────────────────────────────────────

// Se o usuário está logado como admin, entra na área do corretor sem gate.
const getCorretorOuAdmin = () => {
  const c = getCorretor()
  if (c) return c
  try {
    const admToken = localStorage.getItem('vg_admin_token')
    if (admToken) return { nome: 'Vinícius Graton', creci: 'CRECI MG', tipo: 'admin', rotina: true, expiresAt: null }
  } catch {}
  return null
}

export default function Corretor() {
  useSEO({
    title: 'Área do corretor — Ferramentas profissionais | Rotina Imobiliária',
    description: 'Área exclusiva para corretores: abordagem por código, estúdio de fotos com IA, publicidade, legenda para portais, script de objeções, checklist de captação e mais.',
    path: '/corretor',
  })
  const [corretor, setCorretor] = useState(() => getCorretorOuAdmin())
  useEffect(() => {
    const ler = () => setCorretor(getCorretorOuAdmin())
    window.addEventListener('vg-corretor', ler)
    return () => window.removeEventListener('vg-corretor', ler)
  }, [])

  return (
    <main className="pagina section--light det corretor-pg">
      <div className="container">
        {corretor
          ? <HubCorretor corretor={corretor} onSair={() => { sairCorretor() }} />
          : <GateCorretor onOk={setCorretor} />}
      </div>
    </main>
  )
}
