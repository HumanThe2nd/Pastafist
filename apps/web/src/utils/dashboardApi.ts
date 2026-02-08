import type { DashboardBootstrapResponse, OnboardingPreferences } from '../types'
import { fetchJson } from './api'

type DashboardBootstrapRequest = {
  preferences: OnboardingPreferences
}

export const fetchDashboardBootstrap = async (
  preferences: OnboardingPreferences
): Promise<DashboardBootstrapResponse> => {
  return await fetchJson<DashboardBootstrapResponse>('/dashboard/bootstrap', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ preferences } satisfies DashboardBootstrapRequest)
  })
}
