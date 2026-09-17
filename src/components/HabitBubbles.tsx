import { useLiveQuery } from 'dexie-react-hooks'
import { Check } from 'lucide-react'
import { db } from '../db'
import type { DateKey } from '../lib/dates'
import { EmptyState } from './ui'

export async function toggleHabit(habitId: number, date: DateKey): Promise<void> {
  const existing = await db.habitCompletions.where({ habitId, date }).first()
  if (existing) {
    await db.habitCompletions.delete(existing.id)
  } else {
    await db.habitCompletions.add({ habitId, date, completedAt: Date.now() })
  }
}

export function useHabitsForDay(date: DateKey) {
  const habits = useLiveQuery(() => db.habits.toArray(), [])
  const completions = useLiveQuery(
    () => db.habitCompletions.where('date').equals(date).toArray(),
    [date],
  )
  const doneIds = new Set((completions ?? []).map((completion) => completion.habitId))
  return { habits: habits ?? [], doneIds }
}

export function HabitBubbles({ date, emptyHint }: { date: DateKey; emptyHint?: string }) {
  const { habits, doneIds } = useHabitsForDay(date)

  if (habits.length === 0) {
    return <EmptyState title="No habits yet" hint={emptyHint ?? 'Add one on the Habits tab.'} />
  }

  return (
    <div className="flex flex-wrap gap-2">
      {habits.map((habit) => {
        const done = doneIds.has(habit.id)
        return (
          <button
            key={habit.id}
            type="button"
            aria-pressed={done}
            onClick={() => void toggleHabit(habit.id, date)}
            className={`inline-flex items-center gap-2 rounded-full border-2 py-2.5 pr-4 pl-2.5 text-sm font-semibold transition-transform active:scale-95 ${
              done ? 'border-plate-green bg-plate-green text-white' : 'border-iron bg-paper text-iron'
            }`}
          >
            <span
              className={`flex size-5 items-center justify-center rounded-full border-2 ${
                done ? 'border-white/60 bg-white/20' : 'border-iron'
              }`}
            >
              {done ? <Check size={13} strokeWidth={3.5} /> : null}
            </span>
            {habit.name}
          </button>
        )
      })}
    </div>
  )
}
