import type { DashboardBootstrapResponse, OnboardingPreferences } from '../types'
import { fetchJson } from './api'

type DashboardBootstrapRequest = {
  preferences: OnboardingPreferences
  forceRefresh: boolean
}

export const fetchDashboardBootstrap = async (
  preferences: OnboardingPreferences
): Promise<DashboardBootstrapResponse> => {
  return await fetchJson<DashboardBootstrapResponse>('/dashboard/bootstrap', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ preferences, forceRefresh: true } satisfies DashboardBootstrapRequest)
  })
}
