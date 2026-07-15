import { differenceInCalendarDays, parseISO } from 'date-fns'
import { dateLabel } from '../lib/utils'

export default function CountdownBadge({ deadline, status }) {
  if (status === 'Done') return <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Completed</span>
  const days = differenceInCalendarDays(parseISO(deadline), new Date())
  const color = days < 0 ? 'text-red-600 dark:text-red-400' : days <= 3 ? 'text-amber-600 dark:text-yellow-400' : 'text-emerald-600 dark:text-green-400'
  const label = days < 0 ? `${Math.abs(days)} days overdue` : days === 0 ? 'Due today' : `${days} days left`
  return (
    <span className="text-xs font-medium flex flex-wrap items-center gap-1 sm:gap-1.5">
      <span className="text-slate-500 dark:text-slate-400">{dateLabel(deadline)}</span>
      <span className={color}>({label})</span>
    </span>
  )
}
