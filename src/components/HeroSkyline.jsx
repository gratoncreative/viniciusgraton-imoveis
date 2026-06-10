// Fundo animado do hero: cena "jardim ao entardecer" — verde suave, folhagens
// elegantes e luzes douradas (lanternas/vaga-lumes) que acendem e apagam.
// CSS/SVG leve, agradável e estiloso (sem vídeo).

// luzes que acendem: {x%, y%, tamanho px, duração s, atraso s}
const LUZES = [
  { x: 8, y: 70, s: 18, d: 4.5, t: 0 }, { x: 16, y: 52, s: 11, d: 3.8, t: 1.2 },
  { x: 24, y: 82, s: 14, d: 5.2, t: 0.6 }, { x: 34, y: 64, s: 9, d: 4.0, t: 2.1 },
  { x: 44, y: 86, s: 16, d: 5.6, t: 0.3 }, { x: 52, y: 58, s: 10, d: 4.2, t: 1.7 },
  { x: 61, y: 78, s: 13, d: 4.8, t: 0.9 }, { x: 70, y: 60, s: 9, d: 3.6, t: 2.4 },
  { x: 78, y: 84, s: 17, d: 5.4, t: 0.4 }, { x: 86, y: 66, s: 12, d: 4.4, t: 1.4 },
  { x: 92, y: 80, s: 10, d: 4.0, t: 2.0 }, { x: 12, y: 38, s: 8, d: 3.9, t: 1.0 },
  { x: 40, y: 42, s: 9, d: 4.6, t: 2.6 }, { x: 66, y: 40, s: 8, d: 4.1, t: 0.8 },
  { x: 88, y: 44, s: 10, d: 4.7, t: 1.9 }, { x: 30, y: 30, s: 7, d: 3.7, t: 3.0 },
]

// folhagens nos cantos: {classe de posição}
const FOLHAS = [
  { c: 'hsk-leaf--tl', delay: 0 }, { c: 'hsk-leaf--tl2', delay: 1.5 },
  { c: 'hsk-leaf--br', delay: 0.8 }, { c: 'hsk-leaf--br2', delay: 2.2 },
  { c: 'hsk-leaf--bl', delay: 1.1 },
]

const Folha = () => (
  <svg className="hsk-leaf-svg" viewBox="0 0 100 150" fill="currentColor" aria-hidden="true">
    <path d="M50 4 C18 42, 18 108, 50 146 C82 108, 82 42, 50 4 Z" />
    <path d="M50 16 L50 138" stroke="rgba(0,0,0,0.18)" strokeWidth="3" fill="none" />
  </svg>
)

export default function HeroSkyline() {
  return (
    <div className="hero-skyline" aria-hidden="true">
      <span className="hsk-glow" />
      {FOLHAS.map((f, i) => (
        <span key={'f' + i} className={`hsk-leaf ${f.c}`} style={{ animationDelay: f.delay + 's' }}><Folha /></span>
      ))}
      {LUZES.map((l, i) => (
        <span key={'l' + i} className="hsk-luz" style={{ left: l.x + '%', top: l.y + '%', width: l.s, height: l.s, animationDuration: l.d + 's', animationDelay: l.t + 's' }} />
      ))}
    </div>
  )
}
