import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import katex from 'katex'

export const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
export const classColors = { L: 'blue', T: 'green', P: 'purple' }

export function dateLabel(value) {
  if (!value) return 'No date'
  return format(parseISO(value), 'dd MMM yyyy')
}

export function daysFromToday(value) {
  return differenceInCalendarDays(parseISO(value), new Date())
}

export function formatTime(timeStr) {
  if (!timeStr) return '';
  const is12hr = localStorage.getItem('timeFormat') === '12hr';
  if (!is12hr) return timeStr;

  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  
  const hour = parseInt(parts[0], 10);
  if (isNaN(hour)) return timeStr;
  
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${parts[1]} ${ampm}`;
}

export function initials(text = 'U') {
  return text.split(/\s|@/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'U'
}

export function markdownToHtml(text = '') {
  if (!text) return ''

  const mathBlocks = []
  let processed = text

  // 1. Extract block math: \[ ... \] or $$ ... $$
  processed = processed.replace(/\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$/g, (match, g1, g2) => {
    let formula = (g1 !== undefined ? g1 : g2).trim()
    if (formula.includes('\\\\') && !formula.includes('\\begin{')) {
      formula = `\\begin{aligned} ${formula} \\end{aligned}`
    }
    try {
      const html = katex.renderToString(formula, { displayMode: true, throwOnError: false })
      mathBlocks.push(`<div class="my-3 overflow-x-auto">${html}</div>`)
      return `___MATH_BLOCK_${mathBlocks.length - 1}___`
    } catch (e) {
      return match
    }
  })

  // 2. Extract inline math: \( ... \) or $ ... $ (with math indicators)
  processed = processed.replace(/\\\(([\s\S]*?)\\\)|\$([^\$\n]*?(\\|\=|\^|\_)[^\$\n]*?)\$/g, (match, g1, g2) => {
    const formula = (g1 !== undefined ? g1 : g2).trim()
    try {
      const html = katex.renderToString(formula, { displayMode: false, throwOnError: false })
      mathBlocks.push(`<span class="inline-block">${html}</span>`)
      return `___MATH_BLOCK_${mathBlocks.length - 1}___`
    } catch (e) {
      return match
    }
  })

  // 3. Standard markdown styling and HTML escaping
  processed = processed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-slate-800 text-purple-300 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/^\s*-\s(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul class="list-disc pl-5 space-y-1 my-2">$1</ul>')
    .replace(/\n/g, '<br />')

  // 4. Restore rendered KaTeX math blocks
  mathBlocks.forEach((html, i) => {
    const token = `___MATH_BLOCK_${i}___`
    processed = processed.split(`<br />${token}<br />`).join(html)
    processed = processed.split(`${token}<br />`).join(html)
    processed = processed.split(`<br />${token}`).join(html)
    processed = processed.split(token).join(html)
  })

  return processed
}
