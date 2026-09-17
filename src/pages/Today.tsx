import { format } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { Settings } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HabitBubbles } from '../components/HabitBubbles'
import { SetChip } from '../components/SetChip'
import { SettingsSheet } from '../components/SettingsSheet'
import { ButtonLink, Card, EmptyState, IconButton, Meter, PageHeader, SectionTitle } from '../components/ui'
import { db } from '../db'
import { dayLabel, todayKey } from '../lib/dates'
import { totalMacros } from '../lib/nutrition'
import { useSettings } from '../lib/settings'
import { changeOver, formatDelta, toDisplayWeight } from '../lib/weight'
import { entryVolume, formatVolume, heaviestWeight } from '../lib/workouts'

export function Today() {
  const date = todayKey()
  const settings = useSettings()
  const [settingsOpen, setSettingsOpen] = useState(false)

  const workoutEntries = useLiveQuery(() => db.workoutEntries.where('date').equals(date).toArray(), [date])
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  const foodEntries = useLiveQuery(() => db.foodLogEntries.where('date').equals(date).toArray(), [date])
  const foods = useLiveQuery(() => db.foods.toArray(), [])
  const weights = useLiveQuery(() => db.weightEntries.orderBy('date').toArray(), [])

  const entries = workoutEntries ?? []
  const exerciseNames = new Map((exercises ?? []).map((exercise) => [exercise.id, exercise.name]))
  const foodsById = new Map((foods ?? []).map((food) => [food.id, food]))
  const totals = totalMacros(foodEntries ?? [], foodsById)
  const dayVolume = entries.reduce((sum, entry) => sum + entryVolume(entry), 0)
  const remaining = settings.calorieGoal - totals.calories
  const latestWeight = (weights ?? []).at(-1)
  const weekChange = changeOver(weights ?? [], 7)

  return (
    <>
      <PageHeader
        title="Today"
        subtitle={format(new Date(), 'EEEE d MMMM')}
        action={
          <IconButton label="Settings" onClick={() => setSettingsOpen(true)}>
            <Settings size={20} />
          </IconButton>
        }
      />

      <section className="mb-6">
        <SectionTitle>Daily habits</SectionTitle>
        <HabitBubbles date={date} emptyHint="Set up creatine, water or anything else on the Habits tab." />
      </section>

      <Card className="mb-6 p-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">{remaining >= 0 ? 'Calories left' : 'Over goal by'}</p>
            <p
              className={`wide font-mono text-5xl font-bold tabular-nums ${
                remaining < 0 ? 'text-plate-red' : ''
              }`}
            >
              {Math.abs(Math.round(remaining))}
            </p>
            <p className="mt-1 text-sm text-steel">
              <span className="font-mono tabular-nums">{Math.round(totals.calories)}</span> eaten of{' '}
              <span className="font-mono tabular-nums">{settings.calorieGoal}</span>
            </p>
          </div>
          <ButtonLink to="/food" variant="secondary" className="shrink-0">
            Log food
          </ButtonLink>
        </div>

        <div className="mt-4 grid gap-3">
          <Meter label="Protein" value={totals.protein} goal={settings.proteinGoal} color="var(--color-plate-blue)" />
          <Meter label="Carbs" value={totals.carbs} goal={settings.carbGoal} color="var(--color-plate-yellow)" />
          <Meter label="Fat" value={totals.fat} goal={settings.fatGoal} color="var(--color-plate-green)" />
        </div>
      </Card>

      <Card className="p-4">
        <SectionTitle
          action={
            <Link to="/lift" className="text-sm font-semibold underline underline-offset-2">
              Open log
            </Link>
          }
        >
          Training
        </SectionTitle>

        {entries.length === 0 ? (
          <EmptyState
            title="Nothing logged today"
            hint="Add your first exercise when you start the session."
            action={<ButtonLink to="/lift">Log a set</ButtonLink>}
          />
        ) : (
          <>
            <ul className="grid gap-3">
              {entries.map((entry) => {
                const heaviest = heaviestWeight(entry.sets)
                return (
                  <li key={entry.id}>
                    <p className="font-semibold">{exerciseNames.get(entry.exerciseId) ?? 'Exercise'}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {entry.sets.map((set, index) => (
                        <SetChip key={index} set={set} heaviest={heaviest} unit={settings.weightUnit} />
                      ))}
                    </div>
                  </li>
                )
              })}
            </ul>
            <p className="mt-4 border-t-2 border-line pt-3 text-sm text-steel">
              {entries.length} exercise{entries.length === 1 ? '' : 's'} ·{' '}
              <span className="font-mono tabular-nums">{formatVolume(dayVolume, settings.weightUnit)}</span>{' '}
              total volume
            </p>
          </>
        )}
      </Card>

      <Link
        to="/weight"
        className="mt-5 flex items-center justify-between gap-3 rounded-[3px] border-2 border-iron bg-paper p-4 transition-transform active:translate-y-px"
      >
        <div className="min-w-0">
          <p className="eyebrow">Weight</p>
          {latestWeight ? (
            <>
              <p className="wide font-mono text-2xl font-bold tabular-nums">
                {toDisplayWeight(latestWeight.kg, settings.weightUnit).toFixed(1)}
                <span className="ml-1 text-sm font-medium text-steel">{settings.weightUnit}</span>
              </p>
              <p className="text-xs text-steel">{dayLabel(latestWeight.date)}</p>
            </>
          ) : (
            <p className="mt-0.5 font-semibold">Log your first weigh-in</p>
          )}
        </div>
        {weekChange !== undefined ? (
          <p className="shrink-0 text-right text-sm text-steel">
            7 days
            <br />
            <span className="font-mono text-base font-medium tabular-nums text-iron">
              {formatDelta(weekChange, settings.weightUnit)}
            </span>
          </p>
        ) : null}
      </Link>

      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
