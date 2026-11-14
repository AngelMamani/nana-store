import { createContext, useContext } from "react"

export const CatalogContext = createContext<number | null>(null)

export function useCatalog() {
  const version = useContext(CatalogContext)
  if (version === null) throw new Error("useCatalog debe usarse dentro de CatalogProvider")
  return version
}
