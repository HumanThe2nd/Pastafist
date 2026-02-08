import { useEffect, useMemo, useRef, useState } from 'react'
import type { StepDefinition } from '../types'
import { defaultPreferences, SHOPPING_FREQUENCY_OPTIONS, type OnboardingPreferences } from '../types'
import { Button, InputField, OnboardingLayout, Stepper, TagSelect } from '../components'
import { sanitizePreferences } from '../utils/preferences'

const steps: StepDefinition[] = [
  {
    id: 'welcome',
    title: 'Welcome',
    description: 'Start fast with defaults or customize your constraints.'
  },
  {
    id: 'constraints',
    title: 'Constraints',
    description: 'Budget, meal cadence, and travel radius.'
  },
  {
    id: 'diet',
    title: 'Diet',
    description: 'Diet type, allergies, and macro focus.'
  },
  {
    id: 'stores',
    title: 'Location',
    description: 'Pickup location and shopping cadence.'
  }
]

const dietOptions: OnboardingPreferences['dietType'][] = [
  'vegetarian',
  'vegan',
  'pescatarian',
  'halal',
  'kosher',
  'keto',
  'gluten-free',
  'dairy-free'
]

const macroOptions: OnboardingPreferences['macroFocus'][] = [
  'balanced',
  'high-protein',
  'low-carb',
  'high-fiber'
]

const allergyOptions: OnboardingPreferences['allergies'][number][] = [
  'peanuts',
  'tree nuts',
  'dairy',
  'eggs',
  'soy',
  'gluten'
]

const GEOAPIFY_KEY = import.meta.env['VITE_GEOAPIFY_KEY'] as string | undefined

type GeoapifySuggestion = {
  id: string
  label: string
  lat: number
  lng: number
}

type OnboardingProps = {
  onComplete?: (preferences: OnboardingPreferences) => void | Promise<void>
  initialPreferences?: OnboardingPreferences
  eyebrowLabel?: string
  mode?: 'onboarding' | 'preferences'
}

const formatLatLng = (location: OnboardingPreferences['location']): string => {
  return `${location[0].toFixed(5)}, ${location[1].toFixed(5)}`
}

