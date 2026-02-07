import type { GroceryListItem, PlanMeal, PlanSummary } from '../types'

export const planSummary: PlanSummary = {
  id: 'plan-2025-02-06',
  periodLabel: 'This week',
  totalCost: '$41.80',
  meals: 10,
  avgCookTime: '23 min',
  storesCompared: 6,
  savings: '$14.20',
  nextRunInDays: 2
}

export const planMeals: PlanMeal[] = [
  { id: 'm1', day: 'Mon', slot: 'Dinner', title: 'Turkey chili', ingredientCount: 9 },
  { id: 'm2', day: 'Tue', slot: 'Lunch', title: 'Veggie stir-fry', ingredientCount: 7 },
  { id: 'm3', day: 'Wed', slot: 'Dinner', title: 'Salmon rice bowl', ingredientCount: 8 },
  { id: 'm4', day: 'Thu', slot: 'Dinner', title: 'Chickpea curry', ingredientCount: 10 },
  { id: 'm5', day: 'Fri', slot: 'Dinner', title: 'Pesto pasta', ingredientCount: 6 }
]

export const groceryList: GroceryListItem[] = [
  {
    id: 'g1',
    name: 'Chicken thighs',
    totalNeeded: '1.2 kg',
    bestStore: 'Metro',
    purchased: true,
    storeOptions: [
      { store: 'Metro', unitPrice: '$6.99/kg', quantity: '1.2 kg' },
      { store: 'Costco', unitPrice: '$6.20/kg', quantity: '1.5 kg' }
    ]
  },
  {
    id: 'g2',
    name: 'Baby spinach',
    totalNeeded: '2 bags',
    bestStore: 'Farm Boy',
    purchased: false,
    storeOptions: [
      { store: 'Farm Boy', unitPrice: '$2.20/bag', quantity: '2 bags' },
      { store: 'Loblaws', unitPrice: '$2.60/bag', quantity: '2 bags' }
    ]
  },
  {
    id: 'g3',
    name: 'Greek yogurt',
    totalNeeded: '2 tubs',
    bestStore: 'Costco',
    purchased: false,
    storeOptions: [
      { store: 'Costco', unitPrice: '$6.49/1 kg', quantity: '2 tubs' },
      { store: 'Metro', unitPrice: '$3.99/500 g', quantity: '2 tubs' }
    ]
  },
  {
    id: 'g4',
    name: 'Cherry tomatoes',
    totalNeeded: '1 pint',
    bestStore: 'Loblaws',
    purchased: false,
    storeOptions: [
      { store: 'Loblaws', unitPrice: '$3.49/pint', quantity: '1 pint' },
      { store: 'Walmart', unitPrice: '$3.99/pint', quantity: '1 pint' }
    ]
  },
  {
    id: 'g5',
    name: 'Tortillas',
    totalNeeded: '1 pack',
    bestStore: 'Walmart',
    purchased: true,
    storeOptions: [
      { store: 'Walmart', unitPrice: '$2.49/pack', quantity: '1 pack' },
      { store: 'No Frills', unitPrice: '$2.79/pack', quantity: '1 pack' }
    ]
  }
]
