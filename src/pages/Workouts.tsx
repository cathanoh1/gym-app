import { format, parseISO } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { DayNav } from '../components/DayNav'
import { SetChip, SetChipLegend } from '../components/SetChip'
import {
  Button,
  Card,
  EmptyState,
  Field,
  IconButton,
  NumberInput,
  PageHeader,
  parseNumber,
  SectionTitle,
  Segmented,
  Sheet,
  TextInput,
} from '../components/ui'
import { db, type Exercise, type WorkoutEntry, type WorkoutSet } from '../db'
import { dayLabel, todayKey, type DateKey } from '../lib/dates'
import { useSettings } from '../lib/settings'
import { entryVolume, formatLoad, formatVolume, heaviestWeight, topSet } from '../lib/workouts'

const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core', 'Cardio', 'Other']

export function Workouts() {
  const settings = useSettings()
  const [view, setView] = useState<'session' | 'exercises'>('session')
  const [date, setDate] = useState<DateKey>(todayKey())

  return (
    <>
      <PageHeader
        title="Lift"
        subtitle={view === 'session' ? 'Log sets as you go.' : 'Every exercise you train.'}
      />
      <div className="mb-4">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'session', label: 'Session' },
            { value: 'exercises', label: 'Exercises' },
          ]}
        />
      </div>

      {view === 'session' ? (
        <Session date={date} onDateChange={setDate} unit={settings.weightUnit} />
      ) : (
        <ExerciseLibrary unit={settings.weightUnit} />
      )}
    </>
  )
}

