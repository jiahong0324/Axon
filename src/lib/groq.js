export const STUDY_SYSTEM_PROMPT = `You are Axon, a helpful AI study assistant for a university student in Malaysia studying Software Engineering. Be concise, friendly, and academically helpful. Format responses clearly using bullet points when appropriate. Keep responses under 300 words unless asked for more detail. IMPORTANT: When using bulleted lists, do NOT put an empty line between the bullet point and the text that belongs to it. Keep them together.`

export function getPreferenceContext() {
  const language = localStorage.getItem('aiLanguage') || 'English'
  const style = localStorage.getItem('aiStyle') || 'Casual'
  return `\n\nAI response preferences:\n- Language: ${language}\n- Style: ${style}`
}

export async function askGroq(prompt, systemContext = '') {
  const response = await fetch('/api/groq', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'chat',
      prompt,
      systemContext: `${STUDY_SYSTEM_PROMPT}\n\n${systemContext || ''}${getPreferenceContext()}`
    })
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Groq API error')
  return data.content || 'AI is unavailable right now.'
}

export async function analyzeImageWithGroq(base64Image, mimeType, prompt) {
  const response = await fetch('/api/groq', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'vision',
      base64Image,
      mimeType,
      prompt
    })
  })
  if (!response.ok) throw new Error('Groq Vision API error')
  const data = await response.json()
  return data.content || ''
}
