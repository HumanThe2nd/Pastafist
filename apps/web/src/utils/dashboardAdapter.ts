import type {
  DashboardBootstrapResponse,
  DashboardState,
  GroceryListItem,
  GroceryRunGroup,
  LatLng,
  PlanMeal,
  PlanSummary,
  StoreOption,
  TripPlan,
  TripStop,
} from '../types'

type PriceLinks = DashboardBootstrapResponse['shoppingSchedule'][number][0]['items'][number]['ingredient']['priceLinks']

type GroupAndCost = {
  groups: GroceryRunGroup[]
  estimatedTotalCost: number
  estimatedSavings: number
}

const dayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' })

const slotLabels = (count: number): string[] => {
  if (count === 1) return ['Meal']
  if (count === 2) return ['Lunch', 'Dinner']
  if (count === 3) return ['Breakfast', 'Lunch', 'Dinner']
  if (count === 4) return ['Breakfast', 'Lunch', 'Dinner', 'Snack']
  return Array.from({ length: count }, (_, index) => `Meal ${index + 1}`)
}

const formatAmount = (value: number): string => {
  if (!Number.isFinite(value)) return '0'
  if (Number.isInteger(value)) return `${value}`
  return value.toFixed(2).replace(/\.?0+$/, '')
}

const formatCurrency = (value: number): string => {
  return `$${value.toFixed(2)}`
}

const toUtcDate = (value: string): Date => {
  return new Date(`${value}T12:00:00.000Z`)
}

