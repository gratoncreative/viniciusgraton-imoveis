// Gera um Gaussian Splat .ply de TESTE (cubo de pontos coloridos) só para validar o
// visualizador localmente. NÃO faz parte do site. Saída: public/splats/DEMO/scene.ply
import { writeFileSync, mkdirSync } from 'node:fs'

const C0 = 0.28209479177387814
const f_dc = (c) => (c - 0.5) / C0           // cor [0..1] -> SH DC
const logit = (a) => Math.log(a / (1 - a))   // opacidade -> valor armazenado
const logS = (s) => Math.log(s)              // escala -> log

const pts = []
const N = 14
for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) for (let k = 0; k < N; k++) {
  // só a "casca" do cubo, pra parecer um objeto
  if (i > 0 && i < N - 1 && j > 0 && j < N - 1 && k > 0 && k < N - 1) continue
  const x = (i / (N - 1) - 0.5) * 2
  const y = (j / (N - 1) - 0.5) * 2
  const z = (k / (N - 1) - 0.5) * 2
  pts.push({ x, y, z, r: i / (N - 1), g: j / (N - 1), b: k / (N - 1) })
}

const props = ['x','y','z','f_dc_0','f_dc_1','f_dc_2','opacity','scale_0','scale_1','scale_2','rot_0','rot_1','rot_2','rot_3']
const header =
  'ply\nformat binary_little_endian 1.0\n' +
  `element vertex ${pts.length}\n` +
  props.map((p) => `property float ${p}`).join('\n') + '\n' +
  'end_header\n'

const buf = Buffer.alloc(pts.length * props.length * 4)
let o = 0
const w = (v) => { buf.writeFloatLE(v, o); o += 4 }
for (const p of pts) {
  w(p.x); w(p.y); w(p.z)
  w(f_dc(p.r)); w(f_dc(p.g)); w(f_dc(p.b))
  w(logit(0.95))
  w(logS(0.06)); w(logS(0.06)); w(logS(0.06))
  w(1); w(0); w(0); w(0)
}

mkdirSync('public/splats/DEMO', { recursive: true })
writeFileSync('public/splats/DEMO/scene.ply', Buffer.concat([Buffer.from(header, 'ascii'), buf]))
console.log(`ok: ${pts.length} splats -> public/splats/DEMO/scene.ply`)
