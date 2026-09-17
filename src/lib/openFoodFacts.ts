const PRODUCT_ENDPOINT = 'https://world.openfoodfacts.org/api/v2/product'
const SEARCH_ENDPOINT = 'https://world.openfoodfacts.org/cgi/search.pl'
const FIELDS = 'code,product_name,brands,serving_size,nutriments'

export interface ProductNutrition {
  name: string
  servingLabel: string
  calories: number
  protein: number
  carbs: number
  fat: number
  barcode?: string
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
 * Turns one Open Food Facts product into something loggable, preferring the pack's own
 * serving when it carries nutrition for one. Returns null when there is no usable
 * nutrition or nothing to call it.
 */
function parseProduct(
  product: Record<string, unknown>,
  fallbackBarcode?: string,
): ProductNutrition | null {
  const nutriments = (product.nutriments ?? {}) as Nutriments
  const servingSize = typeof product.serving_size === 'string' ? product.serving_size.trim() : ''

  const useServing = servingSize !== '' && readCalories(nutriments, 'serving') !== undefined
  const suffix = useServing ? 'serving' : '100g'

  const calories = readCalories(nutriments, suffix)
  if (calories === undefined) return null

  const barcode = typeof product.code === 'string' ? product.code : fallbackBarcode
  const productName = typeof product.product_name === 'string' ? product.product_name.trim() : ''
  const brand = typeof product.brands === 'string' ? (product.brands.split(',')[0]?.trim() ?? '') : ''
  const name = [brand, productName].filter(Boolean).join(' ').trim()
  if (!name && !barcode) return null

  return {
    name: name || `Barcode ${barcode}`,
    servingLabel: useServing ? servingSize : '100 g',
    calories: Math.round(calories),
    protein: round(readNumber(nutriments, `proteins_${suffix}`) ?? 0),
    carbs: round(readNumber(nutriments, `carbohydrates_${suffix}`) ?? 0),
    fat: round(readNumber(nutriments, `fat_${suffix}`) ?? 0),
    barcode,
  }
}

/** Looks a barcode up. Returns null when the product is unknown or has no usable nutrition. */
export async function lookupBarcode(
  barcode: string,
  signal?: AbortSignal,
): Promise<ProductNutrition | null> {
  const url = `${PRODUCT_ENDPOINT}/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`
  const response = await fetch(url, { signal })
  if (!response.ok) return null

  const body: unknown = await response.json()
  if (typeof body !== 'object' || body === null) return null
  const product = (body as { product?: Record<string, unknown> }).product
  if (!product) return null

  return parseProduct(product, barcode)
}

/** Full-text search, for food that has no barcode to scan. */
export async function searchProducts(
  term: string,
  signal?: AbortSignal,
): Promise<ProductNutrition[]> {
  const params = new URLSearchParams({
    search_terms: term,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '20',
    fields: FIELDS,
  })

  const response = await fetch(`${SEARCH_ENDPOINT}?${params.toString()}`, { signal })
  if (!response.ok) return []

  const body: unknown = await response.json()
  const products = (body as { products?: unknown })?.products
  if (!Array.isArray(products)) return []

  return products
    .map((product) =>
      typeof product === 'object' && product !== null
        ? parseProduct(product as Record<string, unknown>)
        : null,
    )
    .filter((product): product is ProductNutrition => product !== null)
}
