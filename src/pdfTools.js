// Catálogo das ferramentas de PDF — alimenta o hub /ferramentas/pdf (estilo iLovePDF)
// e os cross-links. status: 'live' (no ar) | 'breve' (em construção).
// Cores da MARCA VG (vermelho/navy/dourado), sem rainbow e sem preto.

export const PDF_CATEGORIAS = [
  { id: 'organizar', nome: 'Organizar PDF', sub: 'Junte, divida e reordene' },
  { id: 'otimizar', nome: 'Otimizar PDF', sub: 'Comprima e reconheça texto' },
  { id: 'converter', nome: 'Converter PDF', sub: 'De e para imagem' },
  { id: 'editar', nome: 'Editar PDF', sub: 'Numere, marque e assine' },
  { id: 'seguranca', nome: 'Segurança', sub: 'Senha e proteção' },
  { id: 'ia', nome: 'PDF com IA', sub: 'Resuma e traduza' },
]

const VERMELHO = '#EB0128'
const NAVY = '#1C2A44'
const DOURADO = '#C9A24B'

export const PDF_CATALOGO = [
  // Organizar
  { slug: 'juntar-pdf', nome: 'Juntar PDF', desc: 'Una vários PDFs em um só.', cat: 'organizar', cor: VERMELHO, status: 'live' },
  { slug: 'dividir-pdf', nome: 'Dividir PDF', desc: 'Separe ou extraia páginas.', cat: 'organizar', cor: VERMELHO, status: 'live' },
  { slug: 'organizar-pdf', nome: 'Organizar páginas', desc: 'Reordene e apague páginas.', cat: 'organizar', cor: VERMELHO, status: 'breve' },
  { slug: 'rodar-pdf', nome: 'Rodar PDF', desc: 'Gire as páginas do documento.', cat: 'organizar', cor: VERMELHO, status: 'live' },
  // Otimizar
  { slug: 'comprimir-pdf', nome: 'Comprimir PDF', desc: 'Reduza o tamanho do arquivo.', cat: 'otimizar', cor: NAVY, status: 'live' },
  { slug: 'ocr-pdf', nome: 'OCR PDF', desc: 'PDF escaneado vira texto pesquisável.', cat: 'otimizar', cor: NAVY, status: 'breve' },
  // Converter
  { slug: 'pdf-para-jpg', nome: 'PDF para JPG', desc: 'Cada página vira imagem.', cat: 'converter', cor: DOURADO, status: 'live' },
  { slug: 'imagem-para-pdf', nome: 'Imagem para PDF', desc: 'JPG, PNG e HEIC num PDF.', cat: 'converter', cor: DOURADO, status: 'live' },
  // Editar
  { slug: 'numeros-pagina', nome: 'Números de página', desc: 'Numere as páginas do PDF.', cat: 'editar', cor: NAVY, status: 'breve' },
  { slug: 'marca-dagua', nome: "Marca d'água", desc: 'Texto ou imagem por cima do PDF.', cat: 'editar', cor: NAVY, status: 'breve' },
  { slug: 'recortar-pdf', nome: 'Recortar PDF', desc: 'Corte as margens das páginas.', cat: 'editar', cor: NAVY, status: 'breve' },
  { slug: 'assinar-pdf', nome: 'Assinar PDF', desc: 'Assine e carimbe no documento.', cat: 'editar', cor: NAVY, status: 'breve' },
  // Segurança
  { slug: 'proteger-pdf', nome: 'Proteger PDF', desc: 'Coloque senha no seu PDF.', cat: 'seguranca', cor: VERMELHO, status: 'breve' },
  { slug: 'desbloquear-pdf', nome: 'Desbloquear PDF', desc: 'Remova a senha do PDF.', cat: 'seguranca', cor: VERMELHO, status: 'breve' },
  // IA
  { slug: 'resumir-pdf', nome: 'Resumir com IA', desc: 'Resumo automático do documento.', cat: 'ia', cor: DOURADO, status: 'breve' },
  { slug: 'traduzir-pdf', nome: 'Traduzir PDF', desc: 'Traduza o texto do PDF.', cat: 'ia', cor: DOURADO, status: 'breve' },
]

export const pdfLive = () => PDF_CATALOGO.filter((t) => t.status === 'live')
export const pdfPorCategoria = (cat) => PDF_CATALOGO.filter((t) => t.cat === cat)
