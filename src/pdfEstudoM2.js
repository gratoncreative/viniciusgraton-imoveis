import { importRetry } from './lazyRetry'

// Estudo de valor de mercado (PDF) — referência preliminar pelo método da NBR 14653.
// Documento técnico completo: capa, sumário executivo, metodologia, homogeneização,
// memória de cálculo, saneamento, tratamento estatístico, tabela de comparáveis,
// gráficos, grau (autoavaliação), glossário e referências. Linguagem clara do site.
// NÃO é laudo de avaliação formal (autor = consultor, não avaliador credenciado).
const PW = 595.28, PH = 841.89, M = 46
const NAVY = [28, 42, 68], INK = [42, 47, 56], SOFT = [92, 100, 112], MUTE = [140, 148, 160]
const GOLD = [154, 123, 60], GOLD2 = [198, 161, 91], CREME = [244, 239, 230], LINE = [228, 223, 212]
const HEADER_H = 46, FOOTER_TOP = PH - 38, CONTENT_TOP = HEADER_H + 22
const brl = (v) => 'R$ ' + Math.round(Number(v) || 0).toLocaleString('pt-BR')
const m2 = (v) => 'R$ ' + Math.round(Number(v) || 0).toLocaleString('pt-BR') + '/m²'
const pct1 = (v) => (Number(v) || 0).toFixed(1).replace('.', ',') + '%'
const km = (v) => (Number(v) || 0) < 1 ? Math.round((Number(v) || 0) * 1000) + ' m' : (Number(v) || 0).toFixed(1).replace('.', ',') + ' km'
const T = (s) => String(s == null ? '' : s).replace(/→/g, '·').replace(/[—–]/g, '-')

