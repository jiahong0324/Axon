import { differenceInCalendarDays, parseISO } from 'date-fns'

export default function CountdownBadge({ deadline }) {
  const days = differenceInCalendarDays(parseISO(deadline), new Date())
  const color = days < 0 ? 'text-red-400' : days <= 3 ? 'text-yellow-400' : 'text-green-400'
  const label = days < 0 ? `${Math.abs(days)} days overdue` : days === 0 ? 'Due today' : `${days} days left`
  return <span className={`text-xs font-medium ${color}`}>{label}</span>
}
