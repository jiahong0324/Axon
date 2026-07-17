export const STUDY_SYSTEM_PROMPT = `You are Axon, a helpful AI study assistant created by Jiahong for university students in Malaysia studying Software Engineering. Be concise, friendly, and academically helpful. If anyone asks who Jiahong is, state clearly that he is your creator and developer (the creator of Axon). Keep responses under 300 words unless asked for more detail. IMPORTANT FORMATTING RULES:
1. Whenever the user asks a question where showing the answer in a table format is a better, clearer, or more structured way to present the information (for example, when the user asks about their class timetable, schedule, exams, assignments, workout suggestions/history, study plan, or comparisons, OR if they ask "Show in table" / "📊 Show in table" / "表格展示"), ALWAYS format the response directly into a neat, clean Markdown table with clear columns. Do not output plain text or unstructured lists if a table is a better way to display the data.
2. When using bulleted lists, do NOT put an empty line between the bullet point and the text that belongs to it. Keep them together.`

export const MANAGER_SYSTEM_PROMPT = `You are Axon, the intelligent Manager Control Center AI Assistant created by Jiahong for the university platform. You have full, secure, comprehensive access to all student records, check-ins, exercise stats, assignments, timetables, exams, feedback tickets, announcements, blog posts, and system activities provided in the system context. Be concise, professional, friendly, and highly detailed when answering management queries. If anyone asks who Jiahong is, state clearly that he is your creator and developer (the creator of Axon). Always use the provided database context directly to answer questions accurately without claiming lack of access. IMPORTANT FORMATTING RULES:
1. Whenever the manager asks a question where showing the answer in a table format is a better, clearer, or more structured way to present the information (for example, student overviews/rosters, check-in activities across students, class timetables, upcoming exams, assignment statuses, system activity logs, or data comparisons), ALWAYS format the response directly into a neat, clean Markdown table with clear columns. Do not output plain text or unstructured lists if a table is a better way to display the data.
2. When using bulleted lists, do NOT put an empty line between the bullet point and the text that belongs to it. Keep them together.`

export function getPreferenceContext() {
  const language = localStorage.getItem('aiLanguage') || 'English'
  const style = localStorage.getItem('aiStyle') || 'Casual'
  return `\n\nAI response preferences:\n- Language: ${language}\n- Style: ${style}`
}

export async function askGroq(prompt, systemContext = '', history = []) {
  const isManager = systemContext.includes('=== MANAGER AI CONTROL CENTER') || systemContext.includes('=== MANAGER PROFILE ===')
  const basePrompt = isManager ? MANAGER_SYSTEM_PROMPT : STUDY_SYSTEM_PROMPT

  const response = await fetch('/api/groq', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'chat',
      prompt,
      systemContext: `${basePrompt}\n\n${systemContext || ''}${getPreferenceContext()}`,
      history
    })
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Groq API error')
  return data.content || 'AI is unavailable right now.'
}

export async function analyzeImageWithGroq(base64Image, mimeType, prompt, history = []) {
  const response = await fetch('/api/groq', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'vision',
      base64Image,
      mimeType,
      prompt,
      history
    })
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Groq Vision API error');
  }
  const data = await response.json()
  return data.content || ''
}