// Conteúdo técnico (revisado: "imóvel de estudo", "faixa de referência", ±30% = critério próprio)
const TX = {
  objetivo: [
    'Este documento é um estudo de valor de mercado, elaborado como referência preliminar para apoiar a negociação e a tomada de decisão sobre o imóvel. A finalidade é oferecer uma estimativa fundamentada de faixa de preço, útil tanto para quem pretende anunciar quanto para quem deseja avaliar uma proposta.',
    'O estudo usa como base metodológica a NBR 14653, pelo Método Comparativo Direto de Dados de Mercado (MCDDM). O tratamento dos dados é feito por estatística descritiva, adotando-se a mediana das ofertas como medida central, mais robusta a valores extremos do que a média.',
    'São pressupostos do estudo: que as informações de área, localização, padrão e características do imóvel estão corretas; que não foi realizada vistoria técnica presencial; que não foram apurados eventuais ônus, pendências ou vícios ocultos; e que a amostra reflete a oferta disponível na data-base deste estudo.',
    'Ressalva importante: este é um ESTUDO preliminar de referência, assinado por consultor de imóveis, e NÃO constitui Laudo de Avaliação formal. Não substitui o laudo de profissional habilitado (engenheiro de avaliações ou arquiteto com registro no CREA/CAU e, quando aplicável, CNAI), com vistoria e responsabilidade técnica. Para fins judiciais, bancários, garantias ou exigências legais, recomenda-se a contratação de laudo formal.',
  ],
  metodologia: [
    'Este estudo adota o Método Comparativo Direto de Dados de Mercado (MCDDM), previsto nas NBR 14653-1 e 14653-2 como o procedimento preferencial sempre que existem dados de imóveis assemelhados em quantidade suficiente. O método estima o valor a partir da comparação com ofertas de unidades similares na mesma região, e não por custo de reposição ou por capitalização de renda.',
    'A escolha do MCDDM se justifica pela boa oferta de imóveis comparáveis em Uberlândia/MG. O método apoia-se no pressuposto da substituição e da homogeneidade: um comprador racional não paga por um imóvel mais do que pagaria por outro equivalente, de modo que unidades semelhantes em localização, área, padrão e atributos tendem a convergir para um mesmo nível de valor por metro quadrado.',
    'Para tornar os dados comparáveis, aplica-se a homogeneização por fatores, ajustando cada comparável às características do imóvel de estudo. O tratamento dos valores homogeneizados é feito por estatística descritiva, adotando-se a mediana como medida central.',
  ],
  metodologiaBul: [
    'Coleta: levantamento de ofertas de imóveis assemelhados na mesma região e faixa de padrão (área, vagas, localização e preço anunciado).',
    'Saneamento: exclusão de dados inconsistentes ou fora de mercado, garantindo amostra homogênea.',
    'Homogeneização: aplicação dos fatores de oferta, vaga e área para equiparar cada comparável ao imóvel de estudo.',
    'Tratamento: mediana dos valores homogeneizados e faixa de referência a partir do desvio-padrão da amostra.',
  ],
  homog: [
    'Os imóveis comparáveis raramente são idênticos ao imóvel de estudo, nem entre si. Para que os dados de mercado "falem a mesma língua", aplica-se a homogeneização: fatores de correção que ajustam cada comparável às condições do imóvel de estudo. Só depois desse ajuste faz sentido comparar valores e extrair a medida central.',
    'Cada fator corrige uma diferença conhecida: se um comparável é superior ao imóvel de estudo, seu valor é reduzido; se é inferior, é elevado. Assim, todos os dados passam a refletir um padrão único de comparação.',
    'Limite do método: os fatores aqui tratam apenas de variáveis observáveis à distância (preço de anúncio, área e vagas). Idade, conservação, qualidade construtiva e microlocalização também influenciam o valor, mas exigem vistoria presencial por profissional habilitado. Essa é a principal razão pela qual este é um estudo preliminar de referência, e não um laudo formal.',
  ],
  homogBul: [
    'Fator oferta/fonte (0,90): os comparáveis são preços de ANÚNCIO, não de venda fechada. Há uma margem de negociação ("gordura do anúncio") em torno de 10%. O fator 0,90 converte o valor pedido em estimativa do provável valor de transação.',
    'Fator área (expoente 0,10): há economia de escala no m² - imóveis maiores tendem a ter m² menor e vice-versa. Corrige-se pela razão entre as áreas elevada a um expoente. O expoente baixo aplica uma correção suave (parâmetro adotado neste estudo).',
    'Fator vaga (~R$ 32.000/vaga): a vaga tem valor próprio no mercado. Comparáveis com nº de vagas diferente são ajustados (soma/subtração) para padronizar todos sob a mesma quantidade de vagas.',
    'Fatores NÃO aplicados (exigem vistoria): idade, conservação, acabamento, padrão construtivo e microlocalização. Sua aferição depende de inspeção presencial por profissional habilitado.',
  ],
  tratamento: [
    'Sobre os comparáveis trabalha-se com o valor unitário (R$/m²). Aplica-se estatística descritiva: a média é a soma dividida pela quantidade; a mediana é o valor central da amostra ordenada; o desvio-padrão mede a dispersão em torno da média; e o coeficiente de variação (CV) é o desvio-padrão dividido pela média (%), indicando a homogeneidade da amostra.',
    'Adotamos a MEDIANA como referência (não a média) por ser robusta: não é distorcida por um anúncio muito alto ou muito baixo, situação comum em ofertas. A média, ao contrário, é puxada por esses extremos.',
    'Antes do cálculo, fazemos um saneamento de outliers descartando dados a mais de 30% acima ou abaixo da mediana preliminar - critério simplificado adotado neste estudo (a norma usa critérios estatísticos próprios). Sobre a amostra limpa e homogeneizada recalculamos a mediana e o desvio-padrão. A faixa de referência (intervalo de dispersão) é construída a partir do desvio-padrão: dentro dela o valor é tecnicamente defensável, refletindo a incerteza natural do mercado.',
    'Grau de fundamentação: a NBR 14653-2 classifica os trabalhos em Graus I, II e III conforme nº de dados, vistoria, qualidade do tratamento e detalhamento. O que apresentamos é uma AUTOAVALIAÇÃO SIMPLIFICADA, a partir de dois indicadores objetivos (quantidade de dados e CV - este ligado ao grau de precisão). Serve para dimensionar a robustez do estudo, mas NÃO é o enquadramento oficial, que exige profissional habilitado, vistoria e laudo assinado.',
  ],
  glossario: [
    ['Valor de mercado', 'preço mais provável de negociação em condições normais, entre comprador e vendedor sem pressa nem obrigação.'],
    ['Homogeneização', 'ajuste dos preços das amostras por fatores (oferta, vaga, área) para deixá-las comparáveis ao imóvel de estudo.'],
    ['Faixa de referência', 'intervalo em torno da estimativa central, derivado do desvio-padrão, dentro do qual o resultado é aceitável.'],
    ['Coeficiente de variação (CV)', 'dispersão relativa (desvio-padrão ÷ média); quanto menor, mais homogênea e confiável a amostra.'],
    ['Desvio-padrão', 'quanto os valores se afastam, em média, do valor central; quanto maior, maior a dispersão.'],
    ['Mediana', 'valor central dos dados ordenados; sofre menos influência de preços extremos que a média.'],
    ['Grau de fundamentação', 'nível de robustez do estudo segundo a NBR 14653, conforme quantidade e qualidade dos dados e ajustes.'],
    ['Comparável (testemunha)', 'imóvel ofertado, semelhante ao de estudo, usado como referência de preço.'],
  ],
  referencias: [
    'ABNT NBR 14653-1 - Avaliação de bens · Parte 1: Procedimentos gerais',
    'ABNT NBR 14653-2 - Avaliação de bens · Parte 2: Imóveis urbanos',
    'IBAPE - Instituto Brasileiro de Avaliações e Perícias de Engenharia (boas práticas)',
    'Anúncios e base de ofertas da Rotina Imobiliária / Imoview (comparáveis na região)',
    'Índices públicos de mercado imobiliário (acompanhamento de tendência)',
    'Características do imóvel informadas pelo proprietário/interessado',
  ],
}

