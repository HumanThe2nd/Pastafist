const rawApiBase = import.meta.env['VITE_API_URL'] as string | undefined
const API_BASE_URL = rawApiBase ? rawApiBase.replace(/\/+$/, '') : 'http://localhost:8000'

export class ApiError extends Error {
  status: number
  body?: string
  path?: string

  constructor(message: string, status: number, options?: { body?: string; path?: string }) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = options?.body
    this.path = options?.path
  }
}

export const fetchJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const url = `${API_BASE_URL}${path}`
  const response = await fetch(url, init)
  if (!response.ok) {
    const bodyText = await response.text()
    throw new ApiError(`Request failed (${response.status}) for ${path}`, response.status, {
      body: bodyText,
      path
    })
  }
  return (await response.json()) as T
}
