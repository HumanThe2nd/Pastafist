const DB_NAME = 'pastafist-local'
const DB_VERSION = 1
const SETTINGS_STORE = 'settings'

type StoredRecord = {
  key: string
  value: unknown
}

const openDb = async (): Promise<IDBDatabase | null> => {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return null
  }

  return await new Promise<IDBDatabase | null>((resolve) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(SETTINGS_STORE)) {
        database.createObjectStore(SETTINGS_STORE, { keyPath: 'key' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
    request.onblocked = () => resolve(null)
  })
}

export const readLocalStore = async <T>(key: string): Promise<T | null> => {
  const database = await openDb()
  if (!database) return null

  return await new Promise<T | null>((resolve) => {
    const transaction = database.transaction(SETTINGS_STORE, 'readonly')
    const store = transaction.objectStore(SETTINGS_STORE)
    const request = store.get(key)

    request.onsuccess = () => {
      const record = request.result as StoredRecord | undefined
      resolve((record?.value as T | undefined) ?? null)
    }
    request.onerror = () => resolve(null)
    transaction.onabort = () => resolve(null)
  }).finally(() => {
    database.close()
  })
}

export const writeLocalStore = async (key: string, value: unknown): Promise<boolean> => {
  const database = await openDb()
  if (!database) return false

  return await new Promise<boolean>((resolve) => {
    const transaction = database.transaction(SETTINGS_STORE, 'readwrite')
    const store = transaction.objectStore(SETTINGS_STORE)
    store.put({ key, value } satisfies StoredRecord)

    transaction.oncomplete = () => resolve(true)
    transaction.onerror = () => resolve(false)
    transaction.onabort = () => resolve(false)
  }).finally(() => {
    database.close()
  })
}
