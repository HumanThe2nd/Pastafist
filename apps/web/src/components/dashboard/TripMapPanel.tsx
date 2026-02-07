import { useMemo } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import type { GroceryListItem, LatLng, TripStop } from '../../types'

type TripMapPanelProps = {
  stops: TripStop[]
  route?: LatLng[]
  items: GroceryListItem[]
  activeStopId: string | null
  onStopSelect: (stopId: string) => void
  onToggleItem: (id: string) => void
  onSetItemStore: (id: string, store: string) => void
  onMarkStoreDone: (store: string) => void
}

const defaultIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

L.Marker.prototype.options.icon = defaultIcon

export default function TripMapPanel({
  stops,
  route = [],
  items,
  activeStopId,
  onStopSelect,
  onToggleItem,
  onSetItemStore,
  onMarkStoreDone
}: TripMapPanelProps) {
  const resolvedStopId = activeStopId ?? stops[0]?.id ?? null

  const center = useMemo<LatLng>(() => {
    const routeStart = route[0]
    if (routeStart) {
      return routeStart
    }
    const firstStop = stops[0]
    return firstStop ? [firstStop.lat, firstStop.lng] : [45.4215, -75.6972]
  }, [route, stops])
  const path = useMemo<[number, number][]>(() => {
    if (route.length > 0) {
      return route
    }
    return stops.map((stop) => [stop.lat, stop.lng])
  }, [route, stops])
  const activeStop = useMemo(
    () => stops.find((stop) => stop.id === resolvedStopId) ?? stops[0],
    [stops, resolvedStopId]
  )
  const itemsByStore = useMemo(() => {
    const map = new Map<string, GroceryListItem[]>()
    items.forEach((item) => {
      const list = map.get(item.bestStore) ?? []
      list.push(item)
      map.set(item.bestStore, list)
    })
    return map
  }, [items])
  const activeItems = activeStop ? itemsByStore.get(activeStop.store) ?? [] : []
  const activeStopIndex = activeStop ? stops.findIndex((stop) => stop.id === activeStop.id) : -1
  const nextStops = activeStopIndex >= 0 ? stops.slice(activeStopIndex + 1) : []

  const handleStopSelect = (stopId: string) => {
    onStopSelect(stopId)
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-3xl border border-ink/10 bg-mist px-4 py-4 text-xs text-ink/60 dark:border-[#3b2923] dark:bg-[#231815] dark:text-[#c8b9a9]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p>Trip route preview</p>
          <span className="text-[11px] text-ink/50 dark:text-[#c8b9a9]">OpenStreetMap</span>
        </div>
        <div className="mt-3 overflow-hidden rounded-2xl border border-ink/10 bg-white/80 dark:border-[#352721] dark:bg-[#1a1411]">
          <MapContainer
            center={center}
            zoom={13}
            scrollWheelZoom={false}
            className="h-48 w-full"
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {path.length > 1 ? (
              <Polyline positions={path} pathOptions={{ color: '#1c7c54', weight: 4, opacity: 0.8 }} />
            ) : null}
            {stops.map((stop, index) => (
              <Marker
                key={stop.id}
                position={[stop.lat, stop.lng]}
                eventHandlers={{
                  click: () => handleStopSelect(stop.id)
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{index + 1}. {stop.store}</p>
                    <p>{stop.address}</p>
                    <p className="text-xs text-ink/60">
                      {(itemsByStore.get(stop.store) ?? []).length} items · {stop.eta} away
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
      {activeStop ? (
        <div className="rounded-2xl border border-ink/10 bg-white px-4 py-4 text-sm text-ink/70 dark:border-[#352721] dark:bg-[#1a1411] dark:text-[#c8b9a9]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-ink/40 dark:text-[#c8b9a9]">
                Items at {activeStop.store}
              </p>
              <p className="mt-1 text-xs text-ink/60 dark:text-[#c8b9a9]">{activeStop.address}</p>
            </div>
            <span className="text-xs text-ink/60 dark:text-[#c8b9a9]">{activeItems.length} items</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink/60 dark:text-[#c8b9a9]">
            <span>Mark every item from this stop as purchased.</span>
            <button
              type="button"
              onClick={() => onMarkStoreDone(activeStop.store)}
              className="rounded-full border border-ink/20 px-3 py-1 text-[11px] dark:border-[#3a2b24]"
              disabled={activeItems.length === 0}
            >
              Mark store done
            </button>
          </div>
          <div className="mt-3 grid gap-2">
            {activeItems.length > 0 ? (
              activeItems.map((item) => {
                const alternatives = item.storeOptions.filter((option) => option.store !== activeStop.store)
                const nextStopOption = nextStops.find((stop) =>
                  item.storeOptions.some((option) => option.store === stop.store)
                )

                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-ink/10 bg-ink/5 px-3 py-2 text-sm dark:border-[#352721] dark:bg-[#231815]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={item.purchased}
                          onChange={() => onToggleItem(item.id)}
                          className="h-4 w-4 accent-forest"
                        />
                        <div>
                          <p className="font-medium text-ink dark:text-[#f5f0e8]">{item.name}</p>
                          <p className="text-xs text-ink/50 dark:text-[#c8b9a9]">{item.totalNeeded}</p>
                        </div>
                      </label>
                      {item.storeOptions[0]?.purchaseUrl ? (
                        <a
                          className="rounded-full border border-ink/20 px-3 py-1 text-[11px] dark:border-[#3a2b24]"
                          href={
                            item.storeOptions.find((option) => option.store === item.bestStore)?.purchaseUrl ??
                            item.storeOptions[0]?.purchaseUrl
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          Buy link
                        </a>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink/60 dark:text-[#c8b9a9]">
                      {alternatives.length > 0 ? (
                        <label className="flex items-center gap-2">
                          <span>Alternate store</span>
                          <select
                            className="rounded-full border border-ink/20 bg-white px-2 py-1 text-[11px] text-ink/70 dark:border-[#3a2b24] dark:bg-[#1a1411] dark:text-[#c8b9a9]"
                            defaultValue=""
                            onChange={(event) => {
                              const value = event.target.value
                              if (!value) return
                              onSetItemStore(item.id, value)
                              event.currentTarget.value = ''
                            }}
                          >
                            <option value="">Move to...</option>
                            {alternatives.map((option) => (
                              <option key={`${item.id}-${option.store}`} value={option.store}>
                                {option.store} · {option.unitPrice}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <span>No alternate stores listed.</span>
                      )}
                      {nextStopOption ? (
                        <button
                          type="button"
                          onClick={() => onSetItemStore(item.id, nextStopOption.store)}
                          className="rounded-full border border-ink/20 px-3 py-1 text-[11px] dark:border-[#3a2b24]"
                        >
                          Send to next stop ({nextStopOption.store})
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-xs text-ink/50 dark:text-[#c8b9a9]">No items assigned to this stop yet.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
