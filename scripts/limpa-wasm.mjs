// Remove o .wasm gigante do onnxruntime-web do dist/.
// Em runtime carregamos o WASM do CDN (jsdelivr) via ort.env.wasm.wasmPaths,
// então o arquivo local é inútil — e ele estoura o limite de 25 MiB por arquivo
// do Cloudflare Pages, quebrando o deploy. Aqui apagamos ele do build.
import fs from 'fs'
import path from 'path'

const dir = path.resolve('dist/assets')
let apagados = 0
try {
  for (const f of fs.readdirSync(dir)) {
    if (/^ort-.*\.wasm$/i.test(f) || /^ort-.*\.mjs$/i.test(f)) {
      fs.rmSync(path.join(dir, f))
      apagados++
      console.log('removido do dist (usa CDN):', f)
    }
  }
} catch (e) {
  console.log('limpa-wasm: nada a fazer (', e.message, ')')
}
console.log('limpa-wasm: ' + apagados + ' arquivo(s) ort removido(s).')
