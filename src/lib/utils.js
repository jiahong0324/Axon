import { differenceInCalendarDays, format, parseISO } from 'date-fns'

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
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\s*-\s(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul class="list-disc pl-5 space-y-1">$1</ul>')
    .replace(/\n/g, '<br />')
}
