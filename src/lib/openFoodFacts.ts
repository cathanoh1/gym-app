const ENDPOINT = 'https://world.openfoodfacts.org/api/v2/product'

export interface ProductNutrition {
  name: string
  servingLabel: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

interface Nutriments {
  [key: string]: number | string | undefined
}

function readNumber(nutriments: Nutriments, key: string): number | undefined {
  const value = nutriments[key]
  const parsed = typeof value === 'string' ? Number.parseFloat(value) : value
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : undefined
}

/** Open Food Facts reports energy in kcal when it can, and kJ when it can't. */
function readCalories(nutriments: Nutriments, suffix: string): number | undefined {
  const kcal = readNumber(nutriments, `energy-kcal_${suffix}`)
  if (kcal !== undefined) return kcal
  const kj = readNumber(nutriments, `energy_${suffix}`)
  return kj === undefined ? undefined : kj / 4.184
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}

/**
 * Looks a barcode up on Open Food Facts. Prefers the pack's own serving when it carries
 * nutrition for one, and falls back to per-100 g figures otherwise.
 * Returns null when the product is unknown or has no usable nutrition.
 */
export async function lookupBarcode(barcode: string, signal?: AbortSignal): Promise<ProductNutrition | null> {
  const url = `${ENDPOINT}/${encodeURIComponent(barcode)}.json?fields=product_name,brands,quantity,serving_size,nutriments`
  const response = await fetch(url, { signal })
  if (!response.ok) return null

  const body: unknown = await response.json()
  if (typeof body !== 'object' || body === null) return null
  const product = (body as { product?: Record<string, unknown> }).product
  if (!product) return null

  const nutriments = (product.nutriments ?? {}) as Nutriments
  const servingSize = typeof product.serving_size === 'string' ? product.serving_size.trim() : ''

  const perServing = readCalories(nutriments, 'serving')
  const useServing = servingSize !== '' && perServing !== undefined
  const suffix = useServing ? 'serving' : '100g'

  const calories = readCalories(nutriments, suffix)
  if (calories === undefined) return null

  const productName = typeof product.product_name === 'string' ? product.product_name.trim() : ''
  const brand =
    typeof product.brands === 'string' ? product.brands.split(',')[0]?.trim() ?? '' : ''
  const name = [brand, productName].filter(Boolean).join(' ').trim()

  return {
    name: name || `Barcode ${barcode}`,
    servingLabel: useServing ? servingSize : '100 g',
    calories: Math.round(calories),
    protein: round(readNumber(nutriments, `proteins_${suffix}`) ?? 0),
    carbs: round(readNumber(nutriments, `carbohydrates_${suffix}`) ?? 0),
    fat: round(readNumber(nutriments, `fat_${suffix}`) ?? 0),
  }
}
