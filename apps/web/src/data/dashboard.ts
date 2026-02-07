import type { GroceryListItem, GroceryRunGroup, PlanMeal, PlanSummary, TripPlan } from '../types'

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
      { store: 'Metro', unitPrice: '$6.99/kg', quantity: '1.2 kg', purchaseUrl: 'https://metro.example/item/chicken' },
      { store: 'Costco', unitPrice: '$6.20/kg', quantity: '1.5 kg', purchaseUrl: 'https://costco.example/item/chicken' }
    ]
  },
  {
    id: 'g2',
    name: 'Baby spinach',
    totalNeeded: '2 bags',
    bestStore: 'Farm Boy',
    purchased: false,
    storeOptions: [
      { store: 'Farm Boy', unitPrice: '$2.20/bag', quantity: '2 bags', purchaseUrl: 'https://farmboy.example/item/spinach' },
      { store: 'Loblaws', unitPrice: '$2.60/bag', quantity: '2 bags', purchaseUrl: 'https://loblaws.example/item/spinach' }
    ]
  },
  {
    id: 'g3',
    name: 'Greek yogurt',
    totalNeeded: '2 tubs',
    bestStore: 'Costco',
    purchased: false,
    storeOptions: [
      { store: 'Costco', unitPrice: '$6.49/1 kg', quantity: '2 tubs', purchaseUrl: 'https://costco.example/item/yogurt' },
      { store: 'Metro', unitPrice: '$3.99/500 g', quantity: '2 tubs', purchaseUrl: 'https://metro.example/item/yogurt' }
    ]
  },
  {
    id: 'g4',
    name: 'Cherry tomatoes',
    totalNeeded: '1 pint',
    bestStore: 'Loblaws',
    purchased: false,
    storeOptions: [
      { store: 'Loblaws', unitPrice: '$3.49/pint', quantity: '1 pint', purchaseUrl: 'https://loblaws.example/item/tomatoes' },
      { store: 'Walmart', unitPrice: '$3.99/pint', quantity: '1 pint', purchaseUrl: 'https://walmart.example/item/tomatoes' }
    ]
  },
  {
    id: 'g5',
    name: 'Tortillas',
    totalNeeded: '1 pack',
    bestStore: 'Walmart',
    purchased: true,
    storeOptions: [
      { store: 'Walmart', unitPrice: '$2.49/pack', quantity: '1 pack', purchaseUrl: 'https://walmart.example/item/tortillas' },
      { store: 'No Frills', unitPrice: '$2.79/pack', quantity: '1 pack', purchaseUrl: 'https://nofrills.example/item/tortillas' }
    ]
  },
  {
    id: 'g6',
    name: 'Bell peppers',
    totalNeeded: '3 peppers',
    bestStore: 'No Frills',
    purchased: false,
    storeOptions: [
      { store: 'No Frills', unitPrice: '$1.49 each', quantity: '3 peppers', purchaseUrl: 'https://nofrills.example/item/peppers' },
      { store: 'Walmart', unitPrice: '$1.59 each', quantity: '3 peppers', purchaseUrl: 'https://walmart.example/item/peppers' }
    ]
  }
]

export const groceryRunGroups: GroceryRunGroup[] = [
  {
    id: 'run-current',
    label: 'This run',
    subtitle: 'Auto-scheduled for this trip',
    status: 'current',
    runDate: 'Thu',
    items: [groceryList[1], groceryList[2]].filter(Boolean) as GroceryListItem[]
  },
  {
    id: 'run-later-1',
    label: 'Later run',
    subtitle: 'Next scheduled trip',
    status: 'later',
    runDate: 'Sun',
    items: [groceryList[3], groceryList[5]].filter(Boolean) as GroceryListItem[]
  },
  {
    id: 'run-purchased',
    label: 'Purchased',
    subtitle: 'Already completed',
    status: 'purchased',
    items: groceryList.filter((item) => item.purchased)
  }
]

export const tripPlan: TripPlan = {
  id: 'trip-1',
  runLabel: 'This run',
  runDate: 'Thu',
  window: '3:00–5:00 pm',
  timeline: [
    { id: 't1', time: '3:00 pm', label: 'Leave home', detail: 'Transit + walk' },
    { id: 't2', time: '3:15 pm', label: 'Metro', detail: 'best price', stopId: 's1' },
    { id: 't3', time: '3:40 pm', label: 'Farm Boy', detail: 'produce', stopId: 's2' },
    { id: 't4', time: '4:20 pm', label: 'Return', detail: 'ETA back home' }
  ],
  stops: [
    {
      id: 's1',
      store: 'Metro',
      address: '100 Rideau St',
      eta: '12 min',
      lat: 45.4253,
      lng: -75.6926
    },
    {
      id: 's2',
      store: 'Farm Boy',
      address: '360 Laurier Ave',
      eta: '9 min',
      lat: 45.4204,
      lng: -75.7008
    }
  ],
  route: [
    [45.4215, -75.6972],
    [45.4239, -75.6952],
    [45.4253, -75.6926],
    [45.4236, -75.6968],
    [45.4221, -75.6991],
    [45.4204, -75.7008]
  ]
}
