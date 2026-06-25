const CHAT_MODEL = 'openai/gpt-oss-120b'
const VISION_MODEL = 'meta-llama/llama-3.2-90b-vision-instruct:free' // Free OpenRouter Vision Model

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing GROQ_API_KEY environment variable' })
  }

  try {
    const { mode, prompt, systemContext, base64Image, mimeType } = req.body || {}
    const safeMimeType = mimeType || 'image/jpeg'
    const cleanBase64 = base64Image ? base64Image.replace(/\s+/g, '') : ''
    
    if (mode === 'vision') {
      const openRouterApiKey = process.env.OPENROUTER_API_KEY
      if (!openRouterApiKey) {
        return res.status(500).json({ error: 'Missing OPENROUTER_API_KEY environment variable' })
      }

      const body = {
        model: VISION_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Provide the final answer directly. DO NOT output internal reasoning. DO NOT use <think> tags. Be extremely concise.\n\n' + prompt },
              { type: 'image_url', image_url: { url: `data:${safeMimeType};base64,${cleanBase64}` } }
            ]
          }
        ],
        max_tokens: 1500,
        temperature: 0.2
      }

      const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openRouterApiKey}`,
          'HTTP-Referer': 'http://localhost:3000', // Required by OpenRouter
          'X-Title': 'Axon AI Helper' // Recommended by OpenRouter
        },
        body: JSON.stringify(body)
      })

      const data = await openRouterRes.json()
      if (!openRouterRes.ok) {
        return res.status(openRouterRes.status).json({ error: data.error?.message || 'OpenRouter API error' })
      }

      let content = data.choices?.[0]?.message?.content || ''
      content = content.replace(/<think>[\s\S]*?(?:<\/think>|$)/g, '').trim()

      return res.status(200).json({ content })
    } else {
      const body = {
        model: CHAT_MODEL,
        messages: [
          { role: 'system', content: systemContext || '' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.7
      }

      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
      })

      const data = await groqRes.json()
      if (!groqRes.ok) {
        return res.status(groqRes.status).json({ error: data.error?.message || 'Groq API error' })
      }

      let content = data.choices?.[0]?.message?.content || ''
      // Remove <think>...</think> block which Qwen reasoning models output
      // Also matches if the model gets cut off and never outputs the closing </think>
      content = content.replace(/<think>[\s\S]*?(?:<\/think>|$)/g, '').trim()

      return res.status(200).json({ content })
    }
  } catch (error) {
    return res.status(500).json({ error: 'Groq proxy failed' })
  }
}
