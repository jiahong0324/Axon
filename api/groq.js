const CHAT_MODEL = 'openai/gpt-oss-120b'
const VISION_MODEL = 'nvidia/nemotron-nano-12b-v2-vl:free' // Dedicated Free Vision Language Model

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
      const githubToken = process.env.GITHUB_TOKEN
      if (!githubToken) {
        return res.status(500).json({ error: 'Missing GITHUB_TOKEN environment variable' })
      }

      const body = {
        model: 'Llama-3.2-11B-Vision-Instruct',
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

      const githubRes = await fetch('https://models.github.ai/inference/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${githubToken}`
        },
        body: JSON.stringify(body)
      })

      const data = await githubRes.json()
      if (!githubRes.ok) {
        return res.status(githubRes.status).json({ error: data.error?.message || 'GitHub Models API error' })
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
