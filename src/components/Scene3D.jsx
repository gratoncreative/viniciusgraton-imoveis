// Poeira dourada leve (CSS puro) — substitui o WebGL pesado.
// O efeito 3D do hero vem do parallax da imagem; isto só dá um brilho ambiente sutil.

// posições/tempos determinísticos (estáveis entre renders), sem aleatoriedade
const PARTICLES = Array.from({ length: 18 }, (_, i) => {
  const a = ((i * 9301 + 49297) % 233280) / 233280
  const b = ((i * 21737 + 6173) % 99991) / 99991
  return {
    left: (a * 100).toFixed(2),
    size: (2 + b * 4).toFixed(1),
    dur: (11 + a * 13).toFixed(1),
    delay: (-b * 18).toFixed(1),
    drift: ((a - 0.5) * 50).toFixed(0),
    opacity: (0.12 + b * 0.3).toFixed(2),
  }
})

export default function Scene3D() {
  return (
    <div className="dust" aria-hidden="true">
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="dust-p"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
            '--drift': `${p.drift}px`,
          }}
        />
      ))}
    </div>
  )
}
