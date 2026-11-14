export const PUERTO_MALDONADO = {
  centerLat: -12.5933,
  centerLng: -69.1891,
  south: -12.635,
  west: -69.235,
  north: -12.545,
  east: -69.145,
}

export function isInPuertoMaldonado(lat: number, lng: number): boolean {
  return (
    lat >= PUERTO_MALDONADO.south &&
    lat <= PUERTO_MALDONADO.north &&
    lng >= PUERTO_MALDONADO.west &&
    lng <= PUERTO_MALDONADO.east
  )
}
