// Cálculo de financiamento imobiliário brasileiro (SAC e Price) — funções puras.
// Spec v1.0, dados de mercado de maio de 2026. Validado contra exemplos conhecidos.

// Taxa anual -> mensal por juros compostos (capitalização mensal).
export const taxaMensal = (anual) => Math.pow(1 + anual, 1 / 12) - 1

// Taxa efetiva mensal = juros + componente mensal da TR.
export const taxaEfetivaMensal = (jurosAnual, trAnual = 0) =>
  taxaMensal(jurosAnual) + (trAnual > 0 ? taxaMensal(trAnual) : 0)

// Parcela fixa da Tabela Price. i = taxa MENSAL, n = nº de parcelas.
export const parcelaPrice = (pv, n, i) => {
  if (!(pv > 0) || !(n > 0)) return 0
  if (i === 0) return pv / n
  const f = Math.pow(1 + i, n)
  return (pv * (i * f)) / (f - 1)
}

// Faixas simplificadas do MIP (% mensal sobre o saldo devedor) por idade.
export const MIP_FAIXAS = [
  { ate: 29, taxa: 0.00022 },
  { ate: 39, taxa: 0.00035 },
  { ate: 49, taxa: 0.00060 },
  { ate: 59, taxa: 0.00120 },
  { ate: 200, taxa: 0.00200 },
]
export const mipTaxa = (idade) =>
  (MIP_FAIXAS.find((f) => idade <= f.ate) || MIP_FAIXAS[MIP_FAIXAS.length - 1]).taxa

// Bancos (taxas de balcão SBPE, maio/2026) — valores PADRÃO editáveis na UI.
export const BANCOS = [
  { id: 'caixa', nome: 'Caixa Econômica Federal', taxa: 0.1119, cota: 0.80, prazo: 420 },
  { id: 'brb', nome: 'BRB', taxa: 0.1136, cota: 0.80, prazo: 420 },
  { id: 'bb', nome: 'Banco do Brasil (SBPE)', taxa: 0.1160, cota: 0.80, prazo: 420 },
  { id: 'bb-pro', nome: 'Banco do Brasil (Pró-Cotista)', taxa: 0.0900, cota: 0.80, prazo: 420 },
  { id: 'santander', nome: 'Santander', taxa: 0.1169, cota: 0.90, prazo: 420 },
  { id: 'itau', nome: 'Itaú', taxa: 0.1170, cota: 0.80, prazo: 420 },
  { id: 'bradesco', nome: 'Bradesco', taxa: 0.1170, cota: 0.80, prazo: 420 },
  { id: 'inter', nome: 'Banco Inter', taxa: 0.1376, cota: 0.80, prazo: 420 },
  { id: 'mcmv', nome: 'Minha Casa Minha Vida (Faixa 4)', taxa: 0.1000, cota: 0.80, prazo: 420 },
  { id: 'custom', nome: 'Taxa personalizada', taxa: 0.1119, cota: 0.90, prazo: 420 },
]

// Parâmetros gerais de 2026.
export const PARAMS = {
  tetoSFH: 2250000,
  comprometimentoMax: 0.30,
  prazoMaxMeses: 420,
  dfiMes: 0.000134,      // DFI mensal sobre o valor do imóvel
  taxaAdm: 25,           // taxa de administração mensal (teto SFH)
  itbiPct: 0.02,         // ITBI Uberlândia (transmissão onerosa)
  registroPct: 0.011,    // registro e cartório
  avaliacao: 1000,       // taxa de avaliação do banco
}

// Simulação completa. Retorna parcela (com seguros), totais, custos e renda.
export function simular({
  valorImovel,
  entradaValor,
  jurosAnual,
  trAnual = 0,
  prazoMeses,
  sistema = 'SAC',
  idade = 35,
  renda = 0,
  itbiPct = PARAMS.itbiPct,
  registroPct = PARAMS.registroPct,
  avaliacao = PARAMS.avaliacao,
  taxaAdm = PARAMS.taxaAdm,
  dfiMes = PARAMS.dfiMes,
}) {
  const pv = Math.max(0, (valorImovel || 0) - (entradaValor || 0))
  const i = taxaEfetivaMensal(jurosAnual, trAnual)
  const n = Math.round(prazoMeses)
  if (!(pv > 0) || !(n > 0) || !(i >= 0)) return null

  const dfi = valorImovel * dfiMes
  const mip = mipTaxa(idade)
  const amortSAC = pv / n
  const pmt = sistema === 'Price' ? parcelaPrice(pv, n, i) : 0

  const linhas = []
  let saldo = pv
  let totJuros = 0
  let totSeguros = 0
  let totAdm = 0

  for (let t = 1; t <= n; t++) {
    const juros = saldo * i
    const amort = sistema === 'Price' ? pmt - juros : amortSAC
    const parcelaBase = amort + juros
    const mipT = saldo * mip
    const parcela = parcelaBase + mipT + dfi + taxaAdm
    const novoSaldo = Math.max(0, saldo - amort)
    linhas.push({ t, parcela, parcelaBase, juros, amort, mip: mipT, dfi, adm: taxaAdm, saldo: novoSaldo })
    totJuros += juros
    totSeguros += mipT + dfi
    totAdm += taxaAdm
    saldo = novoSaldo
  }

  // Parcela de referência = a MAIOR parcela do contrato (SAC.. primeira; Price.. também
  // a primeira, pois o MIP cai com o saldo). É a que o banco usa para aprovar.
  const parcelaRef = linhas[0].parcela
  const parcelaBaseRef = sistema === 'Price' ? pmt : linhas[0].parcelaBase

  const itbi = valorImovel * itbiPct
  const registro = valorImovel * registroPct
  const custosIniciais = (entradaValor || 0) + itbi + registro + avaliacao
  const custoTotal = valorImovel + totJuros + totSeguros + totAdm + itbi + registro + avaliacao
  const rendaMinima = parcelaRef / PARAMS.comprometimentoMax
  const comprometimento = renda > 0 ? parcelaRef / renda : null

  return {
    pv, i, n, sistema, pmt,
    linhas,
    primeiraParcela: linhas[0].parcela,
    ultimaParcela: linhas[n - 1].parcela,
    parcelaRef, parcelaBaseRef,
    totJuros, totSeguros, totAdm,
    itbi, registro, avaliacao,
    custosIniciais, custoTotal,
    rendaMinima, comprometimento,
    totalPago: valorImovel + totJuros + totSeguros + totAdm,
  }
}

// Resumo para o comparativo SAC x Price (sem montar a tabela inteira na UI).
export function comparativo(params) {
  const sac = simular({ ...params, sistema: 'SAC' })
  const price = simular({ ...params, sistema: 'Price' })
  return { sac, price }
}
