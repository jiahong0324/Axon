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
  const codeBlocks = []
  let processed = String(text)

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

  // 2. Extract inline math: \( ... \) or $ ... $
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

  // 3. Extract fenced code blocks: ```lang ... ```
  processed = processed.replace(/```([\w-]*)\n?([\s\S]*?)```/g, (match, lang, code) => {
    const escapedCode = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    const html = `
      <div class="ai-code-card my-3.5 overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950 shadow-md">
        ${lang ? `<div class="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/90 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-purple-300"><span>${lang}</span></div>` : ''}
        <pre class="overflow-x-auto p-3.5 text-xs md:text-sm font-mono leading-relaxed text-slate-200"><code>${escapedCode}</code></pre>
      </div>
    `
    codeBlocks.push(html)
    return `___CODE_BLOCK_${codeBlocks.length - 1}___`
  })

  // Helper for inline markdown formatting
  function formatInline(str = '') {
    return str
      .replace(/<br\s*\/?>/gi, '___LINE_BREAK___')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/___LINE_BREAK___/g, '<br class="my-1" />')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-slate-800 text-purple-300 px-1.5 py-0.5 rounded text-xs font-mono border border-slate-700/60">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-theme-400 underline hover:text-theme-300">$1</a>')
  }

  // Helper to parse table row cells
  function parseTableRow(line) {
    return line
      .split('|')
      .map(cell => cell.trim())
      .filter((cell, idx, arr) => {
        if (idx === 0 && cell === '') return false
        if (idx === arr.length - 1 && cell === '') return false
        return true
      })
  }

  // 4. Line-by-line / block parser
  const lines = processed.split('\n')
  const htmlLines = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Check for Markdown Table Block
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?\s*[:\-]+(\s*\|\s*[:\-]+)+\s*\|?\s*$/.test(lines[i + 1])) {
      const headers = parseTableRow(line)
      i += 2 // skip header and separator lines

      const rows = []
      while (i < lines.length && lines[i].includes('|')) {
        const rowCells = parseTableRow(lines[i])
        if (rowCells.length > 0) rows.push(rowCells)
        i++
      }

      const desktopTableHtml = `
        <div class="ai-table-wrapper hidden sm:block my-4 w-full max-w-full overflow-x-auto rounded-2xl border border-white/10 bg-[#0a101d]/80 shadow-2xl backdrop-blur-md">
          <table class="ai-table w-full min-w-full border-collapse text-left text-xs md:text-sm">
            <thead class="border-b border-white/10 bg-blue-500/15 text-blue-300 text-[11px] md:text-xs font-bold uppercase tracking-wider">
              <tr>
                ${headers.map(h => `<th class="px-3 py-3 md:px-4 md:py-3.5 align-top whitespace-nowrap">${formatInline(h)}</th>`).join('')}
              </tr>
            </thead>
            <tbody class="divide-y divide-white/[0.06]">
              ${rows.map((row, rIdx) => `
                <tr class="transition-colors hover:bg-white/[0.05] ${rIdx % 2 === 1 ? 'bg-white/[0.015]' : ''}">
                  ${headers.map((_, colIdx) => `<td class="px-3 py-3 md:px-4 md:py-3.5 align-top leading-relaxed text-slate-200">${formatInline(row[colIdx] || '')}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `

      const mobileCardsHtml = `
        <div class="ai-mobile-table-cards block sm:hidden space-y-3 my-3">
          ${rows.map((row, rIdx) => {
            const title = row[0] || `Phase ${rIdx + 1}`
            const subtitle = row[1] || ''
            const badge = row[2] || ''
            const details = headers.slice(3).map((h, cIdx) => {
              const val = row[cIdx + 3]
              if (!val) return ''
              return `
                <div class="flex flex-col gap-0.5 text-xs">
                  <span class="font-bold text-blue-300 uppercase tracking-wider text-[10px]">${formatInline(h)}</span>
                  <span class="text-slate-200 leading-relaxed">${formatInline(val)}</span>
                </div>`
            }).join('')

            return `
              <div class="rounded-2xl border border-white/10 bg-[#0e1626] p-4 shadow-lg space-y-2.5">
                <div class="flex items-start justify-between gap-2 border-b border-white/10 pb-2.5">
                  <div class="font-extrabold text-blue-400 text-sm leading-snug">${formatInline(title)}</div>
                  ${badge ? `<span class="inline-flex shrink-0 items-center rounded-full bg-blue-500/15 border border-blue-500/30 px-2.5 py-0.5 text-[11px] font-bold text-blue-300">${formatInline(badge)}</span>` : ''}
                </div>
                ${subtitle ? `<div class="text-sm font-semibold text-white leading-relaxed">${formatInline(subtitle)}</div>` : ''}
                ${details ? `<div class="grid grid-cols-1 gap-2 pt-1 border-t border-white/5">${details}</div>` : ''}
              </div>
            `
          }).join('')}
        </div>
      `

      htmlLines.push(desktopTableHtml + mobileCardsHtml)
      continue
    }

    // Check for Headings
    if (/^######\s+(.*)$/.test(line)) {
      htmlLines.push(`<h6 class="font-heading text-xs font-semibold mt-3 mb-1">${formatInline(line.replace(/^######\s+/, ''))}</h6>`)
      i++
      continue
    }
    if (/^#####\s+(.*)$/.test(line)) {
      htmlLines.push(`<h5 class="font-heading text-sm font-semibold mt-3.5 mb-1.5">${formatInline(line.replace(/^#####\s+/, ''))}</h5>`)
      i++
      continue
    }
    if (/^####\s+(.*)$/.test(line)) {
      htmlLines.push(`<h4 class="ai-h4 font-heading text-sm md:text-base font-bold mt-4 mb-2">${formatInline(line.replace(/^####\s+/, ''))}</h4>`)
      i++
      continue
    }
    if (/^###\s+(.*)$/.test(line)) {
      htmlLines.push(`<h3 class="ai-h3 font-heading text-base md:text-lg font-bold mt-5 mb-2.5">${formatInline(line.replace(/^###\s+/, ''))}</h3>`)
      i++
      continue
    }
    if (/^##\s+(.*)$/.test(line)) {
      htmlLines.push(`<h2 class="ai-h2 font-heading text-lg md:text-xl font-bold text-white mt-6 mb-3 pb-2 border-b border-white/10">${formatInline(line.replace(/^##\s+/, ''))}</h2>`)
      i++
      continue
    }
    if (/^#\s+(.*)$/.test(line)) {
      htmlLines.push(`<h1 class="ai-h1 font-heading text-xl md:text-2xl font-extrabold text-white mt-6 mb-3">${formatInline(line.replace(/^#\s+/, ''))}</h1>`)
      i++
      continue
    }

    // Check for Horizontal Rules
    if (/^\s*([-*_]){3,}\s*$/.test(line)) {
      htmlLines.push(`<hr class="my-4 border-slate-700/80" />`)
      i++
      continue
    }

    // Check for Blockquotes
    if (/^>\s+(.*)$/.test(line)) {
      const bqLines = []
      while (i < lines.length && /^>\s+/.test(lines[i])) {
        bqLines.push(lines[i].replace(/^>\s+/, ''))
        i++
      }
      htmlLines.push(`<blockquote class="ai-blockquote my-3 border-l-4 border-purple-500 bg-purple-500/10 px-4 py-3 rounded-r-xl italic text-slate-200">${bqLines.map(l => formatInline(l)).join('<br />')}</blockquote>`)
      continue
    }

    // Check for Unordered Lists
    if (/^\s*[-*]\s+(.*)$/.test(line)) {
      const items = []
      while (i < lines.length && /^\s*[-*]\s+(.*)$/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''))
        i++
      }
      htmlLines.push(`<ul class="ai-ul my-3 list-disc pl-6 space-y-1.5">${items.map(item => `<li class="leading-relaxed">${formatInline(item)}</li>`).join('')}</ul>`)
      continue
    }

    // Check for Ordered Lists
    if (/^\s*\d+\.\s+(.*)$/.test(line)) {
      const items = []
      while (i < lines.length && /^\s*\d+\.\s+(.*)$/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''))
        i++
      }
      htmlLines.push(`<ol class="ai-ol my-3 list-decimal pl-6 space-y-1.5">${items.map(item => `<li class="leading-relaxed">${formatInline(item)}</li>`).join('')}</ol>`)
      continue
    }

    // Regular lines
    if (line.trim() === '') {
      htmlLines.push('<div class="h-2"></div>')
    } else {
      htmlLines.push(`<p class="my-1.5 leading-relaxed">${formatInline(line)}</p>`)
    }
    i++
  }

  let finalHtml = htmlLines.join('\n')

  // 5. Restore Code blocks
  codeBlocks.forEach((html, idx) => {
    finalHtml = finalHtml.split(`___CODE_BLOCK_${idx}___`).join(html)
  })

  // 6. Restore KaTeX math blocks
  mathBlocks.forEach((html, idx) => {
    finalHtml = finalHtml.split(`___MATH_BLOCK_${idx}___`).join(html)
  })

  return finalHtml
}
