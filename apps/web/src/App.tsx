import { useEffect, useRef, useState } from 'react'
import Dashboard from './views/Dashboard'
import Onboarding from './views/Onboarding'
import { defaultPreferences, type OnboardingPreferences } from './types'
import { loadPreferences, sanitizePreferences, savePreferences } from './utils/preferences'

const stats = [
  { label: 'Avg. weekly savings', value: '$18' },
  { label: 'Nearby stores tracked', value: '120+' },
  { label: 'Plans generated', value: '4.7k' }
]

const onboardingSteps = [
  {
    title: 'Tell us your constraints',
    detail: 'Budget, diet, time, and how far you can travel.'
  },
  {
    title: 'Pick a plan',
    detail: 'We compare store flyers, stock, and recipes.'
  },
  {
    title: 'Cook with confidence',
    detail: 'Get a meal flow, nutrient notes, and swaps.'
  }
]

const planCards = [
  {
    name: 'Lean & Simple',
    tag: 'Protein-forward',
    time: '3 dinners',
    price: '$26',
    detail: 'Chicken bowls, lentil pasta, and yogurt parfaits.'
  },
  {
    name: 'Budget Builder',
    tag: 'Under $35',
    time: '5 meals',
    price: '$31',
    detail: 'Veggie chili, tuna wraps, oat smoothies.'
  },
  {
    name: 'Quick Week',
    tag: '25 min max',
    time: '4 meals',
    price: '$29',
    detail: 'Stir-fry kit, sheet-pan salmon, falafel salad.'
  }
]

const storeHighlights = [
  {
    store: 'Metro',
    distance: '1.8 km',
    highlight: '2-for-1 greens + citrus bundle'
  },
  {
    store: 'Farm Boy',
    distance: '2.4 km',
    highlight: 'Bulk grain sale, olive oil markdown'
  },
  {
    store: 'Local Market',
    distance: '0.9 km',
    highlight: 'Fresh produce restock at 6pm'
  }
]

