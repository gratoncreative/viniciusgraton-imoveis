// Gera a capa (Open Graph) do link da SELEÇÃO DO CLIENTE: foto real + degradê + texto.
// Saída: public/og/selecao-cliente.png (1280x720). Rode: node scripts/gen-og-cliente.mjs
import sharp from 'sharp'
import fs from 'node:fs'

const W = 1280, H = 720
const BG = 'scripts/_og-bg.jpg'
const OUT = 'public/og/selecao-cliente.png'

const overlay = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#090d15" stop-opacity="0.20"/>
      <stop offset="48%" stop-color="#090d15" stop-opacity="0.50"/>
      <stop offset="100%" stop-color="#090d15" stop-opacity="0.94"/>
    </linearGradient>
    <linearGradient id="gl" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#090d15" stop-opacity="0.62"/>
      <stop offset="60%" stop-color="#090d15" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect width="${W}" height="${H}" fill="url(#gl)"/>
  <rect x="84" y="452" width="66" height="5" rx="2" fill="#d8b369"/>
  <text x="82" y="536" font-family="Georgia, 'Times New Roman', serif" font-size="78" font-weight="700" fill="#f5ecd6">Sua seleção de imóveis</text>
  <text x="86" y="588" font-family="Georgia, 'Times New Roman', serif" font-size="32" font-style="italic" fill="#e0c389">Escolhidos a dedo pra você</text>
  <text x="86" y="638" font-family="Arial, Helvetica, sans-serif" font-size="22" letter-spacing="3" fill="#cfcabf">VINÍCIUS GRATON · IMÓVEIS EM UBERLÂNDIA</text>
</svg>`

const bg = await sharp(BG).resize(W, H, { fit: 'cover', position: 'attention' }).toBuffer()
await sharp(bg)
  .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
  .png({ quality: 90 })
  .toFile(OUT)

console.log('OK ->', OUT, '(' + Math.round(fs.statSync(OUT).size / 1024) + ' KB)')
