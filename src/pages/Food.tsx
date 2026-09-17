import { useLiveQuery } from 'dexie-react-hooks'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { DayNav } from '../components/DayNav'
import {
  Button,
  Card,
  EmptyState,
  Field,
  IconButton,
  Meter,
  NumberInput,
  PageHeader,
  parseNumber,
  SectionTitle,
  Segmented,
  Sheet,
  TextInput,
} from '../components/ui'
import { db, MEALS, type Food as FoodItem, type Meal, type Settings } from '../db'
import { todayKey, type DateKey } from '../lib/dates'
import { formatServings, scaleFood, totalMacros, type Macros } from '../lib/nutrition'
import { useSettings } from '../lib/settings'

const MEAL_LABELS: Record<Meal, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
}

function macroLine(macros: Macros): string {
  return `${Math.round(macros.protein)}p · ${Math.round(macros.carbs)}c · ${Math.round(macros.fat)}f`
}

export function Food() {
  const settings = useSettings()
  const [view, setView] = useState<'diary' | 'foods'>('diary')
  const [date, setDate] = useState<DateKey>(todayKey())

  return (
    <>
      <PageHeader
        title="Food"
        subtitle={view === 'diary' ? 'Everything you ate, by meal.' : 'The foods you log most.'}
      />
      <div className="mb-4">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'diary', label: 'Diary' },
            { value: 'foods', label: 'Foods' },
          ]}
        />
      </div>

      {view === 'diary' ? <Diary date={date} onDateChange={setDate} goals={settings} /> : <FoodLibrary />}
    </>
  )
}