export default function App() {
  const [view, setView] = useState<'landing' | 'dashboard'>('landing')
  const [preferences, setPreferences] = useState<OnboardingPreferences>(defaultPreferences)
  const [preferencesHydrated, setPreferencesHydrated] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const onboardingRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let isCancelled = false

    const hydratePreferences = async () => {
      const stored = await loadPreferences()
      if (!isCancelled) {
        setPreferences(stored)
        setPreferencesHydrated(true)
      }
    }

    void hydratePreferences()

    return () => {
      isCancelled = true
    }
  }, [])

  const commitPreferences = (next: OnboardingPreferences) => {
    const sanitized = sanitizePreferences(next)
    setPreferences(sanitized)
    void savePreferences(sanitized)
  }

  if (!preferencesHydrated) {
    return (
      <div className="min-h-screen bg-hero bg-no-repeat bg-cover text-ink dark:bg-[#17110f] dark:text-[#f5f0e8]">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6">
          <div className="rounded-2xl bg-white/80 px-6 py-4 text-sm text-ink/70 shadow-soft dark:bg-[#201813]/90 dark:text-[#c8b9a9]">
            Loading local preferences...
          </div>
        </div>
      </div>
    )
  }

  const jumpToOnboarding = () => {
    setView('landing')
    requestAnimationFrame(() => {
      onboardingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return (
    <div className="min-h-screen bg-hero bg-no-repeat bg-cover text-ink dark:bg-[#17110f] dark:text-[#f5f0e8]">
      <div className="mx-auto flex max-w-6xl flex-col gap-20 px-6 pb-16 pt-10">
        <header className="rounded-3xl bg-white/80 p-6 shadow-soft backdrop-blur dark:bg-[#201813]/90 md:p-10">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-forest text-sand font-display text-lg dark:bg-[#d67a3f] dark:text-[#1a120f]">
                P
              </div>
              <div>
                <p className="font-display text-xl text-ink dark:text-[#f5f0e8]">PastAfist</p>
                <p className="text-sm text-ink/60 dark:text-[#c8b9a9]">Smart grocery planning</p>
              </div>
            </div>
            <nav className="flex flex-wrap items-center gap-4 text-sm text-ink/70 dark:text-[#c8b9a9]">
              <a className="hover:text-leaf dark:hover:text-[#f0b36a]" href="#how-it-works">How it works</a>
              <a className="hover:text-leaf dark:hover:text-[#f0b36a]" href="#diet-profiles">Diet profiles</a>
              <a className="hover:text-leaf dark:hover:text-[#f0b36a]" href="#local-deals">Local deals</a>
            </nav>
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="rounded-full border border-ink/20 px-4 py-2 text-sm dark:border-[#3a2b24] dark:text-[#e4d7c9]"
                onClick={() => setView('dashboard')}
              >
                Sign in
              </button>
              <button
                className="rounded-full bg-leaf px-5 py-2 text-sm text-white dark:bg-[#d67a3f] dark:text-[#1a120f]"
                onClick={jumpToOnboarding}
              >
                Start planning
              </button>
            </div>
          </div>

          {view === 'landing' ? (
            <section className="relative mt-12">
              <div className="flex flex-col gap-6 lg:pr-[46%]">
                <p className="text-xs uppercase tracking-[0.35em] text-ink/50 dark:text-[#c8b9a9]">
                  Budget. Distance. Nutrition.
                </p>
                <h1 className="font-display text-4xl leading-tight text-ink dark:text-[#f5f0e8] md:text-5xl">
                  Grocery plans that fit your budget and the stores around you.
                </h1>
                <p className="text-lg text-ink/70 dark:text-[#c8b9a9]">
                  Plan meals using live store prices, your dietary goals, and travel time. No account required. Save your
                  preferences locally, then sync whenever you are ready.
                </p>
                <div className="grid gap-4 md:grid-cols-3">
                  {stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-leaf/10 bg-mist px-5 py-4 dark:border-[#3b2923] dark:bg-[#231815]"
                    >
                      <p className="text-xs uppercase tracking-[0.2em] text-ink/50 dark:text-[#c8b9a9]">{stat.label}</p>
                      <p className="font-display text-2xl text-ink dark:text-[#f5f0e8]">{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div
                ref={onboardingRef}
                className="mt-8 lg:absolute lg:right-0 lg:top-0 lg:mt-0 lg:h-full lg:w-[42%] lg:overflow-auto lg:pr-1"
              >
                <Onboarding
                  initialPreferences={preferences}
                  onComplete={(next) => {
                    commitPreferences(next)
                    setView('dashboard')
                  }}
                />
              </div>
            </section>
          ) : (
            <Dashboard
              preferences={preferences}
              onUpdatePreferences={() => setShowPreferences(true)}
            />
          )}
        </header>

        {view === 'dashboard' && showPreferences ? (
          <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 px-4 py-8">
            <div className="relative h-full w-full max-w-xl overflow-auto rounded-3xl bg-mist p-4 shadow-soft dark:bg-[#1a1411] md:p-6">
              <button
                className="absolute right-4 top-4 rounded-full border border-ink/20 px-3 py-1 text-xs text-ink/70 dark:border-[#3a2b24] dark:text-[#e4d7c9]"
                onClick={() => setShowPreferences(false)}
                type="button"
              >
                Close
              </button>
              <Onboarding
                initialPreferences={preferences}
                eyebrowLabel="Preferences"
                mode="preferences"
                onComplete={(next) => {
                  commitPreferences(next)
                  setShowPreferences(false)
                }}
              />
            </div>
          </div>
        ) : null}

        {view === 'landing' ? (
          <section id="how-it-works" className="rounded-3xl bg-white/80 p-8 shadow-soft dark:bg-[#1f1714] md:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-ink/50 dark:text-[#c8b9a9]">Onboarding</p>
              <h2 className="mt-3 font-display text-3xl text-ink dark:text-[#f5f0e8]">Tell us your constraints once. We do the rest.</h2>
              <p className="mt-4 text-ink/70 dark:text-[#c8b9a9]">
                Customize meal cadence, allergy alerts, macros, and store preferences. Skip onboarding and we will use
                student-friendly defaults.
              </p>
              <div className="mt-6 grid gap-4">
                {onboardingSteps.map((step, index) => (
                  <div key={step.title} className="flex gap-4 rounded-2xl bg-white px-5 py-4 shadow-soft dark:bg-[#1a1411]">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-forest text-sand font-display dark:bg-[#d67a3f] dark:text-[#1a120f]">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-ink dark:text-[#f5f0e8]">{step.title}</p>
                      <p className="text-sm text-ink/60 dark:text-[#c8b9a9]">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              {planCards.map((plan) => (
                <div key={plan.name} className="rounded-3xl bg-white px-6 py-5 shadow-card dark:bg-[#1a1411]">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-display text-2xl text-ink dark:text-[#f5f0e8]">{plan.name}</p>
                      <p className="text-sm text-ink/60 dark:text-[#c8b9a9]">{plan.detail}</p>
                    </div>
                    <div className="rounded-full bg-ink/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-ink/70 dark:bg-[#2a1f1a] dark:text-[#e4d7c9]">
                      {plan.tag}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm text-ink/70 dark:text-[#c8b9a9]">
                    <span>{plan.time}</span>
                    <span className="font-medium text-ink dark:text-[#f5f0e8]">{plan.price} total</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        ) : null}

        {view === 'landing' ? (
          <section id="diet-profiles" className="rounded-3xl bg-white/80 p-8 shadow-soft dark:bg-[#1f1714] md:p-10">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-ink/50 dark:text-[#c8b9a9]">Diet profiles</p>
              <h2 className="mt-3 font-display text-3xl text-ink dark:text-[#f5f0e8]">Save your diet once, reuse forever.</h2>
              <p className="mt-4 text-ink/70 dark:text-[#c8b9a9]">
                Create profiles for high-protein, vegetarian, allergy-friendly, or cultural diets, then switch plans
                instantly.
              </p>
            </div>
            <div className="grid gap-4">
              <div className="rounded-3xl border border-leaf/15 bg-mist px-6 py-5 dark:border-[#3b2923] dark:bg-[#231815]">
                <p className="font-display text-2xl text-ink dark:text-[#f5f0e8]">High Protein</p>
                <p className="text-sm text-ink/60 dark:text-[#c8b9a9]">Bodybuilder friendly, 140g/day</p>
              </div>
              <div className="rounded-3xl border border-leaf/15 bg-mist px-6 py-5 dark:border-[#3b2923] dark:bg-[#231815]">
                <p className="font-display text-2xl text-ink dark:text-[#f5f0e8]">Vegetarian</p>
                <p className="text-sm text-ink/60 dark:text-[#c8b9a9]">Plant-forward, budget friendly</p>
              </div>
            </div>
          </div>
        </section>
        ) : null}

        {view === 'landing' ? (
          <section id="local-deals" className="rounded-3xl bg-white/80 p-8 shadow-soft dark:bg-[#1f1714] md:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-ink/50 dark:text-[#c8b9a9]">Local deals</p>
              <h2 className="mt-3 font-display text-3xl text-ink dark:text-[#f5f0e8]">Shop nearby with live flyers and stock hints.</h2>
              <p className="mt-4 text-ink/70 dark:text-[#c8b9a9]">
                Connects to nearby grocers and highlights the cheapest ingredients for your plan. Works even without an
                account by storing data locally.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button className="rounded-full bg-forest px-5 py-2 text-sm text-sand dark:bg-[#d67a3f] dark:text-[#1a120f]">See local deals</button>
                <button className="rounded-full border border-ink/20 px-5 py-2 text-sm dark:border-[#3a2b24] dark:text-[#e4d7c9]">Add a store</button>
              </div>
            </div>
            <div className="grid gap-4">
              {storeHighlights.map((store) => (
                <div key={store.store} className="rounded-2xl bg-mist px-5 py-4 dark:bg-[#231815]">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-ink dark:text-[#f5f0e8]">{store.store}</p>
                    <span className="text-xs text-ink/60 dark:text-[#c8b9a9]">{store.distance}</span>
                  </div>
                  <p className="mt-2 text-sm text-ink/70 dark:text-[#c8b9a9]">{store.highlight}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        ) : null}

        <footer className="flex flex-wrap items-center justify-between gap-6 px-2 text-sm text-ink/60 dark:text-[#c8b9a9]">
          <div>
            <p className="font-display text-lg text-ink dark:text-[#f5f0e8]">PastAfist</p>
            <p>Meal plans for busy students and travelers.</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <span>Privacy</span>
            <span>Data sources</span>
            <span>Contact</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
