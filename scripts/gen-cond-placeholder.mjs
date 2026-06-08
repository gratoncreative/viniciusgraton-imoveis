// Gera a capa-padrao de marca para condominios SEM foto oficial.
// SVG -> JPG via sharp (sem rede). Saida: public/img/cond/_sem-foto.jpg
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const out = path.join(ROOT, 'public', 'img', 'cond', '_sem-foto.jpg')

const W = 1280, H = 720
// skyline de predios na base (sobrio, dourado de baixa opacidade)
let skyline = ''
const baseY = H - 70
let x = 70
const heights = [120, 180, 90, 220, 150, 260, 130, 200, 110, 240, 160, 190, 100, 230, 140, 180]
for (let i = 0; i < heights.length && x < W - 70; i++) {
  const w = 56 + (i % 3) * 14
  const h = heights[i % heights.length]
  skyline += `<rect x="${x}" y="${baseY - h}" width="${w}" height="${h}" fill="none" stroke="#b8862f" stroke-width="1.4" opacity="0.16" rx="3"/>`
  // janelas
  for (let wy = baseY - h + 16; wy < baseY - 14; wy += 26) {
    for (let wx = x + 12; wx < x + w - 8; wx += 20) {
      skyline += `<rect x="${wx}" y="${wy}" width="7" height="11" fill="#e0b556" opacity="0.12"/>`
    }
  }
  x += w + 20
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1c222e"/>
      <stop offset="0.55" stop-color="#11151d"/>
      <stop offset="1" stop-color="#0b0e16"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f7e3a4"/>
      <stop offset="0.45" stop-color="#e0b556"/>
      <stop offset="1" stop-color="#b8862f"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <g>${skyline}</g>
  <rect x="34" y="34" width="${W - 68}" height="${H - 68}" rx="14" fill="none" stroke="#b8862f" stroke-width="1.4" opacity="0.5"/>
  <!-- emblema: predio -->
  <g transform="translate(${W / 2 - 26}, 210)">
    <rect x="0" y="0" width="52" height="74" rx="5" fill="none" stroke="url(#gold)" stroke-width="2.4"/>
    <line x1="14" y1="16" x2="22" y2="16" stroke="#e0b556" stroke-width="2.4" stroke-linecap="round"/>
    <line x1="30" y1="16" x2="38" y2="16" stroke="#e0b556" stroke-width="2.4" stroke-linecap="round"/>
    <line x1="14" y1="33" x2="22" y2="33" stroke="#e0b556" stroke-width="2.4" stroke-linecap="round"/>
    <line x1="30" y1="33" x2="38" y2="33" stroke="#e0b556" stroke-width="2.4" stroke-linecap="round"/>
    <line x1="14" y1="50" x2="22" y2="50" stroke="#e0b556" stroke-width="2.4" stroke-linecap="round"/>
    <line x1="30" y1="50" x2="38" y2="50" stroke="#e0b556" stroke-width="2.4" stroke-linecap="round"/>
    <rect x="20" y="60" width="12" height="14" fill="#e0b556"/>
  </g>
  <text x="${W / 2}" y="360" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="46" letter-spacing="6" fill="url(#gold)">VINÍCIUS GRATON</text>
  <text x="${W / 2}" y="404" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="19" letter-spacing="4" fill="#cdd2dc" opacity="0.85">CONSULTOR DE IMÓVEIS · UBERLÂNDIA</text>
  <line x1="${W / 2 - 130}" y1="438" x2="${W / 2 + 130}" y2="438" stroke="#b8862f" stroke-width="1" opacity="0.5"/>
  <text x="${W / 2}" y="478" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="26" fill="#f4d98a">Curadoria de Condomínios</text>
  <text x="${W / 2}" y="520" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="15" letter-spacing="3" fill="#8a9080">FOTOS OFICIAIS SOB CONSULTA</text>
</svg>`

await sharp(Buffer.from(svg)).jpeg({ quality: 86, mozjpeg: true }).toFile(out)
console.log('OK ->', out)
