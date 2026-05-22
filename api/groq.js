const CHAT_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'

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
    const body = mode === 'vision'
      ? {
          model: VISION_MODEL,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } },
                { type: 'text', text: prompt }
              ]
            }
          ],
          max_tokens: 2000,
          temperature: 0.2
        }
      : {
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

    return res.status(200).json({ content: data.choices?.[0]?.message?.content || '' })
  } catch (error) {
    return res.status(500).json({ error: 'Groq proxy failed' })
  }
}
