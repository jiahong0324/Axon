const CHAT_MODEL = 'openai/gpt-oss-120b'

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
      const geminiApiKey = process.env.GEMINI_API_KEY
      if (!geminiApiKey) {
        return res.status(500).json({ error: 'Missing GEMINI_API_KEY environment variable' })
      }

      const geminiBody = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: safeMimeType,
                  data: cleanBase64
                }
              }
            ]
          }
        ],
        system_instruction: {
          parts: [
            { text: 'Provide the final answer directly. DO NOT output internal reasoning. DO NOT use <think> tags. Be extremely concise.' }
          ]
        },
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1500
        }
      }

      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(geminiBody)
      })

      const data = await geminiRes.json()
      if (!geminiRes.ok) {
        return res.status(geminiRes.status).json({ error: data.error?.message || 'Gemini API error' })
      }

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      return res.status(200).json({ content: content.trim() })
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
      content = content.replace(/<think>[\\s\\S]*?(?:<\\/think>|$)/g, '').trim()

      return res.status(200).json({ content })
    }
  } catch (error) {
    return res.status(500).json({ error: 'Groq proxy failed' })
  }
}
