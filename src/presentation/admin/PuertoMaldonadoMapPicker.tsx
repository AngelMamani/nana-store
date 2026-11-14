import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { isInPuertoMaldonado, PUERTO_MALDONADO } from "../../domain/catalog/store-location.ts"

export function PuertoMaldonadoMapPicker({
  lat,
  lng,
  onPick,
}: {
  lat: number | null
  lng: number | null
  onPick: (lat: number, lng: number) => void
}) {
  const host = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.CircleMarker | null>(null)
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick

  useEffect(() => {
    const element = host.current
    if (!element || mapRef.current) return

    const bounds = L.latLngBounds(
      [PUERTO_MALDONADO.south, PUERTO_MALDONADO.west],
      [PUERTO_MALDONADO.north, PUERTO_MALDONADO.east],
    )
    const map = L.map(element, {
      center: [PUERTO_MALDONADO.centerLat, PUERTO_MALDONADO.centerLng],
      zoom: 14,
      minZoom: 13,
      maxZoom: 18,
      maxBounds: bounds.pad(0.03),
      maxBoundsViscosity: 1,
    })
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map)

    map.on("click", (event: L.LeafletMouseEvent) => {
      const nextLat = event.latlng.lat
      const nextLng = event.latlng.lng
      if (!isInPuertoMaldonado(nextLat, nextLng)) return
      onPickRef.current(nextLat, nextLng)
    })

    mapRef.current = map
    const frame = requestAnimationFrame(() => map.invalidateSize())

    return () => {
      cancelAnimationFrame(frame)
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || lat === null || lng === null || !isInPuertoMaldonado(lat, lng)) return
    const point = L.latLng(lat, lng)
    if (!markerRef.current) {
      markerRef.current = L.circleMarker(point, {
        radius: 11,
        color: "#ea0f7c",
        weight: 3,
        fillColor: "#f457a5",
        fillOpacity: 0.95,
      }).addTo(map)
    } else {
      markerRef.current.setLatLng(point)
    }
    map.panTo(point)
  }, [lat, lng])

  return <div ref={host} className="admin-store-leaflet" role="application" aria-label="Mapa de Puerto Maldonado" />
}
