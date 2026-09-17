import type { Food, FoodLogEntry } from '../db'

export interface Macros {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export const NO_MACROS: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 }

export function scaleFood(food: Food, servings: number): Macros {
  return {
    calories: food.calories * servings,
    protein: food.protein * servings,
    carbs: food.carbs * servings,
    fat: food.fat * servings,
  }
}

export function addMacros(a: Macros, b: Macros): Macros {
  return {
    calories: a.calories + b.calories,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
  }
}

export function totalMacros(
  entries: FoodLogEntry[],
  foodsById: Map<number, Food>,
): Macros {
  return entries.reduce((sum, entry) => {
    const food = foodsById.get(entry.foodId)
    return food ? addMacros(sum, scaleFood(food, entry.servings)) : sum
  }, NO_MACROS)
}

/** Calories implied by a macro split, for sanity-checking goals. */
export function caloriesFromMacros(protein: number, carbs: number, fat: number): number {
  return protein * 4 + carbs * 4 + fat * 9
}

export function formatServings(servings: number): string {
  return Number.isInteger(servings) ? String(servings) : servings.toFixed(2).replace(/0$/, '')
}
