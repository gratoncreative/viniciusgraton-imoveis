function buildPrompt(tool, campos) {
  if (tool === 'legenda') {
    const { tipo, quartos, suites, vagas, area, bairro, preco, diferenciais, disponivel } = campos
    return `Você é um especialista imobiliário. Gere uma descrição profissional para anúncio em portais (OLX, ZAP, VivaReal).
Imóvel: ${tipo} em ${bairro} - ${area}m² - ${quartos} quartos${suites ? ` (${suites} suítes)` : ''} - ${vagas} vagas.
Preço: R$ ${preco}. ${diferenciais ? `Diferenciais: ${diferenciais}` : ''} ${disponivel ? `Disponível: ${disponivel}` : ''}
Escreva 3 parágrafos: (1) apresentação atrativa, (2) especificações e diferenciais, (3) chamada para ação e contato via WhatsApp com Vinícius Graton (34) 99157-0494. Texto direto, sem emoji excessivo, máximo 350 palavras.`
  }

  if (tool === 'roteiro') {
    const { tipo, quartos, area, bairro, destaque, publico } = campos
    return `Você é um produtor de conteúdo imobiliário. Crie um roteiro de vídeo profissional para um ${tipo} em ${bairro} (${area}m², ${quartos} quartos). Público: ${publico}. Diferencial principal: ${destaque || 'localização e acabamento'}.
Estruture em: ABERTURA (0:00-0:15), ENTRADA/SALA (0:15-0:45), QUARTOS (0:45-1:20), ÁREA EXTERNA/LAZER (1:20-1:50), FECHAMENTO com CTA (1:50-2:10). Inclua a fala exata do corretor em cada trecho. Tom: profissional, entusiasmado, confiante.`
  }

  if (tool === 'rotina') {
    const { im, gancho, nomeCliente, beneficios } = campos
    return `Você escreve mensagens de WhatsApp para corretores imobiliários. Crie uma mensagem de primeiro contato para o cliente "${nomeCliente || 'cliente'}".
Imóvel: ${im.tipo} no ${im.bairro}, R$ ${im.preco?.toLocaleString('pt-BR')}, ${im.quartos} quartos, ${im.area}m².
Gancho escolhido: "${gancho}".
Benefícios do bairro a destacar: ${beneficios?.join(', ')}.
Escreva a mensagem completa pronta para copiar e colar no WhatsApp. Tom consultivo, sem emoji excessivo. Use ".." como pontuação em vez de ":" no meio das frases. Máximo 200 palavras.`
  }

  return null
}

export async function onRequestPost(ctx) {
  const { request, env } = ctx

  if (!env.AI) return Response.json({ ok: false, semChave: true })

  const body = await request.json()
  const { tool, campos } = body

  const prompt = buildPrompt(tool, campos)
  if (!prompt) return Response.json({ ok: false, erro: 'tool inválido' }, { status: 400 })

  let stream
  try {
    stream = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: 'Você é um especialista imobiliário brasileiro. Responda sempre em português do Brasil. Seja direto e profissional.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 700,
      stream: true,
    })
  } catch (e) {
    return new Response(
      `data: ${JSON.stringify({ erro: String(e) })}\n\ndata: [DONE]\n\n`,
      { headers: { 'Content-Type': 'text/event-stream' } },
    )
  }

  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const enc = new TextEncoder()

  const pump = async () => {
    const reader = stream.getReader()
    const dec = new TextDecoder()
    let buf = ''
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') continue
          try {
            const ev = JSON.parse(raw)
            if (ev.response) {
              await writer.write(enc.encode(`data: ${JSON.stringify({ delta: ev.response })}\n\n`))
            }
          } catch {}
        }
      }
    } finally {
      await writer.write(enc.encode('data: [DONE]\n\n'))
      await writer.close()
    }
  }
  pump().catch(() => writer.close())

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
