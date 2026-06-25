import { useState, useEffect } from 'react'
import { formatPreco } from '../data'

const LSK = 'vg_admin_token'

// Decodifica entidades HTML (ex.: "F&#225;bio" -> "Fábio") usando o próprio navegador.
// Rede de segurança no cliente: conserta até dados que já foram salvos quebrados no cache.
const decodeEnt = (s) => {
  if (!s) return s
  const t = document.createElement('textarea'); t.innerHTML = String(s); return t.value
}
const limparOwner = (o) => {
  if (!o || typeof o !== 'object') return o
  const out = { ...o, nome: decodeEnt(o.nome), email: decodeEnt(o.email) }
  if (Array.isArray(o.dados)) out.dados = o.dados.map((d) => ({ rotulo: decodeEnt(d.rotulo), valor: decodeEnt(d.valor) }))
  if (Array.isArray(o.enderecoCampos)) out.enderecoCampos = o.enderecoCampos.map((c) => ({ ...c, valor: decodeEnt(c.valor) }))
  if (o.enderecoImovel) out.enderecoImovel = decodeEnt(o.enderecoImovel)
  return out
}

export default function AdminImovelBar({ im }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [open, setOpen] = useState(false)
  const [owner, setOwner] = useState(null)
  const [form, setForm] = useState({ nome: '', email: '', fone: '' })
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [diag, setDiag] = useState('')
  const [baixando, setBaixando] = useState(false)
  const [prog, setProg] = useState('')

  useEffect(() => {
    const check = () => setIsAdmin(!!localStorage.getItem(LSK))
    check()
    window.addEventListener('storage', check)
    return () => window.removeEventListener('storage', check)
  }, [])

  useEffect(() => {
    setOpen(false)
    setOwner(null)
    setForm({ nome: '', email: '', fone: '' })
    setEditing(false)
    setMsg('')
    setLoading(false)
  }, [im?.codigo])

  if (!isAdmin || !im) return null

  const token = localStorage.getItem(LSK)
  const codigo = im.codigo

  const post = async (action, extra = {}) => {
    const r = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, token, codigo, ...extra }),
    })
    return r.json()
  }

  const buscar = async (force = false) => {
    setLoading(true)
    setMsg('')
    try {
      const j = await post('owner-fetch', force ? { force: true } : {})
      if (j.ok) {
        const o = limparOwner(j.owner || { nome: '', email: '', fone: '' })
        const temDados = !!(o.nome || o.fone || (o.dados && o.dados.length) || o.enderecoImovel || (o.enderecoCampos && o.enderecoCampos.length))
        setOwner(temDados ? o : null)
        setForm(o)
        if (j.source && j.source.startsWith('imoview')) setMsg('✓ Captado do Imoview e salvo automaticamente')
        else if (j.source === 'saved') setMsg('✓ Dados já cadastrados neste imóvel')
        else { setMsg(j.motivo || 'Nenhum dado encontrado. Preencha os campos abaixo.'); setEditing(true) }
      } else {
        setMsg(j.msg || 'Erro ao buscar dados')
        setEditing(true)
      }
    } catch {
      setMsg('Falha de conexão. Tente novamente.')
    }
    setLoading(false)
  }

  const salvar = async () => {
    if (!form.nome && !form.fone) return
    setLoading(true)
    setMsg('')
    try {
      const j = await post('owner-save', { owner: form })
      if (j.ok) {
        setOwner(j.owner)
        setEditing(false)
        setMsg('✓ Dados do proprietário salvos')
      } else {
        setMsg(j.msg || 'Erro ao salvar')
      }
    } catch {
      setMsg('Falha de conexão')
    }
    setLoading(false)
  }

  const waLink = () => {
    const primeiroNome = (owner?.nome || '').split(' ')[0]
    const preco = im.preco ? formatPreco(im.preco) : 'a combinar'
    const tipo = (im.tipo || 'imóvel').toLowerCase()
    const bairro = im.bairro || ''
    const finalidade = (im.finalidade || 'venda').toLowerCase()
    const area = im.area ? ` de ${im.area}m²` : ''
    const texto = [
      `Olá${primeiroNome ? ', ' + primeiroNome : ''}!`,
      `Aqui é o Vinícius Graton, da Rotina Imobiliária.`,
      `Tenho um cliente com grande interesse no seu ${tipo}${area} no ${bairro} (código ${codigo}).`,
      `Pode confirmar que o imóvel ainda está disponível para ${finalidade}?`,
      `Já confirmei ao meu cliente o valor de ${preco} conforme anunciado. Por gentileza, confirme se esse valor se mantém para que possamos avançar com a visita.`,
      `Aguardo seu retorno, obrigado!`,
    ].join('\n\n')
    const fone = (owner?.fone || '').replace(/\D/g, '')
    const num = fone ? (fone.startsWith('55') ? fone : '55' + fone) : ''
    return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`
  }

  // Endereço completo limpo (a partir dos campos captados), p/ a mensagem e o nome do arquivo
  const enderecoPartes = () => {
    const ec = owner?.enderecoCampos || []
    const g = (r) => (ec.find((c) => c.rotulo === r) || {}).valor || ''
    return {
      rua: g('Endereço').replace(/^endere[çc]o\s+/i, '').trim(),
      num: g('Nº'),
      compl: g('Complemento').replace(/[,;]?\s*cep\s*:?\s*$/i, '').trim(),
      bairro: g('Bairro/Região'),
      cep: g('CEP'),
    }
  }
  const enderecoCompletoStr = () => {
    const p = enderecoPartes()
    if (p.rua || p.num) {
      return [[p.rua, p.num].filter(Boolean).join(', '), p.compl, p.bairro, p.cep && ('CEP ' + p.cep)].filter(Boolean).join(', ')
    }
    return owner?.enderecoImovel || im.endereco || im.bairro || ''
  }

  // Mensagem de CAPTAÇÃO ao proprietário: me apresento, confirmo disponibilidade (endereço
  // completo, código e valor), mando o link do anúncio p/ ele conferir as fotos e — foco
  // principal — pergunto se ele tem OUTRO imóvel pra cadastrar comigo.
  const waLinkCaptacao = () => {
    const nome = (owner?.nome || '').split(' ')[0]
    const tipo = (im.tipo || 'imóvel').toLowerCase()
    const bairro = im.bairro || ''
    const valor = im.preco ? formatPreco(im.preco) : 'a combinar'
    const endereco = enderecoCompletoStr()
    const link = `https://viniciusgraton.com.br/imovel/${codigo}`
    // saudação conforme o horário ATUAL (recalculada toda vez que o painel renderiza)
    const h = new Date().getHours()
    const saud = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
    const loc = [endereco && `fica na ${endereco}`, `código ${codigo}`, `no valor de ${valor}`].filter(Boolean).join(', ')
    // concordância de gênero conforme o tipo do imóvel: "a sua casa" / "o seu apartamento", "ela" / "ele"
    const fem = /^(casa|cobertura|loja|sala|kitn|kitin|ch[áa]cara|fazenda|[áa]rea|ed[íi]cula|sobreloja|gleba)/i.test(tipo)
    const artigo = fem ? 'a sua' : 'o seu'
    const pron = fem ? 'ela' : 'ele'
    const p1 = `${saud}! Aqui é o Vinícius, consultor da Rotina Imobiliária, tudo bem${nome ? ', ' + nome : ''}? Estou com ${artigo} ${tipo}${bairro ? ' no ' + bairro : ''} e gostaria de confirmar se ${pron} ainda está disponível.. ${loc}.`
    const p2 = `Verifica também as fotografias, se estão atualizadas.. são essas mesmas ou gostaria de atualizar com novas imagens? Basta me enviar, ou posso ir até o imóvel também.. ${link}. ${nome ? nome + ', aproveito' : 'Aproveito'} pra te perguntar se você tem mais algum imóvel que gostaria de cadastrar conosco.. me coloco à inteira disposição pra te dar suporte total${nome ? ', ' + nome : ''}!`
    const texto = `${p1}\n\n${p2}`
    const fone = (owner?.fone || '').replace(/\D/g, '')
    const num = fone ? (fone.startsWith('55') ? fone : '55' + fone) : ''
    return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`
  }

  const copiarRelatorio = () => {
    if (!owner) return
    const linhas = [
      `Proprietário — imóvel cód. ${codigo}`,
      owner.nome && `Nome: ${owner.nome}`,
      owner.email && `E-mail: ${owner.email}`,
      owner.fone && `Telefone: ${owner.fone}`,
      ...(owner.enderecoCampos?.length
        ? ['Endereço do imóvel:', ...owner.enderecoCampos.map((c) => `  ${c.rotulo}: ${c.valor}`)]
        : (owner.enderecoImovel ? [`Endereço do imóvel: ${owner.enderecoImovel}`] : [])),
      ...((owner.dados || []).map((d) => `${d.rotulo}: ${d.valor}`)),
    ].filter(Boolean).join('\n')
    navigator.clipboard?.writeText(linhas).catch(() => {})
    setCopiado(true); setTimeout(() => setCopiado(false), 2000)
  }

  // Monta o "bloco de notas" do dossiê: dados do proprietário + descrição completa do imóvel.
  // Usa \r\n para abrir certinho no Bloco de Notas do Windows.
  const montarTxt = () => {
    const L = []
    const add = (s = '') => L.push(s)
    const real = (v) => (v ? formatPreco(v) : '—')
    const sep = '═'.repeat(46)
    add(`DOSSIÊ DO IMÓVEL — CÓD. ${codigo}`)
    add(`Anúncio: https://viniciusgraton.com.br/imovel/${codigo}`)
    add('')
    add(sep); add('PROPRIETÁRIO'); add(sep)
    add(`Nome: ${owner?.nome || '—'}`)
    add(`Telefone: ${owner?.fone || '—'}`)
    add(`E-mail: ${owner?.email || '—'}`)
    if (owner?.enderecoCampos?.length) {
      add(''); add('Endereço do imóvel:')
      owner.enderecoCampos.forEach((c) => add(`  ${c.rotulo}: ${c.valor}`))
    } else if (owner?.enderecoImovel) { add(''); add(`Endereço do imóvel: ${owner.enderecoImovel}`) }
    if (owner?.dados?.length) { add(''); add('Outros dados do cadastro:'); owner.dados.forEach((d) => add(`  ${d.rotulo}: ${d.valor}`)) }
    add('')
    add(sep); add('IMÓVEL'); add(sep)
    if (im.titulo) add(`Título: ${im.titulo}`)
    add(`Tipo: ${im.tipo || '—'}`)
    if (im.finalidade) add(`Finalidade: ${im.finalidade}`)
    add(`Bairro: ${im.bairro || '—'}`)
    add(`Cidade: ${im.cidade || 'Uberlândia'}`)
    add(`Preço: ${real(im.preco)}`)
    if (im.condominio) add(`Condomínio: ${real(im.condominio)}`)
    if (im.iptu) add(`IPTU: ${real(im.iptu)}`)
    if (im.area) add(`Área: ${im.area} m²`)
    if (im.areaLote) add(`Área do lote: ${im.areaLote} m²`)
    if (im.quartos != null && im.quartos !== '') add(`Quartos: ${im.quartos}`)
    if (im.suites) add(`Suítes: ${im.suites}`)
    if (im.banheiros) add(`Banheiros: ${im.banheiros}`)
    if (im.vagas != null && im.vagas !== '') add(`Vagas: ${im.vagas}`)
    if (im.andar) add(`Andar: ${im.andar}`)
    if (im.endereco) add(`Endereço (anúncio): ${im.endereco}`)
    if (im.pontoReferencia) add(`Ponto de referência: ${im.pontoReferencia}`)
    if (Array.isArray(im.caracteristicas) && im.caracteristicas.length) {
      add(''); add('Características:'); im.caracteristicas.forEach((c) => add(`  - ${typeof c === 'string' ? c : (c?.nome || c?.titulo || '')}`))
    }
    if (im.descricao) { add(''); add('Descrição:'); add(String(im.descricao).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim()) }
    const fotos = listaFotos()
    add(''); add(sep); add('FOTOS'); add(sep)
    add(`${fotos.length} foto(s) na pasta "fotos" deste arquivo.`)
    add('')
    add('Gerado pelo site de Vinícius Graton — uso interno.')
    return L.join('\r\n')
  }

  const listaFotos = () => (Array.isArray(im.fotos) && im.fotos.length ? im.fotos : (im.img ? [im.img] : []))

  // Nome do arquivo/pasta: "<Bairro> - <Endereço, Nº>" (sanitizado p/ Windows).
  const nomeBase = () => {
    const p = enderecoPartes()
    let endereco = [p.rua, p.num].filter(Boolean).join(', ')
    if (!endereco) endereco = owner?.enderecoImovel || im.endereco || ''
    const bruto = [im.bairro || '', endereco].filter(Boolean).join(' - ')
    const limpo = bruto.replace(/[\\/:*?"<>|\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, 110)
    return limpo || `imovel-${codigo}`
  }

  // Baixa as fotos via proxy same-origin (6 em paralelo). Devolve [{nome, blob}].
  const coletarFotos = async () => {
    const fotos = listaFotos()
    const itens = new Array(fotos.length)
    let done = 0
    const baixarUma = async (urlFoto, idx) => {
      try {
        const r = await fetch('/api/img-proxy?u=' + encodeURIComponent(urlFoto))
        if (r.ok) {
          const blob = await r.blob()
          const ext = ((urlFoto.match(/\.(jpe?g|png|webp)(?=$|\?)/i) || [])[1] || 'jpg').toLowerCase()
          itens[idx] = { nome: String(idx + 1).padStart(2, '0') + '.' + ext, blob }
        }
      } catch {}
      done++; setProg(`Baixando fotos… ${done}/${fotos.length}`)
    }
    const fila = fotos.map((u, i) => () => baixarUma(u, i))
    await Promise.all(Array.from({ length: Math.min(6, fila.length || 1) }, async () => {
      while (fila.length) { const job = fila.shift(); if (job) await job() }
    }))
    return itens.filter(Boolean)
  }

  // Opção 1 — .zip único (funciona em qualquer navegador).
  const baixarZip = async () => {
    if (baixando) return
    setBaixando(true); setProg('Preparando…')
    try {
      const { default: JSZip } = await import('jszip')
      const zip = new JSZip()
      zip.file('dados.txt', montarTxt())
      const pasta = zip.folder('fotos')
      const fotos = await coletarFotos()
      fotos.forEach((f) => pasta.file(f.nome, f.blob))
      setProg('Compactando…')
      const out = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(out)
      const a = document.createElement('a')
      a.href = url; a.download = `${nomeBase()}.zip`
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
      setProg(`✓ Baixado · ${fotos.length} fotos`)
    } catch (e) {
      setProg('Falha ao gerar o .zip. Tente de novo.')
    }
    setBaixando(false); setTimeout(() => setProg(''), 5000)
  }

  // Opção 2 — pasta SEM compactar, DIRETO na pasta Downloads (sem janela de seleção).
  // Dispara o download de cada arquivo com caminho relativo "<imóvel>/<imóvel> - NN.jpg";
  // navegadores Chromium (Chrome/Edge/Comet) criam a subpasta dentro de Downloads sozinhos.
  // O nome do imóvel vai na pasta E em cada foto/arquivo (sobrevive mesmo se o navegador
  // não criar a subpasta — aí ficam soltos, porém já identificados).
  const salvarEmPasta = async () => {
    if (baixando) return
    setBaixando(true); setProg('Preparando…')
    const base = nomeBase()
    const baixarArquivo = (caminho, blob) => new Promise((res) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = caminho; a.rel = 'noopener'
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => { URL.revokeObjectURL(url); res() }, 280)
    })
    try {
      await baixarArquivo(`${base}/${base} - dados.txt`, new Blob([montarTxt()], { type: 'text/plain;charset=utf-8' }))
      const fotos = await coletarFotos()
      for (let k = 0; k < fotos.length; k++) {
        const ext = (fotos[k].nome.split('.').pop() || 'jpg')
        const num = String(k + 1).padStart(2, '0')
        setProg(`Salvando… ${k + 1}/${fotos.length}`)
        await baixarArquivo(`${base}/${base} - ${num}.${ext}`, fotos[k].blob)
      }
      setProg(`✓ ${fotos.length} fotos + dados na sua pasta Downloads`)
    } catch (e) {
      setProg('Falha ao baixar. Tente o .zip.')
    }
    setBaixando(false); setTimeout(() => setProg(''), 7000)
  }

  // Diagnóstico: mostra o que o Imoview devolveu (pra ajustar a captação dos campos)
  const diagnostico = async () => {
    setLoading(true); setDiag(''); setMsg('Rodando diagnóstico…')
    try { const j = await post('owner-fetch', { debug: true, force: true }); setDiag(JSON.stringify(j.dbg || j, null, 2)) }
    catch { setDiag('Falha no diagnóstico.') }
    setLoading(false); setMsg('')
  }

  const temContato = !!(owner && (owner.nome || owner.fone || (owner.dados && owner.dados.length) || owner.enderecoImovel))

  return (
    <div className="adm-bar" role="region" aria-label="Painel administrativo">
      <div className="adm-bar-strip">
        <span className="adm-bar-label">Admin · cód. {codigo}</span>
        <button
          className="adm-bar-btn"
          onClick={() => {
            const next = !open
            setOpen(next)
            if (next && !owner && !loading) buscar()
          }}
        >
          {open ? '▲' : '▼'} Proprietário
        </button>
        {temContato && (
          <a
            className="adm-bar-btn adm-bar-wa"
            href={waLink()}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp →
          </a>
        )}
      </div>

      {open && (
        <div className="adm-panel">
          {loading && (
            <p className="adm-status adm-status--load">Buscando dados no Imoview…</p>
          )}
          {!loading && msg && (
            <p className={`adm-status${msg.startsWith('✓') ? ' adm-status--ok' : ''}`}>{msg}</p>
          )}

          {!editing && temContato ? (
            <div className="adm-owner-view">
              <div className="adm-field"><label>Nome</label><span>{owner.nome || '—'}</span></div>
              <div className="adm-field">
                <label>E-mail</label>
                {owner.email
                  ? <a href={`mailto:${owner.email}`}>{owner.email}</a>
                  : <span>—</span>}
              </div>
              <div className="adm-field">
                <label>Telefone</label>
                {owner.fone
                  ? <a href={`tel:${owner.fone}`}>{owner.fone}</a>
                  : <span>—</span>}
              </div>
              {Array.isArray(owner.enderecoCampos) && owner.enderecoCampos.length > 0 ? (
                <div className="adm-owner-dados" style={{ marginTop: 8, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                  <p className="adm-status" style={{ margin: '0 0 4px', fontWeight: 700 }}>Endereço do imóvel</p>
                  {owner.enderecoCampos.map((c, i) => (
                    <div className="adm-field" key={i}><label>{c.rotulo}</label><span>{c.valor}</span></div>
                  ))}
                </div>
              ) : owner.enderecoImovel ? (
                <div className="adm-field"><label>Endereço do imóvel</label><span>{owner.enderecoImovel}</span></div>
              ) : null}
              {Array.isArray(owner.dados) && owner.dados.length > 0 && (
                <div className="adm-owner-dados" style={{ marginTop: 8, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                  {owner.dados.map((d, i) => (
                    <div className="adm-field" key={i}><label>{d.rotulo}</label><span>{d.valor}</span></div>
                  ))}
                </div>
              )}
              <div className="adm-acoes">
                <button className="adm-btn" onClick={() => { setEditing(true); setForm(owner) }}>
                  Editar
                </button>
                <button className="adm-btn" onClick={() => buscar(true)} disabled={loading} title="Rebuscar dados diretamente no Imoview, ignorando cache">
                  ↺ Atualizar do Imoview
                </button>
                <button className="adm-btn" onClick={copiarRelatorio} title="Copiar o relatório completo do proprietário">
                  {copiado ? '✓ Copiado' : '⧉ Copiar relatório'}
                </button>
                <button className="adm-btn adm-btn--gold" onClick={baixarZip} disabled={baixando} title="Baixar um .zip com todas as fotos + um bloco de notas (proprietário + descrição completa)">
                  {baixando ? '⏳ Gerando…' : '⬇ Baixar .zip (fotos + dados)'}
                </button>
                <button className="adm-btn" onClick={salvarEmPasta} disabled={baixando} title="Baixa direto na pasta Downloads (sem compactar e sem janela de seleção): cria uma pasta com o nome do imóvel + as fotos">
                  📁 Baixar na pasta Downloads (sem zipar)
                </button>
                {!(owner?.enderecoCampos || []).some((c) => c.rotulo === 'Nº') && (
                  <button className="adm-btn" onClick={diagnostico} disabled={loading} title="Faltou o número? Mostra o que o Imoview retornou pra ajustar a captação">
                    🔧 Diagnóstico
                  </button>
                )}
                {owner?.fone && (
                  <a className="adm-btn adm-btn--wa" href={waLink()} target="_blank" rel="noopener noreferrer">
                    Tenho cliente interessado
                  </a>
                )}
                {owner?.fone && (
                  <a className="adm-btn adm-btn--wa" href={waLinkCaptacao()} target="_blank" rel="noopener noreferrer"
                    title="Apresentação + confirmar disponibilidade (endereço, código e valor) + link das fotos + pedir outro imóvel pra cadastrar">
                    Confirmar &amp; captar (WhatsApp)
                  </a>
                )}
              </div>
              {prog && <p className="adm-status" style={{ marginTop: 8 }}>{prog}</p>}
            </div>
          ) : (
            !loading && (
              <div className="adm-form">
                <input
                  className="adm-input"
                  placeholder="Nome do proprietário"
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                />
                <input
                  className="adm-input"
                  placeholder="E-mail"
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
                <input
                  className="adm-input"
                  placeholder="Telefone / WhatsApp (com DDD)"
                  value={form.fone}
                  onChange={e => setForm(f => ({ ...f, fone: e.target.value }))}
                />
                <div className="adm-acoes">
                  <button
                    className="adm-btn adm-btn--gold"
                    onClick={salvar}
                    disabled={loading || (!form.nome && !form.fone)}
                  >
                    Salvar dados
                  </button>
                  {temContato && (
                    <button className="adm-btn" onClick={() => setEditing(false)}>Cancelar</button>
                  )}
                  <button className="adm-btn" onClick={() => buscar(temContato)} disabled={loading}>
                    ↺ Buscar no Imoview
                  </button>
                  <button className="adm-btn" onClick={diagnostico} disabled={loading} title="Não veio nada? Mostra o que o Imoview retornou pra eu ajustar a captação">
                    🔧 Diagnóstico
                  </button>
                </div>
              </div>
            )
          )}
          {diag && (
            <div style={{ marginTop: 12 }}>
              <p className="adm-status" style={{ margin: '0 0 6px' }}>Diagnóstico (mande este texto pro Vinícius ajustar a captação):</p>
              <pre style={{ maxHeight: 280, overflow: 'auto', background: '#f6f4ef', border: '1px solid var(--border)', borderRadius: 10, padding: 12, fontSize: '.72rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{diag}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
