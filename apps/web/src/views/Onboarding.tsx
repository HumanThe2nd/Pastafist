import { useMemo, useState } from 'react'
import type { StepDefinition } from '../types'
import { defaultPreferences, type OnboardingPreferences } from '../types'
import { Button, InputField, OnboardingLayout, Stepper, TagSelect } from '../components'

const steps: StepDefinition[] = [
  {
    id: 'welcome',
    title: 'Welcome',
    description: 'Start fast with defaults or customize your constraints.'
  },
  {
    id: 'constraints',
    title: 'Constraints',
    description: 'Budget, time, travel radius, and meal cadence.'
  },
  {
    id: 'diet',
    title: 'Diet',
    description: 'Diet type, allergies, and optional calorie goals.'
  },
  {
    id: 'stores',
    title: 'Stores',
    description: 'Location and preferred stores.'
  }
]

const dietOptions = [
  'none',
  'vegetarian',
  'vegan',
  'pescatarian',
  'halal',
  'kosher',
  'keto',
  'gluten-free',
  'dairy-free'
]

const allergyOptions = ['peanuts', 'tree nuts', 'dairy', 'egg', 'soy', 'gluten']
const storeOptions = ['Metro', 'Farm Boy', 'Costco', 'Walmart', 'Loblaws', 'No Frills']

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState<StepDefinition['id']>('welcome')
  const [preferences, setPreferences] = useState<OnboardingPreferences>(defaultPreferences)

  const currentIndex = useMemo(
    () => steps.findIndex((step) => step.id === currentStep),
    [currentStep]
  )

  const goNext = () => {
    const next = steps[currentIndex + 1]
    if (next) {
      setCurrentStep(next.id)
    }
  }

  const goBack = () => {
    const prev = steps[currentIndex - 1]
    if (prev) {
      setCurrentStep(prev.id)
    }
  }

  const updatePreferences = (updates: Partial<OnboardingPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...updates }))
  }

  const stepContent = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div className="grid gap-6">
            <div className="rounded-2xl border border-leaf/10 bg-mist p-4 dark:border-[#3b2923] dark:bg-[#231815]">
              <p className="text-sm text-ink/70 dark:text-[#c8b9a9]">
                We will ask for budget, diet, and travel limits. Defaults are student-friendly and can be adjusted
                anytime.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={goNext}>Start onboarding</Button>
            </div>
          </div>
        )
      case 'constraints':
        return (
          <div className="grid gap-6">
            <div className="grid gap-3 md:grid-cols-2">
              <InputField
                label="Weekly budget"
                type="number"
                value={preferences.budget}
                onChange={(event) => updatePreferences({ budget: Number(event.target.value) })}
              />
              <InputField
                label="Meals per day"
                type="number"
                value={preferences.mealsPerDay}
                onChange={(event) => updatePreferences({ mealsPerDay: Number(event.target.value) })}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <InputField
                label="Cooking time per meal (min)"
                type="number"
                value={preferences.timePerMeal}
                onChange={(event) => updatePreferences({ timePerMeal: Number(event.target.value) })}
                hint="Prep + cook time, not eating time."
              />
              <InputField
                label="Travel radius (min)"
                type="number"
                value={preferences.travelRadiusMinutes}
                onChange={(event) => updatePreferences({ travelRadiusMinutes: Number(event.target.value) })}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={goBack}>
                Back
              </Button>
              <Button onClick={goNext}>Continue</Button>
            </div>
          </div>
        )
      case 'diet':
        return (
          <div className="grid gap-6">
            <TagSelect
              label="Diet type"
              options={dietOptions}
              value={[preferences.dietType]}
              onChange={(next) =>
                updatePreferences({
                  dietType: (next[next.length - 1] ?? 'none') as OnboardingPreferences['dietType']
                })
              }
              helper="Pick one. You can always change later."
            />
            <TagSelect
              label="Allergies"
              options={allergyOptions}
              value={preferences.allergies}
              onChange={(next) => updatePreferences({ allergies: next })}
              helper="Leave empty if none."
            />
            <InputField
              label="Calorie goal (optional)"
              type="number"
              value={preferences.calorieGoal ?? ''}
              onChange={(event) =>
                updatePreferences({ calorieGoal: event.target.value ? Number(event.target.value) : undefined })
              }
              hint="We use this to suggest portion sizes."
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={goBack}>
                Back
              </Button>
              <Button onClick={goNext}>Continue</Button>
            </div>
          </div>
        )
      case 'stores':
        return (
          <div className="grid gap-6">
            <InputField
              label="Location"
              value={preferences.location ?? ''}
              onChange={(event) => updatePreferences({ location: event.target.value })}
              placeholder="Thompson Residence, Ottawa"
            />
            <TagSelect
              label="Preferred stores"
              options={storeOptions}
              value={preferences.preferredStores}
              onChange={(next) => updatePreferences({ preferredStores: next })}
              helper="Optional. We can still auto-detect nearby stores."
            />
            <div className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-xs text-ink/70 dark:border-[#352721] dark:bg-[#1a1411] dark:text-[#c8b9a9]">
              Saved locally on this device by default. Sync is optional when accounts are added.
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={goBack}>
                Back
              </Button>
              <Button onClick={() => alert('Onboarding complete!')}>Finish</Button>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  const currentStepMeta = steps.find((step) => step.id === currentStep)

  return (
    <div className="grid gap-4">
      <Stepper steps={steps} currentStepId={currentStep} />
      <OnboardingLayout title={currentStepMeta?.title ?? ''} description={currentStepMeta?.description}>
        {stepContent()}
      </OnboardingLayout>
    </div>
  )
}
