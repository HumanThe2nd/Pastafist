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

export interface OnboardingPreferences {
  budget: number
  currency: string
  budgetPeriod: BudgetPeriod
  mealsPerDay: number
  timePerMeal: number
  travelRadiusMinutes: number
  travelMode: TravelMode
  servings: number
  dietType: DietType
  allergies: string[]
  exclusions: string[]
  macroFocus: MacroFocus
  calorieGoal?: number
  gender?: Gender
  location?: string
  preferredStores: string[]
}

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
  calorieGoal: undefined,
  gender: undefined,
  location: undefined,
  preferredStores: []
}

export interface StepDefinition {
  id: 'welcome' | 'constraints' | 'diet' | 'stores'
  title: string
  description: string
}
