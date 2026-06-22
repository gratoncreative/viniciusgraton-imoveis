/* Web Worker isolado da super-resolução com IA (swin2SR x2).
 *
 * Roda a inferência AQUI (fora da thread principal) por dois motivos:
 *  1. Não congela a interface durante o processamento (que pode ser pesado).
 *  2. Isolamento: se o WebGPU quebrar em runtime ("A valid external Instance
 *     reference no longer exists"), ele corrompe o runtime do ONNX para o resto
 *     da página. A thread principal então DESCARTA este worker e cria um novo,
 *     limpo, forçado em CPU/wasm — onde a inferência sempre conclui.
 *
 * Protocolo (mensagens com `id` para casar pedido/resposta):
 *   <- { type:'load', id, device }                 -> { type:'loaded', id } | { type:'error', id, message }
 *   <- { type:'run',  id, device, width, height, data:ArrayBuffer(RGBA) }
 *                                                   -> { type:'result', id, width, height, data:ArrayBuffer(RGBA) } | { type:'error', id, message }
 *   ->{ type:'progress', pct }   (download do modelo, sem id)
 */
import { pipeline, env, RawImage } from '@huggingface/transformers'

env.allowLocalModels = false
env.allowRemoteModels = true
env.useBrowserCache = true
// single-thread no wasm: dispensa SharedArrayBuffer/COOP-COEP (mais compatível)
try { if (env.backends?.onnx?.wasm) env.backends.onnx.wasm.numThreads = 1 } catch { /* ignora */ }

// Sempre o "lightweight": ~10x menos cálculo que o "classical". No WebGPU o modelo
// classical sobrecarregava o driver até o device cair (DXGI_ERROR_DEVICE_HUNG /
// "external Instance reference no longer exists"); o lightweight roda estável na GPU
// e ainda é ótimo p/ recuperar foto de baixa qualidade. Na CPU usamos os pesos q8.
const MODELO = 'Xenova/swin2SR-lightweight-x2-64'
let upscaler = null
let deviceAtual = null

async function carregar(device) {
  if (upscaler && deviceAtual === device) return
  const opts = {
    progress_callback: (p) => {
      if (p && p.status === 'progress' && p.total) {
        self.postMessage({ type: 'progress', pct: Math.round((p.loaded / p.total) * 100) })
      }
    },
  }
  if (device) opts.device = device
  if (device === 'wasm') opts.dtype = 'q8' // pesos quantizados (int8): bem mais rápidos na CPU
  upscaler = await pipeline('image-to-image', MODELO, opts)
  deviceAtual = device
}

self.onmessage = async (e) => {
  const msg = e.data || {}
  try {
    if (msg.type === 'load') {
      await carregar(msg.device)
      self.postMessage({ type: 'loaded', id: msg.id })
      return
    }
    if (msg.type === 'run') {
      await carregar(msg.device)
      // entrada: RGBA cru -> RawImage RGB (o modelo trabalha em RGB)
      const entrada = new RawImage(new Uint8ClampedArray(msg.data), msg.width, msg.height, 4).rgb()
      const saida = await upscaler(entrada)
      const rgba = saida.rgba()            // 4 canais p/ virar ImageData na thread principal
      const buf = new Uint8ClampedArray(rgba.data) // cópia própria, transferível
      self.postMessage(
        { type: 'result', id: msg.id, width: rgba.width, height: rgba.height, data: buf.buffer },
        [buf.buffer],
      )
      return
    }
  } catch (err) {
    self.postMessage({ type: 'error', id: msg.id, message: String((err && err.message) || err) })
  }
}
