// Camada de luzes douradas BEM DISCRETAS sobre a foto do hero (vaga-lumes sutis
// que acendem e apagam devagar). CSS leve, sem vídeo.
const LUZES = [
  { x: 12, y: 64, s: 10, d: 5.2, t: 0 }, { x: 22, y: 78, s: 7, d: 4.6, t: 1.4 },
  { x: 33, y: 58, s: 8, d: 5.8, t: 0.7 }, { x: 47, y: 82, s: 9, d: 5.0, t: 2.2 },
  { x: 58, y: 66, s: 7, d: 4.8, t: 1.1 }, { x: 69, y: 80, s: 10, d: 5.6, t: 0.4 },
  { x: 79, y: 60, s: 7, d: 4.4, t: 2.6 }, { x: 88, y: 76, s: 9, d: 5.2, t: 1.8 },
  { x: 40, y: 44, s: 6, d: 4.2, t: 3.0 }, { x: 74, y: 46, s: 6, d: 4.9, t: 1.5 },
  { x: 92, y: 52, s: 7, d: 5.1, t: 0.9 }, { x: 18, y: 46, s: 6, d: 4.5, t: 2.4 },
]

export default function HeroSkyline() {
  return (
    <div className="hero-skyline" aria-hidden="true">
      {LUZES.map((l, i) => (
        <span key={i} className="hsk-luz" style={{ left: l.x + '%', top: l.y + '%', width: l.s, height: l.s, animationDuration: l.d + 's', animationDelay: l.t + 's' }} />
      ))}
    </div>
  )
}