async function gerarQR(texto) {
  try { const QR = (await importRetry(() => import('qrcode'))).default || (await importRetry(() => import('qrcode'))); return await QR.toDataURL(texto, { margin: 1, width: 220, color: { dark: '#1C2A44', light: '#ffffff' } }) } catch { return null }
}

async function montar(estudo, charts = {}) {
  const { jsPDF } = await importRetry(() => import('jspdf'))
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true })
  const a = estudo.avaliando || {}, st = estudo.stats || {}, prm = estudo.parametros || {}
  const codigo = estudo.numero || a.codigo || ''
  const qr = await gerarQR(`https://wa.me/${(estudo.consultor && estudo.consultor.whatsapp) || '5534991570494'}?text=` + encodeURIComponent(`Olá Vinícius! Vi o estudo de valor cód. ${codigo} e quero conversar.`))

  const set = (s, sty = 'normal', c = INK) => { doc.setFontSize(s); doc.setFont('helvetica', sty); doc.setTextColor(...c) }
  const fill = (...r) => doc.setFillColor(...r), draw = (...r) => doc.setDrawColor(...r)
  let sec = 0

  const header = () => {
    fill(...NAVY); doc.rect(0, 0, PW, HEADER_H, 'F'); fill(...GOLD2); doc.rect(0, HEADER_H - 2, PW, 2, 'F')
    set(10.5, 'bold', [255, 255, 255]); doc.text('VINÍCIUS GRATON', M, 19)
    set(7, 'normal', GOLD2); doc.text('ESTUDO DE VALOR DE MERCADO · REFERÊNCIA NBR 14653', M, 31)
    set(7.5, 'normal', [205, 212, 222]); doc.text(`Estudo nº ${codigo}`, PW - M, 19, { align: 'right' })
    set(7, 'normal', MUTE); doc.text('viniciusgraton.com.br', PW - M, 31, { align: 'right' })
  }
  const footer = () => {
    draw(...LINE); doc.setLineWidth(0.5); doc.line(M, FOOTER_TOP + 4, PW - M, FOOTER_TOP + 4)
    set(6.5, 'normal', MUTE); doc.text('Estudo preliminar por ofertas públicas (método NBR 14653). Não substitui laudo formal com vistoria de profissional habilitado.', M, FOOTER_TOP + 15, { maxWidth: PW - 2 * M - 70 })
  }
  let y = 0
  const nova = () => { doc.addPage(); header(); footer(); y = CONTENT_TOP }
  const ensure = (h) => { if (y + h > FOOTER_TOP) nova() }
  const secao = (titulo, numerada = true) => {
    ensure(42)
    if (numerada) sec++
    set(11.5, 'bold', NAVY); doc.text((numerada ? sec + '. ' : '') + T(titulo).toUpperCase(), M, y); y += 7
    draw(...GOLD); doc.setLineWidth(1.6); doc.line(M, y, M + 30, y); draw(...LINE); doc.setLineWidth(0.5); doc.line(M + 38, y, PW - M, y); y += 17
  }
  const par = (txt) => { set(9.5, 'normal', INK); for (const ln of doc.splitTextToSize(T(txt), PW - 2 * M)) { ensure(14); doc.text(ln, M, y); y += 14 } y += 5 }
  const pars = (arr) => (arr || []).forEach(par)
  const bullets = (arr) => {
    set(9.3, 'normal', INK)
    for (const it of (arr || [])) {
      const linhas = doc.splitTextToSize(T(it), PW - 2 * M - 14)
      ensure(linhas.length * 13.5 + 3)
      fill(...GOLD); doc.circle(M + 3.5, y - 3.2, 1.8, 'F')
      linhas.forEach((ln, k) => doc.text(ln, M + 13, y + k * 13.5)); y += linhas.length * 13.5 + 4
    }
    y += 4
  }
  const linhaKV = (rot, val, dest) => { ensure(20); draw(238, 238, 238); doc.setLineWidth(0.5); doc.line(M, y + 5, PW - M, y + 5); set(9.3, 'normal', SOFT); doc.text(T(rot), M, y); set(dest ? 10.5 : 9.3, dest ? 'bold' : 'normal', NAVY); doc.text(T(String(val)), PW - M, y, { align: 'right' }); y += 20 }
  const addChart = (titulo, ch) => {
    if (!ch || !ch.dataUrl) return
    let ratio = (ch.h > 0 && ch.w > 0) ? ch.h / ch.w : 0.62
    if (!isFinite(ratio) || ratio <= 0) ratio = 0.62
    ratio = Math.min(1, Math.max(0.45, ratio)) // proporção sã (nunca esticado/gigante)
    let iw = Math.min(PW - 2 * M, 420), ih = iw * ratio
    const maxH = FOOTER_TOP - CONTENT_TOP - 50
    if (ih > maxH) { ih = maxH; iw = ih / ratio }
    ensure(34 + ih + 6); secao(titulo)
    try { doc.addImage(ch.dataUrl, 'PNG', M + (PW - 2 * M - iw) / 2, y, iw, ih) } catch {}
    y += ih + 12
  }

  // ═══ CAPA ═══
  header(); footer()
  y = HEADER_H + 60
  fill(...GOLD2); doc.rect(M, y, 40, 3, 'F'); y += 22
  set(9, 'bold', GOLD); doc.text('ESTUDO DE VALOR DE MERCADO', M, y); y += 30
  set(27, 'bold', NAVY); doc.text(T(`${a.tipo || 'Imóvel'} no ${a.bairro || ''}`), M, y, { maxWidth: PW - 2 * M }); y += 26
  set(11, 'normal', SOFT); doc.text(T(`${a.cidade || 'Uberlândia/MG'} · Estudo nº ${codigo}`), M, y); y += 40
  // caixa de conclusão na capa
  const vTxt = estudo.veredito === 'abaixo' ? `${Math.abs(estudo.diffPct)}% abaixo da mediana do bairro`
    : estudo.veredito === 'acima' ? `${estudo.diffPct}% acima da mediana do bairro` : 'dentro da faixa de mercado'
  const vCor = estudo.veredito === 'abaixo' ? [63, 122, 94] : estudo.veredito === 'acima' ? [176, 74, 55] : NAVY
  fill(...CREME); draw(...LINE); doc.setLineWidth(0.6); doc.roundedRect(M, y, PW - 2 * M, 132, 10, 10, 'FD')
  set(8.5, 'normal', SOFT); doc.text('VALOR DE MERCADO ESTIMADO', M + 20, y + 26)
  set(26, 'bold', NAVY); doc.text(brl(estudo.valorTotal), M + 20, y + 56)
  set(9.5, 'normal', INK); doc.text(T(`Faixa de referência: ${brl(estudo.valMin)} a ${brl(estudo.valMax)}`), M + 20, y + 78)
  set(9.5, 'bold', vCor); doc.text(T(`Preço pedido está ${vTxt}.`), M + 20, y + 98)
  set(8.5, 'normal', SOFT); doc.text(T(`Mediana de mercado: ${m2(estudo.adotadoM2)}  ·  baseado em ${estudo.n} comparáveis`), M + 20, y + 116)
  if (qr) { try { doc.addImage(qr, 'PNG', PW - M - 86, y + 24, 64, 64); set(6.5, 'normal', MUTE); doc.text('fale comigo', PW - M - 54, y + 98, { align: 'center' }) } catch {} }
  y += 132 + 30
  set(9.5, 'normal', SOFT)
  doc.text(T('Vinícius Graton · Consultor de Imóveis · Rotina Imobiliária'), M, y); y += 14
  set(8.5, 'normal', MUTE); doc.text(T('Documento de referência preliminar - não é Laudo de Avaliação formal.'), M, y)

  // ═══ 1. Objetivo ═══
  nova()
  secao('Objetivo e pressupostos'); pars(TX.objetivo)
  // ═══ 2. Caracterização ═══
  secao('Caracterização do imóvel')
  linhaKV('Tipo', a.tipo || '-'); linhaKV('Localização', `${a.bairro || ''} · ${a.cidade || 'Uberlândia/MG'}`)
  if (a.area > 0) linhaKV('Área', `${Math.round(a.area)} m²`, true)
  if (a.dormitorios > 0) linhaKV('Dormitórios', a.dormitorios)
  if (a.suites > 0) linhaKV('Suítes', a.suites)
  if (a.banheiros > 0) linhaKV('Banheiros', a.banheiros)
  if (a.vagas > 0) linhaKV('Vagas de garagem', a.vagas)
  y += 6
  // ═══ 3. Metodologia ═══
  secao('Metodologia'); pars(TX.metodologia); bullets(TX.metodologiaBul)
  // ═══ 4. Pesquisa de mercado ═══
  secao('Pesquisa de mercado')
  par(`Foram considerados imóveis do mesmo tipo ${estudo.escopo === 'cidade' ? 'na cidade' : 'no bairro ' + (a.bairro || '')}. Amostra utilizada: ${estudo.n} comparáveis${estudo.nDesc ? ` (${estudo.nDesc} descartado(s) no saneamento)` : ''}.`)
  if (estudo.coletaEm) par(`Coleta de dados: ${estudo.coletaEm}.`)
  bullets((estudo.fontes && estudo.fontes.length ? estudo.fontes : TX.referencias.slice(3)))
  // ═══ 5. Homogeneização ═══
  secao('Homogeneização dos dados'); pars(TX.homog); bullets(TX.homogBul)
  // ═══ 6. Memória de cálculo ═══
  secao('Memória de cálculo (imóvel de estudo)')
  linhaKV('Preço pedido', brl(estudo.valorTotalPedido || (estudo.precoM2 * a.area)) )
  linhaKV('Preço pedido por m²', m2(estudo.precoM2))
  if ((a.vagas || 0) > 0) linhaKV('Desconto por vaga aplicado', `${brl(prm.vagaValor || 32000)} × ${a.vagas} vaga(s)`)
  linhaKV('Fator de área (expoente)', String(prm.expArea ?? 0.10).replace('.', ','))
  linhaKV('Fator de oferta', String(prm.fatorOferta ?? 0.90).replace('.', ','))
  linhaKV('m² do imóvel após homogeneização', m2(estudo.m2Subj), true)
  linhaKV('Mediana de mercado (referência)', m2(estudo.adotadoM2), true)
  linhaKV('Valor estimado de venda', brl(estudo.valorTotal), true)
  y += 4
  // ═══ 7. Tratamento estatístico ═══
  secao('Tratamento estatístico'); pars(TX.tratamento)
  if (st.media > 0) {
    ensure(20); set(9.5, 'bold', NAVY); doc.text('Estatística da amostra (R$/m² homogeneizado):', M, y); y += 16
    linhaKV('Média', m2(st.media)); linhaKV('Mediana (adotada)', m2(st.mediana), true)
    linhaKV('Desvio-padrão', m2(st.dp)); linhaKV('Coeficiente de variação (CV)', pct1((st.cv || 0) * 100))
    if (st.min) linhaKV('Mínimo / Máximo', `${m2(st.min)}  a  ${m2(st.max)}`)
    linhaKV('Faixa de referência (R$/m²)', `${m2(estudo.campoMin || st.min)}  a  ${m2(estudo.campoMax || st.max)}`)
  } else {
    par('Amostra insuficiente de comparáveis para o tratamento estatístico completo neste caso; adotou-se a referência de índice de mercado do bairro, com a faixa indicada na capa.')
  }
  // ═══ 8. Grau ═══
  secao('Grau de fundamentação (autoavaliação)')
  par(`Pelos indicadores objetivos deste estudo - ${estudo.n} dados de mercado e CV de ${pct1((st.cv || 0) * 100)} - a robustez se posiciona em GRAU ${estudo.grau || 'I'} nesta autoavaliação simplificada. Isto NÃO é o enquadramento oficial da NBR 14653, que exige profissional habilitado, vistoria e laudo assinado.`)
  bullets([
    'Grau I (referência): poucos dados e/ou CV mais alto - robustez limitada.',
    'Grau II (referência): nº intermediário de dados e CV moderado - robustez razoável.',
    'Grau III (referência): muitos dados e CV baixo - maior robustez estatística.',
  ])
  // ═══ 9. Tabela de comparáveis ═══
  const tw = estudo.testemunhas || []
  if (tw.length) {
    secao('Amostra de comparáveis utilizada')
    const cols = [['#', 30], ['Bairro', 150], ['Área', 50], ['Preço', 90], ['R$/m² bruto', 80], ['R$/m² homog.', 80]]
    const drawHead = () => {
      ensure(20); fill(...NAVY); doc.rect(M, y - 11, PW - 2 * M, 18, 'F')
      set(7.5, 'bold', [255, 255, 255]); let x = M + 6
      cols.forEach(([t, w], i) => { doc.text(T(t), i >= 2 ? x + w - 8 : x, y, { align: i >= 2 ? 'right' : 'left' }); x += w }); y += 13
    }
    drawHead()
    // trunca texto que não cabe na coluna (evita invadir a coluna seguinte)
    const clip = (txt, maxW, sz) => { doc.setFontSize(sz); let s = String(txt); if (doc.getTextWidth(s) <= maxW) return s; while (s.length > 1 && doc.getTextWidth(s + '…') > maxW) s = s.slice(0, -1); return s + '…' }
    const linhas = tw.slice(0, 16)
    linhas.forEach((t, idx) => {
      ensure(15); if (idx % 2) { fill(250, 248, 243); doc.rect(M, y - 10, PW - 2 * M, 15, 'F') }
      set(7.4, 'normal', INK); let x = M + 6
      const vals = [String(idx + 1), clip(t.bairro || '-', cols[1][1] - 10, 7.4), `${Math.round(t.area || 0)} m²`, brl(t.valor), m2(t.valorM2), m2(t.valorHomM2)]
      vals.forEach((v, i) => { doc.text(T(v), i >= 2 ? x + cols[i][1] - 8 : x, y, { align: i >= 2 ? 'right' : 'left' }); x += cols[i][1] }); y += 15
    })
    y += 2; set(7, 'italic', MUTE); ensure(12)
    doc.text(T(tw.length > 16 ? `Mostrando 16 de ${tw.length} comparáveis. R$/m² homog. = já ajustado por oferta, vaga e área.` : 'R$/m² homog. = já ajustado por oferta, vaga e área.'), M, y); y += 14
  }
  // ═══ 10. Gráficos ═══
  addChart('Radar de proximidade dos comparáveis', charts.radar)
  addChart('Dispersão: área × R$/m²', charts.scatter)
  addChart('Distribuição do R$/m² homogeneizado', charts.dist)
  // ═══ 11. Limitações ═══
  if ((estudo.limitacoes || []).length) { secao('Limitações e ressalvas'); bullets(estudo.limitacoes) }
  // ═══ 12. Glossário ═══
  secao('Glossário técnico')
  bullets(TX.glossario.map(([t, d]) => `${t}: ${d}`))
  // ═══ 13. Referências ═══
  secao('Referências'); bullets(TX.referencias)
  ensure(16); set(8.5, 'normal', SOFT); doc.text(T('Vinícius Graton · Consultor de Imóveis · Rotina Imobiliária · CRECI PJ 132 · (34) 99157-0494'), M, y)

  // paginação "pág X de Y"
  const total = doc.getNumberOfPages()
  for (let p = 1; p <= total; p++) { doc.setPage(p); set(6.5, 'normal', MUTE); doc.text(`pág. ${p} de ${total}`, PW - M, FOOTER_TOP + 15, { align: 'right' }) }
  return doc
}

export async function gerarPdfEstudoM2(estudo, charts) {
  const doc = await montar(estudo, charts)
  doc.save(`estudo-m2-${estudo.numero || 'imovel'}.pdf`)
}
export async function gerarPdfEstudoM2Blob(estudo, charts) {
  const doc = await montar(estudo, charts)
  return doc.output('blob')
}
