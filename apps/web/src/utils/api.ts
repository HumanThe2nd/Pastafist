const rawApiBase = import.meta.env['VITE_API_URL'] as string | undefined
const API_BASE_URL = rawApiBase ? rawApiBase.replace(/\/+$/, '') : 'http://localhost:8000'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export const fetchJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, init)
  if (!response.ok) {
    throw new ApiError(`Request failed: ${response.status}`, response.status)
  }
  return (await response.json()) as T
}
