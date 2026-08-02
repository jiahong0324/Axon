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
    const { mode, prompt, systemContext, base64Image, mimeType, history = [] } = req.body || {}
    const safeMimeType = mimeType || 'image/jpeg'
    const cleanBase64 = base64Image ? base64Image.replace(/\s+/g, '') : ''
    
    const cleanHistory = (Array.isArray(history) ? history : [])
      .filter(msg => (msg.role === 'user' || msg.role === 'assistant') && msg.content && typeof msg.content === 'string')
      .filter(msg => !msg.content.includes('Selamat datang!') && !msg.content.includes('Welcome to the Manager AI Control Center'))
      .slice(-6)
      .map(msg => ({ role: msg.role, content: msg.content }))

    if (mode === 'audio') {
      const { base64Audio, mimeType = 'audio/webm' } = req.body || {}
      if (!base64Audio) {
        return res.status(400).json({ error: 'Missing audio data' })
      }
      
      const buffer = Buffer.from(base64Audio.replace(/\s+/g, ''), 'base64')
      let ext = 'webm'
      if (mimeType.includes('mp4') || mimeType.includes('m4a')) ext = 'm4a'
      else if (mimeType.includes('wav')) ext = 'wav'
      else if (mimeType.includes('ogg')) ext = 'ogg'
      else if (mimeType.includes('mp3')) ext = 'mp3'

      const fileBlob = new Blob([buffer], { type: mimeType })
      
      const makeAudioRequest = async (modelName, endpoint = 'translations') => {
        const formData = new FormData()
        formData.append('file', fileBlob, `voice.${ext}`)
        formData.append('model', modelName)
        formData.append('response_format', 'json')

        const res = await fetch(`https://api.groq.com/openai/v1/audio/${endpoint}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`
          },
          body: formData
        })
        const data = await res.json().catch(() => ({}))
        return { ok: res.ok, status: res.status, data }
      }

      let result = await makeAudioRequest('whisper-large-v3-turbo', 'translations')
      if (!result.ok) {
        result = await makeAudioRequest('whisper-large-v3', 'translations')
      }
      if (!result.ok) {
        result = await makeAudioRequest('whisper-large-v3-turbo', 'transcriptions')
      }

      if (!result.ok) {
        return res.status(result.status || 500).json({ error: result.data?.error?.message || 'Groq Audio API error' })
      }

      let content = result.data?.text || ''

      if (/[\u4e00-\u9fa5]/.test(content)) {
        try {
          const transRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: 'openai/gpt-oss-20b',
              messages: [
                { role: 'system', content: 'You are a professional translator. Translate the user input text from Chinese (or mixed language) into clear, natural English. Output ONLY the English translation without any extra comments, explanations, or quotes.' },
                { role: 'user', content }
              ],
              max_tokens: 500,
              temperature: 0.2
            })
          })
          if (transRes.ok) {
            const transData = await transRes.json().catch(() => ({}))
            const translatedText = transData.choices?.[0]?.message?.content?.trim()
            if (translatedText) content = translatedText
          }
        } catch (e) {}
      }

      return res.status(200).json({ content })
    } else if (mode === 'vision') {
      const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
      const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID
      const cfApiToken = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN

      if (!geminiKey && (!cfAccountId || !cfApiToken)) {
        return res.status(500).json({ error: 'Missing GEMINI_API_KEY or Cloudflare credentials (CLOUDFLARE_ACCOUNT_ID & CLOUDFLARE_API_TOKEN) in Vercel settings.' })
      }

      const makeCloudflareRequest = async (modelName = '@cf/meta/llama-3.2-11b-vision-instruct') => {
        if (!cfAccountId || !cfApiToken) return { ok: false, error: 'Missing Cloudflare credentials' }
        const buffer = Buffer.from(cleanBase64, 'base64')
        const imageArray = Array.from(buffer)

        const body = {
          image: imageArray,
          prompt: 'Provide the final answer directly and exhaustively. DO NOT output internal reasoning. DO NOT use <think> tags. Do NOT skip, omit, or summarize any items in tables or grids. If showing the answer in a table format is a better, clearer, or more structured way to answer the user question (such as timetables, schedules, lists, or comparisons), always format the output into a clean Markdown table with clear columns. If asked who Jiahong is, state clearly that he is your creator and developer (the creator of Axon).\n\n' + prompt
        }

        const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/${modelName}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${cfApiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        })

        const data = await res.json().catch(() => ({}))
        const content = data.result?.response || ''
        return { ok: res.ok && !!content, status: res.status, content, error: data.errors?.[0]?.message || `Cloudflare error (HTTP ${res.status})` }
      }

      const makeGeminiRequest = async (modelName) => {
        if (!geminiKey) return { ok: false, error: 'Missing GEMINI_API_KEY' }
        const body = {
          contents: [
            {
              role: 'user',
              parts: [
                { text: 'Provide the final answer directly and exhaustively. DO NOT output internal reasoning. DO NOT use <think> tags. Do NOT skip, omit, or summarize any items in tables or grids. If showing the answer in a table format is a better, clearer, or more structured way to answer the user question (such as timetables, schedules, lists, or comparisons), always format the output into a clean Markdown table with clear columns. If asked who Jiahong is, state clearly that he is your creator and developer (the creator of Axon).\n\n' + prompt },
                {
                  inline_data: {
                    mime_type: safeMimeType,
                    data: cleanBase64
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192
          }
        }

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })

        const data = await res.json().catch(() => ({}))
        const content = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || ''
        return { ok: res.ok && !!content, status: res.status, content, error: data.error?.message || `Gemini error (HTTP ${res.status})` }
      }

      let result = { ok: false }
      let lastError = 'Vision API error'
      let lastStatus = 500

      if (cfAccountId && cfApiToken) {
        result = await makeCloudflareRequest('@cf/meta/llama-3.2-11b-vision-instruct')
        if (!result.ok) {
          result = await makeCloudflareRequest('@cf/meta/llama-3.2-90b-vision-instruct')
        }
      }

      if (!result.ok && geminiKey) {
        const geminiModels = [
          'gemini-2.5-flash',
          'gemini-2.0-flash',
          'gemini-1.5-flash-latest',
          'gemini-1.5-pro-latest'
        ]
        for (const modelName of geminiModels) {
          result = await makeGeminiRequest(modelName)
          if (result.ok) break
          lastStatus = result.status || lastStatus
          lastError = result.error || lastError
        }
      }

      if (!result.ok) {
        return res.status(lastStatus).json({ error: result.error || lastError })
      }

      let content = result.content.replace(/<think>[\s\S]*?(?:<\/think>|$)/g, '').trim()

      return res.status(200).json({ content })
    } else {
      const modelsToTry = [
        { model: CHAT_MODEL, maxTokens: 1024 },
        { model: 'openai/gpt-oss-20b', maxTokens: 1500 }
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