const toAllergies = (values: string[]): OnboardingPreferences['allergies'] => {
  return values.filter((value): value is OnboardingPreferences['allergies'][number] =>
    allergyOptions.includes(value as OnboardingPreferences['allergies'][number])
  )
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
  const [locationQuery, setLocationQuery] = useState(() => formatLatLng((initialPreferences ?? defaultPreferences).location))
  const [locationResults, setLocationResults] = useState<GeoapifySuggestion[]>([])
  const [locationOpen, setLocationOpen] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const activeRequest = useRef(0)

  const currentIndex = useMemo(
    () => flowSteps.findIndex((step) => step.id === currentStep),
    [currentStep, flowSteps]
  )
  const canFetchLocationSuggestions =
    currentStep === 'stores' &&
    Boolean(GEOAPIFY_KEY) &&
    locationQuery.trim().length >= 3

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
    if (!canFetchLocationSuggestions || !GEOAPIFY_KEY) return

    const query = locationQuery.trim()

    const requestId = activeRequest.current + 1
    activeRequest.current = requestId
    const handle = window.setTimeout(() => {
      setLocationLoading(true)
      const url = new URL('https://api.geoapify.com/v1/geocode/autocomplete')
      url.searchParams.set('text', query)
      url.searchParams.set('apiKey', GEOAPIFY_KEY)

      void fetch(url.toString())
        .then((response) => {
          if (!response.ok) {
            throw new Error('Failed to fetch address suggestions.')
          }
          return response.json() as Promise<{
            features?: Array<{
              properties?: { formatted?: string; place_id?: string; lat?: number; lon?: number }
              geometry?: { coordinates?: [number, number] }
            }>
          }>
        })
        .then((data) => {
          if (activeRequest.current !== requestId) return
          const next = (data.features ?? [])
            .map((feature) => {
              const label = feature.properties?.formatted
              const lat = feature.properties?.lat ?? feature.geometry?.coordinates?.[1]
              const lng = feature.properties?.lon ?? feature.geometry?.coordinates?.[0]
              if (!label || typeof lat !== 'number' || typeof lng !== 'number') return null
              if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
              return {
                id: feature.properties?.place_id ?? label,
                label,
                lat,
                lng
              }
            })
            .filter((result): result is GeoapifySuggestion => result !== null)
          setLocationResults(next)
          setLocationOpen(next.length > 0)
        })
        .finally(() => {
          setLocationLoading(false)
        })
    }, 250)

    return () => {
      window.clearTimeout(handle)
    }
  }, [canFetchLocationSuggestions, locationQuery])

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
                label="Budget"
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
            <InputField
              label="Travel radius (meters)"
              type="number"
              value={preferences.travelRadiusMeters}
              onChange={(event) => updatePreferences({ travelRadiusMeters: Number(event.target.value) })}
              hint="Maximum distance for suggested stores."
            />
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
            </label>
            <TagSelect
              label="Allergies"
              options={allergyOptions}
              value={preferences.allergies}
              onChange={(next) => updatePreferences({ allergies: toAllergies(next) })}
              helper="Leave empty if none."
            />
            <label className="grid gap-2 text-sm text-ink/70 dark:text-[#c8b9a9]">
              <span className="text-[11px] uppercase tracking-[0.18em] leading-tight text-ink/50 dark:text-[#c8b9a9]">
                Macro focus
              </span>
              <select
                className={[
                  'w-full rounded-xl border border-ink/10 bg-white px-4 py-3 text-ink',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf/40',
                  'dark:border-[#352721] dark:bg-[#1a1411] dark:text-[#f5f0e8]'
                ].join(' ')}
                value={preferences.macroFocus}
                onChange={(event) =>
                  updatePreferences({ macroFocus: event.target.value as OnboardingPreferences['macroFocus'] })
                }
              >
                {macroOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
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
                {locationOpen && canFetchLocationSuggestions ? (
                  <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-48 overflow-auto rounded-2xl border border-ink/10 bg-white p-1 shadow-soft dark:border-[#352721] dark:bg-[#1a1411]">
                    {locationLoading ? (
                      <div className="px-3 py-2 text-xs text-ink/50 dark:text-[#c8b9a9]">Loading...</div>
                    ) : locationResults.length > 0 ? (
                      locationResults.map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          className="w-full rounded-xl px-3 py-2 text-left text-sm text-ink hover:bg-mist dark:text-[#f5f0e8] dark:hover:bg-[#231815]"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setLocationQuery(result.label)
                            updatePreferences({ location: [result.lat, result.lng] })
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
              <span className="text-xs text-ink/50 dark:text-[#c8b9a9]">
                Selected coordinates: {formatLatLng(preferences.location)}
              </span>
              {GEOAPIFY_KEY ? null : (
                <span className="text-xs text-ink/50 dark:text-[#c8b9a9]">
                  Add `VITE_GEOAPIFY_KEY` to enable address suggestions.
                </span>
              )}
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
                onChange={(event) => updatePreferences({ shoppingFrequency: Number(event.target.value) })}
              >
                {SHOPPING_FREQUENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="text-xs text-ink/50 dark:text-[#c8b9a9]">
                Planning interval: {preferences.shoppingFrequency} days.
              </span>
            </label>
            <div className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-xs text-ink/70 dark:border-[#352721] dark:bg-[#1a1411] dark:text-[#c8b9a9]">
              Saved locally on this device by default. Sync is optional when accounts are added.
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={goBack}>
                Back
              </Button>
              <Button
                onClick={() => {
                  onComplete?.(sanitizePreferences(preferences))
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
