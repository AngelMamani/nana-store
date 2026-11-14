import type { StoreProfile, StoreVideoKey, StoreVideoSlot, StoreVideos } from "./entities.ts"

export const STORE_VIDEO_KEYS: StoreVideoKey[] = ["hero", "showcase", "story"]

export const STORE_VIDEO_COPY: Record<
  StoreVideoKey,
  { label: string; hint: string; place: string; defaultTitle: string; defaultDescription: string }
> = {
  hero: {
    label: "Video de campaña",
    hint: "Aparece después de la primera categoría, en formato cine.",
    place: "Inicio · después del primer catálogo",
    defaultTitle: "Nueva colección",
    defaultDescription: "Mira las prendas en uso: texturas, caídas y colores reales de la tienda.",
  },
  showcase: {
    label: "Video vitrina",
    hint: "Lookbook entre colecciones, para mostrar cómo lucen las prendas.",
    place: "Inicio · entre categorías",
    defaultTitle: "Prendas reales en tienda",
    defaultDescription:
      "Telas suaves, frescas y resistentes pensadas para la comodidad de los más pequeños en Puerto Maldonado.",
  },
  story: {
    label: "Reel flotante",
    hint: "La burbuja de “Ver Reel” que se abre a pantalla completa.",
    place: "Inicio · burbuja Ver Reel",
    defaultTitle: "Ver Reel",
    defaultDescription: "Novedades en tienda",
  },
}

export function defaultVideoSlot(key: StoreVideoKey): StoreVideoSlot {
  const copy = STORE_VIDEO_COPY[key]
  return {
    url: null,
    enabled: true,
    title: copy.defaultTitle,
    description: copy.defaultDescription,
  }
}

export function defaultStoreVideos(): StoreVideos {
  return {
    hero: defaultVideoSlot("hero"),
    showcase: defaultVideoSlot("showcase"),
    story: defaultVideoSlot("story"),
  }
}

function asCoord(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const amount = typeof value === "number" ? value : Number(value)
  return Number.isFinite(amount) ? amount : null
}

export function normalizeStoreProfile(store: StoreProfile): StoreProfile {
  const defaults = defaultStoreVideos()
  const current = store.videos
  return {
    ...store,
    mapLat: asCoord(store.mapLat),
    mapLng: asCoord(store.mapLng),
    videos: {
      hero: { ...defaults.hero, ...current?.hero },
      showcase: { ...defaults.showcase, ...current?.showcase },
      story: { ...defaults.story, ...current?.story },
    },
  }
}

export function storeMapEmbed(store: StoreProfile): string | null {
  if (store.mapLat !== null && store.mapLng !== null) {
    return `https://maps.google.com/maps?q=${store.mapLat},${store.mapLng}&hl=es&z=17&output=embed`
  }
  const address = store.address.trim()
  if (!address) return null
  return `https://maps.google.com/maps?q=${encodeURIComponent(address)}&hl=es&z=16&output=embed`
}

export function storeMapLink(store: StoreProfile): string | null {
  if (store.mapLat !== null && store.mapLng !== null) {
    return `https://www.google.com/maps/search/?api=1&query=${store.mapLat},${store.mapLng}`
  }
  const address = store.address.trim()
  if (!address) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}
