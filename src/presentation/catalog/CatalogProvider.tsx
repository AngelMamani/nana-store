import { useEffect, useState, type ReactNode } from "react"
import { container } from "../../infrastructure/composition/container.ts"
import { CatalogContext } from "./catalog-context.ts"

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const stop = container.subscribeCatalog(() => setVersion((value) => value + 1))
    void container.hydrateCatalog().catch(() => undefined)
    return stop
  }, [])

  return <CatalogContext.Provider value={version}>{children}</CatalogContext.Provider>
}
