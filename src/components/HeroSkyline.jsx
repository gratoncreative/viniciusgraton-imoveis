// Skyline animado (CSS/SVG, leve — sem vídeo) pro hero: silhueta de prédios
// com janelas que acendem/piscam suave em dourado. Tema "cidade ao anoitecer".
const BUILDINGS = [
  { x: 0, w: 90, h: 150 }, { x: 96, w: 70, h: 224 }, { x: 172, w: 112, h: 180 },
  { x: 290, w: 66, h: 272 }, { x: 362, w: 120, h: 200 }, { x: 488, w: 82, h: 250 },
  { x: 576, w: 100, h: 160 }, { x: 682, w: 76, h: 300 }, { x: 764, w: 132, h: 212 },
  { x: 902, w: 70, h: 262 }, { x: 978, w: 112, h: 188 }, { x: 1096, w: 86, h: 292 },
  { x: 1188, w: 122, h: 172 }, { x: 1316, w: 80, h: 244 }, { x: 1402, w: 64, h: 204 },
]
const VW = 1466, VH = 320

export default function HeroSkyline() {
  const wins = []
  let k = 0
  for (const b of BUILDINGS) {
    const cols = Math.max(2, Math.floor(b.w / 24))
    const rows = Math.max(2, Math.floor(b.h / 32))
    const gx = (b.w - 16) / cols
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows - 1; r++) {
        const x = b.x + 8 + c * gx
        const y = VH - b.h + 16 + r * 28
        const lit = k % 4 === 0
        const tw = k % 3 === 0
        wins.push({ x, y, lit, tw, d: (k % 9) * 0.45, k })
        k++
      }
    }
  }
  return (
    <div className="hero-skyline" aria-hidden="true">
      <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMax slice">
        {BUILDINGS.map((b, i) => (
          <rect key={'b' + i} x={b.x} y={VH - b.h} width={b.w - 4} height={b.h + 4} rx="2" fill="#0a0e16" />
        ))}
        {wins.map((w) => (
          <rect key={w.k} x={w.x} y={w.y} width="5" height="7" rx="1"
            className={`hsk-win${w.lit ? ' lit' : ''}${w.tw ? ' tw' : ''}`}
            style={w.tw ? { animationDelay: w.d + 's' } : undefined} />
        ))}
      </svg>
    </div>
  )
}
