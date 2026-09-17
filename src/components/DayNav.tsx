import { format, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { dayLabel, shiftKey, todayKey, type DateKey } from '../lib/dates'
import { IconButton } from './ui'

export function DayNav({ date, onChange }: { date: DateKey; onChange: (date: DateKey) => void }) {
  const onToday = date === todayKey()
  return (
    <div className="mb-4 flex items-center justify-between gap-2 rounded-[3px] border-2 border-iron bg-paper px-2 py-1.5">
      <IconButton label="Previous day" onClick={() => onChange(shiftKey(date, -1))}>
        <ChevronLeft size={20} />
      </IconButton>
      <div className="text-center">
        <p className="wide font-bold leading-none">{dayLabel(date)}</p>
        <p className="mt-0.5 font-mono text-xs text-steel tabular-nums">
          {format(parseISO(date), 'd MMM yyyy')}
        </p>
      </div>
      <IconButton
        label="Next day"
        disabled={onToday}
        className={onToday ? 'opacity-25' : ''}
        onClick={() => onChange(shiftKey(date, 1))}
      >
        <ChevronRight size={20} />
      </IconButton>
    </div>
  )
}
