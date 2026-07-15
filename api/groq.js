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
    const { mode, prompt, systemContext, base64Image, mimeType, history = [] } = req.body || {}
    const safeMimeType = mimeType || 'image/jpeg'
    const cleanBase64 = base64Image ? base64Image.replace(/\s+/g, '') : ''
    
    const cleanHistory = (Array.isArray(history) ? history : [])
      .filter(msg => (msg.role === 'user' || msg.role === 'assistant') && msg.content && typeof msg.content === 'string')
      .filter(msg => !msg.content.includes('Selamat datang!') && !msg.content.includes('Welcome to the Manager AI Control Center'))
      .slice(-6)
      .map(msg => ({ role: msg.role, content: msg.content }))

    if (mode === 'vision') {
      const githubToken = process.env.GITHUB_TOKEN
      if (!githubToken) {
        return res.status(500).json({ error: 'Missing GITHUB_TOKEN environment variable' })
      }

      const makeRequest = async (modelName) => {
        const body = {
          model: modelName,
          messages: [
            ...cleanHistory,
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Provide the final answer directly and exhaustively. DO NOT output internal reasoning. DO NOT use <think> tags. Do NOT skip, omit, or summarize any items in tables or grids. If showing the answer in a table format is a better, clearer, or more structured way to answer the user question (such as timetables, schedules, lists, or comparisons), always format the output into a clean Markdown table with clear columns.\n\n' + prompt },
                { type: 'image_url', image_url: { url: `data:${safeMimeType};base64,${cleanBase64}` } }
              ]
            }
          ],
          max_tokens: 8192,
          temperature: 0.0
        }

        const res = await fetch('https://models.github.ai/inference/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${githubToken}`
          },
          body: JSON.stringify(body)
        })

        const text = await res.text()
        let parsed = {}
        try {
          parsed = JSON.parse(text)
        } catch (e) {
          parsed = { error: { message: text || `HTTP ${res.status}` } }
        }
        return { ok: res.ok, status: res.status, data: parsed }
      }

      let result = await makeRequest('gpt-4o')
      if (!result.ok) {
        // Fallback to gpt-4o-mini if gpt-4o is rate-limited or unavailable
        result = await makeRequest('gpt-4o-mini')
      }

      if (!result.ok) {
        return res.status(result.status).json({ error: result.data.error?.message || 'GitHub Models API error' })
      }

      let content = result.data.choices?.[0]?.message?.content || ''
      content = content.replace(/<think>[\s\S]*?(?:<\/think>|$)/g, '').trim()

      return res.status(200).json({ content })
    } else {
      const modelsToTry = [
        { model: CHAT_MODEL, maxTokens: 1024 },
        { model: 'llama-3.1-8b-instant', maxTokens: 1500 },
        { model: 'mixtral-8x7b-32768', maxTokens: 1500 }
      ]

      let lastError = 'Groq API error'
      let lastStatus = 500

      for (const { model, maxTokens } of modelsToTry) {
        const body = {
          model,
          messages: [
            { role: 'system', content: systemContext || '' },
            ...cleanHistory,
            { role: 'user', content: prompt }
          ],
          max_tokens: maxTokens,
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

        const data = await groqRes.json().catch(() => ({}))
        if (groqRes.ok) {
          let content = data.choices?.[0]?.message?.content || ''
          content = content.replace(/<think>[\s\S]*?(?:<\/think>|$)/g, '').trim()
          return res.status(200).json({ content })
        } else {
          lastStatus = groqRes.status || 500
          lastError = data.error?.message || `Groq API error (${lastStatus})`
        }
      }

      return res.status(lastStatus).json({ error: lastError })
    }
  } catch (error) {
    return res.status(500).json({ error: 'Groq proxy failed' })
  }
}