const parseStoreName = (buyUrl: string, fallbackIndex: number): string => {
  const hostMatch = buyUrl.match(/^(?:[a-z]+:\/\/)?([^/?#]+)/i)
  const host = hostMatch?.[1] ?? ''
  const root = host.split('.')[0] ?? ''
  const text = root.replace(/[-_]/g, ' ').trim()
  if (!text) return `Unknown store ${fallbackIndex + 1}`
  return text.replace(/\b\w/g, (char) => char.toUpperCase())
}

const toLatLng = (lat: number, lng: number): LatLng => [lat, lng]

const assertBootstrapShape = (bootstrap: DashboardBootstrapResponse): void => {
  if (!Array.isArray(bootstrap.mealSchedule)) {
    throw new Error('Invalid bootstrap payload: missing mealSchedule array')
  }
  if (!Array.isArray(bootstrap.shoppingSchedule)) {
    throw new Error('Invalid bootstrap payload: missing shoppingSchedule array')
  }
  if (!bootstrap.preferences || typeof bootstrap.preferences !== 'object') {
    throw new Error('Invalid bootstrap payload: missing preferences object')
  }
}

const mapStoreOptions = (priceLinks: PriceLinks, quantityLabel: string): StoreOption[] => {
  if (priceLinks.length === 0) return []

  return [...priceLinks]
    .sort((a, b) => a.price - b.price)
    .map((link, index) => ({
      store: parseStoreName(link.buyUrl, index),
      unitPrice: formatCurrency(link.price),
      quantity: quantityLabel,
      purchaseUrl: link.buyUrl
    }))
}

const buildMeals = (bootstrap: DashboardBootstrapResponse): PlanMeal[] => {
  const byDateCounter = new Map<string, number>()
  const labels = slotLabels(Math.max(1, bootstrap.preferences.mealsPerDay))

  return [...bootstrap.mealSchedule]
    .sort((left, right) => toUtcDate(left[1]).getTime() - toUtcDate(right[1]).getTime())
    .map(([meal, dayIso]) => {
      const counter = byDateCounter.get(dayIso) ?? 0
      byDateCounter.set(dayIso, counter + 1)
      const day = dayFormatter.format(toUtcDate(dayIso))
      const slot = labels[Math.min(counter, labels.length - 1)] ?? `Meal ${counter + 1}`

      return {
        id: meal.id,
        day,
        slot,
        title: meal.title,
        ingredientCount: meal.ingredientIds.length
      }
    })
}

const buildGroups = (bootstrap: DashboardBootstrapResponse): GroupAndCost => {
  let estimatedTotalCost = 0
  let estimatedSavings = 0

  const groups = [...bootstrap.shoppingSchedule]
    .sort((left, right) => toUtcDate(left[1]).getTime() - toUtcDate(right[1]).getTime())
    .map(([list, dayIso], runIndex) => {
      const runDate = dayFormatter.format(toUtcDate(dayIso))
      const status: GroceryRunGroup['status'] = runIndex === 0 ? 'current' : 'later'
      const label = runIndex === 0 ? 'This run' : 'Later run'
      const subtitle = runIndex === 0 ? 'Auto-scheduled for this trip' : 'Next scheduled trip'

      const items: GroceryListItem[] = list.items.map((entry, itemIndex) => {
        const quantityLabel = `${formatAmount(entry.quantity.amount)} ${entry.quantity.unit}`
        const storeOptions = mapStoreOptions(entry.ingredient.priceLinks, quantityLabel)
        const bestStore = storeOptions[0]?.store ?? 'Unavailable'
        const sortedPrices = [...entry.ingredient.priceLinks].map((link) => link.price).sort((a, b) => a - b)
        const cheapest = sortedPrices[0] ?? 0
        const priciest = sortedPrices[sortedPrices.length - 1] ?? cheapest
        estimatedTotalCost += cheapest
        estimatedSavings += Math.max(0, priciest - cheapest)

        return {
          id: `${list.id}-${entry.ingredient.id}-${itemIndex + 1}`,
          name: entry.ingredient.name,
          totalNeeded: quantityLabel,
          bestStore,
          purchased: false,
          storeOptions
        }
      })

      return { id: list.id, label, subtitle, status, runDate, items }
    })

  return { groups, estimatedTotalCost, estimatedSavings }
}

const buildTripPlan = (
  bootstrap: DashboardBootstrapResponse,
  groups: GroceryRunGroup[]
): TripPlan | null => {
  const currentRun = groups.find((group) => group.status === 'current') ?? groups[0]
  if (!currentRun || currentRun.items.length === 0) return null

  const [homeLat, homeLng] = bootstrap.preferences.location
  const uniqueStores = Array.from(new Set(currentRun.items.map((item) => item.bestStore)))
  const offsets: Array<[number, number]> = [
    [0.009, 0.005],
    [0.004, -0.007],
    [-0.006, 0.006],
    [-0.004, -0.005]
  ]

  const stops: TripStop[] = uniqueStores.map((store, index) => {
    const [latDelta, lngDelta] = offsets[index % offsets.length] ?? [0.003, 0.003]
    return {
      id: `s${index + 1}`,
      store,
      address: `${store} location`,
      eta: `${10 + index * 6} min`,
      lat: homeLat + latDelta,
      lng: homeLng + lngDelta
    }
  })

  const timeline = [
    {
      id: 't-leave',
      time: '3:00 pm',
      label: 'Leave home',
      detail: 'Optimized route'
    },
    ...stops.map((stop, index) => {
      const count = currentRun.items.filter((item) => item.bestStore === stop.store).length
      return {
        id: `t-stop-${index + 1}`,
        time: `${3 + Math.floor((20 + index * 20) / 60)}:${`${(20 + index * 20) % 60}`.padStart(2, '0')} pm`,
        label: stop.store,
        detail: `${count} item${count === 1 ? '' : 's'}`,
        stopId: stop.id
      }
    }),
    {
      id: 't-return',
      time: '5:00 pm',
      label: 'Return',
      detail: 'ETA back home'
    }
  ]

  return {
    id: `trip-${currentRun.id}`,
    runLabel: currentRun.label,
    runDate: currentRun.runDate ?? dayFormatter.format(new Date()),
    window: '3:00-5:00 pm',
    timeline,
    stops,
    route: [toLatLng(homeLat, homeLng), ...stops.map((stop) => toLatLng(stop.lat, stop.lng))]
  }
}

const buildSummary = (
  bootstrap: DashboardBootstrapResponse,
  meals: PlanMeal[],
  groups: GroceryRunGroup[],
  estimatedTotalCost: number,
  estimatedSavings: number
): PlanSummary => {
  const uniqueStores = new Set(groups.flatMap((group) => group.items.map((item) => item.bestStore)))

  return {
    id: bootstrap.id,
    periodLabel: 'This week',
    totalCost: formatCurrency(estimatedTotalCost),
    meals: meals.length,
    avgCookTime: '25 min',
    storesCompared: uniqueStores.size,
    savings: formatCurrency(estimatedSavings),
    nextRunInDays: bootstrap.preferences.shoppingFrequency
  }
}

export const deriveActiveRunId = (groups: GroceryRunGroup[]): string | null => {
  return (
    groups.find((group) => group.status === 'current')?.id ??
    groups.find((group) => group.status === 'later')?.id ??
    groups[0]?.id ??
    null
  )
}

export const buildDashboardState = (bootstrap: DashboardBootstrapResponse): DashboardState => {
  assertBootstrapShape(bootstrap)
  const meals = buildMeals(bootstrap)
  const { groups, estimatedTotalCost, estimatedSavings } = buildGroups(bootstrap)
  const tripPlan = buildTripPlan(bootstrap, groups)
  const summary = buildSummary(bootstrap, meals, groups, estimatedTotalCost, estimatedSavings)

  return {
    summary,
    meals,
    groups,
    tripPlan,
    activeRunId: deriveActiveRunId(groups)
  }
}