function Session({
  date,
  onDateChange,
  unit,
}: {
  date: DateKey
  onDateChange: (date: DateKey) => void
  unit: 'kg' | 'lb'
}) {
  const entries = useLiveQuery(() => db.workoutEntries.where('date').equals(date).toArray(), [date]) ?? []
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? []
  const [pickerOpen, setPickerOpen] = useState(false)
  const [editing, setEditing] = useState<{ exercise: Exercise; entry?: WorkoutEntry } | null>(null)

  const exercisesById = new Map(exercises.map((exercise) => [exercise.id, exercise]))
  const dayVolume = entries.reduce((sum, entry) => sum + entryVolume(entry), 0)

  async function removeEntry(entry: WorkoutEntry, name: string) {
    if (!window.confirm(`Remove ${name} from this session?`)) return
    await db.workoutEntries.delete(entry.id)
  }

  return (
    <>
      <DayNav date={date} onChange={onDateChange} />

      {entries.length === 0 ? (
        <EmptyState
          title="No sets logged"
          hint="Pick an exercise and record your first set of the session."
          action={<Button onClick={() => setPickerOpen(true)}>Add exercise</Button>}
        />
      ) : (
        <>
          <div className="grid gap-3">
            {entries.map((entry) => {
              const exercise = exercisesById.get(entry.exerciseId)
              const name = exercise?.name ?? 'Exercise'
              const heaviest = heaviestWeight(entry.sets)
              return (
                <Card key={entry.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold leading-tight">{name}</p>
                      <p className="eyebrow mt-0.5">{exercise?.muscleGroup ?? 'Other'}</p>
                    </div>
                    <div className="flex shrink-0">
                      {exercise ? (
                        <IconButton label={`Edit sets for ${name}`} onClick={() => setEditing({ exercise, entry })}>
                          <Pencil size={17} />
                        </IconButton>
                      ) : null}
                      <IconButton label={`Remove ${name}`} onClick={() => void removeEntry(entry, name)}>
                        <Trash2 size={17} />
                      </IconButton>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {entry.sets.map((set, index) => (
                      <SetChip key={index} set={set} heaviest={heaviest} unit={unit} />
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-steel">
                    {entry.sets.length} set{entry.sets.length === 1 ? '' : 's'} ·{' '}
                    <span className="font-mono tabular-nums">{formatVolume(entryVolume(entry), unit)}</span>
                  </p>
                </Card>
              )
            })}
          </div>

          <SetChipLegend />

          <p className="mt-3 border-t-2 border-line pt-3 text-sm text-steel">
            Session volume{' '}
            <span className="font-mono font-medium tabular-nums text-iron">
              {formatVolume(dayVolume, unit)}
            </span>
          </p>

          <Button className="mt-4 w-full" onClick={() => setPickerOpen(true)}>
            <Plus size={18} /> Add exercise
          </Button>
        </>
      )}

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(exercise) => {
          setPickerOpen(false)
          setEditing({ exercise })
        }}
      />

      {editing ? (
        <SetEditor
          exercise={editing.exercise}
          entry={editing.entry}
          date={date}
          unit={unit}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  )
}

function SetEditor({
  exercise,
  entry,
  date,
  unit,
  onClose,
}: {
  exercise: Exercise
  entry?: WorkoutEntry
  date: DateKey
  unit: 'kg' | 'lb'
  onClose: () => void
}) {
  const [sets, setSets] = useState<WorkoutSet[]>(entry?.sets ?? [])
  const [reps, setReps] = useState(() => String(entry?.sets.at(-1)?.reps ?? 8))
  const [weight, setWeight] = useState(() => String(entry?.sets.at(-1)?.weight ?? 0))

  // Start a new exercise where the last session left off.
  useEffect(() => {
    if (entry) return
    let cancelled = false
    void db.workoutEntries
      .where('exerciseId')
      .equals(exercise.id)
      .sortBy('date')
      .then((rows) => {
        const lastSet = rows.at(-1)?.sets.at(-1)
        if (cancelled || !lastSet) return
        setReps(String(lastSet.reps))
        setWeight(String(lastSet.weight))
      })
    return () => {
      cancelled = true
    }
  }, [entry, exercise.id])

  function bump(value: string, delta: number, apply: (next: string) => void) {
    const next = Math.max(0, parseNumber(value) + delta)
    apply(Number.isInteger(next) ? String(next) : next.toFixed(1))
  }

  function addSet() {
    const parsedReps = Math.round(parseNumber(reps))
    if (parsedReps <= 0) return
    setSets([...sets, { reps: parsedReps, weight: Math.max(0, parseNumber(weight)) }])
  }

  async function save() {
    if (sets.length === 0) return
    if (entry) {
      await db.workoutEntries.update(entry.id, { sets })
    } else {
      await db.workoutEntries.add({ exerciseId: exercise.id, date, sets, createdAt: Date.now() })
    }
    onClose()
  }

  const heaviest = heaviestWeight(sets)

  return (
    <Sheet open title={exercise.name} onClose={onClose}>
      <p className="eyebrow mb-3">{dayLabel(date)}</p>

      {sets.length === 0 ? (
        <p className="mb-4 text-sm text-steel">No sets yet. Enter your reps and load, then add the set.</p>
      ) : (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {sets.map((set, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 rounded-[2px] border-2 border-iron bg-paper py-1 pr-1 pl-2.5"
            >
              <span className="font-mono text-sm tabular-nums">
                {set.reps} × {formatLoad(set.weight, unit)}
              </span>
              <IconButton
                label={`Remove set ${index + 1}`}
                className="size-6"
                onClick={() => setSets(sets.filter((_, position) => position !== index))}
              >
                <X size={14} />
              </IconButton>
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Field label="Reps">
            <NumberInput value={reps} onChange={(event) => setReps(event.target.value)} />
          </Field>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => bump(reps, -1, setReps)}>
              −1
            </Button>
            <Button variant="secondary" onClick={() => bump(reps, 1, setReps)}>
              +1
            </Button>
          </div>
        </div>
        <div>
          <Field label={`Load (${unit}) — 0 for bodyweight`}>
            <NumberInput value={weight} onChange={(event) => setWeight(event.target.value)} />
          </Field>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => bump(weight, -2.5, setWeight)}>
              −2.5
            </Button>
            <Button variant="secondary" onClick={() => bump(weight, 2.5, setWeight)}>
              +2.5
            </Button>
          </div>
        </div>
      </div>

      <Button variant="secondary" className="mt-4 w-full" onClick={addSet}>
        <Plus size={16} /> Add set
      </Button>

      {sets.length > 0 ? (
        <p className="mt-3 text-xs text-steel">
          Heaviest this session{' '}
          <span className="font-mono tabular-nums text-iron">{formatLoad(heaviest, unit)}</span> · volume{' '}
          <span className="font-mono tabular-nums text-iron">
            {formatVolume(
              sets.reduce((sum, set) => sum + set.reps * set.weight, 0),
              unit,
            )}
          </span>
        </p>
      ) : null}

      <Button className="mt-4 w-full" disabled={sets.length === 0} onClick={() => void save()}>
        {entry ? 'Save changes' : 'Save exercise'}
      </Button>
    </Sheet>
  )
}

function NewExerciseForm({ onCreated }: { onCreated: (exercise: Exercise) => void }) {
  const [name, setName] = useState('')
  const [muscleGroup, setMuscleGroup] = useState(MUSCLE_GROUPS[0])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const id = await db.exercises.add({ name: trimmed, muscleGroup, createdAt: Date.now() })
    const created = await db.exercises.get(id)
    setName('')
    if (created) onCreated(created)
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="grid gap-3">
      <Field label="Exercise name">
        <TextInput
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Hack squat, cable fly…"
          autoFocus
        />
      </Field>
      <Field label="Muscle group">
        <select
          value={muscleGroup}
          onChange={(event) => setMuscleGroup(event.target.value)}
          className="w-full rounded-[3px] border-2 border-iron bg-paper px-3 py-2.5"
        >
          {MUSCLE_GROUPS.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>
      </Field>
      <Button type="submit" disabled={!name.trim()}>
        Create exercise
      </Button>
    </form>
  )
}

function ExercisePicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean
  onClose: () => void
  onPick: (exercise: Exercise) => void
}) {
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? []
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (open) return
    setQuery('')
    setCreating(false)
  }, [open])

  const term = query.trim().toLowerCase()
  const matches = exercises.filter((exercise) => exercise.name.toLowerCase().includes(term))

  return (
    <Sheet open={open} title="Add exercise" onClose={onClose}>
      {creating ? (
        <>
          <NewExerciseForm onCreated={onPick} />
          <Button variant="quiet" className="mt-3 w-full" onClick={() => setCreating(false)}>
            Back to list
          </Button>
        </>
      ) : (
        <>
          <TextInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search exercises"
            aria-label="Search exercises"
          />
          <ul className="mt-3 grid gap-2">
            {matches.map((exercise) => (
              <li key={exercise.id}>
                <button
                  type="button"
                  onClick={() => onPick(exercise)}
                  className="flex w-full items-center justify-between gap-3 rounded-[3px] border-2 border-iron bg-paper px-3 py-2.5 text-left active:translate-y-px"
                >
                  <span className="font-semibold">{exercise.name}</span>
                  <span className="eyebrow">{exercise.muscleGroup}</span>
                </button>
              </li>
            ))}
          </ul>
          {matches.length === 0 ? (
            <p className="mt-3 text-sm text-steel">
              Nothing matches “{query}”. Create it instead.
            </p>
          ) : null}
          <Button variant="secondary" className="mt-3 w-full" onClick={() => setCreating(true)}>
            <Plus size={16} /> New exercise
          </Button>
        </>
      )}
    </Sheet>
  )
}

function ExerciseLibrary({ unit }: { unit: 'kg' | 'lb' }) {
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? []
  const allEntries = useLiveQuery(() => db.workoutEntries.toArray(), []) ?? []
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [detail, setDetail] = useState<Exercise | null>(null)

  const historyByExercise = new Map<number, WorkoutEntry[]>()
  for (const entry of allEntries) {
    const history = historyByExercise.get(entry.exerciseId) ?? []
    history.push(entry)
    historyByExercise.set(entry.exerciseId, history)
  }
  for (const history of historyByExercise.values()) {
    history.sort((a, b) => b.date.localeCompare(a.date))
  }

  const term = query.trim().toLowerCase()
  const matches = exercises.filter((exercise) => exercise.name.toLowerCase().includes(term))
  const groups = MUSCLE_GROUPS.map((group) => ({
    group,
    items: matches.filter((exercise) => exercise.muscleGroup === group),
  })).filter((section) => section.items.length > 0)

  return (
    <>
      <TextInput
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search your exercises"
        aria-label="Search your exercises"
      />

      <Button variant="secondary" className="mt-3 w-full" onClick={() => setCreating(true)}>
        <Plus size={16} /> New exercise
      </Button>

      <div className="mt-5 grid gap-5">
        {groups.map(({ group, items }) => (
          <section key={group}>
            <SectionTitle>{group}</SectionTitle>
            <div className="grid gap-2">
              {items.map((exercise) => {
                const history = historyByExercise.get(exercise.id) ?? []
                const best = topSet(history.flatMap((entry) => entry.sets))
                return (
                  <button
                    key={exercise.id}
                    type="button"
                    onClick={() => setDetail(exercise)}
                    className="flex items-center justify-between gap-3 rounded-[3px] border-2 border-iron bg-paper px-3 py-2.5 text-left active:translate-y-px"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{exercise.name}</span>
                      <span className="text-xs text-steel">
                        {history.length === 0
                          ? 'Never logged'
                          : `Last ${format(parseISO(history[0].date), 'd MMM')}`}
                      </span>
                    </span>
                    {best ? (
                      <span className="shrink-0 font-mono text-sm tabular-nums">
                        {best.reps} × {formatLoad(best.weight, unit)}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {matches.length === 0 ? (
        <EmptyState
          title="No exercises match"
          hint="Try a different search, or add it to your library."
          action={<Button onClick={() => setCreating(true)}>New exercise</Button>}
        />
      ) : null}

      <Sheet open={creating} title="New exercise" onClose={() => setCreating(false)}>
        <NewExerciseForm onCreated={() => setCreating(false)} />
      </Sheet>

      {detail ? (
        <ExerciseDetail
          exercise={detail}
          history={historyByExercise.get(detail.id) ?? []}
          unit={unit}
          onClose={() => setDetail(null)}
        />
      ) : null}
    </>
  )
}

function ExerciseDetail({
  exercise,
  history,
  unit,
  onClose,
}: {
  exercise: Exercise
  history: WorkoutEntry[]
  unit: 'kg' | 'lb'
  onClose: () => void
}) {
  async function removeExercise() {
    if (!window.confirm(`Delete ${exercise.name} and all ${history.length} logged sessions?`)) return
    await db.workoutEntries.where('exerciseId').equals(exercise.id).delete()
    await db.exercises.delete(exercise.id)
    onClose()
  }

  const best = topSet(history.flatMap((entry) => entry.sets))

  return (
    <Sheet open title={exercise.name} onClose={onClose}>
      <p className="eyebrow mb-3">{exercise.muscleGroup}</p>

      {best ? (
        <Card className="mb-4 p-3">
          <p className="eyebrow">Best set</p>
          <p className="wide font-mono text-2xl font-bold tabular-nums">
            {best.reps} × {formatLoad(best.weight, unit)}
          </p>
        </Card>
      ) : null}

      {history.length === 0 ? (
        <p className="text-sm text-steel">Nothing logged yet.</p>
      ) : (
        <ul className="grid gap-3">
          {history.slice(0, 12).map((entry) => {
            const heaviest = heaviestWeight(entry.sets)
            return (
              <li key={entry.id} className="border-t-2 border-line pt-3 first:border-t-0 first:pt-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-semibold">{format(parseISO(entry.date), 'EEE d MMM')}</p>
                  <p className="font-mono text-xs tabular-nums text-steel">
                    {formatVolume(entryVolume(entry), unit)}
                  </p>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {entry.sets.map((set, index) => (
                    <SetChip key={index} set={set} heaviest={heaviest} unit={unit} />
                  ))}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Button variant="danger" className="mt-5 w-full" onClick={() => void removeExercise()}>
        <Trash2 size={16} /> Delete exercise
      </Button>
    </Sheet>
  )
}
