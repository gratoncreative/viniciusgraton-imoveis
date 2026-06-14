export async function gerarComIA(tool, campos, onDelta, onDone, onError) {
  try {
    const res = await fetch('/api/ferramenta-ia', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tool, campos }),
    })
    if (!res.ok) { onError('Erro na requisição'); return }
    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let buf = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (raw === '[DONE]') { onDone(); return }
        try {
          const ev = JSON.parse(raw)
          if (ev.delta) onDelta(ev.delta)
          if (ev.erro) { onError(ev.erro); return }
          if (ev.semChave) { onError('__sem_chave__'); return }
        } catch {}
      }
    }
    onDone()
  } catch (e) { onError(String(e)) }
}
