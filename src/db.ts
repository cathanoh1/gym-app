import Dexie, { type EntityTable } from 'dexie'
import type { DateKey } from './lib/dates'

export interface Exercise {
  id: number
  name: string
  muscleGroup: string
  createdAt: number
}

export interface WorkoutSet {
  reps: number
  weight: number
}

export interface WorkoutEntry {
  id: number
  exerciseId: number
  date: DateKey
  sets: WorkoutSet[]
  notes?: string
  createdAt: number
}

export interface Habit {
  id: number
  name: string
  createdAt: number
}

export interface HabitCompletion {
  id: number
  habitId: number
  date: DateKey
  completedAt: number
}

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snacks'

export const MEALS: Meal[] = ['breakfast', 'lunch', 'dinner', 'snacks']

export interface Food {
  id: number
  name: string
  servingLabel: string
  calories: number
  protein: number
  carbs: number
  fat: number
  barcode?: string
  createdAt: number
}

export interface FoodLogEntry {
  id: number
  foodId: number
  date: DateKey
  meal: Meal
  servings: number
  createdAt: number
}

export interface WeightEntry {
  id: number
  date: DateKey
  /** Always kilograms, converted on the way in and out, so a unit change cannot bend the trend. */
  kg: number
  createdAt: number
}

export interface Settings {
  id: number
  calorieGoal: number
  proteinGoal: number
  carbGoal: number
  fatGoal: number
  weightUnit: 'kg' | 'lb'
}

export const SETTINGS_ID = 1

export const db = new Dexie('GymApp') as Dexie & {
  exercises: EntityTable<Exercise, 'id'>
  workoutEntries: EntityTable<WorkoutEntry, 'id'>
  habits: EntityTable<Habit, 'id'>
  habitCompletions: EntityTable<HabitCompletion, 'id'>
  foods: EntityTable<Food, 'id'>
  foodLogEntries: EntityTable<FoodLogEntry, 'id'>
  weightEntries: EntityTable<WeightEntry, 'id'>
  settings: EntityTable<Settings, 'id'>
}

db.version(1).stores({
  exercises: '++id, name, muscleGroup',
  workoutEntries: '++id, exerciseId, date, [exerciseId+date]',
  habits: '++id, name',
  habitCompletions: '++id, habitId, date, [habitId+date]',
  foods: '++id, name',
  foodLogEntries: '++id, foodId, date, [date+meal]',
  settings: 'id',
})

// Scanned products remember their barcode, so a second scan skips the lookup.
db.version(2).stores({
  foods: '++id, name, barcode',
})

db.version(3).stores({
  weightEntries: '++id, date',
})

const STARTER_EXERCISES: Array<[string, string]> = [
  ['Barbell bench press', 'Chest'],
  ['Incline dumbbell press', 'Chest'],
  ['Pull-up', 'Back'],
  ['Barbell row', 'Back'],
  ['Lat pulldown', 'Back'],
  ['Overhead press', 'Shoulders'],
  ['Lateral raise', 'Shoulders'],
  ['Back squat', 'Legs'],
  ['Romanian deadlift', 'Legs'],
  ['Leg press', 'Legs'],
  ['Barbell curl', 'Arms'],
  ['Triceps pushdown', 'Arms'],
]

const STARTER_FOODS: Array<Omit<Food, 'id' | 'createdAt'>> = [
  { name: 'Chicken breast', servingLabel: '100 g', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: 'White rice, cooked', servingLabel: '100 g', calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { name: 'Porridge oats, dry', servingLabel: '50 g', calories: 190, protein: 6.5, carbs: 33, fat: 3.3 },
  { name: 'Whole egg', servingLabel: '1 large', calories: 72, protein: 6.3, carbs: 0.4, fat: 4.8 },
  { name: 'Whey protein', servingLabel: '1 scoop (30 g)', calories: 116, protein: 24, carbs: 2, fat: 1.5 },
  { name: 'Banana', servingLabel: '1 medium', calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
]

db.on('populate', async () => {
  const now = Date.now()
  await db.exercises.bulkAdd(
    STARTER_EXERCISES.map(([name, muscleGroup]) => ({ name, muscleGroup, createdAt: now })),
  )
  await db.foods.bulkAdd(STARTER_FOODS.map((food) => ({ ...food, createdAt: now })))
  await db.habits.bulkAdd([
    { name: 'Creatine', createdAt: now },
    { name: 'Protein target', createdAt: now },
    { name: '3 L water', createdAt: now },
  ])
  await db.settings.add({
    id: SETTINGS_ID,
    calorieGoal: 2600,
    proteinGoal: 180,
    carbGoal: 280,
    fatGoal: 80,
    weightUnit: 'kg',
  })
})

export const DEFAULT_SETTINGS: Settings = {
  id: SETTINGS_ID,
  calorieGoal: 2600,
  proteinGoal: 180,
  carbGoal: 280,
  fatGoal: 80,
  weightUnit: 'kg',
}