function Diary({
  date,
  onDateChange,
  goals,
}: {
  date: DateKey
  onDateChange: (date: DateKey) => void
  goals: Settings
}) {
  const entries = useLiveQuery(() => db.foodLogEntries.where('date').equals(date).toArray(), [date]) ?? []
  const foods = useLiveQuery(() => db.foods.toArray(), []) ?? []
  const [pickerMeal, setPickerMeal] = useState<Meal | null>(null)

  const foodsById = new Map(foods.map((food) => [food.id, food]))
  const totals = totalMacros(entries, foodsById)
  const remaining = goals.calorieGoal - totals.calories

  return (
    <>
      <DayNav date={date} onChange={onDateChange} />

      <Card className="mb-5 p-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">{remaining >= 0 ? 'Calories left' : 'Over goal by'}</p>
            <p className={`wide font-mono text-4xl font-bold tabular-nums ${remaining < 0 ? 'text-plate-red' : ''}`}>
              {Math.abs(Math.round(remaining))}
            </p>
          </div>
          <p className="text-right text-sm text-steel">
            <span className="font-mono tabular-nums">{Math.round(totals.calories)}</span> eaten
            <br />
            <span className="font-mono tabular-nums">{goals.calorieGoal}</span> goal
          </p>
        </div>
        <div className="mt-4 grid gap-3">
          <Meter label="Protein" value={totals.protein} goal={goals.proteinGoal} color="var(--color-plate-blue)" />
          <Meter label="Carbs" value={totals.carbs} goal={goals.carbGoal} color="var(--color-plate-yellow)" />
          <Meter label="Fat" value={totals.fat} goal={goals.fatGoal} color="var(--color-plate-green)" />
        </div>
      </Card>

      <div className="grid gap-3">
        {MEALS.map((meal) => {
          const mealEntries = entries.filter((entry) => entry.meal === meal)
          const mealTotals = totalMacros(mealEntries, foodsById)
          return (
            <Card key={meal} className="p-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="wide font-bold">{MEAL_LABELS[meal]}</h3>
                <span className="font-mono text-sm tabular-nums text-steel">
                  {Math.round(mealTotals.calories)} kcal
                </span>
              </div>

              {mealEntries.length > 0 ? (
                <ul className="mt-2 grid gap-2">
                  {mealEntries.map((entry) => {
                    const food = foodsById.get(entry.foodId)
                    if (!food) return null
                    const macros = scaleFood(food, entry.servings)
                    return (
                      <li
                        key={entry.id}
                        className="flex items-center justify-between gap-2 border-t-2 border-line pt-2 first:border-t-0 first:pt-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{food.name}</p>
                          <p className="font-mono text-xs tabular-nums text-steel">
                            {formatServings(entry.servings)} × {food.servingLabel} · {macroLine(macros)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <span className="font-mono text-sm tabular-nums">{Math.round(macros.calories)}</span>
                          <IconButton
                            label={`Remove ${food.name}`}
                            onClick={() => void db.foodLogEntries.delete(entry.id)}
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : null}

              <Button variant="secondary" className="mt-2 w-full" onClick={() => setPickerMeal(meal)}>
                <Plus size={16} /> Add food
              </Button>
            </Card>
          )
        })}
      </div>

      {pickerMeal ? <FoodPicker meal={pickerMeal} date={date} onClose={() => setPickerMeal(null)} /> : null}
    </>
  )
}

function FoodPicker({ meal, date, onClose }: { meal: Meal; date: DateKey; onClose: () => void }) {
  const foods = useLiveQuery(() => db.foods.toArray(), []) ?? []
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<FoodItem | null>(null)
  const [servings, setServings] = useState('1')
  const [creating, setCreating] = useState(false)

  const term = query.trim().toLowerCase()
  const matches = foods.filter((food) => food.name.toLowerCase().includes(term))
  const amount = parseNumber(servings, 0)

  async function addToDiary() {
    if (!selected || amount <= 0) return
    await db.foodLogEntries.add({
      foodId: selected.id,
      date,
      meal,
      servings: amount,
      createdAt: Date.now(),
    })
    onClose()
  }

  if (creating) {
    return (
      <Sheet open title="New food" onClose={onClose}>
        <FoodForm
          onSaved={(food) => {
            setCreating(false)
            setSelected(food)
          }}
        />
        <Button variant="quiet" className="mt-3 w-full" onClick={() => setCreating(false)}>
          Back to list
        </Button>
      </Sheet>
    )
  }

  if (selected) {
    const preview = scaleFood(selected, amount)
    return (
      <Sheet open title={selected.name} onClose={onClose}>
        <p className="eyebrow mb-3">
          Adding to {MEAL_LABELS[meal].toLowerCase()} · {selected.servingLabel} per serving
        </p>

        <Field label="Servings">
          <NumberInput value={servings} onChange={(event) => setServings(event.target.value)} autoFocus />
        </Field>

        <div className="mt-2 grid grid-cols-4 gap-2">
          {['0.5', '1', '1.5', '2'].map((preset) => (
            <Button key={preset} variant="secondary" onClick={() => setServings(preset)}>
              {preset}
            </Button>
          ))}
        </div>

        <Card className="mt-4 p-3">
          <p className="wide font-mono text-2xl font-bold tabular-nums">
            {Math.round(preview.calories)} <span className="text-base font-medium text-steel">kcal</span>
          </p>
          <p className="font-mono text-sm tabular-nums text-steel">{macroLine(preview)}</p>
        </Card>

        <Button className="mt-4 w-full" disabled={amount <= 0} onClick={() => void addToDiary()}>
          Add to {MEAL_LABELS[meal].toLowerCase()}
        </Button>
        <Button variant="quiet" className="mt-2 w-full" onClick={() => setSelected(null)}>
          Pick a different food
        </Button>
      </Sheet>
    )
  }

  return (
    <Sheet open title={`Add to ${MEAL_LABELS[meal].toLowerCase()}`} onClose={onClose}>
      <TextInput
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search your foods"
        aria-label="Search your foods"
      />

      <ul className="mt-3 grid gap-2">
        {matches.map((food) => (
          <li key={food.id}>
            <button
              type="button"
              onClick={() => {
                setSelected(food)
                setServings('1')
              }}
              className="flex w-full items-center justify-between gap-3 rounded-[3px] border-2 border-iron bg-paper px-3 py-2.5 text-left active:translate-y-px"
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold">{food.name}</span>
                <span className="font-mono text-xs tabular-nums text-steel">
                  {food.servingLabel} · {macroLine(food)}
                </span>
              </span>
              <span className="shrink-0 font-mono text-sm tabular-nums">{Math.round(food.calories)}</span>
            </button>
          </li>
        ))}
      </ul>

      {matches.length === 0 ? (
        <p className="mt-3 text-sm text-steel">Nothing matches “{query}”. Add it to your foods instead.</p>
      ) : null}

      <Button variant="secondary" className="mt-3 w-full" onClick={() => setCreating(true)}>
        <Plus size={16} /> New food
      </Button>
    </Sheet>
  )
}

function FoodLibrary() {
  const foods = useLiveQuery(() => db.foods.toArray(), []) ?? []
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<FoodItem | null>(null)

  const term = query.trim().toLowerCase()
  const matches = foods.filter((food) => food.name.toLowerCase().includes(term))

  async function removeFood(food: FoodItem) {
    if (!window.confirm(`Delete ${food.name}? Diary entries using it go too.`)) return
    await db.foodLogEntries.where('foodId').equals(food.id).delete()
    await db.foods.delete(food.id)
  }

  return (
    <>
      <TextInput
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search your foods"
        aria-label="Search your foods"
      />
      <Button variant="secondary" className="mt-3 w-full" onClick={() => setCreating(true)}>
        <Plus size={16} /> New food
      </Button>

      <div className="mt-5">
        <SectionTitle>Your foods</SectionTitle>
      </div>

      {matches.length === 0 ? (
        <EmptyState
          title="No foods match"
          hint="Add the things you eat often — they only need entering once."
          action={<Button onClick={() => setCreating(true)}>New food</Button>}
        />
      ) : (
        <ul className="grid gap-2">
          {matches.map((food) => (
            <li key={food.id}>
              <Card className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{food.name}</p>
                  <p className="font-mono text-xs tabular-nums text-steel">
                    {food.servingLabel} · {Math.round(food.calories)} kcal · {macroLine(food)}
                  </p>
                </div>
                <div className="flex shrink-0">
                  <IconButton label={`Edit ${food.name}`} onClick={() => setEditing(food)}>
                    <Pencil size={16} />
                  </IconButton>
                  <IconButton label={`Delete ${food.name}`} onClick={() => void removeFood(food)}>
                    <Trash2 size={16} />
                  </IconButton>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={creating} title="New food" onClose={() => setCreating(false)}>
        <FoodForm onSaved={() => setCreating(false)} />
      </Sheet>

      {editing ? (
        <Sheet open title={`Edit ${editing.name}`} onClose={() => setEditing(null)}>
          <FoodForm initial={editing} onSaved={() => setEditing(null)} />
        </Sheet>
      ) : null}
    </>
  )
}

function FoodForm({
  initial,
  onSaved,
}: {
  initial?: FoodItem
  onSaved: (food: FoodItem) => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [servingLabel, setServingLabel] = useState(initial?.servingLabel ?? '100 g')
  const [calories, setCalories] = useState(initial ? String(initial.calories) : '')
  const [protein, setProtein] = useState(initial ? String(initial.protein) : '')
  const [carbs, setCarbs] = useState(initial ? String(initial.carbs) : '')
  const [fat, setFat] = useState(initial ? String(initial.fat) : '')

  async function submit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const values = {
      name: trimmed,
      servingLabel: servingLabel.trim() || '1 serving',
      calories: parseNumber(calories),
      protein: parseNumber(protein),
      carbs: parseNumber(carbs),
      fat: parseNumber(fat),
    }

    if (initial) {
      await db.foods.update(initial.id, values)
      onSaved({ ...initial, ...values })
      return
    }

    const id = await db.foods.add({ ...values, createdAt: Date.now() })
    const created = await db.foods.get(id)
    if (created) onSaved(created)
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="grid gap-3">
      <Field label="Food name">
        <TextInput
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Greek yoghurt, chicken thigh…"
          autoFocus
        />
      </Field>
      <Field label="Serving size" hint="What one serving means — 100 g, 1 scoop, 1 slice.">
        <TextInput value={servingLabel} onChange={(event) => setServingLabel(event.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Calories">
          <NumberInput value={calories} onChange={(event) => setCalories(event.target.value)} placeholder="0" />
        </Field>
        <Field label="Protein (g)">
          <NumberInput value={protein} onChange={(event) => setProtein(event.target.value)} placeholder="0" />
        </Field>
        <Field label="Carbs (g)">
          <NumberInput value={carbs} onChange={(event) => setCarbs(event.target.value)} placeholder="0" />
        </Field>
        <Field label="Fat (g)">
          <NumberInput value={fat} onChange={(event) => setFat(event.target.value)} placeholder="0" />
        </Field>
      </div>
      <Button type="submit" disabled={!name.trim()}>
        {initial ? 'Save changes' : 'Create food'}
      </Button>
    </form>
  )
}
