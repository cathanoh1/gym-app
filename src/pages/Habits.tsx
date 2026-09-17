import { useLiveQuery } from 'dexie-react-hooks'
import { Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { HabitBubbles } from '../components/HabitBubbles'
import { Button, Card, IconButton, PageHeader, SectionTitle, TextInput } from '../components/ui'
import { db } from '../db'
import { lastNDays, shiftKey, todayKey, weekdayInitial, type DateKey } from '../lib/dates'

function streakLength(days: Set<DateKey>): number {
  let cursor = todayKey()
  if (!days.has(cursor)) cursor = shiftKey(cursor, -1)
  let streak = 0
  while (days.has(cursor)) {
    streak += 1
    cursor = shiftKey(cursor, -1)
  }
  return streak
}

export function Habits() {
  const date = todayKey()
  const habits = useLiveQuery(() => db.habits.toArray(), []) ?? []
  const completions = useLiveQuery(() => db.habitCompletions.toArray(), []) ?? []
  const [name, setName] = useState('')

  const week = lastNDays(7)
  const daysByHabit = new Map<number, Set<DateKey>>()
  for (const completion of completions) {
    const days = daysByHabit.get(completion.habitId) ?? new Set<DateKey>()
    days.add(completion.date)
    daysByHabit.set(completion.habitId, days)
  }

  async function addHabit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    await db.habits.add({ name: trimmed, createdAt: Date.now() })
    setName('')
  }

  async function removeHabit(id: number, habitName: string) {
    if (!window.confirm(`Delete "${habitName}" and its history?`)) return
    await db.habitCompletions.where('habitId').equals(id).delete()
    await db.habits.delete(id)
  }

  return (
    <>
      <PageHeader title="Habits" subtitle="Tap a bubble when it's done. They reset at midnight." />

      <section className="mb-6">
        <SectionTitle>Today</SectionTitle>
        <HabitBubbles date={date} emptyHint="Add your first one below." />
      </section>

      <section className="mb-6">
        <SectionTitle>Last 7 days</SectionTitle>
        {habits.length === 0 ? (
          <p className="text-sm text-steel">Nothing to track yet.</p>
        ) : (
          <div className="grid gap-2">
            {habits.map((habit) => {
              const days = daysByHabit.get(habit.id) ?? new Set<DateKey>()
              const streak = streakLength(days)
              return (
                <Card key={habit.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{habit.name}</p>
                    <p className="text-xs text-steel">
                      {streak > 0 ? (
                        <>
                          <span className="font-mono tabular-nums">{streak}</span> day streak
                        </>
                      ) : (
                        'No streak yet'
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {week.map((day) => (
                        <div key={day} className="flex flex-col items-center gap-1">
                          <span
                            className={`size-4 rounded-full border-2 ${
                              days.has(day) ? 'border-plate-green bg-plate-green' : 'border-line bg-paper'
                            }`}
                          />
                          <span className="font-mono text-[10px] text-steel">{weekdayInitial(day)}</span>
                        </div>
                      ))}
                    </div>
                    <IconButton label={`Delete ${habit.name}`} onClick={() => void removeHabit(habit.id, habit.name)}>
                      <Trash2 size={18} />
                    </IconButton>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <SectionTitle>Add a habit</SectionTitle>
        <form onSubmit={(event) => void addHabit(event)} className="flex gap-2">
          <TextInput
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Creatine, fish oil, stretching…"
            aria-label="Habit name"
          />
          <Button type="submit" className="shrink-0" disabled={!name.trim()}>
            Add
          </Button>
        </form>
      </section>
    </>
  )
}
