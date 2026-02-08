import type { OnboardingPreferences } from './onboarding'

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

export type LatLng = [number, number]

export interface TripTimelineStep {
  id: string
  time: string
  label: string
  detail?: string
  stopId?: string
}

export interface TripStop {
  id: string
  store: string
  address: string
  eta: string
  lat: number
  lng: number
}

export interface TripPlan {
  id: string
  runLabel: string
  runDate: string
  window: string
  timeline: TripTimelineStep[]
  stops: TripStop[]
  route: LatLng[]
}

export interface DashboardLocalState {
  summary: PlanSummary | null
  meals: PlanMeal[]
  groups: GroceryRunGroup[]
  tripPlan: TripPlan | null
  activeRunId: string | null
}

export type DashboardState = DashboardLocalState

export interface ApiIngredientPriceLink {
  price: number
  buyUrl: string
}

export interface ApiIngredient {
  id: string
  name: string
  imageUrl: string | null
  priceLinks: ApiIngredientPriceLink[]
}

export interface ApiQuantity {
  amount: number
  unit: string
}

export interface ApiIngredientQuantity {
  ingredient: ApiIngredient
  quantity: ApiQuantity
}

export interface ApiShoppingList {
  id: string
  items: ApiIngredientQuantity[]
}

export interface ApiMeal {
  id: string
  title: string
  ingredientIds: string[]
}

export interface DashboardBootstrapResponse {
  id: string
  createdAt: string
  preferences: OnboardingPreferences
  mealSchedule: Array<[ApiMeal, string]>
  shoppingSchedule: Array<[ApiShoppingList, string]>
}
