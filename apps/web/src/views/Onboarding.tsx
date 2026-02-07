import { useEffect, useMemo, useRef, useState } from 'react'
import type { StepDefinition } from '../types'
import {
  defaultPreferences,
  SHOPPING_FREQUENCY_OPTIONS,
  SHOPPING_INTERVAL_DAYS,
  type OnboardingPreferences
} from '../types'
import { savePreferences } from '../utils/preferences'
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
const GEOAPIFY_KEY = import.meta.env['VITE_GEOAPIFY_KEY'] as string | undefined

type GeoapifySuggestion = {
  id: string
  label: string
}

type OnboardingProps = {
  onComplete?: (preferences: OnboardingPreferences) => void
  initialPreferences?: OnboardingPreferences
  eyebrowLabel?: string
  mode?: 'onboarding' | 'preferences'
}

export default function Onboarding({
  onComplete,
  initialPreferences,
  eyebrowLabel,
  mode = 'onboarding'
}: OnboardingProps) {
  const flowSteps = useMemo(
    () => (mode === 'preferences' ? steps.filter((step) => step.id !== 'welcome') : steps),
    [mode]
  )
  const [currentStep, setCurrentStep] = useState<StepDefinition['id']>(flowSteps[0]?.id ?? 'welcome')
  const [preferences, setPreferences] = useState<OnboardingPreferences>(initialPreferences ?? defaultPreferences)
  const [locationQuery, setLocationQuery] = useState(preferences.location ?? '')
  const [locationResults, setLocationResults] = useState<GeoapifySuggestion[]>([])
  const [locationOpen, setLocationOpen] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const activeRequest = useRef(0)

  const currentIndex = useMemo(
    () => flowSteps.findIndex((step) => step.id === currentStep),
    [currentStep, flowSteps]
  )

  useEffect(() => {
    if (!flowSteps.some((step) => step.id === currentStep)) {
      setCurrentStep(flowSteps[0]?.id ?? 'welcome')
    }
  }, [flowSteps, currentStep])

  const goNext = () => {
    const next = flowSteps[currentIndex + 1]
    if (next) {
      setCurrentStep(next.id)
    }
  }

  const goBack = () => {
    const prev = flowSteps[currentIndex - 1]
    if (prev) {
      setCurrentStep(prev.id)
    }
  }

  const updatePreferences = (updates: Partial<OnboardingPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...updates }))
  }

  useEffect(() => {
    if (currentStep !== 'stores') return
    if (!GEOAPIFY_KEY) {
      setLocationResults([])
      setLocationOpen(false)
      return
    }

    const query = locationQuery.trim()
    if (query.length < 3) {
      setLocationResults([])
      setLocationOpen(false)
      return
    }

    const requestId = activeRequest.current + 1
    activeRequest.current = requestId
    const controller = new AbortController()
    const handle = window.setTimeout(async () => {
      try {
        setLocationLoading(true)
        setLocationError(null)
        const url = new URL('https://api.geoapify.com/v1/geocode/autocomplete')
        url.searchParams.set('text', query)
        url.searchParams.set('apiKey', GEOAPIFY_KEY) // remind me to proxy this later. also, this api is quite low quality in terms of the results
        const response = await fetch(url.toString(), { signal: controller.signal })
        if (!response.ok) {
          throw new Error('Failed to fetch address suggestions.')
        }
        const data = (await response.json()) as {
          features?: Array<{ properties?: { formatted?: string; place_id?: string } }>
        }
        if (activeRequest.current !== requestId) return
        const next = (data.features ?? [])
          .map((feature) => {
            const label = feature.properties?.formatted
            if (!label) return null
            return {
              id: feature.properties?.place_id ?? label,
              label
            }
          })
          .filter(Boolean) as GeoapifySuggestion[]
        setLocationResults(next)
        setLocationOpen(next.length > 0)
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
        setLocationResults([])
        setLocationOpen(false)
        setLocationError('Unable to load suggestions right now.')
      } finally {
        setLocationLoading(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(handle)
      controller.abort()
    }
  }, [currentStep, locationQuery])

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
                label="Cooking per meal (min)"
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
            <label className="grid gap-2 text-sm text-ink/70 dark:text-[#c8b9a9]">
              <span className="text-[11px] uppercase tracking-[0.18em] leading-tight text-ink/50 dark:text-[#c8b9a9]">
                Diet type
              </span>
              <select
                className={[
                  'w-full rounded-xl border border-ink/10 bg-white px-4 py-3 text-ink',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf/40',
                  'dark:border-[#352721] dark:bg-[#1a1411] dark:text-[#f5f0e8]'
                ].join(' ')}
                value={preferences.dietType}
                onChange={(event) =>
                  updatePreferences({ dietType: event.target.value as OnboardingPreferences['dietType'] })
                }
              >
                {dietOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <span className="text-xs text-ink/50 dark:text-[#c8b9a9]">Pick one. You can always change later.</span>
            </label>
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
                updatePreferences({ calorieGoal: event.target.value ? Number(event.target.value) : null })
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
            <label className="grid gap-2 text-sm text-ink/70 dark:text-[#c8b9a9]">
              <span className="text-[11px] uppercase tracking-[0.18em] leading-tight text-ink/50 dark:text-[#c8b9a9]">
                Location
              </span>
              <div className="relative">
                <input
                  className={[
                    'w-full rounded-xl border border-ink/10 bg-white px-4 py-3 text-ink',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf/40',
                    'dark:border-[#352721] dark:bg-[#1a1411] dark:text-[#f5f0e8]'
                  ].join(' ')}
                  value={locationQuery}
                  onChange={(event) => {
                    const next = event.target.value
                    setLocationQuery(next)
                    updatePreferences({ location: next })
                    setLocationOpen(true)
                  }}
                  onFocus={() => {
                    if (locationResults.length > 0) setLocationOpen(true)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      setLocationOpen(false)
                    }
                  }}
                  placeholder="Thompson Residence, Ottawa"
                  autoComplete="off"
                />
                {locationOpen ? (
                  <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-48 overflow-auto rounded-2xl border border-ink/10 bg-white p-1 shadow-soft dark:border-[#352721] dark:bg-[#1a1411]">
                    {locationLoading ? (
                      <div className="px-3 py-2 text-xs text-ink/50 dark:text-[#c8b9a9]">Loading…</div>
                    ) : locationResults.length > 0 ? (
                      locationResults.map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          className="w-full rounded-xl px-3 py-2 text-left text-sm text-ink hover:bg-mist dark:text-[#f5f0e8] dark:hover:bg-[#231815]"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setLocationQuery(result.label)
                            updatePreferences({ location: result.label })
                            setLocationOpen(false)
                          }}
                        >
                          {result.label}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-xs text-ink/50 dark:text-[#c8b9a9]">No matches.</div>
                    )}
                  </div>
                ) : null}
              </div>
              {GEOAPIFY_KEY ? null : (
                <span className="text-xs text-ink/50 dark:text-[#c8b9a9]">
                  Add `VITE_GEOAPIFY_KEY` to enable address suggestions.
                </span>
              )}
              {locationError ? (
                <span className="text-xs text-ink/50 dark:text-[#c8b9a9]">{locationError}</span>
              ) : null}
            </label>
            <label className="grid gap-2 text-sm text-ink/70 dark:text-[#c8b9a9]">
              <span className="text-[11px] uppercase tracking-[0.18em] leading-tight text-ink/50 dark:text-[#c8b9a9]">
                Shopping frequency
              </span>
              <select
                className={[
                  'w-full rounded-xl border border-ink/10 bg-white px-4 py-3 text-ink',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf/40',
                  'dark:border-[#352721] dark:bg-[#1a1411] dark:text-[#f5f0e8]'
                ].join(' ')}
                value={preferences.shoppingFrequency}
                onChange={(event) =>
                  updatePreferences({
                    shoppingFrequency: event.target.value as OnboardingPreferences['shoppingFrequency']
                  })
                }
              >
                {SHOPPING_FREQUENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="text-xs text-ink/50 dark:text-[#c8b9a9]">
                We translate this to {SHOPPING_INTERVAL_DAYS[preferences.shoppingFrequency]} days for planning.
              </span>
            </label>
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
              <Button
                onClick={() => {
                  savePreferences(preferences)
                  onComplete?.(preferences)
                }}
              >
                Finish
              </Button>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  const currentStepMeta = flowSteps.find((step) => step.id === currentStep)

  return (
    <div className="grid gap-3 lg:flex lg:h-full lg:flex-col lg:gap-6">
      <Stepper steps={flowSteps} currentStepId={currentStep} />
      <div className="lg:flex-1 lg:h-full">
        <OnboardingLayout
          title={currentStepMeta?.title ?? ''}
          description={currentStepMeta?.description}
          eyebrow={eyebrowLabel}
        >
          {stepContent()}
        </OnboardingLayout>
      </div>
    </div>
  )
}
