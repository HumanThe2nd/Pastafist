export type DietType =
  | 'vegetarian'
  | 'vegan'
  | 'pescatarian'
  | 'halal'
  | 'kosher'
  | 'keto'
  | 'gluten-free'
  | 'dairy-free'

export type MacroFocus = 'balanced' | 'high-protein' | 'low-carb' | 'high-fiber'
export type Allergy = 'peanuts' | 'tree nuts' | 'dairy' | 'eggs' | 'soy' | 'gluten'
export type LocationPoint = [number, number]

export interface ShoppingFrequencyOption {
  value: number
  label: string
}

export const SHOPPING_FREQUENCY_OPTIONS: ShoppingFrequencyOption[] = [
  { value: 2, label: 'Every other day' },
  { value: 3.5, label: 'Twice weekly' },
  { value: 7, label: 'Weekly' },
  { value: 14, label: 'Biweekly' },
  { value: 30, label: 'Monthly' }
]

export interface OnboardingPreferences {
  budget: number
  mealsPerDay: number
  travelRadiusMeters: number
  dietType: DietType
  allergies: Allergy[]
  macroFocus: MacroFocus
  location: LocationPoint
  shoppingFrequency: number
}

export const defaultPreferences: OnboardingPreferences = {
  budget: 65,
  mealsPerDay: 2,
  travelRadiusMeters: 3000,
  dietType: 'vegetarian',
  allergies: [],
  macroFocus: 'balanced',
  location: [45.4215, -75.6972],
  shoppingFrequency: 7
}

export type StepId = 'welcome' | 'constraints' | 'diet' | 'stores'

export interface StepDefinition {
  id: StepId
  title: string
  description: string
}
