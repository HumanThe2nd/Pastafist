export interface PlanSummary {
  id: string
  periodLabel: string
  totalCost: string
  meals: number
  avgCookTime: string
  storesCompared: number
  savings: string
  nextRunInDays: number
}

export interface PlanMeal {
  id: string
  day: string
  slot: string
  title: string
  ingredientCount: number
}

export interface StoreOption {
  store: string
  unitPrice: string
  quantity: string
  purchaseUrl: string
}

export interface GroceryListItem {
  id: string
  name: string
  totalNeeded: string
  bestStore: string
  purchased: boolean
  storeOptions: StoreOption[]
}

export type GroceryRunStatus = 'current' | 'later' | 'purchased'

export interface GroceryRunGroup {
  id: string
  label: string
  subtitle?: string
  status: GroceryRunStatus
  items: GroceryListItem[]
  runDate?: string
}
