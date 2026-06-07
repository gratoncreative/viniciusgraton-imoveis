// Valor em reais por extenso (PT-BR), até trilhões. Auxílio de leitura nos campos de dinheiro.
const UNI = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove']
const DEZ10 = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
const DEZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
const CEM = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']
const ESCALA = [['', ''], ['mil', 'mil'], ['milhão', 'milhões'], ['bilhão', 'bilhões'], ['trilhão', 'trilhões']]

function ate999(n) {
  if (n === 0) return ''
  if (n === 100) return 'cem'
  const partes = []
  const c = Math.floor(n / 100)
  const r = n % 100
  if (c) partes.push(CEM[c])
  if (r) {
    if (r < 10) partes.push(UNI[r])
    else if (r < 20) partes.push(DEZ10[r - 10])
    else {
      const d = Math.floor(r / 10), u = r % 10
      partes.push(u ? `${DEZ[d]} e ${UNI[u]}` : DEZ[d])
    }
  }
  return partes.join(' e ')
}

// Converte um inteiro (>=0) em palavras (sem a unidade monetária)
function inteiroPorExtenso(n) {
  if (n === 0) return 'zero'
  const blocos = []
  let x = n
  while (x > 0) { blocos.push(x % 1000); x = Math.floor(x / 1000) }
  const partes = []
  for (let g = blocos.length - 1; g >= 0; g--) {
    const b = blocos[g]
    if (b === 0) continue
    let txt
    if (g === 1) txt = b === 1 ? 'mil' : `${ate999(b)} mil`
    else if (g >= 2) txt = `${ate999(b)} ${b === 1 ? ESCALA[g][0] : ESCALA[g][1]}`
    else txt = ate999(b)
    partes.push({ txt, val: b })
  }
  let out = ''
  partes.forEach((p, i) => {
    if (i === 0) { out = p.txt; return }
    const usaE = p.val < 100 || p.val % 100 === 0
    out += (usaE ? ' e ' : ' ') + p.txt
  })
  return out
}

// "R$ 500.000,00" -> "quinhentos mil reais". Aceita número (reais) com centavos opcionais.
export function reaisPorExtenso(valor) {
  const v = Math.abs(Number(valor) || 0)
  const reais = Math.floor(v)
  const centavos = Math.round((v - reais) * 100)
  if (reais === 0 && centavos === 0) return 'zero real'
  const partes = []
  if (reais > 0) partes.push(`${inteiroPorExtenso(reais)} ${reais === 1 ? 'real' : 'reais'}`)
  if (centavos > 0) partes.push(`${inteiroPorExtenso(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`)
  return partes.join(' e ')
}

// Formata número de reais como "R$500.000,00" (ponto p/ milhar, vírgula p/ centavos)
export function formatBRL(valor) {
  const v = Math.abs(Number(valor) || 0)
  return 'R$' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
