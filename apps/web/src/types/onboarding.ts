export type DietType =
  | 'none'
  | 'vegetarian'
  | 'vegan'
  | 'pescatarian'
  | 'halal'
  | 'kosher'
  | 'keto'
  | 'gluten-free'
  | 'dairy-free'
  | 'other'

export type MacroFocus = 'balanced' | 'high-protein' | 'low-carb' | 'high-fiber'

export type TravelMode = 'walk' | 'bike' | 'transit' | 'drive'

export type Gender = 'female' | 'male' | 'non-binary' | 'prefer-not-to-say'

export type BudgetPeriod = 'weekly' | 'biweekly' | 'monthly'

export type ShoppingFrequency = 'every_other_day' | 'twice_weekly' | 'weekly' | 'biweekly' | 'monthly'

export const SHOPPING_INTERVAL_DAYS: Record<ShoppingFrequency, number> = {
  every_other_day: 2,
  twice_weekly: 3.5,
  weekly: 7,
  biweekly: 14,
  monthly: 30
}

export const SHOPPING_FREQUENCY_OPTIONS: Array<{ value: ShoppingFrequency; label: string }> = [
  { value: 'every_other_day', label: 'Every other day' },
  { value: 'twice_weekly', label: 'Twice weekly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' }
]

export interface BudgetPreferences {
  budget: number
  currency: string
  budgetPeriod: BudgetPeriod
  mealsPerDay: number
  timePerMeal: number
  travelRadiusMinutes: number
  travelMode: TravelMode
  servings: number
}

export interface NutritionPreferences {
  dietType: DietType
  allergies: string[]
  exclusions: string[]
  macroFocus: MacroFocus
  calorieGoal?: number | null
}

export interface ProfilePreferences {
  gender?: Gender | null
  location?: string | null
  preferredStores: string[]
  shoppingFrequency: ShoppingFrequency
}

export interface OnboardingPreferences extends BudgetPreferences, NutritionPreferences, ProfilePreferences {}

export const defaultPreferences: OnboardingPreferences = {
  budget: 65,
  currency: 'CAD',
  budgetPeriod: 'weekly',
  mealsPerDay: 2,
  timePerMeal: 25,
  travelRadiusMinutes: 15,
  travelMode: 'walk',
  servings: 1,
  dietType: 'none',
  allergies: [],
  exclusions: [],
  macroFocus: 'balanced',
  calorieGoal: null,
  gender: null,
  location: null,
  preferredStores: [],
  shoppingFrequency: 'weekly'
}

export type StepId = 'welcome' | 'constraints' | 'diet' | 'stores'

export interface StepDefinition {
  id: StepId
  title: string
  description: string
}
