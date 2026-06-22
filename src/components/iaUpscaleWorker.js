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
 *   <- { type:'load', id, device, modelo, dtype }   -> { type:'loaded', id } | { type:'error', id, message }
 *   <- { type:'run',  id, device, modelo, dtype, width, height, data:ArrayBuffer(RGBA) }
 *                                                   -> { type:'result', id, width, height, data:ArrayBuffer(RGBA) } | { type:'error', id, message }
 *   ->{ type:'progress', pct }   (download do modelo, sem id)
 *
 * O modelo é escolhido pela thread principal (hoje sempre o swin2SR "lightweight",
 * leve e estável até no WebGPU). Na CPU ela manda dtype 'q8' (pesos quantizados,
 * mais rápidos). Se a GPU cair, ela descarta este worker e cria um novo em CPU.
 */
import { pipeline, env, RawImage } from '@huggingface/transformers'

env.allowLocalModels = false
env.allowRemoteModels = true
env.useBrowserCache = true
// single-thread no wasm: dispensa SharedArrayBuffer/COOP-COEP (mais compatível)
try { if (env.backends?.onnx?.wasm) env.backends.onnx.wasm.numThreads = 1 } catch { /* ignora */ }

const MODELO_PADRAO = 'Xenova/swin2SR-lightweight-x2-64'
let upscaler = null
let chaveAtual = null

async function carregar(device, modelo, dtype) {
  const m = modelo || MODELO_PADRAO
  const chave = `${device || ''}|${m}|${dtype || ''}`
  if (upscaler && chaveAtual === chave) return
  upscaler = null // libera o anterior antes de montar outro
  const opts = {
    progress_callback: (p) => {
      if (p && p.status === 'progress' && p.total) {
        self.postMessage({ type: 'progress', pct: Math.round((p.loaded / p.total) * 100) })
      }
    },
  }
  if (device) opts.device = device
  if (dtype) opts.dtype = dtype
  upscaler = await pipeline('image-to-image', m, opts)
  chaveAtual = chave
}

self.onmessage = async (e) => {
  const msg = e.data || {}
  try {
    if (msg.type === 'load') {
      await carregar(msg.device, msg.modelo, msg.dtype)
      self.postMessage({ type: 'loaded', id: msg.id })
      return
    }
    if (msg.type === 'run') {
      await carregar(msg.device, msg.modelo, msg.dtype)
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
