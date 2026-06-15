import { useState } from 'react'
import JSZip from 'jszip'

// Protótipo — download de TODAS as fotos do imóvel aberto, com marca d'água
// do site (grande, diagonal, baixa opacidade) aplicada no momento do download.
// O processamento é 100% no navegador (canvas + JSZip); o CDN da Rotina
// permite CORS, então não precisa de servidor.

const MARCA = 'viniciusgraton.com.br'

// Marca d'água: a URL do site repetida na diagonal, grande e com baixa
// opacidade, para identificar a origem sem atrapalhar a leitura da foto.
function desenharMarca(ctx, w, h) {
  ctx.save()
  const fonte = Math.max(20, Math.round(w * 0.042))
  ctx.font = `700 ${fonte}px "Inter", "Segoe UI", system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const txtW = ctx.measureText(MARCA).width
  const passoX = txtW + fonte * 2.4
  const passoY = fonte * 4.6
  ctx.translate(w / 2, h / 2)
  ctx.rotate((-28 * Math.PI) / 180)
  const diag = Math.sqrt(w * w + h * h)
  ctx.fillStyle = 'rgba(255,255,255,0.16)'
  ctx.shadowColor = 'rgba(0,0,0,0.20)'
  ctx.shadowBlur = Math.round(fonte * 0.12)
  let linha = 0
  for (let y = -diag / 2; y < diag / 2; y += passoY) {
    const offset = (linha % 2) * (passoX / 2)
    for (let x = -diag / 2 - offset; x < diag / 2 + passoX; x += passoX) {
      ctx.fillText(MARCA, x, y)
    }
    linha++
  }
  ctx.restore()
}

function carregarImagem(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Falha ao carregar ' + url))
    img.src = url
  })
}

export default function BaixarFotosImovel({ im, fotos = [] }) {
  const [estado, setEstado] = useState('idle') // idle | baixando | ok | erro
  const [prog, setProg] = useState({ feito: 0, total: 0, falhas: 0 })

  const baixar = async () => {
    if (!fotos.length || estado === 'baixando') return
    setEstado('baixando')
    setProg({ feito: 0, total: fotos.length, falhas: 0 })

    const zip = new JSZip()
    let feito = 0
    let falhas = 0

    for (let i = 0; i < fotos.length; i++) {
      try {
        const img = await carregarImagem(fotos[i])
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        desenharMarca(ctx, canvas.width, canvas.height)
        const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.9))
        if (blob) {
          zip.file(`${im.codigo}_foto_${String(i + 1).padStart(2, '0')}.jpg`, blob)
          feito++
        } else {
          falhas++
        }
        canvas.width = 0
        canvas.height = 0
      } catch {
        falhas++
      }
      setProg({ feito, total: fotos.length, falhas })
    }

    if (feito === 0) {
      setEstado('erro')
      setTimeout(() => setEstado('idle'), 4000)
      return
    }

    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 3 },
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(zipBlob)
    a.download = `fotos_${im.tipo ? im.tipo.toLowerCase().replace(/\s+/g, '-') + '_' : ''}cod-${im.codigo}.zip`
    a.click()
    URL.revokeObjectURL(a.href)

    setEstado('ok')
    setTimeout(() => setEstado('idle'), 5000)
  }

  if (!fotos.length) return null

  const rotulo =
    estado === 'baixando'
      ? `Baixando ${prog.feito}/${prog.total}…`
      : estado === 'ok'
        ? 'Fotos baixadas!'
        : estado === 'erro'
          ? 'Erro — tente de novo'
          : `Baixar fotos (${fotos.length})`

  return (
    <button
      className={`det-btn-acao${estado === 'baixando' ? ' det-btn-acao--proc' : ''}${estado === 'ok' ? ' det-btn-acao--ok' : ''}`}
      onClick={baixar}
      disabled={estado === 'baixando'}
      title="Baixa todas as fotos do imóvel com a marca d'água do site"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
        <path d="M12 13v6M9 16l3 3 3-3" />
      </svg>
      {rotulo}
    </button>
  )
}
